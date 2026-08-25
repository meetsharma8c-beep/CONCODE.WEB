const DatabaseManager = require('./DatabaseManager');
const db = new DatabaseManager();

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'ms.concode@gmail.com';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

/**
 * Sends a real-time notification alert across configured channels (Discord, Slack, Email, System Log).
 * @param {string} title - The notification title/category.
 * @param {Object} data - The payload details (name, email, message, serviceType).
 */
async function sendLeadAlert(title, data) {
  const payload = {
    notificationId: 'notif_' + Date.now().toString(36),
    title,
    data,
    timestamp: new Date().toISOString(),
    read: false
  };

  // 1. Persist to system notification log
  await db.insert('notifications', payload);
  console.log(`\n [NOTIFICATION ALERT] ${title}:`, JSON.stringify(data, null, 2));

  // 2. Dispatch Discord Webhook if configured
  if (DISCORD_WEBHOOK_URL) {
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: ` ${title}`,
            color: 0x00F0FF,
            fields: Object.keys(data).map(key => ({
              name: key.toUpperCase(),
              value: String(data[key] || 'N/A'),
              inline: false
            })),
            timestamp: new Date().toISOString()
          }]
        })
      });
      console.log(' Sent Discord webhook notification');
    } catch (err) {
      console.warn('Discord webhook failed:', err.message);
    }
  }

  // 3. Dispatch Slack Webhook if configured
  if (SLACK_WEBHOOK_URL) {
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `* ${title}*\n` + Object.entries(data).map(([k, v]) => `• *${k}*: ${v}`).join('\n')
        })
      });
      console.log(' Sent Slack webhook notification');
    } catch (err) {
      console.warn('Slack webhook failed:', err.message);
    }
  }

  // 4. Send Email Alert via Resend API (if RESEND_API_KEY is provided in .env)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'ConCode Alerts <onboarding@resend.dev>',
          to: [ADMIN_EMAIL],
          subject: `[CONCODE ALERT] ${title} - ${data.name || data.email || 'New Lead'}`,
          html: `
            <div style="font-family: Arial, sans-serif; background: #060b16; color: #fff; padding: 24px; border-radius: 12px; max-width: 600px;">
              <h2 style="color: #00f0ff;"> ${title}</h2>
              <hr style="border-color: rgba(255,255,255,0.1);" />
              ${Object.entries(data).map(([k, v]) => `<p><strong>${escapeHtml(k.toUpperCase())}:</strong> ${escapeHtml(v)}</p>`).join('')}
              <br />
              <a href="http://localhost:3000/login.html" style="background: #00f0ff; color: #060b16; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">View in Admin Panel</a>
            </div>
          `
        })
      });
      if (res.ok) {
        console.log(` Resend Email alert sent to ${ADMIN_EMAIL}`);
      } else {
        const errData = await res.json();
        console.warn('Resend email alert error:', errData);
      }
    } catch (resendErr) {
      console.warn('Resend Email alert failed:', resendErr.message);
    }
  }
  // 5. Send Email Alert via SMTP (if SMTP_HOST, SMTP_USER, and SMTP_PASS are provided)
  else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"ConCode Alerts" <${process.env.SMTP_USER}>`,
        to: ADMIN_EMAIL,
        subject: `[CONCODE ALERT] ${title} - ${data.name || data.email || 'New Lead'}`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #060b16; color: #fff; padding: 24px; border-radius: 12px; max-width: 600px;">
            <h2 style="color: #00f0ff;"> ${title}</h2>
            <hr style="border-color: rgba(255,255,255,0.1);" />
            ${Object.entries(data).map(([k, v]) => `<p><strong>${escapeHtml(k.toUpperCase())}:</strong> ${escapeHtml(v)}</p>`).join('')}
            <br />
            <a href="http://localhost:3000/login.html" style="background: #00f0ff; color: #060b16; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">View in Admin Panel</a>
          </div>
        `
      });
      console.log(` Email alert sent to ${ADMIN_EMAIL}`);
    } catch (emailErr) {
      console.warn('SMTP Email alert failed:', emailErr.message);
    }
  }

  return payload;
}

/**
 * Retrieves unread or all system notifications.
 */
async function getNotifications() {
  const notifs = await db.read('notifications') || [];
  return notifs.reverse();
}

module.exports = {
  sendLeadAlert,
  getNotifications
};

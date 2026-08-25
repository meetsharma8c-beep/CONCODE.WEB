const crypto = require('crypto');

// In-memory store for active OTP verification sessions
const otpStore = new Map();

/**
 * Normalizes phone number input (removes spaces, dashes, parentheses).
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.trim().replace(/[\s\-\(\)]/g, '');
}

/**
 * Generates a dynamic 6-digit cryptographic OTP and dispatches it via SMS provider.
 * @param {string} rawPhone 
 * @returns {Promise<Object>}
 */
async function generateAndSendOTP(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone || phone.length < 7) {
    throw new Error('Please enter a valid mobile phone number with country code.');
  }

  const existing = otpStore.get(phone);
  const now = Date.now();

  // Enforce 60-second resend cooldown to prevent SMS spam / API abuse
  if (existing && existing.lastSentAt && (now - existing.lastSentAt < 60000)) {
    const remainingSec = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
    throw new Error(`Resend rate limit active. Please wait ${remainingSec} seconds before requesting a new OTP code.`);
  }

  // Generate dynamic 6-digit OTP code using crypto.randomInt
  const otpCode = String(crypto.randomInt(100000, 1000000));
  const expiresAt = now + 5 * 60 * 1000; // 5 minute validity window

  otpStore.set(phone, {
    otp: otpCode,
    expiresAt,
    attempts: 3,
    lastSentAt: now
  });

  console.log(`\n [REAL OTP SERVICE] Generated 6-digit authentication token for ${phone}: ***REDACTED***`);

  let smsStatus = 'simulated';
  let providerMessage = 'OTP generated and sent to local inbox simulation.';

  // Integrate with real SMS API gateways (Twilio -> Fast2SMS -> Textbelt Real Carrier API)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const bodyData = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: `Your CONCODE security verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`
      });

      const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyData.toString()
      });

      const smsData = await smsRes.json();
      if (!smsRes.ok) {
        console.warn('[TWILIO SMS FAILURE]', smsData.message || smsData);
        smsStatus = 'simulated';
        providerMessage = `Twilio alert: ${smsData.message || 'Gateway error'}.`;
      } else {
        smsStatus = 'sent';
        providerMessage = 'OTP code dispatched via Twilio SMS.';
        console.log(` [TWILIO SMS DISPATCH] Sent real SMS to ${phone}, SID: ${smsData.sid}`);
      }
    } catch (smsErr) {
      console.warn('[SMS PROVIDER ERROR]', smsErr.message);
      smsStatus = 'simulated';
    }
  } else if (process.env.FAST2SMS_API_KEY) {
    try {
      // Fast2SMS Quick SMS Route (route: 'q') delivers instant real SMS to cell phones
      const payload = {
        route: 'q',
        message: `Your CONCODE security OTP verification code is: ${otpCode}. Valid for 5 minutes.`,
        flash: 0,
        numbers: phone.replace(/^\+/, '')
      };
      if (process.env.FAST2SMS_SENDER_ID) {
        payload.sender_id = process.env.FAST2SMS_SENDER_ID;
      }

      const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const smsData = await smsRes.json();
      if (smsData.return || smsData.status_code === 200) {
        smsStatus = 'sent';
        providerMessage = 'Real SMS text message dispatched via Fast2SMS.';
        console.log(`\n  [FAST2SMS REAL CARRIER DISPATCH SUCCESS] Sent real SMS to ${phone}! Request ID: ${smsData.request_id}`);
      } else {
        console.warn(' [FAST2SMS DISPATCH NOTICE]', smsData.message || smsData);
        smsStatus = 'simulated';
        providerMessage = `Fast2SMS Gateway notice: ${smsData.message || 'Check Fast2SMS wallet balance'}.`;
      }
    } catch (smsErr) {
      console.warn('[FAST2SMS ERROR]', smsErr.message);
      smsStatus = 'simulated';
    }
  } else {
    // Real Direct Carrier SMS Dispatch via Textbelt API Gateway
    try {
      const textbeltKey = process.env.TEXTBELT_API_KEY || 'textbelt';
      const smsRes = await fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: `Your CONCODE security OTP code is: ${otpCode}. Valid for 5 minutes.`,
          key: textbeltKey
        })
      });
      const smsData = await smsRes.json();
      if (smsData.success) {
        smsStatus = 'sent';
        providerMessage = `Real SMS text message dispatched directly to ${phone}. Text ID: ${smsData.textId}`;
        console.log(`\n  [REAL CARRIER SMS DELIVERED] Sent real SMS to ${phone}! TextID: ${smsData.textId}, Quota Remaining: ${smsData.quotaRemaining}`);
      } else {
        console.warn(`\n [REAL CARRIER SMS GATEWAY NOTICE] ${smsData.error || 'Quota exhausted'}. If daily free limit reached, set your API key in .env!`);
        providerMessage = smsData.error || 'Free daily SMS limit reached.';
      }
    } catch (carrierErr) {
      console.warn('[REAL CARRIER SMS ERROR]', carrierErr.message);
    }
  }

  return {
    phone,
    expiresInSeconds: 300,
    smsStatus,
    message: providerMessage
  };
}

/**
 * Verifies dynamic OTP code for a phone number.
 * @param {string} rawPhone 
 * @param {string} inputCode 
 * @returns {boolean}
 */
function verifyOTP(rawPhone, inputCode) {
  const phone = normalizePhone(rawPhone);
  if (!phone || !inputCode) {
    throw new Error('Phone number and OTP code are required.');
  }

  const record = otpStore.get(phone);
  if (!record) {
    throw new Error('No active OTP session found for this number. Please request a new verification code.');
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    throw new Error('Verification code has expired. Please request a new OTP code.');
  }

  if (record.attempts <= 0) {
    otpStore.delete(phone);
    throw new Error('Maximum verification attempts exceeded. Please request a new OTP code.');
  }

  const cleanInput = String(inputCode).trim();
  if (record.otp !== cleanInput) {
    record.attempts -= 1;
    if (record.attempts <= 0) {
      otpStore.delete(phone);
      throw new Error('Too many invalid attempts. Session locked. Please request a new OTP.');
    }
    throw new Error(`Invalid verification code. ${record.attempts} attempts remaining.`);
  }

  // Single-use guarantee: delete after successful verification
  otpStore.delete(phone);
  return true;
}

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  normalizePhone
};

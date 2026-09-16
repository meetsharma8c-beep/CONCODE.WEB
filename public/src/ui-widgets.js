/**
 * CONCODE Platform — Frontend UI Widget Library
 * File: public/src/ui-widgets.js
 * 
 * Provides client-side helpers for glassmorphism UI cards, badges, and notification toasts.
 */

(function (window) {
  const UIWidgets = {
    /**
     * Creates a glassmorphism card element.
     */
    createCard: function ({ title, text, icon = '', badgeText = '' }) {
      const card = document.createElement('div');
      card.className = 'glass-card-widget';
      card.style.cssText = `
        background: rgba(18, 24, 43, 0.75);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        padding: 1.5rem;
        color: #f0f4fc;
        transition: transform 0.2s ease;
      `;

      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
          <span style="font-size: 1.5rem;">${icon}</span>
          ${badgeText ? `<span style="font-size: 0.75rem; background: rgba(0, 240, 255, 0.15); color: #00f0ff; padding: 0.2rem 0.6rem; border-radius: 12px; border: 1px solid rgba(0, 240, 255, 0.4);">${badgeText}</span>` : ''}
        </div>
        <h3 style="margin-bottom: 0.5rem; font-size: 1.2rem; font-weight: 700;">${title}</h3>
        <p style="color: #8e9bb4; font-size: 0.9rem; line-height: 1.5;">${text}</p>
      `;

      return card;
    },

    /**
     * Displays a temporary notification toast.
     */
    showToast: function (message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = 'concode-toast';
      const bgColor = type === 'error' ? 'rgba(255, 0, 100, 0.9)' : 'rgba(0, 240, 255, 0.9)';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${bgColor};
        color: #070913;
        font-weight: 600;
        padding: 0.8rem 1.4rem;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        z-index: 10000;
        transition: opacity 0.3s ease;
      `;
      toast.innerText = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  };

  window.UIWidgets = UIWidgets;
})(window);

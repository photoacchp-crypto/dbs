/**
 * app.js
 * Inisialisasi umum tiap halaman: terapkan tema warna & info toko dari Settings
 * (bukan hardcode), dan tangani state loading/empty/error dasar.
 */

async function applyThemeFromSettings() {
  const res = await Api.get('settings');
  if (!res.success || !res.data) return;

  const s = res.data;
  const root = document.documentElement.style;
  if (s.PrimaryColor) root.setProperty('--primary', s.PrimaryColor);
  if (s.SecondaryColor) root.setProperty('--secondary', s.SecondaryColor);
  if (s.AccentColor) root.setProperty('--accent', s.AccentColor);

  document.querySelectorAll('[data-store-name]').forEach(el => {
    el.textContent = s.StoreName || el.textContent;
  });
  document.querySelectorAll('[data-store-footer]').forEach(el => {
    el.textContent = s.FooterText || '';
  });

  const waFloat = document.querySelector('.wa-float');
  if (waFloat && s.WhatsAppNumber) {
    const digits = String(s.WhatsAppNumber).replace(/[^0-9]/g, '');
    const normalized = digits.charAt(0) === '0' ? (s.WhatsAppCountryCode || '62') + digits.substring(1) : digits;
    const msg = encodeURIComponent(`Halo ${s.StoreName || 'Toko'}, saya ingin bertanya tentang produk.`);
    waFloat.href = `https://wa.me/${normalized}?text=${msg}`;
    waFloat.target = '_blank';
  }

  return s;
}

function formatCurrency(amount, currency = 'IDR') {
  if (amount === null || amount === undefined || amount === '') return 'N/A';
  const n = Number(amount);
  if (isNaN(n)) return 'N/A';
  if (currency === 'IDR') return 'Rp' + n.toLocaleString('id-ID');
  return n.toLocaleString('id-ID') + ' ' + currency;
}

/** Tampilkan salah satu dari state: loading | content | empty | error */
function setViewState(container, state) {
  container.querySelectorAll('[data-state]').forEach(el => {
    el.hidden = el.dataset.state !== state;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyThemeFromSettings();
});

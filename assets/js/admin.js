/**
 * admin.js
 * Dipakai di semua halaman admin-*.html (kecuali admin.html/login).
 */

const AdminAuth = {
  token: sessionStorage.getItem('admin_token'),
  username: sessionStorage.getItem('admin_username'),

  requireLogin() {
    if (!AdminAuth.token) {
      window.location.href = 'admin.html';
      throw new Error('redirecting');
    }
  },

  logout() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_username');
    window.location.href = 'admin.html';
  }
};

const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', href: 'admin-dashboard.html' },
  { key: 'products', label: 'Produk', href: 'admin-products.html' },
  { key: 'categories', label: 'Kategori', href: 'admin-categories.html' },
  { key: 'orders', label: 'Pesanan', href: 'admin-orders.html' },
  { key: 'import', label: 'Import Excel', href: 'admin-import.html' },
  { key: 'settings', label: 'Pengaturan', href: 'admin-settings.html' }
];

function renderAdminNav(activeKey) {
  const el = document.getElementById('admin-nav');
  if (!el) return;
  el.innerHTML = `
    <div class="container" style="display:flex;gap:4px;overflow-x:auto;">
      ${ADMIN_NAV_ITEMS.map(item => `
        <a href="${item.href}" class="admin-nav-link ${item.key === activeKey ? 'active' : ''}">${item.label}</a>
      `).join('')}
    </div>
  `;
}

// Panggil token pada setiap request admin: Api.post('...', { token: AdminAuth.token, ... })
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', AdminAuth.logout);
});

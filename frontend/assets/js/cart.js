/**
 * cart.js
 * Keranjang disimpan di localStorage (customer belum tentu login).
 * Struktur item: { key, productId, variantId, sku, productName, variantName,
 *                   price, image, quantity, selected, stock }
 * key = productId + ':' + (variantId || 'base')  → identitas unik baris cart.
 */

const CART_STORAGE_KEY = 'toko_cart_v1';

const Cart = {
  getAll() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[Cart] Gagal membaca cart, reset.', e);
      return [];
    }
  },

  _save(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    Cart._updateBadge();
  },

  add(item, qty = 1) {
    const items = Cart.getAll();
    const key = item.productId + ':' + (item.variantId || 'base');
    const existing = items.find(i => i.key === key);
    if (existing) {
      existing.quantity += qty;
    } else {
      items.push(Object.assign({ key, quantity: qty, selected: true }, item));
    }
    Cart._save(items);
  },

  updateQuantity(key, qty) {
    const items = Cart.getAll();
    const item = items.find(i => i.key === key);
    if (!item) return;
    item.quantity = Math.max(1, qty);
    if (item.stock !== undefined && item.stock !== null && item.stock !== '') {
      item.quantity = Math.min(item.quantity, Number(item.stock));
    }
    Cart._save(items);
  },

  remove(key) {
    Cart._save(Cart.getAll().filter(i => i.key !== key));
  },

  clear() {
    Cart._save([]);
  },

  setSelected(key, selected) {
    const items = Cart.getAll();
    const item = items.find(i => i.key === key);
    if (item) item.selected = selected;
    Cart._save(items);
  },

  setAllSelected(selected) {
    const items = Cart.getAll().map(i => Object.assign({}, i, { selected }));
    Cart._save(items);
  },

  totals(onlySelected = true) {
    const items = Cart.getAll().filter(i => !onlySelected || i.selected);
    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    return { subtotal, discount: 0, grandTotal: subtotal, itemCount: items.reduce((n, i) => n + i.quantity, 0) };
  },

  count() {
    return Cart.getAll().reduce((n, i) => n + i.quantity, 0);
  },

  _updateBadge() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      const count = Cart.count();
      el.textContent = count;
      el.hidden = count === 0;
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Cart._updateBadge());

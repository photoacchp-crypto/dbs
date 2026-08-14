/**
 * cart-page.js
 */

function renderCart() {
  const items = Cart.getAll();
  const emptyEl = document.getElementById('cart-empty');
  const contentEl = document.getElementById('cart-content');

  if (!items.length) {
    emptyEl.hidden = false;
    contentEl.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  contentEl.hidden = false;

  document.getElementById('cart-items').innerHTML = items.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <input type="checkbox" class="item-select" ${item.selected ? 'checked' : ''}>
      <img src="${item.image || ''}" alt="${escapeHtml(item.productName)}" onerror="this.style.visibility='hidden'">
      <div>
        <div class="name">${escapeHtml(item.productName)}</div>
        ${item.variantName ? `<div class="variant">${escapeHtml(item.variantName)}</div>` : ''}
        <div class="price">${formatCurrency(item.price)}</div>
      </div>
      <div class="qty-control">
        <button class="qty-minus" type="button">−</button>
        <input type="number" class="qty-value" value="${item.quantity}" min="1">
        <button class="qty-plus" type="button">+</button>
      </div>
      <button class="remove-btn">Hapus</button>
    </div>
  `).join('');

  document.getElementById('select-all').checked = items.every(i => i.selected);

  bindCartItemEvents();
  updateSummary();
}

function bindCartItemEvents() {
  document.querySelectorAll('.cart-item').forEach(el => {
    const key = el.dataset.key;

    el.querySelector('.item-select').addEventListener('change', (e) => {
      Cart.setSelected(key, e.target.checked);
      updateSummary();
      document.getElementById('select-all').checked = Cart.getAll().every(i => i.selected);
    });

    el.querySelector('.qty-minus').addEventListener('click', () => {
      const item = Cart.getAll().find(i => i.key === key);
      Cart.updateQuantity(key, item.quantity - 1);
      renderCart();
    });
    el.querySelector('.qty-plus').addEventListener('click', () => {
      const item = Cart.getAll().find(i => i.key === key);
      Cart.updateQuantity(key, item.quantity + 1);
      renderCart();
    });
    el.querySelector('.qty-value').addEventListener('change', (e) => {
      Cart.updateQuantity(key, Number(e.target.value) || 1);
      renderCart();
    });

    el.querySelector('.remove-btn').addEventListener('click', () => {
      Cart.remove(key);
      renderCart();
    });
  });
}

function updateSummary() {
  const totals = Cart.totals(true);
  document.getElementById('sum-subtotal').textContent = formatCurrency(totals.subtotal);
  document.getElementById('sum-discount').textContent = formatCurrency(totals.discount);
  document.getElementById('sum-total').textContent = formatCurrency(totals.grandTotal);
  document.getElementById('btn-checkout').disabled = totals.itemCount === 0;
}

document.getElementById('select-all').addEventListener('change', (e) => {
  Cart.setAllSelected(e.target.checked);
  renderCart();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('Kosongkan seluruh keranjang?')) {
    Cart.clear();
    renderCart();
  }
});

document.getElementById('btn-checkout').addEventListener('click', () => {
  const totals = Cart.totals(true);
  if (totals.itemCount === 0) { alert('Pilih minimal satu produk untuk checkout.'); return; }
  window.location.href = 'checkout.html';
});

document.addEventListener('DOMContentLoaded', renderCart);

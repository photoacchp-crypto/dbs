/**
 * checkout.js
 * Aturan wajib (section 31): order HARUS tersimpan dulu sebelum WhatsApp dibuka.
 * Jika API gagal menyimpan, JANGAN buka WhatsApp — tampilkan error saja.
 */

(function () {
  const selectedItems = Cart.getAll().filter(i => i.selected);

  if (!selectedItems.length) {
    window.location.href = 'cart.html';
    return;
  }

  function renderSummary() {
    document.getElementById('checkout-items').innerHTML = selectedItems.map(item => `
      <div class="summary-item">
        <span>${escapeHtml(item.productName)}${item.variantName ? ' (' + escapeHtml(item.variantName) + ')' : ''} x${item.quantity}</span>
        <span class="price">${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `).join('');

    const subtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    document.getElementById('co-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('co-total').textContent = formatCurrency(subtotal);
  }

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('checkout-error');
    errorEl.textContent = '';

    const customer = {
      name: document.getElementById('f-name').value.trim(),
      whatsapp: document.getElementById('f-whatsapp').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      city: document.getElementById('f-city').value.trim(),
      province: document.getElementById('f-province').value.trim(),
      postalCode: document.getElementById('f-postal').value.trim(),
      notes: document.getElementById('f-notes').value.trim()
    };

    if (!customer.name || !customer.whatsapp || !customer.address) {
      errorEl.textContent = 'Nama, WhatsApp, dan alamat wajib diisi.';
      return;
    }

    const items = selectedItems.map(i => ({
      productId: i.productId, variantId: i.variantId, sku: i.sku,
      productName: i.productName, variantName: i.variantName,
      price: i.price, quantity: i.quantity, image: i.image
    }));

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Menyimpan pesanan...';

    const res = await Api.post('createOrder', { customer, items });

    btn.disabled = false;
    btn.textContent = '🟢 Pesan via WhatsApp';

    if (!res.success) {
      // Order gagal tersimpan -> JANGAN buka WhatsApp.
      errorEl.textContent = 'Gagal menyimpan pesanan: ' + res.message + '. Silakan coba lagi.';
      return;
    }

    // Order tersimpan -> hapus item yang sudah dipesan dari cart, lalu buka WhatsApp.
    selectedItems.forEach(i => Cart.remove(i.key));
    window.location.href = res.data.waLink;
  });

  renderSummary();
})();

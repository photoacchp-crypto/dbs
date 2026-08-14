/**
 * product-detail.js
 * Catatan: model varian saat ini (mengikuti ImportService.gs Phase 2) adalah
 * SATU dimensi per SKU varian (mis. "Warna: Hitam"), bukan kombinasi independen
 * Warna x Ukuran terpisah. Jika nanti mapping Excel diperluas untuk multi-dimensi,
 * UI ini perlu diperbarui untuk menampilkan grup per dimensi.
 */

const ProductDetailPage = {
  product: null,
  selectedVariant: null, // null = pakai data produk induk (tidak ada varian dipilih)

  async init() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return ProductDetailPage.showNotFound();

    const res = await Api.get('product', { id });
    if (!res.success || !res.data) return ProductDetailPage.showNotFound();

    ProductDetailPage.product = res.data;
    ProductDetailPage.render();
    ProductDetailPage.bindEvents();
  },

  showNotFound() {
    document.getElementById('pd-loading').hidden = true;
    document.getElementById('pd-not-found').hidden = false;
  },

  render() {
    const p = ProductDetailPage.product;
    document.getElementById('pd-loading').hidden = true;
    document.getElementById('pd-content').hidden = false;
    document.getElementById('pd-details').hidden = false;

    document.getElementById('page-title').textContent = p.ProductName + ' — Toko Saya';
    document.getElementById('crumb-name').textContent = p.ProductName;
    document.getElementById('pd-name').textContent = p.ProductName;
    document.getElementById('pd-sold').textContent = `Terjual ${p.SoldCount || 0}+`;
    document.getElementById('pd-description').textContent = p.Description || 'Belum ada deskripsi.';

    // Gallery
    const images = (p.media && p.media.length) ? p.media.map(m => m.URL) : (p.CoverImage ? [p.CoverImage] : []);
    const mainImg = document.getElementById('gallery-main-img');
    mainImg.src = images[0] || '';
    document.getElementById('gallery-thumbs').innerHTML = images.map((url, i) =>
      `<img src="${url}" data-idx="${i}" class="${i === 0 ? 'active' : ''}">`
    ).join('');
    document.querySelectorAll('.gallery-thumbs img').forEach(img => {
      img.addEventListener('click', () => {
        mainImg.src = img.src;
        document.querySelectorAll('.gallery-thumbs img').forEach(i => i.classList.remove('active'));
        img.classList.add('active');
      });
    });

    // Variants
    if (p.variants && p.variants.length) {
      const groupLabel = p.variants[0].VariantName || 'Varian';
      document.getElementById('pd-variants').innerHTML = `
        <div class="variant-group">
          <h4>${escapeHtml(groupLabel)}</h4>
          <div class="variant-options">
            ${p.variants.map(v => `<div class="variant-chip" data-sku="${v.SKU}">${escapeHtml(v.VariantValue)}</div>`).join('')}
          </div>
        </div>
      `;
      document.querySelectorAll('.variant-chip').forEach(chip => {
        chip.addEventListener('click', () => ProductDetailPage.selectVariant(chip.dataset.sku));
      });
    }

    ProductDetailPage.updatePriceStockDisplay();

    // Shipping info (section 10 — jangan mengarang estimasi)
    const shippingEl = document.getElementById('pd-shipping');
    if (p.ShippingEstimate || p.ProcessingTime) {
      shippingEl.textContent = [p.ProcessingTime, p.ShippingEstimate].filter(Boolean).join(' · ');
    } else {
      shippingEl.textContent = 'Informasi pengiriman akan dikonfirmasi melalui WhatsApp.';
    }

    // Related products
    if (p.related && p.related.length) {
      document.getElementById('pd-related-wrap').hidden = false;
      document.getElementById('pd-related').innerHTML = p.related.map(renderProductCard).join('');
    }
  },

  selectVariant(sku) {
    const p = ProductDetailPage.product;
    ProductDetailPage.selectedVariant = p.variants.find(v => v.SKU === sku) || null;
    document.querySelectorAll('.variant-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.sku === sku);
    });
    ProductDetailPage.updatePriceStockDisplay();
  },

  currentData() {
    // Harga/stok/SKU/foto varian TIDAK BOLEH jatuh balik ke data induk kalau varian punya datanya sendiri.
    const p = ProductDetailPage.product;
    const v = ProductDetailPage.selectedVariant;
    if (v) {
      return {
        sku: v.SKU,
        price: (v.SalePrice && Number(v.SalePrice) > 0) ? Number(v.SalePrice) : Number(v.Price),
        originalPrice: Number(v.Price),
        hasDiscount: v.SalePrice && Number(v.SalePrice) > 0 && Number(v.SalePrice) < Number(v.Price),
        stock: Number(v.Stock) || 0,
        image: v.Image || p.CoverImage,
        variantName: `${v.VariantName}: ${v.VariantValue}`,
        variantId: v.ID
      };
    }
    return {
      sku: p.SKU,
      price: (p.SalePrice && Number(p.SalePrice) > 0) ? Number(p.SalePrice) : Number(p.Price),
      originalPrice: Number(p.Price),
      hasDiscount: p.SalePrice && Number(p.SalePrice) > 0 && Number(p.SalePrice) < Number(p.Price),
      stock: Number(p.Stock) || 0,
      image: p.CoverImage,
      variantName: '',
      variantId: ''
    };
  },

  updatePriceStockDisplay() {
    const d = ProductDetailPage.currentData();
    const priceOrig = document.getElementById('pd-price-original');
    const priceCurrent = document.getElementById('pd-price-current');
    if (d.hasDiscount) {
      priceOrig.hidden = false;
      priceOrig.textContent = formatCurrency(d.originalPrice);
    } else {
      priceOrig.hidden = true;
    }
    priceCurrent.textContent = formatCurrency(d.price);

    const stockEl = document.getElementById('pd-stock');
    stockEl.textContent = d.stock > 0 ? `Stok tersedia: ${d.stock}` : 'Stok habis';
    stockEl.style.color = d.stock > 0 ? 'var(--muted)' : 'var(--danger)';

    const qtyInput = document.getElementById('qty-input');
    qtyInput.max = d.stock;

    const addBtn = document.getElementById('btn-add-cart');
    const orderBtn = document.getElementById('btn-order-now');
    addBtn.disabled = d.stock === 0;
    if (d.stock === 0) { orderBtn.style.pointerEvents = 'none'; orderBtn.style.opacity = 0.5; }
    else { orderBtn.style.pointerEvents = ''; orderBtn.style.opacity = ''; }
  },

  bindEvents() {
    document.getElementById('qty-minus').addEventListener('click', () => {
      const input = document.getElementById('qty-input');
      input.value = Math.max(1, Number(input.value) - 1);
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      const input = document.getElementById('qty-input');
      const max = Number(input.max) || 999;
      input.value = Math.min(max, Number(input.value) + 1);
    });

    document.getElementById('btn-add-cart').addEventListener('click', () => {
      ProductDetailPage.addToCart();
      alert('Produk ditambahkan ke keranjang.');
    });

    document.getElementById('btn-order-now').addEventListener('click', (e) => {
      e.preventDefault();
      ProductDetailPage.addToCart();
      window.location.href = 'checkout.html';
    });
  },

  addToCart() {
    const p = ProductDetailPage.product;
    const d = ProductDetailPage.currentData();
    const qty = Number(document.getElementById('qty-input').value) || 1;
    Cart.add({
      productId: p.ID,
      variantId: d.variantId,
      sku: d.sku,
      productName: p.ProductName,
      variantName: d.variantName,
      price: d.price,
      image: d.image,
      stock: d.stock
    }, qty);
  }
};

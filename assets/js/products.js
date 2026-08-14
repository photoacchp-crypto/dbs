/**
 * products.js
 * Dipakai bersama oleh index.html (produk pilihan) dan shop.html (katalog penuh).
 */

function renderProductCard(p) {
  const hasDiscount = p.SalePrice && Number(p.SalePrice) > 0 && Number(p.SalePrice) < Number(p.Price);
  const displayPrice = hasDiscount ? p.SalePrice : (p.SalePrice || p.Price);
  const discountPct = hasDiscount ? Math.round((1 - Number(p.SalePrice) / Number(p.Price)) * 100) : 0;
  const img = p.CoverImage || '';

  return `
    <a href="product.html?id=${encodeURIComponent(p.ID)}" class="product-card">
      <div class="thumb">
        ${img ? `<img src="${img}" alt="${escapeHtml(p.ProductName)}" loading="lazy" onerror="this.style.display='none'">`
               : `<div class="skeleton" style="width:100%;height:100%;"></div>`}
      </div>
      <div class="body">
        <div class="name">${escapeHtml(p.ProductName)}</div>
        <div class="sold">Terjual ${p.SoldCount || 0}+</div>
        <div style="margin-top:6px;">
          ${hasDiscount ? `<span class="price-strike">${formatCurrency(p.Price)}</span>` : ''}
          <span class="price">${formatCurrency(displayPrice)}</span>
          ${hasDiscount ? `<span class="badge-discount">${discountPct}% OFF</span>` : ''}
        </div>
      </div>
    </a>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function loadFeaturedProducts(containerEl, params = {}) {
  containerEl.innerHTML = Array(4).fill('<div class="skeleton" style="aspect-ratio:1/1.4;"></div>').join('');
  const res = await Api.get('products', Object.assign({ sort: 'newest', pageSize: 8 }, params));
  if (!res.success || !res.data.items.length) {
    containerEl.innerHTML = `<p class="text-muted">Belum ada produk. Import data lewat Admin &gt; Import Data Shopee.</p>`;
    return;
  }
  containerEl.innerHTML = res.data.items.map(renderProductCard).join('');
}

/* ===================== Shop page (katalog penuh) ===================== */

const ShopPage = {
  state: { page: 1, q: '', category: '', brand: '', sort: 'newest', minPrice: '', maxPrice: '', promoOnly: false },

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('q')) ShopPage.state.q = urlParams.get('q');
    if (urlParams.get('category')) ShopPage.state.category = urlParams.get('category');

    await ShopPage.loadFilters();
    ShopPage.bindEvents();
    ShopPage.load();
  },

  async loadFilters() {
    const [catRes, brandRes] = await Promise.all([Api.get('categories'), Api.get('brands')]);
    const catSelect = document.getElementById('filter-category');
    if (catRes.success) {
      catRes.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.ID; opt.textContent = c.Name;
        if (c.ID === ShopPage.state.category) opt.selected = true;
        catSelect.appendChild(opt);
      });
    }
    const brandSelect = document.getElementById('filter-brand');
    if (brandRes.success) {
      brandRes.data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b; opt.textContent = b;
        brandSelect.appendChild(opt);
      });
    }
  },

  bindEvents() {
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.value = ShopPage.state.q;
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          ShopPage.state.q = e.target.value.trim();
          ShopPage.state.page = 1;
          ShopPage.load();
        }, 350);
      });
    }

    document.getElementById('filter-category').addEventListener('change', e => {
      ShopPage.state.category = e.target.value; ShopPage.state.page = 1; ShopPage.load();
    });
    document.getElementById('filter-brand').addEventListener('change', e => {
      ShopPage.state.brand = e.target.value; ShopPage.state.page = 1; ShopPage.load();
    });
    document.getElementById('sort-select').addEventListener('change', e => {
      ShopPage.state.sort = e.target.value; ShopPage.load();
    });
    document.getElementById('promo-only').addEventListener('change', e => {
      ShopPage.state.promoOnly = e.target.checked; ShopPage.state.page = 1; ShopPage.load();
    });
    document.getElementById('apply-price').addEventListener('click', () => {
      ShopPage.state.minPrice = document.getElementById('min-price').value;
      ShopPage.state.maxPrice = document.getElementById('max-price').value;
      ShopPage.state.page = 1;
      ShopPage.load();
    });
  },

  async load() {
    const grid = document.getElementById('product-grid');
    const emptyState = document.getElementById('empty-state');
    grid.hidden = false;
    emptyState.hidden = true;
    grid.innerHTML = Array(8).fill('<div class="skeleton" style="aspect-ratio:1/1.4;"></div>').join('');

    const res = await Api.get('products', ShopPage.state);
    if (!res.success) {
      grid.innerHTML = `<p class="text-muted">Gagal memuat produk: ${res.message}</p>`;
      return;
    }
    if (!res.data.items.length) {
      grid.hidden = true;
      emptyState.hidden = false;
      return;
    }
    grid.innerHTML = res.data.items.map(renderProductCard).join('');
    ShopPage.renderPagination(res.data);
  },

  renderPagination(data) {
    const el = document.getElementById('pagination');
    if (data.totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= data.totalPages; i++) {
      html += `<button class="btn ${i === data.page ? 'btn-primary' : 'btn-outline'}" data-page="${i}" style="padding:8px 14px;">${i}</button>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        ShopPage.state.page = Number(btn.dataset.page);
        ShopPage.load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }
};

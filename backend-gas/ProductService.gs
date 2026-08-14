/**
 * ProductService.gs
 * Phase 1: baca (list/detail). Phase 3: tambah search/filter/sort lengkap.
 * Phase 6: tambah fungsi admin (create/update/delete/list-all) di bagian bawah file.
 */

function listProducts_(params) {
  params = params || {};
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS)
    .filter(function (p) { return p.Status !== 'Inactive'; });

  if (params.category) {
    products = products.filter(function (p) { return p.CategoryID === params.category; });
  }
  if (params.brand) {
    products = products.filter(function (p) { return p.Brand === params.brand; });
  }
  if (params.minPrice) {
    var minP = Number(params.minPrice);
    products = products.filter(function (p) { return effectivePrice_(p) >= minP; });
  }
  if (params.maxPrice) {
    var maxP = Number(params.maxPrice);
    products = products.filter(function (p) { return effectivePrice_(p) <= maxP; });
  }
  if (params.promoOnly === 'true' || params.promoOnly === true) {
    products = products.filter(function (p) { return !isBlank_(p.SalePrice) && Number(p.SalePrice) > 0; });
  }
  if (params.q) {
    var q = String(params.q).toLowerCase();
    products = products.filter(function (p) {
      return String(p.ProductName || '').toLowerCase().indexOf(q) !== -1 ||
        String(p.SKU || '').toLowerCase().indexOf(q) !== -1 ||
        String(p.Brand || '').toLowerCase().indexOf(q) !== -1 ||
        String(p.Description || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  products = sortProducts_(products, params.sort);

  var page = Number(params.page) || 1;
  var pageSize = Number(params.pageSize) || 20;
  var start = (page - 1) * pageSize;
  var paged = products.slice(start, start + pageSize);

  return {
    items: paged,
    total: products.length,
    page: page,
    pageSize: pageSize,
    totalPages: Math.max(1, Math.ceil(products.length / pageSize))
  };
}

function effectivePrice_(p) {
  if (!isBlank_(p.SalePrice) && Number(p.SalePrice) > 0) return Number(p.SalePrice);
  return Number(p.Price) || 0;
}

function sortProducts_(products, sortKey) {
  var copy = products.slice();
  switch (sortKey) {
    case 'price_low':
      return copy.sort(function (a, b) { return effectivePrice_(a) - effectivePrice_(b); });
    case 'price_high':
      return copy.sort(function (a, b) { return effectivePrice_(b) - effectivePrice_(a); });
    case 'best_seller':
      return copy.sort(function (a, b) { return (Number(b.SoldCount) || 0) - (Number(a.SoldCount) || 0); });
    case 'name_az':
      return copy.sort(function (a, b) { return String(a.ProductName).localeCompare(String(b.ProductName)); });
    case 'newest':
    default:
      return copy.sort(function (a, b) { return new Date(b.CreatedAt) - new Date(a.CreatedAt); });
  }
}

function getProductById_(id) {
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS);
  var product = products.filter(function (p) { return String(p.ID) === String(id); })[0];
  if (!product) return null;

  var variants = readSheetAsObjects_(SHEET_NAMES.VARIANTS)
    .filter(function (v) { return String(v.ProductID) === String(id); });
  var media = readSheetAsObjects_(SHEET_NAMES.MEDIA)
    .filter(function (m) { return String(m.ProductID) === String(id); })
    .sort(function (a, b) { return (a.SortOrder || 0) - (b.SortOrder || 0); });

  product.variants = variants;
  product.media = media;

  var related = products.filter(function (p) {
    return p.ID !== product.ID && p.CategoryID === product.CategoryID && p.Status !== 'Inactive';
  }).slice(0, 8);
  product.related = related;

  return product;
}

function listCategories_() {
  return readSheetAsObjects_(SHEET_NAMES.CATEGORIES)
    .filter(function (c) { return c.Status !== 'Inactive'; });
}

function listBrands_() {
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS);
  var brands = {};
  products.forEach(function (p) { if (p.Brand) brands[p.Brand] = true; });
  return Object.keys(brands).sort();
}

/* =========================================================
   ADMIN (Phase 6) — semua butuh requireAuth_(token) di Api.gs
   ========================================================= */

function adminListProducts_(params) {
  params = params || {};
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS);
  if (params.status) products = products.filter(function (p) { return p.Status === params.status; });
  if (params.q) {
    var q = String(params.q).toLowerCase();
    products = products.filter(function (p) {
      return String(p.ProductName || '').toLowerCase().indexOf(q) !== -1 ||
        String(p.SKU || '').toLowerCase().indexOf(q) !== -1;
    });
  }
  return { items: products, total: products.length };
}

function adminUpdateProduct_(id, patch) {
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS);
  var idx = -1;
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].ID) === String(id)) { idx = i; break; }
  }
  if (idx === -1) throw new Error('Produk tidak ditemukan');

  var allowedFields = ['ProductName', 'Price', 'OriginalPrice', 'SalePrice', 'Stock',
    'Status', 'CategoryID', 'Brand', 'Description', 'CoverImage'];
  allowedFields.forEach(function (f) {
    if (patch[f] !== undefined) products[idx][f] = patch[f];
  });
  products[idx].UpdatedAt = nowIso_();

  writeSheetObjects_(SHEET_NAMES.PRODUCTS, products);
  return products[idx];
}

function adminSetProductStatus_(id, status) {
  return adminUpdateProduct_(id, { Status: status });
}

function adminDeleteProduct_(id) {
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS)
    .filter(function (p) { return String(p.ID) !== String(id); });
  writeSheetObjects_(SHEET_NAMES.PRODUCTS, products);
  return { deleted: true };
}

/**
 * ImportService.gs — Phase 2: Import Engine
 *
 * Asumsi yang didokumentasikan (belum bisa diverifikasi tanpa contoh file Excel
 * asli dari akun Shopee pengguna — nama kolom bisa berbeda antar versi/negara):
 *   - SHOPEE_HEADER_ALIASES di bawah adalah tebakan terbaik untuk nama kolom
 *     export Shopee versi Indonesia yang umum dipakai.
 *   - Setiap BARIS di file dianggap mewakili satu SKU (produk sederhana ATAU
 *     satu kombinasi varian). Ini menangani format "flat, 1 baris = 1 SKU"
 *     yang paling umum. Jika contoh file asli menunjukkan struktur induk/anak
 *     yang berbeda, mapping ini perlu disesuaikan — JANGAN diasumsikan benar
 *     100% sebelum diuji dengan file asli pengguna.
 *   - Kolom yang tidak dikenali TIDAK dibuang — dicatat di 'unknownHeaders'
 *     agar kelihatan di preview, sesuai section 7: "data yang belum memiliki
 *     field tujuan harus dapat disimpan sebagai metadata jika diperlukan."
 */

var SHOPEE_HEADER_ALIASES = {
  product_id:        ['product id', 'id produk'],
  sku:               ['sku', 'sku induk', 'nomor referensi sku', 'kode sku'],
  product_name:      ['nama produk', 'nama', 'product name'],
  brand:             ['merek', 'brand'],
  category:          ['kategori', 'category'],
  subcategory:       ['subkategori', 'sub kategori'],
  description:       ['deskripsi produk', 'deskripsi', 'description'],
  status:            ['status produk', 'status'],
  variant_name:      ['nama variasi', 'tipe variasi 1', 'variasi 1'],
  variant_value:     ['pilihan variasi', 'pilihan', 'opsi variasi 1'],
  variant_sku:       ['sku variasi', 'kode variasi'],
  price:             ['harga'],
  original_price:    ['harga coret', 'harga asli'],
  sale_price:        ['harga promo', 'harga diskon'],
  stock:             ['stok', 'stock'],
  sales_status:      ['status penjualan'],
  sold_count:        ['jumlah terjual', 'terjual'],
  weight:            ['berat produk', 'berat'],
  length:            ['panjang produk', 'panjang'],
  width:             ['lebar produk', 'lebar'],
  height:            ['tinggi produk', 'tinggi'],
  shipping_type:     ['jenis pengiriman'],
  shipping_options:  ['opsi pengiriman'],
  processing_time:   ['waktu proses', 'waktu pemrosesan'],
  dispatch_time:     ['waktu pengiriman'],
  shipping_estimate: ['estimasi pengiriman'],
  cover_image:       ['gambar utama', 'foto utama', 'gambar sampul'],
  video_url:         ['video', 'tautan video', 'url video']
};

/** Petakan array header mentah -> { rawHeader: targetField|null }. */
function buildFieldMap_(rawHeaders) {
  var map = {};
  var unknown = [];

  rawHeaders.forEach(function (raw) {
    var norm = normalizeHeader_(raw);
    var matched = null;

    Object.keys(SHOPEE_HEADER_ALIASES).some(function (target) {
      if (SHOPEE_HEADER_ALIASES[target].indexOf(norm) !== -1) {
        matched = target;
        return true;
      }
      return false;
    });

    // Deteksi kolom galeri "gambar produk N" / "foto produk N" secara generik.
    if (!matched && /^(gambar|foto)( produk)? ?\d+$/.test(norm)) {
      matched = 'gallery_image';
    }

    if (matched) {
      map[raw] = matched;
    } else {
      unknown.push(raw);
    }
  });

  return { fieldMap: map, unknownHeaders: unknown };
}

/** Ambil nilai field target dari satu baris mentah, pakai fieldMap. */
function extractRowFields_(rawRow, fieldMap) {
  var out = { gallery_images: [] };
  Object.keys(rawRow).forEach(function (rawHeader) {
    var target = fieldMap[rawHeader];
    if (!target) return;
    if (target === 'gallery_image') {
      if (!isBlank_(rawRow[rawHeader])) out.gallery_images.push(rawRow[rawHeader]);
    } else {
      out[target] = rawRow[rawHeader];
    }
  });
  return out;
}

/**
 * Validasi + petakan satu baris menjadi { product, variant, media, issues, level }
 * level: 'valid' | 'warning' | 'error'
 */
function validateAndMapRow_(fields, seenSkus) {
  var issues = [];
  var level = 'valid';

  function addIssue(lvl, msg) {
    issues.push({ level: lvl, message: msg });
    if (lvl === 'error') level = 'error';
    else if (lvl === 'warning' && level !== 'error') level = 'warning';
  }

  var sku = String(fields.sku || '').trim();
  var name = String(fields.product_name || '').trim();
  var price = toNumberOrNull_(fields.sale_price) || toNumberOrNull_(fields.price) || toNumberOrNull_(fields.original_price);

  if (!sku) addIssue('error', 'SKU kosong');
  if (!name) addIssue('error', 'Nama produk kosong');
  if (price === null || price < 0) addIssue('error', 'Harga tidak valid');
  if (sku && seenSkus[sku]) addIssue('error', 'SKU duplicate di dalam file: ' + sku);
  if (sku) seenSkus[sku] = true;

  var stock = toNumberOrNull_(fields.stock);
  if (stock === null) { addIssue('warning', 'Stok tidak tercantum, default 0'); stock = 0; }

  if (!fields.category) addIssue('warning', 'Tidak memiliki kategori');

  var mediaUrls = [];
  if (fields.cover_image) mediaUrls.push(fields.cover_image);
  (fields.gallery_images || []).forEach(function (u) { mediaUrls.push(u); });
  var validMedia = mediaUrls.filter(isValidUrl_);
  if (mediaUrls.length && validMedia.length < mediaUrls.length) {
    addIssue('warning', (mediaUrls.length - validMedia.length) + ' URL gambar tidak valid, dilewati');
  }
  if (!validMedia.length) addIssue('warning', 'Tidak memiliki foto');

  if (level === 'error') {
    return { level: level, issues: issues, sku: sku };
  }

  var isVariantRow = !!(fields.variant_name && fields.variant_value);

  var product = {
    SKU: sku,
    ProductName: name,
    Slug: slugify_(name) + '-' + sku.toLowerCase(),
    Brand: fields.brand || '',
    CategoryID: fields.category || '',
    SubCategoryID: fields.subcategory || '',
    Description: fields.description || '',
    Price: price,
    OriginalPrice: toNumberOrNull_(fields.original_price) || '',
    SalePrice: toNumberOrNull_(fields.sale_price) || '',
    Stock: stock,
    SoldCount: toNumberOrNull_(fields.sold_count) || 0,
    Status: fields.status || 'Active',
    Weight: toNumberOrNull_(fields.weight) || '',
    Length: toNumberOrNull_(fields.length) || '',
    Width: toNumberOrNull_(fields.width) || '',
    Height: toNumberOrNull_(fields.height) || '',
    ProcessingTime: fields.processing_time || '',
    ShippingEstimate: fields.shipping_estimate || '',
    CoverImage: validMedia[0] || '',
    VideoURL: fields.video_url || '',
    Source: 'Shopee Excel',
    UpdatedAt: nowIso_()
  };

  var variant = null;
  if (isVariantRow) {
    variant = {
      SKU: fields.variant_sku || (sku + '-' + slugify_(fields.variant_value)),
      VariantName: fields.variant_name,
      VariantValue: fields.variant_value,
      Price: price,
      OriginalPrice: toNumberOrNull_(fields.original_price) || '',
      SalePrice: toNumberOrNull_(fields.sale_price) || '',
      Stock: stock,
      Status: fields.status || 'Active',
      UpdatedAt: nowIso_()
      // ProductID diisi setelah ID produk induk diketahui (lihat commitImport_).
    };
  }

  return {
    level: level, issues: issues, sku: sku,
    product: product, variant: variant, mediaUrls: validMedia
  };
}

/**
 * Preview saja — TIDAK menulis apa pun ke Spreadsheet.
 * rawRows: array of object (header asli -> value), dari SheetJS di frontend.
 */
function previewImport_(rawRows, rawHeaders) {
  var mapResult = buildFieldMap_(rawHeaders);
  var seenSkus = {};
  var mapped = rawRows.map(function (row) {
    var fields = extractRowFields_(row, mapResult.fieldMap);
    return validateAndMapRow_(fields, seenSkus);
  });

  var validCount = mapped.filter(function (r) { return r.level === 'valid'; }).length;
  var warningCount = mapped.filter(function (r) { return r.level === 'warning'; }).length;
  var errorCount = mapped.filter(function (r) { return r.level === 'error'; }).length;

  var previewRows = mapped.slice(0, 50).map(function (r) {
    return {
      sku: r.sku,
      productName: r.product ? r.product.ProductName : '',
      category: r.product ? r.product.CategoryID : '',
      price: r.product ? r.product.Price : null,
      stock: r.product ? r.product.Stock : null,
      hasVariant: !!r.variant,
      mediaCount: r.mediaUrls ? r.mediaUrls.length : 0,
      level: r.level,
      issues: r.issues.map(function (i) { return i.message; })
    };
  });

  return {
    totalRows: rawRows.length,
    detectedGroups: {
      informasiDasar: true,
      informasiPenjualan: rawHeaders.some(function (h) { return SHOPEE_HEADER_ALIASES.price.indexOf(normalizeHeader_(h)) !== -1; }),
      informasiPengiriman: rawHeaders.some(function (h) { return SHOPEE_HEADER_ALIASES.weight.indexOf(normalizeHeader_(h)) !== -1; }),
      informasiDikirimDalam: rawHeaders.some(function (h) { return SHOPEE_HEADER_ALIASES.processing_time.indexOf(normalizeHeader_(h)) !== -1; }),
      informasiMedia: rawHeaders.some(function (h) { return SHOPEE_HEADER_ALIASES.cover_image.indexOf(normalizeHeader_(h)) !== -1; })
    },
    unknownHeaders: mapResult.unknownHeaders,
    summary: { valid: validCount, warning: warningCount, error: errorCount },
    previewRows: previewRows
  };
}

/**
 * Commit — menulis ke Spreadsheet. Baris ERROR SELALU dilewati (sesuai
 * section 22: pilihan user hanya "import valid saja" atau "batalkan").
 */
function commitImport_(rawRows, rawHeaders, mode, fileName) {
  if (['update_only', 'merge', 'replace'].indexOf(mode) === -1) {
    throw new Error('Mode import tidak valid: ' + mode);
  }

  var startedAt = nowIso_();
  var mapResult = buildFieldMap_(rawHeaders);
  var seenSkus = {};
  var mapped = rawRows.map(function (row) {
    var fields = extractRowFields_(row, mapResult.fieldMap);
    return validateAndMapRow_(fields, seenSkus);
  });

  var okRows = mapped.filter(function (r) { return r.level !== 'error'; });
  var failedRows = mapped.length - okRows.length;

  // Pastikan tiap produk punya ID stabil: gunakan SKU sebagai basis ID
  // supaya import berulang untuk SKU yang sama tidak membuat ID baru.
  var existingProducts = readSheetAsObjects_(SHEET_NAMES.PRODUCTS);
  var idBySku = {};
  existingProducts.forEach(function (p) { idBySku[p.SKU] = p.ID; });

  var products = [];
  var variants = [];
  var mediaRows = [];

  okRows.forEach(function (r) {
    var productId = idBySku[r.product.SKU] || generateId_('PRD');
    idBySku[r.product.SKU] = productId;
    var productToSave = Object.assign({ ID: productId, CreatedAt: nowIso_(), SourceFile: fileName, LastImportedAt: startedAt }, r.product);
    products.push(productToSave);

    if (r.variant) {
      variants.push(Object.assign({ ID: generateId_('VAR'), ProductID: productId, CreatedAt: nowIso_() }, r.variant));
    }

    (r.mediaUrls || []).forEach(function (url, i) {
      mediaRows.push({
        ID: 'MEDIA_' + productId + '_' + i, // deterministik agar re-import upsert, bukan duplicate
        ProductID: productId,
        VariantID: '',
        Type: 'image',
        URL: url,
        DriveFileID: '',
        AltText: r.product.ProductName,
        SortOrder: i,
        Status: 'Active',
        CreatedAt: nowIso_()
      });
    });
  });

  var productResult = upsertByKey_(SHEET_NAMES.PRODUCTS, products, 'SKU', mode);
  var variantResult = variants.length
    ? upsertByKey_(SHEET_NAMES.VARIANTS, variants, 'SKU', mode === 'replace' ? 'merge' : mode)
    : { newRows: 0, updatedRows: 0, skippedRows: 0 };
  var mediaResult = mediaRows.length
    ? upsertByKey_(SHEET_NAMES.MEDIA, mediaRows, 'ID', 'merge')
    : { newRows: 0, updatedRows: 0, skippedRows: 0 };

  var completedAt = nowIso_();
  var errorSummary = mapped
    .filter(function (r) { return r.level === 'error'; })
    .slice(0, 20)
    .map(function (r) { return (r.sku || '(tanpa SKU)') + ': ' + r.issues.map(function (i) { return i.message; }).join(', '); })
    .join(' | ');

  appendRow_(SHEET_NAMES.IMPORT_LOGS, {
    ID: generateId_('LOG'),
    FileName: fileName,
    ImportType: mode,
    TotalRows: rawRows.length,
    SuccessRows: okRows.length,
    FailedRows: failedRows,
    UpdatedRows: productResult.updatedRows,
    NewRows: productResult.newRows,
    StartedAt: startedAt,
    CompletedAt: completedAt,
    Status: 'Completed',
    ErrorSummary: errorSummary
  });

  return {
    totalRows: rawRows.length,
    successRows: okRows.length,
    failedRows: failedRows,
    products: productResult,
    variants: variantResult,
    media: mediaResult
  };
}

/**
 * Api.gs
 * Router tunggal untuk semua request. Frontend memanggil satu Web App URL
 * dengan parameter ?action=...
 */

var ADMIN_GET_ACTIONS = ['dashboardStats', 'adminProducts', 'adminCategoriesAll',
  'adminOrders', 'orderDetail', 'importLogs', 'productMedia'];

function routeGet_(action, params) {
  if (ADMIN_GET_ACTIONS.indexOf(action) !== -1) {
    requireAuth_(params.token);
  }

  switch (action) {
    case 'products':
      return jsonSuccess_(listProducts_(params));
    case 'product':
      var product = getProductById_(params.id);
      return product ? jsonSuccess_(product) : jsonError_('Produk tidak ditemukan', 'NOT_FOUND');
    case 'categories':
      return jsonSuccess_(listCategories_());
    case 'brands':
      return jsonSuccess_(listBrands_());
    case 'search':
      return jsonSuccess_(listProducts_(params));
    case 'settings':
      return jsonSuccess_(getSettings_());

    // ---- Admin (Phase 6) ----
    case 'dashboardStats':
      return jsonSuccess_(getDashboardStats_());
    case 'adminProducts':
      return jsonSuccess_(adminListProducts_(params));
    case 'adminCategoriesAll':
      return jsonSuccess_(adminListCategoriesAll_());
    case 'adminOrders':
      return jsonSuccess_(adminListOrders_(params));
    case 'orderDetail':
      var detail = adminGetOrderDetail_(params.id);
      return detail ? jsonSuccess_(detail) : jsonError_('Order tidak ditemukan', 'NOT_FOUND');
    case 'importLogs':
      return jsonSuccess_(readSheetAsObjects_(SHEET_NAMES.IMPORT_LOGS)
        .sort(function (a, b) { return new Date(b.StartedAt) - new Date(a.StartedAt); }));
    case 'productMedia':
      return jsonSuccess_(adminListMedia_(params.productId));

    default:
      return jsonError_('Action tidak dikenal: ' + action, 'UNKNOWN_ACTION');
  }
}

var ADMIN_POST_ACTIONS = ['updateSettings', 'previewImport', 'importProducts',
  'adminUpdateProduct', 'adminSetProductStatus', 'adminDeleteProduct',
  'adminCreateCategory', 'adminUpdateCategory', 'adminDeleteCategory',
  'adminUpdateOrderStatus', 'adminAddMedia', 'adminDeleteMedia',
  'adminSetCoverImage', 'adminReorderMedia'];

function routePost_(action, body) {
  if (ADMIN_POST_ACTIONS.indexOf(action) !== -1) {
    requireAuth_(body.token);
  }

  switch (action) {
    case 'login':
      var result = adminLogin_(body.username, body.password);
      return result.success ? jsonSuccess_(result) : jsonError_(result.message, 'AUTH_FAILED');

    case 'updateSettings':
      return jsonSuccess_(updateSettings_(body.settings));

    case 'previewImport':
      return jsonSuccess_(previewImport_(body.rows, body.headers));
    case 'importProducts':
      return jsonSuccess_(commitImport_(body.rows, body.headers, body.mode, body.fileName));

    case 'createOrder':
      return jsonSuccess_(createOrder_(body.customer, body.items));

    // ---- Admin product management ----
    case 'adminUpdateProduct':
      return jsonSuccess_(adminUpdateProduct_(body.id, body.patch));
    case 'adminSetProductStatus':
      return jsonSuccess_(adminSetProductStatus_(body.id, body.status));
    case 'adminDeleteProduct':
      return jsonSuccess_(adminDeleteProduct_(body.id));

    // ---- Admin categories ----
    case 'adminCreateCategory':
      return jsonSuccess_(adminCreateCategory_(body.data));
    case 'adminUpdateCategory':
      return jsonSuccess_(adminUpdateCategory_(body.id, body.patch));
    case 'adminDeleteCategory':
      return jsonSuccess_(adminDeleteCategory_(body.id));

    // ---- Admin orders ----
    case 'adminUpdateOrderStatus':
      return jsonSuccess_(adminUpdateOrderStatus_(body.id, body.status));

    // ---- Admin media ----
    case 'adminAddMedia':
      return jsonSuccess_(adminAddMedia_(body.productId, body.url, body.altText));
    case 'adminDeleteMedia':
      return jsonSuccess_(adminDeleteMedia_(body.mediaId));
    case 'adminSetCoverImage':
      return jsonSuccess_(adminSetCoverImage_(body.productId, body.url));
    case 'adminReorderMedia':
      return jsonSuccess_(adminReorderMedia_(body.productId, body.orderedMediaIds));

    default:
      return jsonError_('Action tidak dikenal: ' + action, 'UNKNOWN_ACTION');
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (!action) return jsonError_('Parameter action wajib diisi', 'MISSING_ACTION');
    return routeGet_(action, e.parameter);
  } catch (err) {
    return jsonError_(err.message, err.name === 'AuthError' ? 'AUTH_ERROR' : 'SERVER_ERROR');
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = e.parameter.action || body.action;
    if (!action) return jsonError_('Parameter action wajib diisi', 'MISSING_ACTION');
    return routePost_(action, body);
  } catch (err) {
    return jsonError_(err.message, err.name === 'AuthError' ? 'AUTH_ERROR' : 'SERVER_ERROR');
  }
}

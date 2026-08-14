/**
 * OrderService.gs
 */

function generateOrderNumber_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyyMMdd');
    var orders = readSheetAsObjects_(SHEET_NAMES.ORDERS);
    var todayPrefix = 'ORD-' + today + '-';
    var countToday = orders.filter(function (o) {
      return String(o.OrderNumber || '').indexOf(todayPrefix) === 0;
    }).length;
    var seq = String(countToday + 1).padStart(4, '0');
    return todayPrefix + seq;
  } finally {
    lock.releaseLock();
  }
}

function findOrCreateCustomer_(customerData) {
  var customers = readSheetAsObjects_(SHEET_NAMES.CUSTOMERS);
  var waNumber = normalizeWhatsAppNumber_(customerData.whatsapp, '62');
  var existing = customers.filter(function (c) { return c.WhatsApp === waNumber; })[0];

  if (existing) {
    existing.Name = customerData.name || existing.Name;
    existing.Address = customerData.address || existing.Address;
    existing.City = customerData.city || existing.City;
    existing.Province = customerData.province || existing.Province;
    existing.PostalCode = customerData.postalCode || existing.PostalCode;
    existing.UpdatedAt = nowIso_();
    writeSheetObjects_(SHEET_NAMES.CUSTOMERS, customers);
    return existing;
  }

  var newCustomer = {
    ID: generateId_('CUST'),
    Name: customerData.name,
    WhatsApp: waNumber,
    Email: customerData.email || '',
    Address: customerData.address || '',
    City: customerData.city || '',
    Province: customerData.province || '',
    PostalCode: customerData.postalCode || '',
    Notes: customerData.notes || '',
    CreatedAt: nowIso_(),
    UpdatedAt: nowIso_()
  };
  appendRow_(SHEET_NAMES.CUSTOMERS, newCustomer);
  return newCustomer;
}

/**
 * items: [{ productId, variantId, sku, productName, variantName, price, quantity, image }]
 * customerData: { name, whatsapp, address, city, province, postalCode, notes }
 * Order HARUS tersimpan dulu sebelum WhatsApp dibuka (section 31) — makanya
 * fungsi ini hanya menyimpan & mengembalikan link WA; membuka WA dilakukan di frontend.
 */
function createOrder_(customerData, items) {
  if (!customerData || !customerData.name || !customerData.whatsapp) {
    throw new Error('Nama dan nomor WhatsApp wajib diisi');
  }
  if (!items || !items.length) {
    throw new Error('Keranjang kosong');
  }

  var customer = findOrCreateCustomer_(customerData);

  var subtotal = 0;
  items.forEach(function (it) { subtotal += Number(it.price) * Number(it.quantity); });
  var discount = 0;
  var shippingCost = 0;
  var grandTotal = subtotal - discount + shippingCost;

  var orderNumber = generateOrderNumber_();
  var orderId = generateId_('ORD');
  var settings = getSettings_();

  var order = {
    ID: orderId,
    OrderNumber: orderNumber,
    CustomerID: customer.ID,
    CustomerName: customerData.name,
    WhatsApp: customer.WhatsApp,
    Subtotal: subtotal,
    Discount: discount,
    ShippingCost: shippingCost,
    GrandTotal: grandTotal,
    PaymentMethod: 'WhatsApp Order',
    Status: ORDER_STATUS.PENDING,
    Notes: customerData.notes || '',
    WhatsAppMessage: '',
    CreatedAt: nowIso_(),
    UpdatedAt: nowIso_()
  };

  var orderItems = items.map(function (it) {
    return {
      ID: generateId_('OI'),
      OrderID: orderId,
      ProductID: it.productId || '',
      VariantID: it.variantId || '',
      SKU: it.sku || '',
      ProductName: it.productName || '',
      VariantName: it.variantName || '',
      Price: Number(it.price),
      Quantity: Number(it.quantity),
      Subtotal: Number(it.price) * Number(it.quantity),
      Image: it.image || '',
      CreatedAt: nowIso_()
    };
  });

  var message = buildWhatsAppMessage_(order, orderItems, customerData, settings);
  order.WhatsAppMessage = message;

  appendRow_(SHEET_NAMES.ORDERS, order);
  orderItems.forEach(function (oi) { appendRow_(SHEET_NAMES.ORDER_ITEMS, oi); });

  var waLink = buildWhatsAppLink_(settings.WhatsAppNumber, settings.WhatsAppCountryCode, message);

  return { order: order, waLink: waLink };
}

/* =========================================================
   ADMIN (Phase 6)
   ========================================================= */

function adminListOrders_(params) {
  params = params || {};
  var orders = readSheetAsObjects_(SHEET_NAMES.ORDERS)
    .sort(function (a, b) { return new Date(b.CreatedAt) - new Date(a.CreatedAt); });
  if (params.status) orders = orders.filter(function (o) { return o.Status === params.status; });
  return { items: orders, total: orders.length };
}

function adminGetOrderDetail_(orderId) {
  var orders = readSheetAsObjects_(SHEET_NAMES.ORDERS);
  var order = orders.filter(function (o) { return String(o.ID) === String(orderId); })[0];
  if (!order) return null;
  order.items = readSheetAsObjects_(SHEET_NAMES.ORDER_ITEMS)
    .filter(function (oi) { return String(oi.OrderID) === String(orderId); });
  return order;
}

function adminUpdateOrderStatus_(orderId, status) {
  var validStatuses = Object.keys(ORDER_STATUS).map(function (k) { return ORDER_STATUS[k]; });
  if (validStatuses.indexOf(status) === -1) throw new Error('Status tidak valid: ' + status);

  var orders = readSheetAsObjects_(SHEET_NAMES.ORDERS);
  var idx = -1;
  for (var i = 0; i < orders.length; i++) {
    if (String(orders[i].ID) === String(orderId)) { idx = i; break; }
  }
  if (idx === -1) throw new Error('Order tidak ditemukan');

  orders[idx].Status = status;
  orders[idx].UpdatedAt = nowIso_();
  writeSheetObjects_(SHEET_NAMES.ORDERS, orders);
  return orders[idx];
}

function getDashboardStats_() {
  var products = readSheetAsObjects_(SHEET_NAMES.PRODUCTS);
  var orders = readSheetAsObjects_(SHEET_NAMES.ORDERS);
  var categories = readSheetAsObjects_(SHEET_NAMES.CATEGORIES);
  var importLogs = readSheetAsObjects_(SHEET_NAMES.IMPORT_LOGS)
    .sort(function (a, b) { return new Date(b.StartedAt) - new Date(a.StartedAt); })
    .slice(0, 5);

  var recentOrders = orders
    .sort(function (a, b) { return new Date(b.CreatedAt) - new Date(a.CreatedAt); })
    .slice(0, 10);

  var lowStock = products
    .filter(function (p) { return Number(p.Stock) > 0 && Number(p.Stock) <= 5; })
    .slice(0, 10);

  return {
    totalProducts: products.length,
    activeProducts: products.filter(function (p) { return p.Status !== 'Inactive'; }).length,
    outOfStockProducts: products.filter(function (p) { return Number(p.Stock) === 0; }).length,
    totalCategories: categories.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(function (o) { return o.Status === ORDER_STATUS.PENDING; }).length,
    completedOrders: orders.filter(function (o) { return o.Status === ORDER_STATUS.COMPLETED; }).length,
    recentOrders: recentOrders,
    lowStock: lowStock,
    recentImports: importLogs
  };
}

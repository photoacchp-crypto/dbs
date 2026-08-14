/**
 * WhatsAppService.gs
 * Nomor WhatsApp SELALU dari Settings (lihat SettingsService.gs) — tidak pernah hardcode di sini.
 */

function buildWhatsAppMessage_(order, orderItems, customerData, settings) {
  var productList = orderItems.map(function (it) {
    var line = '- ' + it.ProductName;
    if (it.VariantName) line += ' (' + it.VariantName + ')';
    line += ' x' + it.Quantity + ' = ' + formatIdr_(it.Subtotal);
    return line;
  }).join('\n');

  var template =
    'Halo {{STORE_NAME}}, saya ingin melakukan pemesanan.\n\n' +
    'DETAIL PESANAN\n' +
    '-------------------------\n' +
    'Order: {{ORDER_NUMBER}}\n\n' +
    '{{PRODUCT_LIST}}\n\n' +
    'Subtotal: {{SUBTOTAL}}\n' +
    'Diskon: {{DISCOUNT}}\n' +
    'Total: {{GRAND_TOTAL}}\n\n' +
    'DATA PEMBELI\n' +
    '-------------------------\n' +
    'Nama: {{CUSTOMER_NAME}}\n' +
    'WhatsApp: {{WHATSAPP}}\n' +
    'Alamat: {{ADDRESS}}\n' +
    'Kota: {{CITY}}\n' +
    'Provinsi: {{PROVINCE}}\n' +
    'Kode Pos: {{POSTAL_CODE}}\n\n' +
    'Catatan:\n{{NOTES}}\n\n' +
    'Mohon konfirmasi ketersediaan dan proses pesanan saya.\n\n' +
    'Terima kasih.';

  var replacements = {
    '{{STORE_NAME}}': settings.StoreName || 'Toko',
    '{{ORDER_NUMBER}}': order.OrderNumber,
    '{{PRODUCT_LIST}}': productList,
    '{{SUBTOTAL}}': formatIdr_(order.Subtotal),
    '{{DISCOUNT}}': formatIdr_(order.Discount),
    '{{GRAND_TOTAL}}': formatIdr_(order.GrandTotal),
    '{{CUSTOMER_NAME}}': customerData.name || '',
    '{{WHATSAPP}}': order.WhatsApp,
    '{{ADDRESS}}': customerData.address || '-',
    '{{CITY}}': customerData.city || '-',
    '{{PROVINCE}}': customerData.province || '-',
    '{{POSTAL_CODE}}': customerData.postalCode || '-',
    '{{NOTES}}': customerData.notes || '-'
  };

  var message = template;
  Object.keys(replacements).forEach(function (key) {
    message = message.split(key).join(replacements[key]);
  });
  return message;
}

function formatIdr_(amount) {
  var n = Number(amount) || 0;
  return 'Rp' + n.toLocaleString('id-ID');
}

function buildWhatsAppLink_(whatsAppNumber, countryCode, message) {
  var normalized = normalizeWhatsAppNumber_(whatsAppNumber, countryCode || '62');
  if (!normalized) {
    throw new Error('Nomor WhatsApp toko belum diatur di Settings');
  }
  return 'https://wa.me/' + normalized + '?text=' + encodeURIComponent(message);
}

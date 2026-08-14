/**
 * SettingsService.gs
 * Satu-satunya tempat penyimpanan/pembacaan Settings (termasuk nomor WhatsApp).
 * Jangan pernah hardcode nomor WhatsApp / harga di service lain — selalu panggil getSettings_().
 */

function getSettings_() {
  var sheet = getOrCreateSheet_(SHEET_NAMES.SETTINGS);
  if (sheet.getLastRow() < 2) {
    // Seed nilai default sekali saja saat sheet baru dibuat.
    var rows = Object.keys(DEFAULT_SETTINGS).map(function (k) { return [k, DEFAULT_SETTINGS[k]]; });
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var settings = {};
  values.forEach(function (row) { settings[row[0]] = row[1]; });
  return settings;
}

function updateSettings_(partialSettings) {
  var sheet = getOrCreateSheet_(SHEET_NAMES.SETTINGS);
  var current = getSettings_();
  var merged = Object.assign({}, current, partialSettings);
  var rows = Object.keys(merged).map(function (k) { return [k, merged[k]]; });
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).clearContent();
  }
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  return merged;
}

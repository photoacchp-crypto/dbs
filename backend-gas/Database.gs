/**
 * Database.gs
 * Layer akses Google Spreadsheet. SEMUA baca/tulis harus lewat sini
 * dan harus batch (getValues/setValues), tidak boleh per-row.
 */

/** Ambil sheet, buat + isi header jika belum ada. */
function getOrCreateSheet_(sheetName) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = SHEET_HEADERS[sheetName];
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/** Baca seluruh sheet sekali (1 batch call) dan kembalikan array of object. */
function readSheetAsObjects_(sheetName) {
  var sheet = getOrCreateSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  }).filter(function (obj) {
    // buang baris benar-benar kosong
    return Object.keys(obj).some(function (k) { return obj[k] !== '' && obj[k] !== null; });
  });
}

/** Tulis ulang seluruh isi sheet (di luar header) dalam satu batch call. */
function writeSheetObjects_(sheetName, objects) {
  var sheet = getOrCreateSheet_(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  if (!objects.length) return;
  var rows = objects.map(function (obj) {
    return headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Upsert batch berdasarkan kolom key (mis. 'SKU').
 * mode: 'update_only' | 'merge' | 'replace'
 * Mengembalikan { newRows, updatedRows, skippedRows }
 */
function upsertByKey_(sheetName, incomingObjects, keyField, mode) {
  var existing = readSheetAsObjects_(sheetName);
  var indexByKey = {};
  existing.forEach(function (row, i) { indexByKey[row[keyField]] = i; });

  var newRows = 0, updatedRows = 0, skippedRows = 0;

  if (mode === IMPORT_MODES.REPLACE) {
    // Sumber file jadi data terbaru sepenuhnya (harus sudah dikonfirmasi user di UI).
    writeSheetObjects_(sheetName, incomingObjects);
    return { newRows: incomingObjects.length, updatedRows: 0, skippedRows: 0 };
  }

  incomingObjects.forEach(function (incoming) {
    var key = incoming[keyField];
    var existingIdx = indexByKey[key];

    if (existingIdx === undefined) {
      if (mode === IMPORT_MODES.UPDATE_ONLY) { skippedRows++; return; }
      existing.push(incoming);
      indexByKey[key] = existing.length - 1;
      newRows++;
    } else {
      // MERGE: field kosong pada file baru tidak menghapus data lama.
      var current = existing[existingIdx];
      var merged = Object.assign({}, current);
      Object.keys(incoming).forEach(function (field) {
        var val = incoming[field];
        if (val !== '' && val !== null && val !== undefined) merged[field] = val;
      });
      existing[existingIdx] = merged;
      updatedRows++;
    }
  });

  writeSheetObjects_(sheetName, existing);
  return { newRows: newRows, updatedRows: updatedRows, skippedRows: skippedRows };
}

function appendRow_(sheetName, obj) {
  var sheet = getOrCreateSheet_(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var row = headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function generateId_(prefix) {
  return (prefix || 'ID') + '_' + Utilities.getUuid().substring(0, 8);
}

function nowIso_() {
  return new Date().toISOString();
}

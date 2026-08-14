/**
 * Utils.gs
 */

function jsonSuccess_(data, message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true, data: data || null, message: message || 'Success'
  })).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(message, code) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false, data: null, message: message || 'Error', code: code || 'ERROR'
  })).setMimeType(ContentService.MimeType.JSON);
}

/** Normalisasi header kolom Excel: trim, lowercase, hilangkan simbol non-alfanumerik. */
function normalizeHeader_(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify_(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** 08xxxxxxxxxx / +62xxxx / 62xxxx -> 62xxxxxxxxxx */
function normalizeWhatsAppNumber_(raw, defaultCountryCode) {
  var digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.charAt(0) === '0') {
    digits = (defaultCountryCode || '62') + digits.substring(1);
  }
  return digits;
}

function isValidUrl_(url) {
  if (!url) return false;
  return /^https?:\/\/.+/i.test(String(url).trim());
}

function isBlank_(val) {
  return val === '' || val === null || val === undefined;
}

function toNumberOrNull_(val) {
  if (isBlank_(val)) return null;
  var n = Number(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

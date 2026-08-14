/**
 * MediaService.gs
 * Phase 6 — admin media management. Upload file biner tidak didukung di Phase ini
 * (butuh Google Drive API); untuk sekarang admin menambahkan media lewat URL gambar,
 * sesuai section 11 master prompt ("jika URL media tersedia, validasi URL").
 */

function adminListMedia_(productId) {
  return readSheetAsObjects_(SHEET_NAMES.MEDIA)
    .filter(function (m) { return String(m.ProductID) === String(productId); })
    .sort(function (a, b) { return (a.SortOrder || 0) - (b.SortOrder || 0); });
}

function adminAddMedia_(productId, url, altText) {
  if (!isValidUrl_(url)) throw new Error('URL gambar tidak valid');
  var existing = adminListMedia_(productId);
  var media = {
    ID: generateId_('MED'),
    ProductID: productId,
    VariantID: '',
    Type: 'image',
    URL: url,
    DriveFileID: '',
    AltText: altText || '',
    SortOrder: existing.length,
    Status: 'Active',
    CreatedAt: nowIso_()
  };
  appendRow_(SHEET_NAMES.MEDIA, media);
  return media;
}

function adminDeleteMedia_(mediaId) {
  var media = readSheetAsObjects_(SHEET_NAMES.MEDIA)
    .filter(function (m) { return String(m.ID) !== String(mediaId); });
  writeSheetObjects_(SHEET_NAMES.MEDIA, media);
  return { deleted: true };
}

function adminSetCoverImage_(productId, mediaUrl) {
  return adminUpdateProduct_(productId, { CoverImage: mediaUrl });
}

function adminReorderMedia_(productId, orderedMediaIds) {
  var media = readSheetAsObjects_(SHEET_NAMES.MEDIA);
  orderedMediaIds.forEach(function (id, index) {
    for (var i = 0; i < media.length; i++) {
      if (String(media[i].ID) === String(id)) { media[i].SortOrder = index; break; }
    }
  });
  writeSheetObjects_(SHEET_NAMES.MEDIA, media);
  return adminListMedia_(productId);
}

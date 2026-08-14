/**
 * CategoryService.gs
 */

function adminListCategoriesAll_() {
  return readSheetAsObjects_(SHEET_NAMES.CATEGORIES);
}

function adminCreateCategory_(data) {
  var categories = readSheetAsObjects_(SHEET_NAMES.CATEGORIES);
  var cat = {
    ID: generateId_('CAT'),
    ParentID: data.ParentID || '',
    Name: data.Name,
    Slug: slugify_(data.Name),
    Description: data.Description || '',
    Image: data.Image || '',
    SortOrder: data.SortOrder || 0,
    Status: 'Active',
    CreatedAt: nowIso_(),
    UpdatedAt: nowIso_()
  };
  categories.push(cat);
  writeSheetObjects_(SHEET_NAMES.CATEGORIES, categories);
  return cat;
}

function adminUpdateCategory_(id, patch) {
  var categories = readSheetAsObjects_(SHEET_NAMES.CATEGORIES);
  var idx = -1;
  for (var i = 0; i < categories.length; i++) {
    if (String(categories[i].ID) === String(id)) { idx = i; break; }
  }
  if (idx === -1) throw new Error('Kategori tidak ditemukan');

  ['Name', 'ParentID', 'Description', 'Image', 'SortOrder', 'Status'].forEach(function (f) {
    if (patch[f] !== undefined) categories[idx][f] = patch[f];
  });
  if (patch.Name) categories[idx].Slug = slugify_(patch.Name);
  categories[idx].UpdatedAt = nowIso_();

  writeSheetObjects_(SHEET_NAMES.CATEGORIES, categories);
  return categories[idx];
}

function adminDeleteCategory_(id) {
  var categories = readSheetAsObjects_(SHEET_NAMES.CATEGORIES)
    .filter(function (c) { return String(c.ID) !== String(id); });
  writeSheetObjects_(SHEET_NAMES.CATEGORIES, categories);
  return { deleted: true };
}

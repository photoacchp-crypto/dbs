/**
 * Config.gs
 * Konstanta global aplikasi. Jangan hardcode nilai-nilai ini di tempat lain.
 */

var SHEET_NAMES = {
  PRODUCTS: 'Products',
  VARIANTS: 'Variants',
  CATEGORIES: 'Categories',
  MEDIA: 'Media',
  CUSTOMERS: 'Customers',
  ORDERS: 'Orders',
  ORDER_ITEMS: 'OrderItems',
  IMPORT_LOGS: 'ImportLogs',
  SETTINGS: 'Settings',
  ACTIVITY_LOGS: 'ActivityLogs',
  ADMIN_USERS: 'AdminUsers'
};

// Header kolom per sheet — dipakai Database.gs untuk membuat sheet baru
// dan untuk memetakan baris ke object.
var SHEET_HEADERS = {
  Products: ['ID','SKU','ProductName','Slug','Brand','CategoryID','SubCategoryID',
    'Description','Price','OriginalPrice','SalePrice','Stock','SoldCount','Status',
    'Weight','Length','Width','Height','ProcessingTime','ShippingEstimate',
    'CoverImage','VideoURL','Source','SourceFile','LastImportedAt','CreatedAt','UpdatedAt'],
  Variants: ['ID','ProductID','SKU','VariantName','VariantValue','Price','OriginalPrice',
    'SalePrice','Stock','Image','Status','CreatedAt','UpdatedAt'],
  Categories: ['ID','ParentID','Name','Slug','Description','Image','SortOrder','Status',
    'CreatedAt','UpdatedAt'],
  Media: ['ID','ProductID','VariantID','Type','URL','DriveFileID','AltText','SortOrder',
    'Status','CreatedAt'],
  Customers: ['ID','Name','WhatsApp','Email','Address','City','Province','PostalCode',
    'Notes','CreatedAt','UpdatedAt'],
  Orders: ['ID','OrderNumber','CustomerID','CustomerName','WhatsApp','Subtotal','Discount',
    'ShippingCost','GrandTotal','PaymentMethod','Status','Notes','WhatsAppMessage',
    'CreatedAt','UpdatedAt'],
  OrderItems: ['ID','OrderID','ProductID','VariantID','SKU','ProductName','VariantName',
    'Price','Quantity','Subtotal','Image','CreatedAt'],
  ImportLogs: ['ID','FileName','ImportType','TotalRows','SuccessRows','FailedRows',
    'UpdatedRows','NewRows','StartedAt','CompletedAt','Status','ErrorSummary'],
  Settings: ['Key','Value'],
  ActivityLogs: ['ID','Actor','Action','Entity','EntityID','Detail','CreatedAt'],
  AdminUsers: ['ID','Username','PasswordHash','Salt','Role','CreatedAt']
};

// Nilai default Settings — HANYA dipakai saat sheet Settings pertama kali dibuat.
// Setelah itu semua perubahan lewat Admin > Settings, bukan lewat kode.
var DEFAULT_SETTINGS = {
  StoreName: 'Toko Saya',
  StoreLogo: '',
  StoreDescription: '',
  WhatsAppNumber: '',
  WhatsAppCountryCode: '62',
  Currency: 'IDR',
  PrimaryColor: '#142C26',
  SecondaryColor: '#B8863B',
  AccentColor: '#6E8B7A',
  ShippingText: 'Informasi pengiriman akan dikonfirmasi melalui WhatsApp.',
  FooterText: '',
  ContactAddress: '',
  ContactEmail: '',
  Instagram: '',
  Facebook: '',
  TikTok: ''
};

var IMPORT_MODES = {
  UPDATE_ONLY: 'update_only',
  MERGE: 'merge',
  REPLACE: 'replace'
};

var ORDER_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

function getSpreadsheet_() {
  // Ambil spreadsheet aktif jika script bound, atau via ID di Script Properties
  // (PROPERTY: SPREADSHEET_ID) jika dijalankan sebagai standalone Web App.
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (ssId) return SpreadsheetApp.openById(ssId);
  return SpreadsheetApp.getActiveSpreadsheet();
}

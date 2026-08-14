/**
 * Code.gs
 * Jalankan setupProject() SEKALI secara manual dari editor Apps Script
 * (pilih fungsi ini di dropdown lalu klik Run) untuk:
 *   1. Membuat semua sheet + header yang dibutuhkan.
 *   2. Mengisi Settings dengan nilai default.
 *   3. Membuat 1 akun admin awal.
 *
 * Ganti ADMIN_USERNAME / ADMIN_PASSWORD_INITIAL sebelum menjalankan,
 * lalu HAPUS/kosongkan nilai password setelah setup selesai.
 */

var ADMIN_USERNAME = 'admin';
var ADMIN_PASSWORD_INITIAL = 'GANTI_SEBELUM_SETUP';

// PENTING: nama fungsi ini SENGAJA tanpa underscore di akhir. Google Apps
// Script menyembunyikan fungsi yang diakhiri underscore (`_`) dari dropdown
// "Select function to run" di editor — jadi fungsi setup yang perlu dijalankan
// manual TIDAK BOLEH diberi trailing underscore.
function setupProject() {
  Object.keys(SHEET_NAMES).forEach(function (key) {
    getOrCreateSheet_(SHEET_NAMES[key]);
  });

  getSettings_(); // seed default settings jika sheet baru

  var existingAdmins = readSheetAsObjects_(SHEET_NAMES.ADMIN_USERS);
  if (existingAdmins.length === 0) {
    if (ADMIN_PASSWORD_INITIAL === 'GANTI_SEBELUM_SETUP') {
      throw new Error('Ganti ADMIN_PASSWORD_INITIAL di Code.gs sebelum menjalankan setup.');
    }
    createAdminUser_(ADMIN_USERNAME, ADMIN_PASSWORD_INITIAL);
  }

  Logger.log('Setup selesai. Sheet, Settings, dan admin awal sudah siap.');
}

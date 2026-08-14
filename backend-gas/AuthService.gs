/**
 * AuthService.gs
 * Autentikasi admin sederhana: username/password (hash+salt) di sheet AdminUsers,
 * session token disimpan di CacheService (default TTL 6 jam).
 *
 * Asumsi (didokumentasikan, bukan diputuskan diam-diam): ini BUKAN Google OAuth
 * penuh. Untuk kebutuhan lebih ketat, ganti dengan Google Sign-In / OAuth di
 * fase keamanan lanjutan.
 */

var SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 jam

function hashPassword_(password, salt) {
  var raw = salt + ':' + password;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function (b) { return (b + 256).toString(16).slice(-2); }).join('');
}

/** Dipanggil sekali lewat setupInitialAdmin_() di Code.gs, bukan hardcode di kode publik. */
function createAdminUser_(username, password) {
  var salt = Utilities.getUuid();
  var hash = hashPassword_(password, salt);
  appendRow_(SHEET_NAMES.ADMIN_USERS, {
    ID: generateId_('ADM'),
    Username: username,
    PasswordHash: hash,
    Salt: salt,
    Role: 'admin',
    CreatedAt: nowIso_()
  });
}

function adminLogin_(username, password) {
  var users = readSheetAsObjects_(SHEET_NAMES.ADMIN_USERS);
  var user = users.filter(function (u) { return u.Username === username; })[0];
  if (!user) return { success: false, message: 'Username atau password salah' };

  var hash = hashPassword_(password, user.Salt);
  if (hash !== user.PasswordHash) {
    return { success: false, message: 'Username atau password salah' };
  }

  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('session_' + token, user.Username, SESSION_TTL_SECONDS);
  return { success: true, token: token, username: user.Username };
}

function isValidSession_(token) {
  if (!token) return false;
  var username = CacheService.getScriptCache().get('session_' + token);
  return !!username;
}

function requireAuth_(token) {
  if (!isValidSession_(token)) {
    throw new AuthError_('Sesi tidak valid, silakan login kembali');
  }
}

function AuthError_(message) {
  this.name = 'AuthError';
  this.message = message;
}
AuthError_.prototype = Object.create(Error.prototype);

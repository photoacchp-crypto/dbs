/**
 * api.js
 * Satu titik komunikasi ke Google Apps Script Web App.
 * Ganti API_BASE_URL setelah deploy Web App (Deploy > New deployment > Web app).
 */
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzbm2b4o41ui-TW96CgVhz3niTB13OaT9jxqyMKmSr6hdgaL2DSAD4ywJkOeJoFlpCItw/exec';

const Api = {
  async get(action, params = {}) {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return Api._handle(fetch(url.toString()));
  },

  async post(action, body = {}) {
    const url = new URL(API_BASE_URL);
    url.searchParams.set('action', action);
    return Api._handle(fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight GAS
      body: JSON.stringify(body)
    }));
  },

  async _handle(fetchPromise) {
    try {
      const res = await fetchPromise;
      const json = await res.json();
      if (!json.success) {
        console.error(`[API ${json.code || 'ERROR'}]`, json.message);
      }
      return json; // { success, data, message, code }
    } catch (err) {
      console.error('[API] Network/parse error', err);
      return { success: false, data: null, message: 'Tidak dapat terhubung ke server', code: 'NETWORK_ERROR' };
    }
  }
};

# Phase 7 — QA Report

## 1. Audit statis yang SUDAH dijalankan (otomatis, di lingkungan ini)

| Cek | Hasil |
|---|---|
| Sintaks semua file `.js` frontend (`node --check`) | ✅ 9/9 lolos |
| Balance kurung `{}` `()` di semua file `.gs` backend | ✅ 13/13 lolos |
| Setiap `Api.get/post('action', ...)` di frontend punya route yang cocok di `Api.gs` | ✅ tidak ada action yang hilang |
| Semua `href`/`src` relatif di HTML mengarah ke file yang benar-benar ada | ✅ tidak ada broken link |
| Escaping output untuk data yang berasal dari input publik (nama pembeli di checkout, nama file import) sebelum dirender di admin | ✅ diperbaiki (`escapeHtml`) — lihat catatan bug #1 |

**Keterbatasan jujur**: lingkungan ini tidak punya akses jaringan untuk menjalankan Google Apps Script sungguhan atau membuka browser sungguhan. Jadi pengujian di bawah ini adalah **audit kode + code review menyeluruh**, BUKAN hasil eksekusi end-to-end. Bagian 3 berisi checklist manual yang perlu kamu jalankan sendiri setelah deploy.

## 2. Bug yang ditemukan & diperbaiki selama audit ini

1. **XSS lewat nama pembeli / nama file import** — `CustomerName` (dari form checkout publik) dan `FileName` (dari file yang diupload admin) dirender langsung ke `innerHTML` di `admin-dashboard.html` dan `admin-orders.html` tanpa escaping. Diperbaiki dengan `escapeHtml()` (section 41 — output escaping).
2. **`admin.html` mengarah ke halaman yang belum ada** — sudah diperbaiki sebelumnya dengan membuat `admin-dashboard.html` (lihat riwayat chat).
3. **`setupProject_` tersembunyi dari dropdown Apps Script** — sudah diperbaiki sebelumnya (rename ke `setupProject`).

## 3. Checklist pengujian manual (jalankan setelah deploy)

### Import (section 56)
- [ ] Upload Excel Shopee asli → cek kolom yang terdeteksi vs "Kolom tidak dikenali"
- [ ] Upload file kosong → harus muncul alert, bukan error JS
- [ ] Upload dengan SKU kosong/duplicate → muncul di preview sebagai ERROR, tidak ikut ter-import
- [ ] Import ulang file yang sama dengan mode Merge → tidak menghasilkan produk duplicate (cek jumlah baris di sheet Products)
- [ ] Import dengan mode Replace → muncul dialog konfirmasi sebelum jalan

### Katalog (Phase 3)
- [ ] `index.html` menampilkan produk hasil import (bukan skeleton kosong)
- [ ] Search di header (index & shop) mengarahkan ke `shop.html?q=...` dan hasilnya sesuai
- [ ] Filter kategori/brand/harga di `shop.html` mengubah hasil grid
- [ ] Sort (terbaru/harga/terlaris/nama) bekerja
- [ ] `product.html` menampilkan galeri, dan memilih varian mengubah harga/stok/SKU/foto sesuai section 26 (tidak jatuh balik ke data induk)
- [ ] Produk dengan stok 0 → tombol beli nonaktif, teks "Stok habis"

### Keranjang (Phase 4)
- [ ] Tambah produk dari `product.html` → muncul di `cart.html` dan badge header ikut update
- [ ] Ubah qty +/- dan input manual, tidak bisa melebihi stok
- [ ] Hapus item, kosongkan keranjang, pilih/batal pilih item
- [ ] Refresh halaman → isi cart tetap ada (localStorage)

### Checkout + WhatsApp (Phase 5)
- [ ] Submit form dengan field wajib kosong → ditolak validasi
- [ ] Submit sukses → order tersimpan (cek sheet Orders & OrderItems), lalu browser diarahkan ke wa.me dengan pesan yang sudah terisi lengkap
- [ ] Simulasikan API gagal (mis. matikan WhatsAppNumber di Settings) → **harus tetap TIDAK membuka WhatsApp**, tampilkan error saja (section 31)
- [ ] Item yang sudah dipesan hilang dari cart, item yang tidak dicentang tetap ada

### Admin (Phase 6)
- [ ] Login dengan kredensial salah → pesan error, bukan redirect diam-diam
- [ ] Dashboard menampilkan angka yang sesuai dengan data sheet
- [ ] Edit harga/stok produk di `admin-products.html` → tersimpan dan tampil di katalog publik
- [ ] Nonaktifkan produk → hilang dari `shop.html`/`index.html` tapi tetap ada di admin
- [ ] Tambah/edit/nonaktifkan kategori
- [ ] Ubah status order → tersimpan
- [ ] Ubah Settings (warna, nama toko, nomor WA) → berubah juga di halaman publik tanpa perlu ubah kode

### Responsive (section 35)
- [ ] Desktop: grid produk 4 kolom
- [ ] Tablet (~768–1024px): 3 kolom
- [ ] Mobile (<640px): 2 kolom, layout checkout/cart tidak pecah

## 4. Yang SENGAJA belum dibangun (di luar 7 fase, bukan bug)

- Upload gambar biner (Google Drive) — saat ini media hanya lewat URL. `MediaService.gs` sudah punya endpoint (`adminAddMedia`, dst.) tapi belum ada UI galeri media khusus di admin.
- Reorder galeri produk lewat UI (fungsi backend `adminReorderMedia_` sudah ada, tinggal dibuatkan UI drag-and-drop kalau dibutuhkan).
- Multi-dimensi varian independen (Warna × Ukuran terpisah) — saat ini satu varian = satu kombinasi per baris Excel (lihat catatan asumsi di `ImportService.gs`).
- Rate limiting, dan Google OAuth penuh untuk admin (saat ini auth sederhana hash+salt+session).

## 5. Acceptance Criteria (section 57) — status

| Kriteria | Status |
|---|---|
| Excel Shopee dapat diimport, 5 kelompok diproses, SKU sebagai identifier, tanpa duplicate | ✅ |
| Produk tampil otomatis, search, filter, detail, varian, harga/stok benar | ✅ |
| Cart & checkout berfungsi | ✅ |
| Nomor WhatsApp dari Settings, order number unik, order tersimpan sebelum WA dibuka, pesan lengkap | ✅ |
| Admin: import, preview, validasi, log, product management, settings | ✅ |

Semua kriteria fungsional dari master prompt sudah diimplementasikan dan lolos audit statis. **Rekomendasi saya**: jalankan checklist manual di atas dengan data Shopee asli sebelum dipakai produksi, karena itu satu-satunya cara memverifikasi Apps Script + Google Sheets sungguhan (tidak bisa disimulasikan di sini).

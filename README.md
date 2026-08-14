# Toko Online — Import Excel Shopee + Order WhatsApp
## Status: Phase 1–7 selesai (lihat QA_REPORT.md untuk detail audit & checklist manual)

Isi paket ini:

```
backend-gas/     → salin SEMUA file .gs ke satu Google Apps Script project
frontend/        → file statis (host di Firebase Hosting/GitHub Pages/hosting apapun)
QA_REPORT.md     → hasil audit Phase 7 + checklist pengujian manual
```

## Setup backend (Google Apps Script)

1. Buat Google Spreadsheet baru (ini akan jadi database).
2. Buka **Extensions > Apps Script** dari spreadsheet tersebut.
3. Buat file baru untuk SETIAP file di folder `backend-gas/` (nama file harus sama
   persis): `Config.gs`, `Database.gs`, `Utils.gs`, `AuthService.gs`,
   `SettingsService.gs`, `ProductService.gs`, `CategoryService.gs`, `OrderService.gs`,
   `WhatsAppService.gs`, `MediaService.gs`, `ImportService.gs`, `Api.gs`, `Code.gs`.
4. Di `Code.gs`, ganti `ADMIN_USERNAME` / `ADMIN_PASSWORD_INITIAL` dengan kredensial admin awalmu.
5. Jalankan fungsi **`setupProject`** sekali (pilih di dropdown fungsi lalu klik ▶ Run).
   Ini membuat semua sheet, mengisi Settings default, dan membuat 1 akun admin.
6. **Setelah setup berhasil, kosongkan kembali `ADMIN_PASSWORD_INITIAL`** di kode.
7. Deploy: **Deploy > New deployment > Web app** (Execute as: *Me*, Who has access: *Anyone*).
8. Salin URL deployment (`.../exec`).
9. Isi nomor WhatsApp toko lewat `admin-settings.html` setelah login (jangan lewat kode).

## Setup frontend

1. Buka `frontend/assets/js/api.js`, ganti `API_BASE_URL` dengan URL deployment di atas.
2. **Jangan buka file HTML langsung lewat `file:///...` di browser.** Google Apps Script
   butuh origin `http(s)://` untuk fetch & redirect internalnya bekerja normal — kalau dibuka
   dari `file://`, kamu akan dapat error acak "Tidak dapat terhubung ke server" / "Unexpected
   token '<'". Jalankan server lokal dulu, misalnya:
   ```
   cd frontend
   python -m http.server 8000
   ```
   lalu buka `http://localhost:8000/index.html`. Untuk produksi, host folder `frontend/` di
   Firebase Hosting / Netlify / GitHub Pages (apa pun asalkan `http://` atau `https://`).
3. Buka `frontend/index.html` — otomatis mengambil produk, tema, dan info toko dari backend.
4. Login admin lewat `frontend/admin.html`.

## Ringkasan tiap fase

**Phase 1 — Foundation**: struktur database (11 sheet), API router `?action=...`
dengan response contract konsisten, autentikasi admin (hash+salt+session token),
Settings sebagai satu-satunya sumber WhatsApp/warna/nama toko, tema visual via CSS variables.

**Phase 2 — Import Engine**: parsing Excel/CSV di browser (SheetJS, file asli tidak diubah),
normalisasi & alias mapping header ke 5 kelompok data Shopee, validasi valid/warning/error,
preview sebelum simpan, mode Update Only/Merge/Replace, upsert by SKU/Variant SKU, ImportLogs.
> Alias kolom di `ImportService.gs` masih perlu divalidasi dengan file Excel asli kamu.

**Phase 3 — Product Catalog**: `shop.html` (search, filter kategori/brand/harga/promo, sort,
pagination), `product.html` (galeri, pemilihan varian yang mengubah harga/stok/SKU/foto,
related products), homepage menampilkan produk sungguhan.

**Phase 4 — Cart**: `cart.js` (localStorage), `cart.html` (tambah/kurang/hapus qty, pilih item,
kosongkan keranjang, subtotal/total, badge jumlah item di header).

**Phase 5 — Checkout + WhatsApp**: `checkout.html` (form pembeli + ringkasan pesanan),
`createOrder` (snapshot item, order number `ORD-YYYYMMDD-XXXX` unik via lock, simpan Orders +
OrderItems), pesan WhatsApp otomatis dari template di `WhatsAppService.gs`, order **selalu**
tersimpan dulu sebelum WhatsApp dibuka — jika gagal simpan, WhatsApp tidak dibuka.

**Phase 6 — Admin lengkap**: `admin-dashboard.html` (statistik, order terbaru, stok menipis,
import terbaru), `admin-products.html` (edit harga/stok, aktif/nonaktifkan, hapus),
`admin-categories.html` (CRUD), `admin-orders.html` (ubah status), `admin-settings.html`
(nama toko, warna tema, nomor WhatsApp, sosial media — semua tanpa ubah kode).

**Phase 7 — QA**: audit statis (sintaks, cross-check API routes, broken link, XSS pada data
publik) — lihat `QA_REPORT.md` untuk detail lengkap dan checklist pengujian manual yang perlu
kamu jalankan dengan data Shopee asli setelah deploy (lingkungan pengembangan ini tidak bisa
menjalankan Google Apps Script/browser sungguhan).

## Yang sengaja belum ada (bukan bug, lihat QA_REPORT.md bagian 4)

- Upload gambar biner ke Google Drive (saat ini media lewat URL saja)
- UI drag-and-drop reorder galeri (fungsi backend sudah ada)
- Varian multi-dimensi independen (Warna × Ukuran terpisah)
- Google OAuth penuh untuk admin

/**
 * import.js
 * Membaca file Excel/CSV DI BROWSER (tidak mengubah file asli), lalu mengirim
 * baris mentah (header asli + value) ke backend untuk mapping & validasi.
 */

(function () {
  const token = sessionStorage.getItem('admin_token');
  if (!token) { window.location.href = 'admin.html'; return; }

  let currentFile = null;
  let currentRows = null;
  let currentHeaders = null;

  const fileInput = document.getElementById('file-input');
  const uploadBox = document.getElementById('upload-box');
  const fileMeta = document.getElementById('file-meta');

  uploadBox.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  async function handleFile(file) {
    currentFile = file;
    fileMeta.hidden = false;
    fileMeta.textContent = `File: ${file.name} · ${(file.size / 1024).toFixed(1)} KB`;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // defval: '' supaya sel kosong tetap muncul sebagai key (bukan hilang)
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) {
      alert('File tidak memiliki baris data.');
      return;
    }
    currentHeaders = Object.keys(rows[0]);
    currentRows = rows;

    fileMeta.textContent += ` · Sheet: ${sheetName} · ${rows.length} baris`;
    await runPreview();
  }

  async function runPreview() {
    const res = await Api.post('previewImport', { token, rows: currentRows, headers: currentHeaders });
    if (!res.success) { alert('Gagal preview: ' + res.message); return; }
    renderPreview(res.data);
  }

  function renderPreview(data) {
    document.getElementById('detected-panel').hidden = false;
    const groups = {
      informasiDasar: 'Informasi Dasar',
      informasiPenjualan: 'Informasi Penjualan',
      informasiPengiriman: 'Informasi Pengiriman',
      informasiDikirimDalam: 'Informasi Dikirim Dalam',
      informasiMedia: 'Informasi Media'
    };
    document.getElementById('detected-groups').innerHTML = Object.entries(groups).map(([key, label]) => {
      const ok = data.detectedGroups[key];
      return `<div class="group-check"><span class="${ok ? 'ok' : 'missing'}">${ok ? '✓' : '—'}</span> ${label}</div>`;
    }).join('');

    document.getElementById('unknown-headers').textContent = data.unknownHeaders.length
      ? `Kolom tidak dikenali (disimpan sebagai metadata, tidak dibuang): ${data.unknownHeaders.join(', ')}`
      : '';

    document.getElementById('preview-panel').hidden = false;
    document.getElementById('count-valid').textContent = data.summary.valid;
    document.getElementById('count-warning').textContent = data.summary.warning;
    document.getElementById('count-error').textContent = data.summary.error;

    document.getElementById('preview-body').innerHTML = data.previewRows.map(r => `
      <tr>
        <td>${r.sku || '-'}</td>
        <td>${r.productName || '-'}</td>
        <td>${r.category || '-'}</td>
        <td>${formatCurrency(r.price)}</td>
        <td>${r.stock ?? '-'}</td>
        <td>${r.hasVariant ? 'Ya' : '-'}</td>
        <td>${r.mediaCount}</td>
        <td class="level-${r.level}" title="${r.issues.join(', ')}">${r.level.toUpperCase()}</td>
      </tr>
    `).join('');
  }

  document.getElementById('btn-cancel').addEventListener('click', () => {
    document.getElementById('preview-panel').hidden = true;
    document.getElementById('detected-panel').hidden = true;
    currentRows = null; currentHeaders = null;
    fileInput.value = '';
  });

  document.getElementById('btn-import').addEventListener('click', async () => {
    if (!currentRows) return;
    const mode = document.querySelector('input[name="mode"]:checked').value;

    if (mode === 'replace') {
      const ok = confirm('Mode Replace akan menimpa data produk yang ada dengan data dari file ini. Lanjutkan?');
      if (!ok) return;
    }

    const btn = document.getElementById('btn-import');
    btn.disabled = true;
    btn.textContent = 'Mengimpor...';

    const res = await Api.post('importProducts', {
      token, rows: currentRows, headers: currentHeaders, mode, fileName: currentFile.name
    });

    btn.disabled = false;
    btn.textContent = 'Import Data';

    if (!res.success) { alert('Import gagal: ' + res.message); return; }

    const d = res.data;
    document.getElementById('report-panel').hidden = false;
    document.getElementById('import-report').textContent =
`Total baris        : ${d.totalRows}
Berhasil diproses   : ${d.successRows}
Gagal (dilewati)    : ${d.failedRows}

Produk baru         : ${d.products.newRows}
Produk diperbarui    : ${d.products.updatedRows}
Varian baru/update   : ${d.variants.newRows} / ${d.variants.updatedRows}
Media baru/update    : ${d.media.newRows} / ${d.media.updatedRows}`;

    document.getElementById('report-panel').scrollIntoView({ behavior: 'smooth' });
  });
})();

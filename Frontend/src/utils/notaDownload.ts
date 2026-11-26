import type { Order } from '../types/domain';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatTanggalWaktuWib,
  formatWaktuWib,
} from './format';

export function triggerDownloadNotaHtml(order: Order, paidAmount: number) {
  const sisaSaatIni = Math.max(0, order.totalHarga - paidAmount);
  const rowsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5ece3;">${item.namaProduk} (${item.jenisPaket})</td>
        <td style="padding:8px;border-bottom:1px solid #e5ece3;text-align:right;">${item.jumlahPorsi}</td>
        <td style="padding:8px;border-bottom:1px solid #e5ece3;text-align:right;">${formatRupiah(item.hargaPerPorsi)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5ece3;text-align:right;font-weight:600;">${formatRupiah(item.subtotal)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Nota ${order.nomorNota} - Efdi Kitchen</title>
</head>
<body style="font-family:Arial,sans-serif;color:#243128;max-width:720px;margin:24px auto;padding:24px;border:1px solid #dce5da;border-radius:12px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #245C3D;padding-bottom:16px;">
    <div>
      <h1 style="margin:0;color:#245C3D;font-size:24px;">Efdi Kitchen</h1>
      <p style="margin:4px 0 0;color:#55645A;font-size:13px;">Nota Digital Pemesanan Katering (Simulasi)</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-weight:700;font-size:15px;">${order.nomorNota}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#55645A;">Kode Pesanan: <strong>${order.kodePesanan}</strong></p>
    </div>
  </div>
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
    <div>
      <p style="margin:2px 0;"><strong>Pemesan:</strong> ${order.namaPelanggan}</p>
      <p style="margin:2px 0;"><strong>Kontak:</strong> ${order.noKontak}</p>
      <p style="margin:2px 0;"><strong>Kanal:</strong> ${order.kanal}</p>
    </div>
    <div>
      <p style="margin:2px 0;"><strong>Tanggal Acara:</strong> ${formatTanggalIndonesia(order.tanggalAcara, true)}</p>
      <p style="margin:2px 0;"><strong>Waktu Pengambilan/Acara:</strong> ${formatWaktuWib(order.waktuAcara)}</p>
      <p style="margin:2px 0;"><strong>Dibuat:</strong> ${formatTanggalWaktuWib(order.dibuatPada)}</p>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;">
    <thead>
      <tr style="background:#EEF5EC;text-align:left;">
        <th style="padding:8px;">Paket</th>
        <th style="padding:8px;text-align:right;">Porsi</th>
        <th style="padding:8px;text-align:right;">Harga/Porsi</th>
        <th style="padding:8px;text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:16px;padding:14px;background:#F5F7F4;border-radius:8px;font-size:13px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>Total Tagihan</span><strong>${formatRupiah(order.totalHarga)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>Ketentuan DP Minimum (50%) pada Nota Awal</span><span>${formatRupiah(order.dpMinimumNota)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>Sisa Pembayaran pada Nota Awal</span><span>${formatRupiah(order.sisaAwalNota)}</span>
    </div>
    <hr style="border:none;border-top:1px solid #dce5da;margin:8px 0;" />
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span>Pembayaran Sudah Diterima</span><span>${formatRupiah(paidAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#245C3D;">
      <span>Sisa Pembayaran Saat Ini</span><span>${formatRupiah(sisaSaatIni)}</span>
    </div>
  </div>
  <p style="margin-top:16px;font-size:12px;color:#55645A;">Status Pesanan: ${order.statusPesanan} • Status Pembayaran: ${order.statusPembayaran}</p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${order.nomorNota}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

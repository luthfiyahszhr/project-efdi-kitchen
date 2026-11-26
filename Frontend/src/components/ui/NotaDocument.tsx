import React from 'react';
import { Download, Printer } from 'lucide-react';
import type { Order } from '../../types/domain';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatWaktuWib,
} from '../../utils/format';
import { triggerDownloadNotaHtml } from '../../utils/notaDownload';
import { Button } from './FormControls';
import { Modal } from './Feedback';

export const NotaModal: React.FC<{
  open: boolean;
  onClose: () => void;
  order: Order | null;
  paidAmount: number;
}> = ({ open, onClose, order, paidAmount }) => {
  if (!order) return null;
  const remaining = Math.max(0, order.totalHarga - paidAmount);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Nota Digital — ${order.nomorNota}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 rounded-xl border border-[#DCE5DA] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DCE5DA] pb-4">
          <div>
            <p className="font-brand text-xl font-bold text-[#245C3D]">
              Efdi Kitchen
            </p>
            <p className="text-xs text-[#55645A]">
              Nota Digital Pemesanan Katering
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-bold text-[#243128]">{order.nomorNota}</p>
            <p className="text-xs text-[#55645A]">
              Kode Pesanan:{' '}
              <span className="font-semibold text-[#245C3D]">
                {order.kodePesanan}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-[#55645A]">Pemesan</p>
            <p className="font-semibold text-[#243128]">{order.namaPelanggan}</p>
            <p className="text-xs text-[#55645A]">
              {order.noKontak} • {order.kanal}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#55645A]">Jadwal Acara / Pengambilan</p>
            <p className="font-semibold text-[#243128]">
              {formatTanggalIndonesia(order.tanggalAcara, true)}
            </p>
            <p className="text-xs text-[#55645A]">
              Pukul {formatWaktuWib(order.waktuAcara)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#DCE5DA]">
          <table className="w-full text-sm">
            <thead className="bg-[#EEF5EC] text-[#243128]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Paket</th>
                <th className="px-3 py-2 text-right font-semibold">Porsi</th>
                <th className="px-3 py-2 text-right font-semibold">Harga</th>
                <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EC]">
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 font-medium">{item.namaProduk}</td>
                  <td className="px-3 py-2.5 text-right">{item.jumlahPorsi}</td>
                  <td className="px-3 py-2.5 text-right">
                    {formatRupiah(item.hargaPerPorsi)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 rounded-xl bg-[#F5F7F4] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#55645A]">Total Tagihan</span>
            <span className="font-bold text-[#243128]">
              {formatRupiah(order.totalHarga)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-[#55645A]">
            <span>DP Minimum (50%) pada Nota Awal</span>
            <span>{formatRupiah(order.dpMinimumNota)}</span>
          </div>
          <div className="flex justify-between text-xs text-[#55645A]">
            <span>Sisa sesuai Nota Awal</span>
            <span>{formatRupiah(order.sisaAwalNota)}</span>
          </div>
          <div className="my-2 border-t border-[#DCE5DA]" />
          <div className="flex justify-between">
            <span className="text-[#55645A]">Pembayaran Sudah Diterima</span>
            <span className="font-semibold text-[#137333]">
              {formatRupiah(paidAmount)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#245C3D]">
            <span>Sisa Pembayaran Saat Ini</span>
            <span>{formatRupiah(remaining)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3 no-print">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Cetak
        </Button>
        <Button
          variant="primary"
          onClick={() => triggerDownloadNotaHtml(order, paidAmount)}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Unduh Nota (.html)
        </Button>
      </div>
    </Modal>
  );
};

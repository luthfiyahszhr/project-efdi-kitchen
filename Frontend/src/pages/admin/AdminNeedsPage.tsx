import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { EmptyState } from '../../components/ui/Feedback';
import { Button, DatePicker } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { InventoryType, InventoryUnit } from '../../types/domain';
import {
  formatStockNumber,
  formatTanggalIndonesia,
  formatTanggalWaktuWib,
  getTodayWibDate,
} from '../../utils/format';

interface NeedRow {
  itemId: number;
  nama: string;
  tipe: InventoryType;
  satuan: InventoryUnit;
  kebutuhan: number;
  stokTersedia: number;
  kekurangan: number;
}

export const AdminNeedsPage: React.FC = () => {
  const { orders, products, inventory, pushToast } = useApp();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(() => getTodayWibDate());
  const [lastCalculatedAt, setLastCalculatedAt] = useState(() =>
    new Date().toISOString()
  );

  const computeNeedsForStatus = (targetStatus: 'Pesanan Baru' | 'Menunggu DP') => {
    const matchingOrders = orders.filter(
      (o) => o.tanggalAcara === selectedDate && o.statusPesanan === targetStatus
    );

    const map = new Map<number, number>();
    for (const o of matchingOrders) {
      for (const line of o.items) {
        const prod = products.find((p) => p.id === line.produkId);
        if (!prod) continue;
        for (const comp of prod.komposisi) {
          const prev = map.get(comp.itemId) ?? 0;
          map.set(
            comp.itemId,
            Number((prev + comp.jumlahPerPorsi * line.jumlahPorsi).toFixed(3))
          );
        }
      }
    }

    const rows: NeedRow[] = [];
    map.forEach((kebutuhan, itemId) => {
      const inv = inventory.find((i) => i.id === itemId);
      if (!inv) return;
      const kekurangan = Number(Math.max(0, kebutuhan - inv.stok).toFixed(3));
      rows.push({
        itemId,
        nama: inv.nama,
        tipe: inv.tipe,
        satuan: inv.satuan,
        kebutuhan,
        stokTersedia: inv.stok,
        kekurangan,
      });
    });

    return { ordersCount: matchingOrders.length, rows };
  };

  const activeNeeds = useMemo(
    () => computeNeedsForStatus('Pesanan Baru'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, products, inventory, selectedDate, lastCalculatedAt]
  );

  const potentialNeeds = useMemo(
    () => computeNeedsForStatus('Menunggu DP'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, products, inventory, selectedDate, lastCalculatedAt]
  );

  const shoppingList = useMemo(
    () => activeNeeds.rows.filter((r) => r.kekurangan > 0),
    [activeNeeds.rows]
  );

  const handleRecalculate = () => {
    setLastCalculatedAt(new Date().toISOString());
    pushToast({
      type: 'info',
      title: 'Kebutuhan Dihitung Ulang',
      message: `Data kebutuhan untuk ${formatTanggalIndonesia(selectedDate)} diperbarui.`,
    });
  };

  return (
    <AdminLayout
      title="Kebutuhan Produksi &amp; Daftar Belanja"
      subtitle="Menghitung kebutuhan bahan baku &amp; kemasan dari pesanan berstatus Pesanan Baru pada tanggal acara terpilih."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/stok')}
          >
            <Boxes className="h-4 w-4" aria-hidden="true" />
            Input Stok Baru
          </Button>
          <Button variant="primary" size="sm" onClick={handleRecalculate}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Hitung Ulang
          </Button>
        </div>
      }
    >
      {/* Controls & Timestamp */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full sm:w-72">
            <DatePicker
              id="needs-date"
              label="Tanggal Acara"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="text-xs text-[#55645A] space-y-1">
            <p className="inline-flex items-center gap-1.5 font-medium text-[#243128]">
              <Clock className="h-4 w-4 text-[#245C3D]" aria-hidden="true" />
              Waktu perhitungan terakhir:{' '}
              <strong>{formatTanggalWaktuWib(lastCalculatedAt)}</strong>
            </p>
            <p>
              Pesanan tahap <em>Mulai Dimasak</em> ke atas tidak dihitung ulang
              karena stoknya sudah dipotong.
            </p>
          </div>
        </div>
      </section>

      {/* Active Production Needs (Pesanan Baru) */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#243128]">
              Kebutuhan Aktif (Pesanan Baru: {activeNeeds.ordersCount} pesanan)
            </h2>
            <p className="text-xs text-[#55645A]">
              Tanggal acara: {formatTanggalIndonesia(selectedDate, true)}
            </p>
          </div>
        </div>

        {activeNeeds.rows.length === 0 ? (
          <EmptyState
            title="Belum ada pesanan berstatus Pesanan Baru pada tanggal ini"
            description="Pesanan yang belum menerima DP atau sudah masuk tahap dimasak tidak masuk ke kebutuhan aktif."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#DCE5DA]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Satuan</th>
                  <th className="px-4 py-3 text-right">Kebutuhan</th>
                  <th className="px-4 py-3 text-right">Stok Tersedia</th>
                  <th className="px-4 py-3 text-right">Kekurangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {activeNeeds.rows.map((r) => (
                  <tr key={r.itemId}>
                    <td className="px-4 py-3 font-semibold text-[#243128]">
                      {r.nama}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#55645A]">
                      {r.tipe}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.satuan}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatStockNumber(r.kebutuhan)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatStockNumber(r.stokTersedia)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        r.kekurangan > 0 ? 'text-[#B42318]' : 'text-[#137333]'
                      }`}
                    >
                      {formatStockNumber(r.kekurangan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Shopping List (Only items with shortfall > 0) */}
      <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-[#245C3D]" aria-hidden="true" />
          <h2 className="text-base font-bold text-[#243128]">
            Daftar Belanja (Item dengan Kekurangan &gt; 0)
          </h2>
        </div>

        {shoppingList.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#EEF5EC] p-4 text-sm text-[#245C3D]">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Tidak ada kekurangan stok untuk kebutuhan aktif tanggal{' '}
              {formatTanggalIndonesia(selectedDate)}.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shoppingList.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center justify-between rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4"
              >
                <div>
                  <p className="text-sm font-bold text-[#243128]">
                    {item.nama}
                  </p>
                  <p className="text-xs text-[#55645A]">
                    {item.tipe} • Tersedia {formatStockNumber(item.stokTersedia)}{' '}
                    {item.satuan}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7A271A]">Perlu Beli</p>
                  <p className="text-base font-bold text-[#B42318]">
                    {formatStockNumber(item.kekurangan)} {item.satuan}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Separate Potential Needs (Menunggu DP) */}
      <section className="rounded-2xl border border-[#F3D88C] bg-[#FEF7E0]/40 p-5 space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#243128]">
            Potensi Kebutuhan — Pesanan Menunggu DP ({potentialNeeds.ordersCount}{' '}
            pesanan)
          </h2>
          <p className="text-xs text-[#55645A]">
            Ditampilkan terpisah sebagai antisipasi. Pesanan belum masuk daftar
            produksi aktif sebelum DP diterima.
          </p>
        </div>

        {potentialNeeds.rows.length === 0 ? (
          <p className="text-sm text-[#55645A]">
            Tidak ada pesanan Menunggu DP pada tanggal acara ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {potentialNeeds.rows.map((r) => (
              <div
                key={r.itemId}
                className="flex items-center justify-between rounded-xl border border-[#F3D88C] bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium text-[#243128]">{r.nama}</span>
                <span className="font-bold text-[#855800]">
                  {formatStockNumber(r.kebutuhan)} {r.satuan}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
};

import React, { useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  Power,
  Trash2,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ProductPhoto, UploadArea } from '../../components/ui/DataDisplay';
import { Modal } from '../../components/ui/Feedback';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { JenisPaket, Product, ProductComposition } from '../../types/domain';
import { formatRupiah, formatStockNumber } from '../../utils/format';

export const AdminProductsPage: React.FC = () => {
  const { products, inventory, saveProduct, toggleProductActive, pushToast } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const [nama, setNama] = useState('');
  const [jenis, setJenis] = useState<JenisPaket>('Nasi Box');
  const [ringkasanIsi, setRingkasanIsi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [isiText, setIsiText] = useState('');
  const [hargaStr, setHargaStr] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoName, setFotoName] = useState('');
  const [aktif, setAktif] = useState(true);
  const [komposisi, setKomposisi] = useState<ProductComposition[]>([]);
  const [formError, setFormError] = useState('');
  const [fotoError, setFotoError] = useState('');

  const openAdd = () => {
    setEditingId(undefined);
    setNama('');
    setJenis('Nasi Box');
    setRingkasanIsi('');
    setDeskripsi('');
    setIsiText('');
    setHargaStr('25000');
    setFotoUrl('');
    setFotoName('');
    setAktif(true);
    setKomposisi([{ itemId: inventory[0]?.id ?? 1, jumlahPerPorsi: 1 }]);
    setFormError('');
    setFotoError('');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setNama(p.nama);
    setJenis(p.jenis);
    setRingkasanIsi(p.ringkasanIsi);
    setDeskripsi(p.deskripsi);
    setIsiText(p.isiLengkap.join('\n'));
    setHargaStr(String(p.hargaPerPorsi));
    setFotoUrl(p.fotoUrl);
    setFotoName(p.fotoUrl ? `${p.nama}.jpg` : '');
    setAktif(p.aktif);
    setKomposisi(p.komposisi.map((k) => ({ ...k })));
    setFormError('');
    setFotoError('');
    setModalOpen(true);
  };

  const addCompRow = () => {
    const unused = inventory.find(
      (inv) => !komposisi.some((k) => k.itemId === inv.id)
    );
    setKomposisi((prev) => [
      ...prev,
      { itemId: unused?.id ?? inventory[0]?.id ?? 1, jumlahPerPorsi: 1 },
    ]);
  };

  const removeCompRow = (idx: number) => {
    setKomposisi((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const harga = Number(hargaStr);
    if (!Number.isFinite(harga) || harga <= 0) {
      setFormError('Harga per porsi harus lebih dari Rp0.');
      return;
    }

    const cleanComp = komposisi.filter((k) => k.jumlahPerPorsi > 0);
    const isiLines = isiText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await saveProduct({
      id: editingId,
      nama,
      jenis,
      ringkasanIsi: ringkasanIsi.trim() || isiLines.join(', '),
      deskripsi: deskripsi.trim() || ringkasanIsi.trim(),
      isiLengkap: isiLines.length > 0 ? isiLines : [ringkasanIsi.trim()],
      hargaPerPorsi: harga,
      fotoUrl,
      aktif,
      komposisi: cleanComp,
    });

    if (!res.ok) {
      setFormError(res.error || 'Gagal menyimpan produk.');
      return;
    }

    setModalOpen(false);
  };

  return (
    <AdminLayout
      title="Kelola Katalog Paket"
      subtitle="Atur paket katering, harga per porsi, foto, status aktif, serta komposisi bahan dan kemasan per porsi."
      actions={
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Paket Baru
        </Button>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
              <tr>
                <th className="px-4 py-3 text-left">Paket</th>
                <th className="px-4 py-3 text-left">Jenis</th>
                <th className="px-4 py-3 text-right">Harga/Porsi</th>
                <th className="px-4 py-3 text-left">Komposisi</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2EC]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F7F4]/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductPhoto
                        src={p.fotoUrl}
                        alt={p.nama}
                        className="h-12 w-16 shrink-0 rounded-lg"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-[#243128]">{p.nama}</p>
                        <p className="max-w-xs truncate text-xs text-[#55645A]">
                          {p.ringkasanIsi}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-[#243128]">
                    {p.jenis}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#245C3D]">
                    {formatRupiah(p.hargaPerPorsi)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#55645A]">
                    {p.komposisi.length} item (
                    {p.komposisi
                      .slice(0, 2)
                      .map((k) => {
                        const inv = inventory.find((i) => i.id === k.itemId);
                        return inv
                          ? `${inv.nama} ${formatStockNumber(k.jumlahPerPorsi)} ${inv.satuan}`
                          : '';
                      })
                      .join(', ')}
                    {p.komposisi.length > 2 ? ', ...' : ''})
                  </td>
                  <td className="px-4 py-3">
                    {p.aktif ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#A8DAB5] bg-[#E6F4EA] px-2.5 py-1 text-xs font-semibold text-[#137333]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(p)}
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Sunting
                      </Button>
                      <Button
                        variant={p.aktif ? 'ghost' : 'secondary'}
                        size="sm"
                        onClick={async () => {
                          const result = await toggleProductActive(p.id);
                          if (!result.ok) {
                            pushToast({
                              type: 'error',
                              title: 'Status produk gagal diubah',
                              message: result.error,
                            });
                          }
                        }}
                      >
                        <Power className="h-3.5 w-3.5" aria-hidden="true" />
                        {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Sunting Paket Katering' : 'Tambah Paket Baru'}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3 text-xs font-semibold text-[#B42318]"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="prod-nama"
              label="Nama Paket (Unik)"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Nasi Box Ayam Bakar"
            />
            <Select
              id="prod-jenis"
              label="Jenis Paket"
              value={jenis}
              onChange={(e) => setJenis(e.target.value as JenisPaket)}
            >
              <option value="Nasi Box">Nasi Box</option>
              <option value="Tumpeng">Tumpeng</option>
              <option value="Prasmanan">Prasmanan</option>
              <option value="Snack Box">Snack Box</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="prod-harga"
              label="Harga per Porsi (Rp)"
              type="number"
              min={1}
              required
              value={hargaStr}
              onChange={(e) => setHargaStr(e.target.value)}
            />
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#243128] cursor-pointer">
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="h-4 w-4 accent-[#245C3D]"
                />
                <span>Tampilkan sebagai paket aktif di katalog</span>
              </label>
            </div>
          </div>

          <Input
            id="prod-ringkasan"
            label="Ringkasan Isi Singkat"
            required
            value={ringkasanIsi}
            onChange={(e) => setRingkasanIsi(e.target.value)}
            placeholder="Contoh: Nasi putih, ayam goreng, sayur tumis, dan sambal."
          />

          <Textarea
            id="prod-deskripsi"
            label="Deskripsi Lengkap"
            rows={2}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />

          <Textarea
            id="prod-isi"
            label="Daftar Isi Paket Lengkap (satu baris per item)"
            rows={3}
            value={isiText}
            onChange={(e) => setIsiText(e.target.value)}
            placeholder={'Nasi putih hangat\nAyam goreng lengkuas\nSambal bajak'}
          />

          <UploadArea
            id="prod-foto"
            label="Foto Paket (JPG/JPEG/PNG maksimal 2 MB)"
            maxSizeMb={2}
            valueUrl={fotoUrl}
            fileName={fotoName}
            error={fotoError}
            onFileSelected={(url, name) => {
              setFotoUrl(url);
              setFotoName(name);
              setFotoError('');
            }}
            onClear={() => {
              setFotoUrl('');
              setFotoName('');
            }}
            onError={(msg) => setFotoError(msg)}
          />

          {/* Composition table */}
          <div className="rounded-xl border border-[#DCE5DA] bg-[#F5F7F4] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[#243128]">
                  Komposisi Bahan &amp; Kemasan per Porsi
                </p>
                <p className="text-xs text-[#55645A]">
                  Produk aktif wajib memiliki minimal satu komposisi.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addCompRow}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Tambah Item
              </Button>
            </div>

            {komposisi.length === 0 ? (
              <p className="text-xs font-medium text-[#B42318]">
                Belum ada baris komposisi.
              </p>
            ) : (
              <div className="space-y-2">
                {komposisi.map((row, idx) => {
                  const invItem = inventory.find((i) => i.id === row.itemId);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg bg-white p-2.5 border border-[#DCE5DA]"
                    >
                      <div className="col-span-6">
                        <select
                          aria-label={`Item komposisi ${idx + 1}`}
                          value={row.itemId}
                          onChange={(e) => {
                            const nextId = Number(e.target.value);
                            setKomposisi((prev) =>
                              prev.map((k, i) =>
                                i === idx ? { ...k, itemId: nextId } : k
                              )
                            );
                          }}
                          className="h-10 w-full rounded-lg border border-[#CBD6C8] px-2.5 text-xs"
                        >
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.nama} ({inv.tipe})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          aria-label={`Jumlah per porsi ${idx + 1}`}
                          value={row.jumlahPerPorsi}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setKomposisi((prev) =>
                              prev.map((k, i) =>
                                i === idx ? { ...k, jumlahPerPorsi: val } : k
                              )
                            );
                          }}
                          className="h-10 w-full rounded-lg border border-[#CBD6C8] px-2.5 text-xs text-right"
                        />
                      </div>
                      <div className="col-span-2 text-xs font-medium text-[#55645A]">
                        {invItem?.satuan ?? '-'}
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeCompRow(idx)}
                          aria-label="Hapus baris komposisi"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#B42318] hover:bg-[#FEF3F2] cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Produk
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

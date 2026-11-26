import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Info,
  Plus,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, Input, Select, Textarea } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type {
  InventoryItem,
  InventoryMutationType,
  InventoryType,
  InventoryUnit,
} from '../../types/domain';
import { formatStockNumber } from '../../utils/format';

export const AdminStockPage: React.FC = () => {
  const { inventory, createInventoryItem, mutateInventory } = useApp();

  const [activeTypeTab, setActiveTypeTab] =
    useState<InventoryType>('Bahan Baku');
  const [formMode, setFormMode] = useState<'mutasi' | 'baru'>('mutasi');

  // Mutasi form
  const [selectedItemId, setSelectedItemId] = useState<number>(
    () => inventory[0]?.id ?? 1
  );
  const [jenisMutasi, setJenisMutasi] =
    useState<InventoryMutationType>('Tambah');
  const [jumlahStr, setJumlahStr] = useState('');
  const [batasMinStr, setBatasMinStr] = useState('');
  const [updateBatasMin, setUpdateBatasMin] = useState(false);
  const [keterangan, setKeterangan] = useState('');

  // New item form
  const [newNama, setNewNama] = useState('');
  const [newTipe, setNewTipe] = useState<InventoryType>('Bahan Baku');
  const [newSatuan, setNewSatuan] = useState<InventoryUnit>('kg');
  const [newStokAwal, setNewStokAwal] = useState('0');
  const [newBatasMin, setNewBatasMin] = useState('');

  const [formError, setFormError] = useState('');

  const filteredItems = useMemo(
    () => inventory.filter((i) => i.tipe === activeTypeTab),
    [inventory, activeTypeTab]
  );

  const selectedItem = inventory.find((i) => i.id === Number(selectedItemId));

  const validateMax3Decimals = (valStr: string) => {
    if (!/^\d+(\.\d{1,3})?$/.test(valStr.trim())) {
      return false;
    }
    return true;
  };

  const handleMutasiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedItem) {
      setFormError('Pilih item stok terlebih dahulu.');
      return;
    }
    if (!jumlahStr.trim() || !validateMax3Decimals(jumlahStr)) {
      setFormError('Jumlah harus angka non-negatif dengan maksimal 3 angka desimal.');
      return;
    }

    let nextBatas: number | null | undefined = undefined;
    if (updateBatasMin) {
      if (!batasMinStr.trim()) {
        nextBatas = null;
      } else if (!validateMax3Decimals(batasMinStr)) {
        setFormError('Batas minimum maksimal 3 angka desimal.');
        return;
      } else {
        nextBatas = Number(batasMinStr);
      }
    }

    const res = mutateInventory({
      itemId: selectedItem.id,
      jenisMutasi,
      jumlah: Number(jumlahStr),
      batasMinimum: nextBatas,
      keterangan,
    });

    if (!res.ok) {
      setFormError(res.error || 'Gagal memperbarui stok.');
      return;
    }

    setJumlahStr('');
    setKeterangan('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newNama.trim()) {
      setFormError('Nama item wajib diisi.');
      return;
    }
    if (!validateMax3Decimals(newStokAwal)) {
      setFormError('Stok awal harus angka >= 0 dengan maksimal 3 angka desimal.');
      return;
    }
    if (newBatasMin.trim() && !validateMax3Decimals(newBatasMin)) {
      setFormError('Batas minimum maksimal 3 angka desimal.');
      return;
    }

    const res = createInventoryItem({
      nama: newNama,
      tipe: newTipe,
      satuan: newSatuan,
      stokAwal: Number(newStokAwal),
      batasMinimum: newBatasMin.trim() ? Number(newBatasMin) : null,
    });

    if (!res.ok || !res.item) {
      setFormError(res.error || 'Gagal menambahkan item.');
      return;
    }

    setActiveTypeTab(res.item.tipe);
    setSelectedItemId(res.item.id);
    setNewNama('');
    setNewStokAwal('0');
    setNewBatasMin('');
    setFormMode('mutasi');
  };

  const renderCondition = (item: InventoryItem) => {
    if (item.batasMinimum === null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#CBD6C8] bg-[#F5F7F4] px-2.5 py-1 text-xs font-medium text-[#55645A]">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          Belum diatur
        </span>
      );
    }
    if (item.stok <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#FECDCA] bg-[#FEF3F2] px-2.5 py-1 text-xs font-semibold text-[#B42318]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Habis
        </span>
      );
    }
    if (item.stok <= item.batasMinimum) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D88C] bg-[#FEF7E0] px-2.5 py-1 text-xs font-semibold text-[#855800]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Stok Menipis
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#A8DAB5] bg-[#E6F4EA] px-2.5 py-1 text-xs font-semibold text-[#137333]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Aman
      </span>
    );
  };

  return (
    <AdminLayout
      title="Kelola Stok Bahan &amp; Kemasan"
      subtitle="Pisahkan Bahan Baku dan Kemasan, catat penambahan, pengurangan, atau koreksi absolut."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Inventory Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['Bahan Baku', 'Kemasan'] as InventoryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTypeTab(t)}
                className={`min-h-[42px] rounded-full px-5 text-sm font-semibold cursor-pointer ${
                  activeTypeTab === t
                    ? 'bg-[#245C3D] text-white'
                    : 'border border-[#DCE5DA] bg-white text-[#243128]'
                }`}
              >
                {t} ({inventory.filter((i) => i.tipe === t).length})
              </button>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#DCE5DA] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                  <tr>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-right">Stok</th>
                    <th className="px-4 py-3 text-left">Satuan</th>
                    <th className="px-4 py-3 text-right">Batas Minimum</th>
                    <th className="px-4 py-3 text-left">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EC]">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setFormMode('mutasi');
                        setBatasMinStr(
                          item.batasMinimum !== null
                            ? String(item.batasMinimum)
                            : ''
                        );
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedItemId === item.id && formMode === 'mutasi'
                          ? 'bg-[#EEF5EC]/70'
                          : 'hover:bg-[#F5F7F4]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#243128]">
                          {item.nama}
                        </p>
                        <p className="text-[11px] text-[#55645A]">
                          {item.sudahDigunakan
                            ? 'Sudah dipakai pada komposisi/pesanan (satuan terkunci)'
                            : 'Belum digunakan'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#243128]">
                        {formatStockNumber(item.stok)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#55645A]">
                        {item.satuan}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#55645A]">
                        {item.batasMinimum !== null
                          ? `${formatStockNumber(item.batasMinimum)} ${item.satuan}`
                          : 'Belum diatur'}
                      </td>
                      <td className="px-4 py-3">{renderCondition(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Mutasi or Add New Item Form */}
        <div className="lg:col-span-5">
          <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F5F7F4] p-1">
              <button
                type="button"
                onClick={() => {
                  setFormMode('mutasi');
                  setFormError('');
                }}
                className={`min-h-[38px] rounded-lg text-xs font-bold cursor-pointer ${
                  formMode === 'mutasi'
                    ? 'bg-white text-[#245C3D] shadow-xs'
                    : 'text-[#55645A]'
                }`}
              >
                <Boxes className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Ubah Stok Item
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormMode('baru');
                  setFormError('');
                }}
                className={`min-h-[38px] rounded-lg text-xs font-bold cursor-pointer ${
                  formMode === 'baru'
                    ? 'bg-white text-[#245C3D] shadow-xs'
                    : 'text-[#55645A]'
                }`}
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Tambah Item Baru
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-3 text-xs font-semibold text-[#B42318]"
              >
                {formError}
              </div>
            )}

            {formMode === 'mutasi' ? (
              <form onSubmit={handleMutasiSubmit} className="space-y-4">
                <Select
                  id="stok-item"
                  label="Pilih Item Inventaris"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(Number(e.target.value))}
                >
                  {inventory.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nama} ({i.tipe}) — {formatStockNumber(i.stok)}{' '}
                      {i.satuan}
                    </option>
                  ))}
                </Select>

                {selectedItem && (
                  <div className="rounded-xl bg-[#F5F7F4] p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#55645A]">Stok Saat Ini</span>
                      <span className="font-bold text-[#243128]">
                        {formatStockNumber(selectedItem.stok)}{' '}
                        {selectedItem.satuan}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#55645A]">Satuan</span>
                      <span className="font-semibold">
                        {selectedItem.satuan}{' '}
                        {selectedItem.sudahDigunakan ? '(Terkunci)' : ''}
                      </span>
                    </div>
                  </div>
                )}

                <Select
                  id="stok-mutasi"
                  label="Jenis Perubahan"
                  value={jenisMutasi}
                  onChange={(e) =>
                    setJenisMutasi(e.target.value as InventoryMutationType)
                  }
                >
                  <option value="Tambah">Tambah</option>
                  <option value="Kurang">Kurang</option>
                  <option value="Koreksi Absolut">Koreksi Absolut</option>
                </Select>

                <Input
                  id="stok-jumlah"
                  label={`Jumlah (${selectedItem?.satuan ?? ''})`}
                  type="text"
                  inputMode="decimal"
                  required
                  value={jumlahStr}
                  onChange={(e) => setJumlahStr(e.target.value)}
                  placeholder="Contoh: 15 atau 2.500"
                  helper="Maksimal 3 angka desimal. Stok tidak boleh menjadi negatif."
                />

                <div className="space-y-2 rounded-xl border border-[#EEF2EC] p-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#243128] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateBatasMin}
                      onChange={(e) => setUpdateBatasMin(e.target.checked)}
                      className="h-4 w-4 accent-[#245C3D]"
                    />
                    <span>Ubah batas minimum item ini (opsional)</span>
                  </label>
                  {updateBatasMin && (
                    <Input
                      id="stok-min-edit"
                      label="Batas Minimum Baru (kosongkan untuk Belum diatur)"
                      type="text"
                      inputMode="decimal"
                      value={batasMinStr}
                      onChange={(e) => setBatasMinStr(e.target.value)}
                      placeholder="Kosong = Belum diatur"
                    />
                  )}
                </div>

                <Textarea
                  id="stok-ket"
                  label={
                    jenisMutasi === 'Koreksi Absolut'
                      ? 'Keterangan (Wajib untuk Koreksi Absolut)'
                      : 'Keterangan (Opsional)'
                  }
                  required={jenisMutasi === 'Koreksi Absolut'}
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Belanja pasar pagi atau hasil stok opname fisik."
                />

                <Button type="submit" variant="primary" className="w-full">
                  Simpan Perubahan Stok
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <Input
                  id="new-item-nama"
                  label="Nama Item Baru"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Daun Pisang"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    id="new-item-tipe"
                    label="Tipe"
                    value={newTipe}
                    onChange={(e) => setNewTipe(e.target.value as InventoryType)}
                  >
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Kemasan">Kemasan</option>
                  </Select>
                  <Select
                    id="new-item-satuan"
                    label="Satuan"
                    value={newSatuan}
                    onChange={(e) =>
                      setNewSatuan(e.target.value as InventoryUnit)
                    }
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="new-item-stok"
                    label="Stok Awal"
                    type="text"
                    inputMode="decimal"
                    required
                    value={newStokAwal}
                    onChange={(e) => setNewStokAwal(e.target.value)}
                  />
                  <Input
                    id="new-item-min"
                    label="Batas Minimum (Opsional)"
                    type="text"
                    inputMode="decimal"
                    value={newBatasMin}
                    onChange={(e) => setNewBatasMin(e.target.value)}
                    placeholder="Kosong = Belum diatur"
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full">
                  Tambah Item Inventaris
                </Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

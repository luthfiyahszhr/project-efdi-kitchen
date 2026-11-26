import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { StoreStatusBanner } from '../../components/ui/Badges';
import {
  Button,
  DatePicker,
  Input,
  Select,
  Textarea,
  TimePicker,
} from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { OrderChannel } from '../../types/domain';
import {
  addDaysIso,
  formatRupiah,
  getTodayWibDate,
  getWibParts,
  isValidIndonesianPhone,
} from '../../utils/format';

interface LineDraft {
  rowKey: string;
  produkId: number;
  jumlahPorsi: string;
}

export const OrderFormPage: React.FC = () => {
  const {
    currentUser,
    products,
    effectiveStoreStatus,
    orderDraft,
    setOrderDraft,
    createOrder,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isStaff =
    currentUser?.role === 'Admin' || currentUser?.role === 'Owner';
  const activeProducts = useMemo(
    () => products.filter((p) => p.aktif),
    [products]
  );

  const initialChannel: OrderChannel =
    isStaff && searchParams.get('kanal') === 'datang-langsung'
      ? 'Datang Langsung'
      : 'Online';

  const todayWib = getTodayWibDate();
  const tomorrowWib = addDaysIso(todayWib, 1);

  const [kanalState, setKanalState] = useState<OrderChannel>(initialChannel);
  const kanal: OrderChannel = isStaff ? kanalState : 'Online';
  const setKanal = setKanalState;
  const [namaPelanggan, setNamaPelanggan] = useState(() =>
    initialChannel === 'Online' && currentUser?.role === 'Customer'
      ? currentUser.namaLengkap
      : ''
  );
  const [noKontak, setNoKontak] = useState(() =>
    initialChannel === 'Online' && currentUser?.role === 'Customer'
      ? '081234567890'
      : ''
  );
  const [tanggalAcara, setTanggalAcara] = useState(() =>
    initialChannel === 'Datang Langsung' ? todayWib : tomorrowWib
  );
  const [waktuAcara, setWaktuAcara] = useState('12:00');
  const [catatan, setCatatan] = useState('');

  const [rows, setRows] = useState<LineDraft[]>(() => {
    if (orderDraft?.items && orderDraft.items.length > 0) {
      return orderDraft.items.map((it, idx) => ({
        rowKey: `row-${idx}-${Date.now()}`,
        produkId: it.produkId,
        jumlahPorsi: String(it.jumlahPorsi),
      }));
    }
    return [
      {
        rowKey: `row-0-${Date.now()}`,
        produkId: activeProducts[0]?.id ?? 1,
        jumlahPorsi: '20',
      },
    ];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const parsedLines = useMemo(() => {
    return rows.map((r) => {
      const prod = activeProducts.find((p) => p.id === Number(r.produkId));
      const qty = Number(r.jumlahPorsi);
      const validQty = Number.isInteger(qty) && qty >= 1 ? qty : 0;
      const subtotal = prod ? prod.hargaPerPorsi * validQty : 0;
      return {
        ...r,
        prod,
        qty: validQty,
        subtotal,
      };
    });
  }, [rows, activeProducts]);

  const totalHarga = useMemo(
    () => parsedLines.reduce((sum, l) => sum + l.subtotal, 0),
    [parsedLines]
  );
  const dpMinimum = Math.ceil(totalHarga * 0.5);

  const addRow = () => {
    const unused = activeProducts.find(
      (p) => !rows.some((r) => r.produkId === p.id)
    );
    setRows((prev) => [
      ...prev,
      {
        rowKey: `row-${Date.now()}-${Math.random()}`,
        produkId: unused?.id ?? activeProducts[0]?.id ?? 1,
        jumlahPorsi: '10',
      },
    ]);
  };

  const removeRow = (rowKey: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.rowKey !== rowKey));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!effectiveStoreStatus.isOpen) {
      setSubmitError(
        'Pemesanan sedang tutup. Isian formulir Anda tetap dipertahankan hingga pemesanan dibuka kembali.'
      );
      return;
    }

    const nextErrors: Record<string, string> = {};
    const nameTrim = namaPelanggan.trim();
    if (nameTrim.length < 2 || nameTrim.length > 100) {
      nextErrors.namaPelanggan = 'Nama pemesan harus antara 2–100 karakter.';
    }

    if (!isValidIndonesianPhone(noKontak)) {
      nextErrors.noKontak =
        'Nomor kontak harus 10–15 digit dengan awalan 08 atau +62.';
    }

    if (!tanggalAcara) {
      nextErrors.tanggalAcara = 'Tanggal acara wajib dipilih.';
    } else if (kanal === 'Online' && tanggalAcara < tomorrowWib) {
      nextErrors.tanggalAcara =
        'Pesanan online minimal untuk besok (H+1) dalam waktu WIB.';
    } else if (kanal === 'Datang Langsung') {
      if (tanggalAcara < todayWib) {
        nextErrors.tanggalAcara = 'Tanggal acara tidak boleh di masa lalu.';
      } else if (tanggalAcara === todayWib) {
        const wibNow = getWibParts(new Date());
        if (!waktuAcara || waktuAcara <= wibNow.timeShort) {
          nextErrors.waktuAcara = `Untuk acara hari ini, waktu acara harus setelah pukul ${wibNow.timeShort} WIB.`;
        }
      }
    }

    if (!waktuAcara) {
      nextErrors.waktuAcara = 'Waktu acara wajib dipilih.';
    }

    if (catatan.length > 500) {
      nextErrors.catatan = 'Catatan maksimal 500 karakter.';
    }

    const itemErrors: string[] = [];
    rows.forEach((r, idx) => {
      const n = Number(r.jumlahPorsi);
      if (!Number.isInteger(n) || n < 1) {
        nextErrors[`row-${r.rowKey}`] =
          'Jumlah porsi harus bilangan bulat minimal 1.';
        itemErrors.push(`Baris ${idx + 1}`);
      }
    });
    if (rows.length === 0) {
      nextErrors.items = 'Tambahkan minimal satu paket.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const res = await createOrder({
      namaPelanggan,
      noKontak,
      kanal,
      tanggalAcara,
      waktuAcara,
      catatan,
      items: rows.map((r) => ({
        produkId: Number(r.produkId),
        jumlahPorsi: Number(r.jumlahPorsi),
      })),
    });

    if (!res.ok || !res.order) {
      setSubmitError(res.error || 'Gagal membuat pesanan.');
      return;
    }

    setOrderDraft(null);
    navigate(`/pesanan/${res.order.kodePesanan}/ringkasan`);
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-brand text-2xl font-bold text-[#243128] sm:text-3xl">
            Formulir Pemesanan Katering
          </h1>
          <p className="mt-1 text-sm text-[#55645A]">
            Lengkapi rincian pemesan, pilihan paket, dan jadwal acara Anda
            (waktu WIB).
          </p>
        </div>

        <div className="mb-6">
          <StoreStatusBanner status={effectiveStoreStatus} />
        </div>

        {!effectiveStoreStatus.isOpen && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#B42318]"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">
                Pembuatan pesanan dinonaktifkan sementara
              </p>
              <p className="mt-0.5 text-xs">
                Toko sedang tutup. Seluruh isian yang sudah Anda ketik tetap
                dipertahankan di halaman ini dan tidak akan hilang.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#B42318]"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          {/* Left Form Columns */}
          <div className="space-y-6 lg:col-span-8">
            {/* Channel selector only for Admin/Owner */}
            {isStaff && (
              <section className="rounded-2xl border border-[#DCE5DA] bg-[#EEF5EC]/60 p-5">
                <h2 className="text-base font-bold text-[#243128]">
                  Kanal Pemesanan (Pengelola)
                </h2>
                <p className="mt-0.5 text-xs text-[#55645A]">
                  Pilih Datang Langsung untuk mencatat pesanan pelanggan yang
                  datang langsung ke dapur.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(['Datang Langsung', 'Online'] as OrderChannel[]).map(
                    (ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          setKanal(ch);
                          if (ch === 'Online' && tanggalAcara < tomorrowWib) {
                            setTanggalAcara(tomorrowWib);
                          }
                        }}
                        className={`min-h-[42px] rounded-[10px] border px-4 text-sm font-semibold cursor-pointer ${
                          kanal === ch
                            ? 'border-[#245C3D] bg-[#245C3D] text-white'
                            : 'border-[#CBD6C8] bg-white text-[#243128]'
                        }`}
                      >
                        {ch}
                      </button>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Section 1: Data Pemesan */}
            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#243128]">
                1. Data Pemesan
              </h2>
              <p className="mt-0.5 text-xs text-[#55645A]">
                {kanal === 'Datang Langsung'
                  ? 'Isi nama dan nomor kontak pelanggan sebenarnya.'
                  : 'Digunakan untuk pencatatan nota dan konfirmasi pesanan.'}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="order-nama"
                  label="Nama Pemesan"
                  required
                  value={namaPelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                  placeholder="Nama lengkap pemesan"
                  error={errors.namaPelanggan}
                />
                <Input
                  id="order-kontak"
                  label="Nomor Kontak (WhatsApp/HP)"
                  required
                  value={noKontak}
                  onChange={(e) => setNoKontak(e.target.value)}
                  placeholder="Contoh: 081234567890 atau +62812..."
                  helper="10–15 digit, diawali 08 atau +62"
                  error={errors.noKontak}
                />
              </div>
            </section>

            {/* Section 2: Rincian Paket */}
            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#243128]">
                    2. Rincian Paket
                  </h2>
                  <p className="mt-0.5 text-xs text-[#55645A]">
                    Pilih satu atau lebih paket katering beserta jumlah porsinya.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Tambah Paket
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                {parsedLines.map((line, index) => (
                  <div
                    key={line.rowKey}
                    className="rounded-xl border border-[#DCE5DA] bg-[#F5F7F4]/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-[#245C3D]">
                        Paket #{index + 1}
                      </span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(line.rowKey)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-7">
                        <Select
                          id={`paket-${line.rowKey}`}
                          label="Pilih Paket Aktif"
                          required
                          value={line.produkId}
                          onChange={(e) => {
                            const nextId = Number(e.target.value);
                            setRows((prev) =>
                              prev.map((r) =>
                                r.rowKey === line.rowKey
                                  ? { ...r, produkId: nextId }
                                  : r
                              )
                            );
                          }}
                        >
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nama} — {formatRupiah(p.hargaPerPorsi)}/porsi
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="sm:col-span-5">
                        <Input
                          id={`porsi-${line.rowKey}`}
                          label="Jumlah Porsi"
                          type="number"
                          min={1}
                          step={1}
                          required
                          value={line.jumlahPorsi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows((prev) =>
                              prev.map((r) =>
                                r.rowKey === line.rowKey
                                  ? { ...r, jumlahPorsi: val }
                                  : r
                              )
                            );
                          }}
                          error={errors[`row-${line.rowKey}`]}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[#DCE5DA] pt-2.5 text-xs">
                      <span className="text-[#55645A]">Subtotal baris ini</span>
                      <span className="font-bold text-[#243128]">
                        {formatRupiah(line.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Jadwal & Catatan */}
            <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#243128]">
                3. Tanggal, Waktu Acara (WIB) &amp; Catatan
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePicker
                  id="order-tanggal"
                  label="Tanggal Acara"
                  required
                  min={kanal === 'Datang Langsung' ? todayWib : tomorrowWib}
                  value={tanggalAcara}
                  onChange={(e) => setTanggalAcara(e.target.value)}
                  helper={
                    kanal === 'Datang Langsung'
                      ? 'Boleh hari ini selama waktu acara belum lewat'
                      : 'Pesanan online minimal H+1 (mulai besok)'
                  }
                  error={errors.tanggalAcara}
                />

                <TimePicker
                  id="order-waktu"
                  label="Waktu Pengambilan / Acara (WIB)"
                  required
                  value={waktuAcara}
                  onChange={(e) => setWaktuAcara(e.target.value)}
                  helper="Seluruh waktu dalam zona WIB"
                  error={errors.waktuAcara}
                />
              </div>

              <div className="mt-4">
                <Textarea
                  id="order-catatan"
                  label="Catatan atau Preferensi (Opsional)"
                  rows={3}
                  maxLength={500}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: sambal dipisah, tidak memakai kacang, atau catatan pengambilan."
                  helper={`${catatan.length}/500 karakter`}
                  error={errors.catatan}
                />
              </div>
            </section>
          </div>

          {/* Right Summary Column (desktop) / Bottom (mobile) */}
          <div className="lg:col-span-4">
            <aside className="sticky top-24 rounded-2xl border border-[#DCE5DA] bg-white p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-bold text-[#243128]">
                Ringkasan Estimasi Harga
              </h2>
              <p className="mt-0.5 text-xs text-[#55645A]">
                Kanal: <strong className="text-[#243128]">{kanal}</strong>
              </p>

              <div className="mt-4 divide-y divide-[#EEF2EC] border-t border-b border-[#EEF2EC]">
                {parsedLines.map((l) => (
                  <div
                    key={l.rowKey}
                    className="flex items-start justify-between gap-2 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#243128]">
                        {l.prod?.nama ?? '-'}
                      </p>
                      <p className="text-xs text-[#55645A]">
                        {l.qty} porsi ×{' '}
                        {formatRupiah(l.prod?.hargaPerPorsi ?? 0)}
                      </p>
                    </div>
                    <span className="font-semibold text-[#243128] whitespace-nowrap">
                      {formatRupiah(l.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#243128]">
                    Total Estimasi
                  </span>
                  <span className="text-xl font-bold text-[#245C3D]">
                    {formatRupiah(totalHarga)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#EEF5EC] px-3.5 py-2.5">
                  <span className="text-xs font-semibold text-[#245C3D]">
                    DP Minimum (50%)
                  </span>
                  <span className="text-sm font-bold text-[#245C3D]">
                    {formatRupiah(dpMinimum)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#55645A]">
                  Setelah pesanan dibuat, Anda akan mendapatkan kode pesanan,
                  nota digital, dan instruksi pembayaran DP.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={!effectiveStoreStatus.isOpen}
                className="mt-5 w-full"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Buat Pesanan
              </Button>
            </aside>
          </div>
        </form>
      </div>
    </CustomerLayout>
  );
};

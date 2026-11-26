import React, { useMemo, useState } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { StoreStatusBanner } from '../../components/ui/Badges';
import { Button } from '../../components/ui/FormControls';
import { useApp } from '../../context/AppContext';
import type { DaySchedule, OperationalMode } from '../../types/domain';
import { computeEffectiveStoreStatus } from '../../utils/format';

export const AdminSettingsPage: React.FC = () => {
  const { operationalSettings, saveOperationalSettings } = useApp();

  const [mode, setMode] = useState<OperationalMode>(operationalSettings.mode);
  const [jadwal, setJadwal] = useState<DaySchedule[]>(() =>
    operationalSettings.jadwal.map((j) => ({ ...j }))
  );
  const [errorMsg, setErrorMsg] = useState('');

  const previewStatus = useMemo(
    () => computeEffectiveStoreStatus({ mode, jadwal }),
    [mode, jadwal]
  );

  const handleDayChange = (
    idx: number,
    patch: Partial<DaySchedule>
  ) => {
    setJadwal((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = await saveOperationalSettings({ mode, jadwal });
    if (!res.ok) {
      setErrorMsg(res.error || 'Gagal menyimpan pengaturan.');
    }
  };

  return (
    <AdminLayout
      title="Pengaturan Operasional"
      subtitle="Atur mode pemesanan (Otomatis, Dibuka Manual, Ditutup Manual) dan jadwal operasional Senin–Minggu (WIB)."
    >
      {/* Live Effective Status Preview */}
      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#55645A]">
          Status Efektif Saat Ini (Pratinjau Langsung)
        </p>
        <StoreStatusBanner status={previewStatus} />
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-sm text-[#B42318]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Operational */}
        <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-[#243128]">
            Mode Pemesanan
          </h2>
          <p className="mt-0.5 text-xs text-[#55645A]">
            Mode manual (Dibuka Manual / Ditutup Manual) mengesampingkan jadwal
            harian.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                {
                  val: 'Otomatis',
                  desc: 'Mengikuti jam buka & tutup Senin–Minggu WIB.',
                },
                {
                  val: 'Dibuka Manual',
                  desc: 'Pemesanan dibuka terus hingga mode diubah.',
                },
                {
                  val: 'Ditutup Manual',
                  desc: 'Pemesanan ditutup sementara (mengesampingkan jadwal).',
                },
              ] as { val: OperationalMode; desc: string }[]
            ).map((opt) => {
              const selected = mode === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setMode(opt.val)}
                  className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#245C3D] bg-[#EEF5EC]'
                      : 'border-[#DCE5DA] bg-white hover:bg-[#F5F7F4]'
                  }`}
                >
                  <p className="text-sm font-bold text-[#243128]">{opt.val}</p>
                  <p className="mt-1 text-xs text-[#55645A]">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Weekly Schedule Table */}
        <section className="rounded-2xl border border-[#DCE5DA] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#243128]">
                Jadwal Mingguan (Waktu WIB)
              </h2>
              <p className="text-xs text-[#55645A]">
                Jam buka harus sebelum jam tutup pada hari yang sama. Jika
                semua hari libur/kosong, pemesanan otomatis tutup.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#DCE5DA]">
            <table className="w-full min-w-[540px] text-sm">
              <thead className="bg-[#EEF5EC] text-xs font-semibold text-[#243128]">
                <tr>
                  <th className="px-4 py-3 text-left">Hari</th>
                  <th className="px-4 py-3 text-left">Status Hari</th>
                  <th className="px-4 py-3 text-left">Jam Buka (WIB)</th>
                  <th className="px-4 py-3 text-left">Jam Tutup (WIB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EC]">
                {jadwal.map((day, idx) => (
                  <tr key={day.hari}>
                    <td className="px-4 py-3 font-semibold text-[#243128]">
                      {day.hari}
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.aktif}
                          onChange={(e) =>
                            handleDayChange(idx, { aktif: e.target.checked })
                          }
                          className="h-4 w-4 accent-[#245C3D]"
                        />
                        <span
                          className={
                            day.aktif ? 'text-[#245C3D]' : 'text-[#55645A]'
                          }
                        >
                          {day.aktif ? 'Hari Aktif' : 'Libur'}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        aria-label={`Jam buka ${day.hari}`}
                        disabled={!day.aktif}
                        value={day.jamBuka}
                        onChange={(e) =>
                          handleDayChange(idx, { jamBuka: e.target.value })
                        }
                        className="h-10 rounded-lg border border-[#CBD6C8] bg-white px-3 text-sm disabled:bg-[#F5F7F4] disabled:text-[#7E8D83]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        aria-label={`Jam tutup ${day.hari}`}
                        disabled={!day.aktif}
                        value={day.jamTutup}
                        onChange={(e) =>
                          handleDayChange(idx, { jamTutup: e.target.value })
                        }
                        className="h-10 rounded-lg border border-[#CBD6C8] bg-white px-3 text-sm disabled:bg-[#F5F7F4] disabled:text-[#7E8D83]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              <Save className="h-4 w-4" aria-hidden="true" />
              Simpan Pengaturan
            </Button>
          </div>
        </section>
      </form>
    </AdminLayout>
  );
};

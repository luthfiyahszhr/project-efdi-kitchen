import { sql } from '../config/database';
import { nowWIB } from '../utils/datetime';

/**
 * Nomor nota format NOTA-YYYYMMDD-NNNN (CK_Nota_format).
 * Harus dipanggil di dalam transaksi: UPDLOCK + HOLDLOCK mengunci rentang nomor hari ini
 * sehingga dua request bersamaan tidak mendapat nomor yang sama.
 */
export async function terbitkanNomorNota(trx: sql.Transaction): Promise<string> {
  const tanggal = nowWIB().format('YYYYMMDD');
  const r = await new sql.Request(trx)
    .input('pola', sql.VarChar(40), `NOTA-${tanggal}-[0-9][0-9][0-9][0-9]`)
    .query(`
      SELECT ISNULL(MAX(CAST(RIGHT(nomor_nota, 4) AS INT)), 0) AS terakhir
      FROM dbo.NotaDigital WITH (UPDLOCK, HOLDLOCK)
      WHERE nomor_nota LIKE @pola
    `);
  const seq = Number(r.recordset[0].terakhir) + 1;
  return `NOTA-${tanggal}-${String(seq).padStart(4, '0')}`;
}

export async function simpanNota(params: {
  trx: sql.Transaction;
  idPesanan: number;
  total: number;
  nominalDp: number;
  sisa: number;
  nomorNota: string;
}): Promise<void> {
  await new sql.Request(params.trx)
    .input('nomor', sql.VarChar(18), params.nomorNota)
    .input('idPesanan', sql.Int, params.idPesanan)
    .input('total', sql.Decimal(14, 2), params.total)
    .input('dp', sql.Decimal(14, 2), params.nominalDp)
    .input('sisa', sql.Decimal(14, 2), params.sisa)
    .query(`
      INSERT INTO dbo.NotaDigital (nomor_nota, id_pesanan, total_tagihan, nominal_dp, sisa_pembayaran)
      VALUES (@nomor, @idPesanan, @total, @dp, @sisa)
    `);
}

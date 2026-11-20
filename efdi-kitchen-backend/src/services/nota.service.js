const { getPool, sql } = require('../config/database');
const { dayjs } = require('../utils/datetime');

async function terbitkanNomorNota(pool) {
  const today = dayjs().format('YYYYMMDD');
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await pool.request()
      .input('prefix', `NOTA-${today}-%`)
      .query(`SELECT COUNT(*) AS c FROM nota_digital WHERE nomor_nota LIKE @prefix`);
    const seq = String(r.recordset[0].c + 1 + attempt).padStart(4, '0');
    return `NOTA-${today}-${seq}`;
  }
}

async function simpanNota({ transaction, idPesanan, total, nominalDp, sisa, nomorNota }) {
  const req = new sql.Request(transaction);
  await req
    .input('nomor', nomorNota)
    .input('idPesanan', idPesanan)
    .input('total', total)
    .input('dp', nominalDp)
    .input('sisa', sisa)
    .query(`
      INSERT INTO nota_digital (nomor_nota, id_pesanan, total_tagihan, nominal_dp, sisa_pembayaran)
      VALUES (@nomor, @idPesanan, @total, @dp, @sisa)
    `);
}

module.exports = { terbitkanNomorNota, simpanNota };
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getPool, sql } = require('../config/database');
const { ok } = require('../utils/response');
const { AppError } = require('../utils/errors');

const sign = (u) => jwt.sign({ id: u.id, role: u.role, email: u.email }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

exports.register = async (req, res, next) => {
  try {
    const { nama, email, password } = req.body;
    const pool = await getPool();
    const exists = await pool.request().input('e', email)
      .query(`SELECT TOP 1 id FROM users WHERE email=@e`);
    if (exists.recordset[0]) throw new AppError('ERR-VAL-01', 409, 'Email sudah digunakan');

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.request()
      .input('nama', nama)
      .input('email', email)
      .input('hash', hash)
      .query(`
        INSERT INTO users (nama, email, password_hash, role)
        OUTPUT INSERTED.id, INSERTED.nama, INSERTED.email, INSERTED.role
        VALUES (@nama, @email, @hash, 'CUSTOMER')
      `);
    const user = r.recordset[0];
    return ok(res, { user, token: sign(user) }, 201);
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const pool = await getPool();
    const r = await pool.request().input('e', email)
      .query(`SELECT TOP 1 * FROM users WHERE email=@e AND is_active=1`);
    const user = r.recordset[0];
    if (!user) throw new AppError('ERR-AUTH-01', 401, 'Email/password salah');
    const okPw = await bcrypt.compare(password, user.password_hash);
    if (!okPw) throw new AppError('ERR-AUTH-01', 401, 'Email/password salah');

    return ok(res, {
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role },
      token: sign(user),
    });
  } catch (e) { next(e); }
};

exports.logout = (req, res) => ok(res, { message: 'Logged out' });
exports.me = (req, res) => ok(res, req.user);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

if (!fs.existsSync(env.upload.dir)) fs.mkdirSync(env.upload.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.upload.dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bukti_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
  if (!ok) return cb(new AppError('ERR-VAL-05', 422, 'File harus JPG/JPEG/PNG'));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxSize },
});

module.exports = { upload };
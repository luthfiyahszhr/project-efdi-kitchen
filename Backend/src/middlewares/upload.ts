import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

if (!fs.existsSync(env.upload.dir)) fs.mkdirSync(env.upload.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.upload.dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `bukti_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const imageFileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
  if (!ok) return cb(new AppError('ERR-VAL-05', 422, 'File harus JPG/JPEG/PNG'));
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: Math.min(env.upload.maxSize, 5 * 1024 * 1024) },
});

export const uploadProduct = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} wajib diisi di file .env`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  googleRecaptchaSecret: process.env.GOOGLE_RECAPTCHA_SECRET || '',
  db: {
    host: required('DB_HOST'),
    port: parseInt(process.env.DB_PORT || '1433', 10),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'src/uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },
};

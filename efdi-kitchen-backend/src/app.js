const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// static untuk file bukti & foto produk
app.use('/files', express.static(path.resolve(env.upload.dir)));

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date() }));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
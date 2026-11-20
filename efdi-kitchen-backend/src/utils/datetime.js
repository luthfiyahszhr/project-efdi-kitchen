const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';
const nowWIB = () => dayjs().tz(TZ);
const toWIB = (d) => dayjs(d).tz(TZ);

module.exports = { dayjs, TZ, nowWIB, toWIB };
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TZ = 'Asia/Jakarta';

/** Waktu sekarang dalam WIB. */
export const nowWIB = () => dayjs().tz(TZ);

export const toWIB = (value: Date | string) => dayjs.utc(value).tz(TZ).format();

/** Waktu sekarang di sisi SQL untuk kolom datetime2 yang menyimpan UTC. */
export const SQL_NOW_UTC = 'SYSUTCDATETIME()';

export { dayjs };

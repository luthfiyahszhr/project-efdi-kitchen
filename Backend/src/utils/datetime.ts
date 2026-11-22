import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TZ = 'Asia/Jakarta';

/** Waktu sekarang dalam WIB. */
export const nowWIB = () => dayjs().tz(TZ);

/** Waktu sekarang di sisi SQL, WIB tanpa zona (sama dengan default kolom di schema). */
export const SQL_NOW_WIB = "CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS DATETIME2(0))";

export { dayjs };

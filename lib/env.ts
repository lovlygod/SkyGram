import { cleanEnv, num, str } from 'envalid';

export const env = cleanEnv(process.env, {
  DATABASE_URL: str({
    default: 'file:./SkyGram.sqlite',
  }),
  TELEGRAM_API_ID: num(),
  TELEGRAM_API_HASH: str(),
});

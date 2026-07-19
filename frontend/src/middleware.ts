import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // API route'ları, statik dosyalar ve nokta içeren yolları (favicon.ico vb.) hariç tut
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)'
};

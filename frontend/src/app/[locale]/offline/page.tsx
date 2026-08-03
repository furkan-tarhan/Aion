'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function OfflinePage() {
  const t = useTranslations('offline');

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900">
      <div className="max-w-md w-full text-center bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 dark:border-blue-800 p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('description')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          {t('retry')}
        </Link>
      </div>
    </main>
  );
}

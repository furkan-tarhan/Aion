'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';

const DISMISS_KEY = 'loopskins_push_prompt_dismissed';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushPrompt() {
  const t = useTranslations('push');
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      return;
    }
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    // Serwist SW production'da aktif; dev'de genelde yok — o durumda banner gösterme.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) setVisible(true);
    });
  }, [isAuthenticated]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismiss();
        return;
      }

      const { data } = await notificationsApi.getVapidPublicKey();
      if (!data?.publicKey) {
        dismiss();
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      await notificationsApi.subscribePush(subscription.toJSON());
      dismiss();
    } catch {
      // VAPID yoksa veya SW yoksa sessizce kapat
      dismiss();
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-xl border border-gray-200 dark:border-blue-800 bg-white dark:bg-blue-950 shadow-xl p-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('title')}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t('description')}</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-blue-900"
          >
            {t('later')}
          </button>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? t('enabling') : t('enable')}
          </button>
        </div>
      </div>
    </div>
  );
}

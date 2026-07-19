'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';

const TYPE_ICON: Record<string, string> = {
  sale: '💰',
  purchase: '🛍️',
  deposit: '💳',
  withdrawal: '🏦',
  review: '⭐',
  account_banned: '🚫',
  account_unbanned: '✅',
  listing_removed: '🗑️',
};

const TYPE_TARGET: Record<string, string> = {
  sale: '/wallet',
  purchase: '/wallet',
  deposit: '/wallet',
  withdrawal: '/wallet',
  review: '/profile',
  account_banned: '/',
  account_unbanned: '/',
  listing_removed: '/profile',
};

const POLL_INTERVAL_MS = 25000;

type RelativeTimeTranslator = (key: string, values?: Record<string, string | number | Date>) => string;

const formatRelativeTime = (dateStr: string, t: RelativeTimeTranslator) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('justNow');
  if (diffMin < 60) return t('minutesAgo', { minutes: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('hoursAgo', { hours: diffHour });
  const diffDay = Math.floor(diffHour / 24);
  return t('daysAgo', { days: diffDay });
};

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  variant?: 'desktop' | 'mobile';
}

const NotificationBell = ({ variant = 'desktop' }: NotificationBellProps) => {
  const t = useTranslations('notifications');
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(() => {
    notificationsApi.getUnreadCount()
      .then(data => { if (data.success) setUnreadCount(data.data.count); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      notificationsApi.getAll(1, 10)
        .then(data => { if (data.success) setNotifications(data.data); })
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    setIsOpen(false);
    if (!notification.isRead) {
      try {
        await notificationsApi.markRead(notification._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // sessizce geç
      }
    }
    router.push(TYPE_TARGET[notification.type] || '/');
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // sessizce geç
    }
  };

  if (!isAuthenticated) return null;

  const listContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('title')}</span>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{t('loading')}</div>
      ) : notifications.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">{t('empty')}</div>
      ) : (
        notifications.map((n) => (
          <button
            key={n._id}
            onClick={() => handleNotificationClick(n)}
            className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${!n.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          >
            <span className="text-lg leading-none">{TYPE_ICON[n.type] || '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatRelativeTime(n.createdAt, t)}</p>
            </div>
            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
          </button>
        ))
      )}
    </>
  );

  if (variant === 'mobile') {
    return (
      <div ref={dropdownRef}>
        <button
          onClick={toggleOpen}
          className="w-full flex items-center justify-between pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span>🔔 {t('title')}{unreadCount > 0 ? ` (${unreadCount > 9 ? '9+' : unreadCount})` : ''}</span>
        </button>
        {isOpen && (
          <div className="bg-gray-50 dark:bg-gray-800/50 max-h-80 overflow-y-auto border-y border-gray-200 dark:border-gray-700">
            {listContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
        aria-label={t('title')}
        title={t('title')}
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
          {listContent}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

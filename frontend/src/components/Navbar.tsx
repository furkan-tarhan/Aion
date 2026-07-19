'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import { skinsApi, walletApi } from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const Navbar = () => {
  const t = useTranslations('navbar');
  const locale = useLocale();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const systemTheme = getSystemTheme();
    setTheme(systemTheme);
    document.documentElement.classList.toggle('dark', systemTheme === 'dark');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(null);
      return;
    }
    walletApi.getWallet()
      .then(data => { if (data.success) setBalance(data.data.balance); })
      .catch(() => setBalance(null));
  }, [isAuthenticated]);

  const formatBalance = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await skinsApi.search(query);
        setSearchResults(data.data || []);
        setShowResults(true);
      } catch {
        // Backend çalışmıyorsa sessizce başarısız ol
        setSearchResults([]);
      }
    }, 300);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="animate-spin-slow group-hover:animate-spin-fast transition-all duration-300">
                <img
                  src="/logo.png"
                  alt="Zade Logo"
                  className="h-12 w-12 object-contain transition-all duration-300 group-hover:scale-110 dark:brightness-0 dark:invert dark:opacity-90 dark:filter dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:via-purple-600 group-hover:to-pink-600 transition-all duration-300">Zade</span>
            </Link>
          </div>

          {/* Ana Menü */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="relative text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium group"
            >
              {t('home')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/cs2-skin"
              className="relative text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium group"
            >
              {t('cs2Skin')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/market"
              className="relative text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium group"
            >
              {t('market')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/sell"
              className="relative text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium group"
            >
              {t('sell')}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </div>

          {/* Sağ Menü */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Arama */}
            <div className="relative flex items-center" ref={searchRef}>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                className="w-64 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 pr-10 transition-all duration-300"
              />
              <button className="absolute right-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>

              {/* Arama Sonuçları Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto z-50">
                  {searchResults.map((skin: any, index: number) => (
                    <Link
                      key={skin.id || index}
                      href={`/cs2/skins/${skin.category}/${skin.weapon?.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${skin.id}`}
                      className="flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onClick={() => { setShowResults(false); setSearchQuery(''); }}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{skin.weapon} | {skin.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{skin.rarity}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 text-center text-gray-500 dark:text-gray-400 text-sm z-50">
                  {t('noResults')}
                </div>
              )}
            </div>

            {/* Auth Butonları */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <NotificationBell />
                <Link
                  href="/wallet"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
                  title={t('wallet')}
                >
                  💰 {balance !== null ? formatBalance(balance) : '...'}
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  {user.username}
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors text-sm"
                    title={t('adminMobile')}
                  >
                    🛠️ {t('admin')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors text-sm"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                >
                  {t('register')}
                </Link>
              </>
            )}

            {/* Dil Değiştirici */}
            <Link
              href={pathname}
              locale={otherLocale}
              className="ml-2 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm text-xs font-bold uppercase text-gray-700 dark:text-gray-200"
              aria-label={t('language')}
              title={t('language')}
            >
              {otherLocale}
            </Link>

            {/* Tema Butonu */}
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
              aria-label={t('toggleTheme')}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9H21M3 12H4.75m15.364 6.364l-1.591-1.591M6.227 6.227l-1.591-1.591m12.728 0l-1.591 1.591M6.227 17.773l-1.591 1.591M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-200">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobil Menü Butonu */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobil Menü */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-lg">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('home')}
            </Link>
            <Link
              href="/cs2-skin"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('cs2Skin')}
            </Link>
            <Link
              href="/market"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('market')}
            </Link>
            <Link
              href="/sell"
              className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {t('sell')}
            </Link>
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            {isAuthenticated && user ? (
              <>
                <NotificationBell variant="mobile" />
                <Link
                  href="/wallet"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  💰 {t('walletMobile')} {balance !== null ? `(${formatBalance(balance)})` : ''}
                </Link>
                <Link
                  href="/profile"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {user.username}
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="block pl-3 pr-4 py-2 text-base font-medium text-purple-600 dark:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    🛠️ {t('adminMobile')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t('logoutMobile')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block pl-3 pr-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/register"
                  className="block pl-3 pr-4 py-2 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                >
                  {t('register')}
                </Link>
              </>
            )}

            {/* Dil Değiştirici Mobil */}
            <Link
              href={pathname}
              locale={otherLocale}
              className="ml-3 mt-2 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 text-xs font-bold uppercase text-gray-700 dark:text-gray-200"
              aria-label={t('language')}
            >
              {otherLocale}
            </Link>

            {/* Tema Butonu Mobil */}
            <button
              onClick={toggleTheme}
              className="ml-3 mt-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300"
              aria-label={t('toggleTheme')}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9H21M3 12H4.75m15.364 6.364l-1.591-1.591M6.227 6.227l-1.591-1.591m12.728 0l-1.591 1.591M6.227 17.773l-1.591 1.591M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-200">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

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
    <nav className="sticky top-0 z-50" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="transition-all duration-300 group-hover:opacity-80">
                <img
                  src="/logo.png"
                  alt="Zade Logo"
                  className="h-8 w-8 object-contain brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
              <span className="text-lg font-semibold text-white/90 group-hover:text-white tracking-tight transition-colors duration-200" style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>Zade</span>
            </Link>
          </div>

          {/* Ana Menü */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="relative text-white/50 hover:text-white/90 text-sm font-medium group transition-colors duration-200"
              style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
            >
              {t('home')}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white/60 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/cs2-skin"
              className="relative text-white/50 hover:text-white/90 text-sm font-medium group transition-colors duration-200"
              style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
            >
              {t('cs2Skin')}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white/60 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/market"
              className="relative text-white/50 hover:text-white/90 text-sm font-medium group transition-colors duration-200"
              style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
            >
              {t('market')}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white/60 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/sell"
              className="relative text-white/50 hover:text-white/90 text-sm font-medium group transition-colors duration-200"
              style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
            >
              {t('sell')}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white/60 group-hover:w-full transition-all duration-300"></span>
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
                className="w-56 px-3 py-1.5 rounded-md focus:outline-none pr-8 text-sm transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
              />
              <button className="absolute right-2.5 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>

              {/* Arama Sonuçları Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-md max-h-80 overflow-y-auto z-50" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
                  {searchResults.map((skin: any, index: number) => (
                    <Link
                      key={skin.id || index}
                      href={`/cs2/skins/${skin.category}/${skin.weapon?.toLowerCase().replace(/[^a-z0-9]/g, '-')}/${skin.id}`}
                      className="flex items-center px-4 py-3 transition-colors border-b last:border-0"
                      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                      onClick={() => { setShowResults(false); setSearchQuery(''); }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{skin.weapon} | {skin.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{skin.rarity}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-md p-4 text-center text-sm z-50" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
                  title={t('wallet')}
                >
                  💰 {balance !== null ? formatBalance(balance) : '...'}
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {user.username}
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    title={t('adminMobile')}
                  >
                    🛠️ {t('admin')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
                >
                  {t('login')}
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium px-4 py-1.5 rounded-md transition-all duration-200 hover:bg-white hover:text-black"
                  style={{ border: '1px solid rgba(255,255,255,0.5)', color: 'rgba(255,255,255,0.85)', fontFamily: "'Inter','Helvetica Neue',sans-serif" }}
                >
                  {t('register')}
                </Link>
              </>
            )}

            {/* Dil Değiştirici */}
            <Link
              href={pathname}
              locale={otherLocale}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all duration-200 hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontFamily: "'Courier New',monospace" }}
              aria-label={t('language')}
              title={t('language')}
            >
              {otherLocale}
            </Link>

            {/* Tema Butonu */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md transition-all duration-200 hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
              aria-label={t('toggleTheme')}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9H21M3 12H4.75m15.364 6.364l-1.591-1.591M6.227 6.227l-1.591-1.591m12.728 0l-1.591 1.591M6.227 17.773l-1.591 1.591M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
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
        <div className="md:hidden shadow-lg" style={{ background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className="block pl-4 pr-4 py-3 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t('home')}</Link>
            <Link href="/cs2-skin" className="block pl-4 pr-4 py-3 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t('cs2Skin')}</Link>
            <Link href="/market" className="block pl-4 pr-4 py-3 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t('market')}</Link>
            <Link href="/sell" className="block pl-4 pr-4 py-3 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t('sell')}</Link>
            <div className="my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}></div>

            {isAuthenticated && user ? (
              <>
                <NotificationBell variant="mobile" />
                <Link href="/wallet" className="block pl-4 pr-4 py-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  💰 {t('walletMobile')} {balance !== null ? `(${formatBalance(balance)})` : ''}
                </Link>
                <Link href="/profile" className="block pl-4 pr-4 py-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{user.username}</Link>
                {user.role === 'admin' && (
                  <Link href="/admin" className="block pl-4 pr-4 py-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>🛠️ {t('adminMobile')}</Link>
                )}
                <button onClick={handleLogout} className="block w-full text-left pl-4 pr-4 py-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {t('logoutMobile')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block pl-4 pr-4 py-3 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('login')}</Link>
                <Link href="/register" className="block pl-4 pr-4 py-3 text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t('register')}</Link>
              </>
            )}

            {/* Dil Değiştirici Mobil */}
            <div className="flex items-center gap-2 px-4 py-3">
              <Link
                href={pathname}
                locale={otherLocale}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
                aria-label={t('language')}
              >
                {otherLocale}
              </Link>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
                aria-label={t('toggleTheme')}
              >
                {theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9H21M3 12H4.75m15.364 6.364l-1.591-1.591M6.227 6.227l-1.591-1.591m12.728 0l-1.591 1.591M6.227 17.773l-1.591 1.591M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

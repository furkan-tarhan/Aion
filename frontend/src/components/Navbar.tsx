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
  const { user, isAuthenticated, logout, login } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollY = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
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
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

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

  const handleSteamLogin = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    // apiBaseUrl boş olabilir (Nginx reverse proxy arkasında relative path) — bu durumda backend
    // aynı origin'de sayılır, popup'ın postMessage origin'i sayfanın kendi origin'i olur.
    const expectedOrigin = new URL(apiBaseUrl || '/', window.location.origin).origin;

    const width = 600;
    const height = 800;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      `${apiBaseUrl}/api/auth/steam`,
      'SteamLogin',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return;
      if (event.data?.type === 'STEAM_LOGIN_SUCCESS' && event.data.token) {
        login(event.data.token);
        window.removeEventListener('message', messageListener);
      }
    };
    window.addEventListener('message', messageListener);
  };

  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <nav className={`fixed w-full top-0 z-50 transition-transform duration-300 ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="transition-all duration-300 group-hover:opacity-80">
                {/* Geçici bir ikon kullanabiliriz ya da logo.png kalabilir */}
                <div className="h-8 w-8 bg-accent text-surface flex items-center justify-center rounded-md font-bold text-xl">L</div>
              </div>
              <span className="text-xl font-bold text-foreground group-hover:text-accent tracking-tight transition-colors duration-200">
                LoopSkins
              </span>
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
            {/* Arama kaldırıldı */}

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
              <button
                onClick={handleSteamLogin}
                className="text-sm font-bold px-4 py-2 rounded-md transition-all duration-300 bg-[#171a21] hover:bg-[#2a475e] text-white flex items-center gap-2 shadow-lg"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" className="w-5 h-5 brightness-0 invert" />
                Steam ile Giriş Yap
              </button>
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
                <button onClick={handleSteamLogin} className="flex items-center gap-2 pl-4 pr-4 py-3 text-sm font-bold transition-colors bg-[#171a21] hover:bg-[#2a475e] text-white border-b border-white/5 w-full text-left">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" className="w-5 h-5 brightness-0 invert" />
                  Steam ile Giriş Yap
                </button>
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
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

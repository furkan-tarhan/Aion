'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { skinsApi, listingsApi, steamApi, userApi } from '@/lib/api';
import { cdnUrl } from '@/lib/cdn';
import { Link } from '@/i18n/navigation';

const WEAR_VALUE_LABELS: Record<string, string> = {
    'Factory New': 'Factory New (FN)',
    'Minimal Wear': 'Minimal Wear (MW)',
    'Field-Tested': 'Field-Tested (FT)',
    'Well-Worn': 'Well-Worn (WW)',
    'Battle-Scarred': 'Battle-Scarred (BS)',
};

// Steam market_hash_name içinden wear kategorisini ve StatTrak bilgisini otomatik çıkarır
const parseWearAndStatTrak = (marketHashName?: string) => {
    if (!marketHashName) return { wear: '', isStatTrak: false };
    const wearMatch = marketHashName.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/);
    const isStatTrak = /StatTrak/i.test(marketHashName);
    return { wear: wearMatch ? wearMatch[1] : '', isStatTrak };
};

export default function SellPage() {
    const t = useTranslations('sell');
    const WEAR_OPTIONS = [
        { value: '', label: t('wearUnspecified') },
        ...Object.entries(WEAR_VALUE_LABELS).map(([value, label]) => ({ value, label })),
    ];
    const { isAuthenticated, user, login } = useAuth();
    const [steamTradeUrl, setSteamTradeUrl] = useState('');
    const [selectedSkin, setSelectedSkin] = useState<any>(null);
    const [skinSearch, setSkinSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [price, setPrice] = useState('');
    const [wear, setWear] = useState('');
    const [isStatTrak, setIsStatTrak] = useState(false);
    const [floatValue, setFloatValue] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [steamInventory, setSteamInventory] = useState<any[]>([]);
    const [showInventory, setShowInventory] = useState(false);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [userSteamId, setUserSteamId] = useState<string | null>(null);
    const [depositInfo, setDepositInfo] = useState<{ listingId: string; tradeOfferUrl: string; status: string } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Steam bot emanet akışı aktifse (depositInfo dolu), ilanın bota teslim edilip edilmediğini poll et
    useEffect(() => {
        if (!depositInfo || depositInfo.status !== 'pending') return;
        const interval = setInterval(async () => {
            try {
                const res = await listingsApi.getDepositStatus(depositInfo.listingId);
                if (res.success && res.data.depositStatus && res.data.depositStatus !== 'pending') {
                    setDepositInfo(prev => prev ? { ...prev, status: res.data.depositStatus! } : prev);
                }
            } catch {
                // sessizce yeniden dene
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [depositInfo]);

    // Skin arama (debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (skinSearch.length >= 2) {
                try {
                    const data = await skinsApi.search(skinSearch);
                    if (data.success) {
                        setSearchResults(data.data);
                        setShowDropdown(true);
                    }
                } catch {
                    setSearchResults([]);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [skinSearch]);

    // Dropdown dışına tıklanınca kapat
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Kullanıcının steamId'sini çek
    useEffect(() => {
        if (!isAuthenticated) return;
        userApi.getMe().then(data => {
            if (data.success && data.data.steamId) {
                setUserSteamId(data.data.steamId);
            }
        }).catch(() => {});
    }, [isAuthenticated]);

    const loadSteamInventory = async () => {
        if (!userSteamId) {
            setError(t('steamNotLinked'));
            return;
        }
        try {
            setLoadingInventory(true);
            const data = await steamApi.getInventory(userSteamId);
            if (data.success && data.data.skins) {
                setSteamInventory(data.data.skins);
                setShowInventory(true);
            }
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : t('steamInventoryLoadError'));
        } finally {
            setLoadingInventory(false);
        }
    };

    const handleSelectSkin = (skin: any) => {
        setSelectedSkin(skin);
        setSkinSearch(`${skin.weapon || skin.market_hash_name?.split(' | ')[0] || ''} | ${skin.name || skin.market_hash_name?.split(' | ')[1] || ''}`);
        setShowDropdown(false);
        setShowInventory(false);

        // Steam envanterinden veya isim üzerinden wear/StatTrak otomatik tespiti (kullanıcı yine düzenleyebilir)
        const { wear: detectedWear, isStatTrak: detectedStatTrak } = parseWearAndStatTrak(skin.market_hash_name);
        setWear(detectedWear);
        setIsStatTrak(detectedStatTrak);
        setFloatValue('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedSkin) {
            setError(t('selectSkinFirst'));
            return;
        }

        if (!price || Number(price) <= 0) {
            setError(t('invalidPrice'));
            return;
        }

        if (!steamTradeUrl.includes('steamcommunity.com/tradeoffer')) {
            setError(t('invalidTradeUrl'));
            return;
        }

        if (floatValue && (Number(floatValue) < 0 || Number(floatValue) > 1)) {
            setError(t('invalidFloat'));
            return;
        }

        try {
            setSubmitting(true);
            const res = await listingsApi.create({
                skinId: selectedSkin.id || selectedSkin.market_hash_name, // Fallback for backend
                marketHashName: selectedSkin.market_hash_name,
                iconUrl: selectedSkin.icon_url ? `https://community.akamai.steamstatic.com/economy/image/${selectedSkin.icon_url}` : selectedSkin.image,
                price: Number(price),
                steamTradeUrl,
                wear: wear || undefined,
                floatValue: floatValue ? Number(floatValue) : undefined,
                isStatTrak,
                assetId: selectedSkin.assetid,
            });
            setSubmitted(true);
            if (res.depositTradeOfferUrl && res.data?._id) {
                setDepositInfo({ listingId: res.data._id, tradeOfferUrl: res.depositTradeOfferUrl, status: 'pending' });
            }
            setSelectedSkin(null);
            setSkinSearch('');
            setPrice('');
            setSteamTradeUrl('');
            setWear('');
            setIsStatTrak(false);
            setFloatValue('');
            setTimeout(() => setSubmitted(false), 5000);
        } catch (err: any) {
            setError(err.message || t('createError'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSteamLogin = () => {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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

    if (!isAuthenticated) {
        return (
            <>
                <Navbar />
                <main className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="text-center max-w-md relative z-10 w-full">
                        <div className="bg-surface rounded-2xl shadow-2xl border border-border p-10 flex flex-col items-center">
                            <div className="w-20 h-20 bg-background border border-border rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-accent">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">{t('loginRequiredTitle')}</h2>
                            <p className="text-muted mb-8 font-medium">
                                Skin satışı yapabilmek için hesabınıza Steam ile giriş yapmanız gerekiyor.
                            </p>
                            <button onClick={handleSteamLogin} className="w-full flex items-center justify-center gap-3 bg-[#171a21] hover:bg-[#2a475e] text-white py-4 rounded-xl transition-all font-bold text-lg shadow-xl">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" alt="Steam" className="w-6 h-6 brightness-0 invert" />
                                Steam ile Giriş Yap
                            </button>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen bg-background text-foreground pb-24 overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="container mx-auto px-4 py-16 max-w-3xl relative z-10">
                    {/* Başlık */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                            {t('title')}
                        </h1>
                        <p className="text-lg text-muted">
                            {t('subtitle')}
                        </p>
                    </div>

                    {/* Nasıl Çalışır */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {[
                            { step: '1', title: t('step1Title'), desc: t('step1Desc') },
                            { step: '2', title: t('step2Title'), desc: t('step2Desc') },
                            { step: '3', title: t('step3Title'), desc: t('step3Desc') },
                        ].map(item => (
                            <div key={item.step} className="bg-surface rounded-xl border border-border p-6 text-center shadow-lg transition-transform hover:-translate-y-1">
                                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-xl mx-auto mb-4 border border-accent/20">
                                    {item.step}
                                </div>
                                <h3 className="font-semibold text-lg mb-2 text-foreground">{item.title}</h3>
                                <p className="text-sm text-muted font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Satış Formu */}
                    <div className="bg-surface rounded-2xl shadow-xl border border-border p-8">
                        <h2 className="text-2xl font-bold mb-6">{t('formTitle')}</h2>

                        {submitted && (
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
                                ✅ {t('submitSuccess')}
                            </div>
                        )}

                        {depositInfo && (
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 space-y-2">
                                {depositInfo.status === 'pending' && (
                                    <>
                                        <p className="font-semibold">📦 İlanınız yayına alınmadan önce item'ı bota emanet etmeniz gerekiyor.</p>
                                        <p className="text-sm">Steam'de size gönderilen trade teklifini kabul edin, item bota ulaşınca ilan otomatik olarak aktif hale gelecek.</p>
                                        <a href={depositInfo.tradeOfferUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
                                            Trade Teklifini Steam'de Aç
                                        </a>
                                    </>
                                )}
                                {depositInfo.status === 'accepted' && <p className="font-semibold">✅ Item bota ulaştı, ilanınız artık pazarda görünüyor!</p>}
                                {['declined', 'canceled', 'expired'].includes(depositInfo.status) && (
                                    <p className="font-semibold">⚠️ Trade teklifi {depositInfo.status === 'declined' ? 'reddedildi' : depositInfo.status === 'expired' ? 'süresi doldu' : 'iptal edildi'}. Lütfen ilanı tekrar oluşturun.</p>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                                ❌ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Skin Arama */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('selectSkinLabel')}</label>
                                <input
                                    type="text"
                                    value={skinSearch}
                                    onChange={e => { setSkinSearch(e.target.value); setSelectedSkin(null); }}
                                    placeholder={t('selectSkinPlaceholder')}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400"
                                />
                                {selectedSkin && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        ✅ {t('skinSelected')}: {selectedSkin.weapon} | {selectedSkin.name}
                                    </p>
                                )}

                                {/* Arama Dropdown */}
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map((skin: any) => (
                                            <button
                                                key={skin.id}
                                                type="button"
                                                onClick={() => handleSelectSkin(skin)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                            >
                                                {skin.image && (
                                                    <img src={cdnUrl(skin.image)} alt={skin.name} className="w-10 h-10 object-contain" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                        {skin.weapon} | {skin.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {skin.rarity} • ${skin.price?.min} - ${skin.price?.max}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Steam Envanter Butonu */}
                            {userSteamId && (
                                <button
                                    type="button"
                                    onClick={loadSteamInventory}
                                    disabled={loadingInventory}
                                    className="w-full py-3 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium disabled:opacity-50"
                                >
                                    {loadingInventory ? t('inventoryLoading') : `🎮 ${t('selectFromInventory')}`}
                                </button>
                            )}

                            {/* Steam Envanter Grid */}
                            {showInventory && steamInventory.length > 0 && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm">{t('steamInventoryTitle', { count: steamInventory.length })}</h3>
                                        <button type="button" onClick={() => setShowInventory(false)}
                                            className="text-sm text-gray-500 hover:text-gray-700">✕ {t('close')}</button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                        {steamInventory.map((item: any, idx: number) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectSkin({ ...item, weapon: item.market_hash_name?.split(' | ')[0], name: item.market_hash_name?.split(' | ')[1] || item.market_hash_name })}
                                                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                                            >
                                                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {item.market_hash_name || item.name}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('priceLabel')}</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    required
                                    min="1"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400"
                                />
                            </div>

                            {/* Wear / StatTrak / Float */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('wearLabel')}</label>
                                    <select
                                        value={wear}
                                        onChange={e => setWear(e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {WEAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('floatLabel')}</label>
                                    <input
                                        type="number"
                                        value={floatValue}
                                        onChange={e => setFloatValue(e.target.value)}
                                        min="0"
                                        max="1"
                                        step="0.000001"
                                        placeholder={t('optional')}
                                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400"
                                    />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isStatTrak}
                                            onChange={e => setIsStatTrak(e.target.checked)}
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                        StatTrak™
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('steamTradeUrlLabel')}</label>
                                <input
                                    type="url"
                                    value={steamTradeUrl}
                                    onChange={e => setSteamTradeUrl(e.target.value)}
                                    required
                                    placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('steamTradeUrlHint')}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-accent hover:bg-accentHover text-background py-4 rounded-xl transition-all duration-300 font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {submitting ? t('submitting') : t('submit')}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}

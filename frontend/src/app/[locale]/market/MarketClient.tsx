'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { listingsApi } from '@/lib/api';
import { cdnUrl } from '@/lib/cdn';

// Nadirlik/wear'ın kendi değer etiketleri (Consumer, Factory New vb.) kapsam dışı; sabit kalır.
const rarityValueLabels = ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Contraband'];
const weaponValueLabels = ['AWP', 'AK-47', 'M4A4'];
const wearValueLabels: Record<string, string> = {
    'Factory New': 'Factory New (FN)',
    'Minimal Wear': 'Minimal Wear (MW)',
    'Field-Tested': 'Field-Tested (FT)',
    'Well-Worn': 'Well-Worn (WW)',
    'Battle-Scarred': 'Battle-Scarred (BS)',
};

const wearShort: Record<string, string> = {
    'Factory New': 'FN',
    'Minimal Wear': 'MW',
    'Field-Tested': 'FT',
    'Well-Worn': 'WW',
    'Battle-Scarred': 'BS',
};

const rarityColors: Record<string, string> = {
    'Consumer': 'bg-gray-500',
    'Industrial': 'bg-blue-500',
    'Mil-Spec': 'bg-green-500',
    'Restricted': 'bg-purple-500',
    'Classified': 'bg-pink-500',
    'Covert': 'bg-red-500',
    'Contraband': 'bg-yellow-500',
};

export default function MarketClient() {
    const t = useTranslations('market');
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const { isAuthenticated, user } = useAuth();

    const sortOptions = [
        { value: 'newest', label: t('sortNewest') },
        { value: 'oldest', label: t('sortOldest') },
        { value: 'price-asc', label: t('sortPriceAsc') },
        { value: 'price-desc', label: t('sortPriceDesc') },
    ];

    const rarityFilters = [
        { value: '', label: t('all') },
        ...rarityValueLabels.map(v => ({ value: v, label: v })),
    ];

    const weaponFilters = [
        { value: '', label: t('allWeapons') },
        ...weaponValueLabels.map(v => ({ value: v, label: v })),
    ];

    const wearFilters = [
        { value: '', label: t('allWear') },
        ...Object.entries(wearValueLabels).map(([value, label]) => ({ value, label })),
    ];

    const statTrakFilters = [
        { value: '', label: t('statTrakAny') },
        { value: 'true', label: t('statTrakOnly') },
        { value: 'false', label: t('statTrakExclude') },
    ];

    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('newest');
    const [rarityFilter, setRarityFilter] = useState('');
    const [weaponFilter, setWeaponFilter] = useState('');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 999999 });
    const [wearFilter, setWearFilter] = useState('');
    const [statTrakFilter, setStatTrakFilter] = useState('');
    const [floatRange, setFloatRange] = useState({ min: '', max: '' });
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: string; tradeOfferUrl?: string }>({ text: '', type: '' });
    const [buyModalListing, setBuyModalListing] = useState<any>(null);
    const [buyTradeUrl, setBuyTradeUrl] = useState('');

    const fetchListings = useCallback(async () => {
        try {
            setLoading(true);
            const data = await listingsApi.getAll({
                page: pagination.page,
                limit: 20,
                sort: sortBy,
                weapon: weaponFilter || undefined,
                rarity: rarityFilter || undefined,
                search: searchQuery || undefined,
                minPrice: priceRange.min || undefined,
                maxPrice: priceRange.max === 999999 ? undefined : priceRange.max,
                wear: wearFilter || undefined,
                statTrak: statTrakFilter === '' ? undefined : statTrakFilter === 'true',
                minFloat: floatRange.min !== '' ? Number(floatRange.min) : undefined,
                maxFloat: floatRange.max !== '' ? Number(floatRange.max) : undefined,
            });

            if (data.success) {
                setListings(data.data);
                setPagination(prev => ({ ...prev, pages: data.pagination.pages, total: data.pagination.total }));
            } else {
                setListings([]);
            }
        } catch {
            setListings([]);
        } finally {
            setLoading(false);
        }
    }, [sortBy, rarityFilter, weaponFilter, priceRange, wearFilter, statTrakFilter, floatRange, pagination.page, searchQuery]);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    const formatPrice = (price: number, currency = 'USD') => {
        if (price === undefined || price === null) return '—';
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency,
            minimumFractionDigits: 0, maximumFractionDigits: 2,
        }).format(price);
    };

    const openBuyModal = (listing: any) => {
        if (!isAuthenticated) {
            setMessage({ text: t('loginRequiredError'), type: 'error' });
            return;
        }
        setBuyTradeUrl('');
        setBuyModalListing(listing);
    };

    const confirmBuy = async () => {
        if (!buyModalListing) return;
        const listing = buyModalListing;

        try {
            setBuyingId(listing._id);
            setMessage({ text: '', type: '' });
            const res = await listingsApi.buy(listing._id, buyTradeUrl || undefined);
            setMessage({ text: t('buySuccess'), type: 'success', tradeOfferUrl: res.deliveryTradeOfferUrl });
            setListings(prev => prev.filter(l => l._id !== listing._id));
            setBuyModalListing(null);
        } catch (err: any) {
            setMessage({ text: err.message || t('buyFailedDefault'), type: 'error' });
        } finally {
            setBuyingId(null);
        }
    };

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen text-gray-100" style={{ background: '#000000' }}>
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `
                            radial-gradient(ellipse 60% 60% at 50% 20%,
                                rgba(255,255,255,0.03) 0%,
                                rgba(255,255,255,0.01) 40%,
                                rgba(0,0,0,0) 80%
                            )
                        `,
                    }}
                />
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-[0.015]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    }}
                />

                <div className="relative z-10 container mx-auto px-4 py-12">
                    {/* Başlık */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-semibold mb-4 text-white tracking-tight" style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
                            {searchQuery ? `Arama Sonuçları: ${searchQuery}` : t('title')}
                        </h1>
                        <p className="text-sm text-white/50 max-w-2xl mx-auto" style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
                            {t('description')} {searchQuery && `- "${searchQuery}" için sonuçlar listeleniyor`}
                        </p>
                        {isAuthenticated && (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {t('manageWalletBefore')} <Link href="/wallet" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">{t('walletLinkText')}</Link> {t('manageWalletAfter')}
                            </p>
                        )}
                    </div>

                    {message.text && (
                        <div className={`max-w-2xl mx-auto mb-8 p-4 rounded-lg text-center ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                            }`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                            {message.type === 'error' && message.text.includes('bakiye') && (
                                <> <Link href="/wallet" className="underline font-medium">{t('goToWallet')}</Link></>
                            )}
                            {message.tradeOfferUrl && (
                                <div className="mt-2">
                                    <a href={message.tradeOfferUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
                                        Steam Trade Teklifini Aç ve Kabul Et
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {buyModalListing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setBuyModalListing(null)}>
                            <div className="w-full max-w-md rounded-xl p-6 space-y-4" style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold text-white">{t('buyConfirm', { title: buyModalListing.title, price: formatPrice(buyModalListing.price, buyModalListing.currency) })}</h3>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                                        Steam Trade URL <span className="text-white/40">(otomatik teslimat için — boş bırakabilirsiniz)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={buyTradeUrl}
                                        onChange={e => setBuyTradeUrl(e.target.value)}
                                        placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
                                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <button onClick={() => setBuyModalListing(null)} className="px-4 py-2 text-sm text-white/60 hover:text-white">
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={confirmBuy}
                                        disabled={buyingId === buyModalListing._id}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-50"
                                    >
                                        {buyingId === buyModalListing._id ? t('processing') : t('buyNow')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sol: Filtreler */}
                        <aside className="lg:w-72 shrink-0">
                            <div className="rounded-xl p-6 sticky top-24 space-y-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.07)', fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>{t('filtersTitle')}</h3>

                                {/* Sıralama */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('sortLabel')}</label>
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                    >
                                        {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Silah */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('weaponLabel')}</label>
                                    <select
                                        value={weaponFilter}
                                        onChange={e => setWeaponFilter(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                    >
                                        {weaponFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Nadirlik */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('rarityLabel')}</label>
                                    <select
                                        value={rarityFilter}
                                        onChange={e => setRarityFilter(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                    >
                                        {rarityFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Fiyat Aralığı */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('priceRangeLabel')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder={t('min')}
                                            value={priceRange.min || ''}
                                            onChange={e => setPriceRange(p => ({ ...p, min: Number(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 rounded-md text-sm outline-none placeholder-white/30"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                        />
                                        <span className="text-white/30">—</span>
                                        <input
                                            type="number"
                                            placeholder={t('max')}
                                            value={priceRange.max === 999999 ? '' : priceRange.max}
                                            onChange={e => setPriceRange(p => ({ ...p, max: Number(e.target.value) || 999999 }))}
                                            className="w-full px-3 py-2 rounded-md text-sm outline-none placeholder-white/30"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                        />
                                    </div>
                                </div>

                                {/* Wear */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('wearLabel')}</label>
                                    <select
                                        value={wearFilter}
                                        onChange={e => setWearFilter(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                    >
                                        {wearFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* StatTrak */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('statTrakLabel')}</label>
                                    <select
                                        value={statTrakFilter}
                                        onChange={e => setStatTrakFilter(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                    >
                                        {statTrakFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Float Aralığı */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-medium text-white/50 mb-2">{t('floatRangeLabel')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder={t('min')}
                                            min="0" max="1" step="0.01"
                                            value={floatRange.min}
                                            onChange={e => setFloatRange(p => ({ ...p, min: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-md text-sm outline-none placeholder-white/30"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                        />
                                        <span className="text-white/30">—</span>
                                        <input
                                            type="number"
                                            placeholder={t('max')}
                                            min="0" max="1" step="0.01"
                                            value={floatRange.max}
                                            onChange={e => setFloatRange(p => ({ ...p, max: e.target.value }))}
                                            className="w-full px-3 py-2 rounded-md text-sm outline-none placeholder-white/30"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setRarityFilter(''); setWeaponFilter(''); setPriceRange({ min: 0, max: 999999 }); setWearFilter(''); setStatTrakFilter(''); setFloatRange({ min: '', max: '' }); setSortBy('newest'); }}
                                    className="w-full text-xs tracking-widest uppercase font-semibold text-white/40 hover:text-white/80 transition-colors pt-2"
                                >
                                    {t('clearFilters')}
                                </button>
                            </div>
                        </aside>

                        {/* Sağ: Ürün Grid */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-6 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                <p className="text-sm text-white/50 font-mono tracking-widest uppercase">
                                    {loading ? t('loadingListings') : t('listingsFound', { count: pagination.total })}
                                </p>
                                <Link href="/sell" className="text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded-md transition-all hover:bg-white hover:text-black" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                                    + {t('addListing')}
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {listings.map((listing: any) => (
                                    <div
                                        key={listing._id}
                                        className="rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group flex flex-col"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                                    >
                                        {/* Görsel */}
                                        <div className="aspect-[4/3] flex items-center justify-center relative p-4" style={{ background: 'rgba(255,255,255,0.015)' }}>
                                            {listing.skin?.image && (
                                                <img
                                                    src={cdnUrl(listing.skin.image)}
                                                    alt={listing.title}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-4"
                                                />
                                            )}
                                            <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${rarityColors[listing.rarity] || 'bg-gray-500'}`}>
                                                {listing.rarity}
                                            </span>
                                        </div>

                                        {/* Bilgiler */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <h3 className="font-semibold text-[15px] text-white/90 group-hover:text-white transition-colors tracking-wide leading-tight" style={{ fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
                                                {listing.isStatTrak && <span className="text-orange-400 mr-1.5 font-medium">StatTrak™</span>}
                                                {listing.title}
                                            </h3>
                                            {(listing.wear || listing.floatValue !== undefined) && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    {listing.wear && (
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }} title={listing.wear}>
                                                            {wearShort[listing.wear] || listing.wear}
                                                        </span>
                                                    )}
                                                    {listing.floatValue !== undefined && listing.floatValue !== null && (
                                                        <span className="text-[11px] font-mono text-white/40">
                                                            {t('floatLabel', { value: Number(listing.floatValue).toFixed(4) })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <p className="text-[11px] text-white/30 mt-2 font-mono">
                                                {t('sellerLabel', { name: listing.seller?.username || t('unknownSeller') })}
                                            </p>
                                            <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                                                <div>
                                                    <h1 className="text-4xl font-bold text-foreground drop-shadow-md">
                                                        {searchQuery ? `Arama Sonuçları: ${searchQuery}` : t('pageTitle')}
                                                    </h1>
                                                    <p className="text-muted mt-2">
                                                        {t('pageSubtitle')} {searchQuery && `- "${searchQuery}" için sonuçlar listeleniyor`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-auto pt-4 flex items-center justify-between">
                                                <span className="text-white font-semibold tracking-tight text-lg">
                                                    {formatPrice(listing.price, listing.currency)}
                                                </span>
                                                <button
                                                    onClick={() => openBuyModal(listing)}
                                                    disabled={buyingId === listing._id || listing.seller?._id === user?.userId || listing.seller === user?.userId}
                                                    className="px-4 py-1.5 rounded text-xs uppercase tracking-widest font-semibold transition-all hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.9)' }}
                                                >
                                                    {buyingId === listing._id
                                                        ? t('processing')
                                                        : (listing.seller?._id === user?.userId || listing.seller === user?.userId)
                                                            ? t('ownListing')
                                                            : t('buyNow')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!loading && listings.length === 0 && (
                                <div className="text-center py-24 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <p className="text-white/40 text-sm font-mono uppercase tracking-widest mb-4">{t('noListingsFound')}</p>
                                    <button
                                        onClick={() => { setRarityFilter(''); setWeaponFilter(''); setPriceRange({ min: 0, max: 999999 }); setWearFilter(''); setStatTrakFilter(''); setFloatRange({ min: '', max: '' }); }}
                                        className="text-xs uppercase tracking-widest font-semibold px-4 py-2 rounded-md transition-all hover:bg-white hover:text-black"
                                        style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        {t('clearFilters')}
                                    </button>
                                </div>
                            )}

                            {/* Sayfalama */}
                            {pagination.pages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-8">
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                        disabled={pagination.page <= 1}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                                    >
                                        ← {t('previousPage')}
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        {t('pageIndicator', { current: pagination.page, total: pagination.pages })}
                                    </span>
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                                        disabled={pagination.page >= pagination.pages}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                                    >
                                        {t('nextPage')} →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

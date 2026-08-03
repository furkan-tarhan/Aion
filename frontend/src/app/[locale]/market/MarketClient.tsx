'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
    const [message, setMessage] = useState({ text: '', type: '' });

    const fetchListings = useCallback(async () => {
        try {
            setLoading(true);
            const data = await listingsApi.getAll({
                page: pagination.page,
                limit: 20,
                sort: sortBy,
                weapon: weaponFilter || undefined,
                rarity: rarityFilter || undefined,
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
    }, [sortBy, rarityFilter, weaponFilter, priceRange, wearFilter, statTrakFilter, floatRange, pagination.page]);

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

    const handleBuy = async (listing: any) => {
        if (!isAuthenticated) {
            setMessage({ text: t('loginRequiredError'), type: 'error' });
            return;
        }
        if (!confirm(t('buyConfirm', { title: listing.title, price: formatPrice(listing.price, listing.currency) }))) {
            return;
        }

        try {
            setBuyingId(listing._id);
            setMessage({ text: '', type: '' });
            await listingsApi.buy(listing._id);
            setMessage({ text: t('buySuccess'), type: 'success' });
            setListings(prev => prev.filter(l => l._id !== listing._id));
        } catch (err: any) {
            setMessage({ text: err.message || t('buyFailedDefault'), type: 'error' });
        } finally {
            setBuyingId(null);
        }
    };

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 text-black dark:text-gray-100">
                <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
                    <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
                </div>

                <div className="container mx-auto px-4 py-12">
                    {/* Başlık */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                            {t('title')}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            {t('description')}
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
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sol: Filtreler */}
                        <aside className="lg:w-72 shrink-0">
                            <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-6 sticky top-24 space-y-6">
                                <h3 className="text-lg font-bold border-b border-gray-200 dark:border-blue-800 pb-2">{t('filtersTitle')}</h3>

                                {/* Sıralama */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sortLabel')}</label>
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Silah */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('weaponLabel')}</label>
                                    <select
                                        value={weaponFilter}
                                        onChange={e => setWeaponFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {weaponFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Nadirlik */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('rarityLabel')}</label>
                                    <select
                                        value={rarityFilter}
                                        onChange={e => setRarityFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {rarityFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Fiyat Aralığı */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('priceRangeLabel')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder={t('min')}
                                            value={priceRange.min || ''}
                                            onChange={e => setPriceRange(p => ({ ...p, min: Number(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-400">—</span>
                                        <input
                                            type="number"
                                            placeholder={t('max')}
                                            value={priceRange.max === 999999 ? '' : priceRange.max}
                                            onChange={e => setPriceRange(p => ({ ...p, max: Number(e.target.value) || 999999 }))}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Wear */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('wearLabel')}</label>
                                    <select
                                        value={wearFilter}
                                        onChange={e => setWearFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {wearFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* StatTrak */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('statTrakLabel')}</label>
                                    <select
                                        value={statTrakFilter}
                                        onChange={e => setStatTrakFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {statTrakFilters.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Float Aralığı */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('floatRangeLabel')}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            placeholder={t('min')}
                                            min="0" max="1" step="0.01"
                                            value={floatRange.min}
                                            onChange={e => setFloatRange(p => ({ ...p, min: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-400">—</span>
                                        <input
                                            type="number"
                                            placeholder={t('max')}
                                            min="0" max="1" step="0.01"
                                            value={floatRange.max}
                                            onChange={e => setFloatRange(p => ({ ...p, max: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setRarityFilter(''); setWeaponFilter(''); setPriceRange({ min: 0, max: 999999 }); setWearFilter(''); setStatTrakFilter(''); setFloatRange({ min: '', max: '' }); setSortBy('newest'); }}
                                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                >
                                    {t('clearFilters')}
                                </button>
                            </div>
                        </aside>

                        {/* Sağ: Ürün Grid */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {loading ? t('loadingListings') : t('listingsFound', { count: pagination.total })}
                                </p>
                                <Link href="/sell" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                                    + {t('addListing')}
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {listings.map((listing: any) => (
                                    <div
                                        key={listing._id}
                                        className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group"
                                    >
                                        {/* Görsel */}
                                        <div className="aspect-video bg-gray-100 dark:bg-blue-800 overflow-hidden relative">
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
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {listing.isStatTrak && <span className="text-orange-500 mr-1">StatTrak™</span>}
                                                {listing.title}
                                            </h3>
                                            {(listing.wear || listing.floatValue !== undefined) && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    {listing.wear && (
                                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" title={listing.wear}>
                                                            {wearShort[listing.wear] || listing.wear}
                                                        </span>
                                                    )}
                                                    {listing.floatValue !== undefined && listing.floatValue !== null && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {t('floatLabel', { value: Number(listing.floatValue).toFixed(4) })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {t('sellerLabel', { name: listing.seller?.username || t('unknownSeller') })}
                                            </p>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                                                    {formatPrice(listing.price, listing.currency)}
                                                </span>
                                                <button
                                                    onClick={() => handleBuy(listing)}
                                                    disabled={buyingId === listing._id || listing.seller?._id === user?.userId || listing.seller === user?.userId}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <div className="text-center py-16">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">{t('noListingsFound')}</p>
                                    <button
                                        onClick={() => { setRarityFilter(''); setWeaponFilter(''); setPriceRange({ min: 0, max: 999999 }); setWearFilter(''); setStatTrakFilter(''); setFloatRange({ min: '', max: '' }); }}
                                        className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
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

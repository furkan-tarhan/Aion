'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { userApi, listingsApi, favoritesApi, skinsApi, walletApi } from '@/lib/api';
import { cdnUrl } from '@/lib/cdn';
import { Link } from '@/i18n/navigation';

export default function ProfilePage() {
    const t = useTranslations('profile');
    const { isAuthenticated, user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'favorites' | 'settings'>('overview');
    const [profileData, setProfileData] = useState<any>(null);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [favoriteSkins, setFavoriteSkins] = useState<any[]>([]);
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Form states
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [steamId, setSteamId] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (!isAuthenticated) return;

        async function loadProfile() {
            try {
                setLoading(true);
                const data = await userApi.getMe();
                if (data.success) {
                    setProfileData(data.data);
                    setFullName(data.data.profile?.fullName || '');
                    setPhone(data.data.profile?.phone || '');
                    setSteamId(data.data.steamId || '');
                }
            } catch {
                // Token geçersiz olabilir
            } finally {
                setLoading(false);
            }
        }

        loadProfile();

        walletApi.getWallet()
            .then(data => { if (data.success) setBalance(data.data.balance); })
            .catch(() => setBalance(null));
    }, [isAuthenticated]);

    const loadListings = async () => {
        try {
            const data = await listingsApi.getMyListings();
            if (data.success) setMyListings(data.data);
        } catch { /* */ }
    };

    const loadFavorites = async () => {
        try {
            const data = await favoritesApi.getAll();
            if (data.success && data.data.length > 0) {
                // Her favori skinId için skin bilgilerini çek
                const skinPromises = data.data.map((skinId: string) =>
                    skinsApi.getById(skinId).catch(() => null)
                );
                const skins = await Promise.all(skinPromises);
                setFavoriteSkins(skins.filter(s => s?.success).map(s => s!.data));
            } else {
                setFavoriteSkins([]);
            }
        } catch { /* */ }
    };

    useEffect(() => {
        if (activeTab === 'listings') loadListings();
        if (activeTab === 'favorites') loadFavorites();
    }, [activeTab]);

    const handleProfileUpdate = async () => {
        try {
            const data = await userApi.updateProfile({ fullName, phone });
            setMessage({ text: data.message, type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const handlePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            setMessage({ text: t('passwordTooShort'), type: 'error' });
            return;
        }
        try {
            await userApi.changePassword(user!.userId, { password: newPassword });
            setMessage({ text: t('passwordChanged'), type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const handleSteamLink = async () => {
        if (!steamId) {
            setMessage({ text: t('enterSteamId'), type: 'error' });
            return;
        }
        try {
            const data = await userApi.linkSteam(steamId);
            setMessage({ text: data.message, type: 'success' });
            if (data.data) {
                setProfileData((prev: any) => ({ ...prev, steamId: data.data.steamId, steamProfile: data.data.steamProfile }));
            }
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t('deleteAccountConfirm'))) return;
        try {
            await userApi.deleteAccount(user!.userId);
            logout();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const removeFavorite = async (skinId: string) => {
        try {
            await favoritesApi.remove(skinId);
            setFavoriteSkins(prev => prev.filter(s => s.id !== skinId));
        } catch { /* */ }
    };

    if (!isAuthenticated || !user) {
        return (
            <>
                <Navbar />
                <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center px-4">
                    <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
                        <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
                    </div>
                    <div className="text-center max-w-md">
                        <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-blue-800 p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-blue-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('loginRequiredTitle')}</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {t('loginRequiredMessage')}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link href="/login" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-center">
                                    {t('login')}
                                </Link>
                                <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                                    {t('createAccount')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    const stats = profileData?.stats || { activeListings: 0, completedSales: 0, totalEarnings: 0 };

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 text-black dark:text-gray-100">
                <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
                    <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
                </div>

                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    {/* Profil Header */}
                    <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-blue-800 p-8 mb-8">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Avatar */}
                            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                                {profileData?.steamProfile?.avatar ? (
                                    <img src={profileData.steamProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user.username.charAt(0).toUpperCase()
                                )}
                            </div>

                            {/* User Info */}
                            <div className="text-center md:text-left flex-1">
                                <h1 className="text-3xl font-bold mb-1">{user.username}</h1>
                                <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
                                <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                        ✅ {t('activeAccount')}
                                    </span>
                                    {profileData?.steamId && (
                                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                                            🎮 {t('steamLinked')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                                >
                                    {t('logout')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tab Menü */}
                    <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-hidden">
                        <div className="border-b border-gray-200 dark:border-blue-700">
                            <nav className="flex">
                                {(['overview', 'listings', 'favorites', 'settings'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-4 px-6 text-center font-medium transition-colors text-sm ${activeTab === tab
                                            ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {tab === 'overview' && t('tabOverview')}
                                        {tab === 'listings' && t('tabListings')}
                                        {tab === 'favorites' && t('tabFavorites')}
                                        {tab === 'settings' && t('tabSettings')}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-8">
                            {/* Message */}
                            {message.text && (
                                <div className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                                    : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                    }`}>
                                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                                </div>
                            )}

                            {/* Genel Bakış */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    <div>
                                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-5 text-white flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-sm opacity-80">{t('walletBalance')}</p>
                                                <p className="text-2xl font-bold">
                                                    {balance !== null
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)
                                                        : '...'}
                                                </p>
                                            </div>
                                            <Link href="/wallet" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                                {t('goToWallet')} →
                                            </Link>
                                        </div>
                                        <h3 className="text-lg font-semibold mb-4">{t('statistics')}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="bg-gray-50 dark:bg-blue-800/50 rounded-xl p-5 text-center">
                                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.activeListings}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t('activeListings')}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-blue-800/50 rounded-xl p-5 text-center">
                                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completedSales}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t('completedSales')}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-blue-800/50 rounded-xl p-5 text-center">
                                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">${stats.totalEarnings}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t('totalEarnings')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Steam Bilgileri */}
                                    {profileData?.steamProfile && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">{t('steamProfileTitle')}</h3>
                                            <div className="bg-gray-50 dark:bg-blue-800/50 rounded-xl p-5 flex items-center gap-4">
                                                {profileData.steamProfile.avatar && (
                                                    <img src={profileData.steamProfile.avatar} alt="Steam" className="w-14 h-14 rounded-full" />
                                                )}
                                                <div>
                                                    <p className="font-semibold">{profileData.steamProfile.displayName || t('unknown')}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">ID: {profileData.steamId}</p>
                                                </div>
                                                {profileData.steamProfile.profileUrl && (
                                                    <a href={profileData.steamProfile.profileUrl} target="_blank" rel="noopener noreferrer"
                                                        className="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium">
                                                        {t('viewProfile')} →
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Son Aktivite */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">{t('recentActivity')}</h3>
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p>{t('noActivity')}</p>
                                            <Link href="/market" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                                                {t('goToMarket')} →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* İlanlarım */}
                            {activeTab === 'listings' && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">{t('myListings')}</h3>
                                    {myListings.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            <p>{t('noActiveListings')}</p>
                                            <Link href="/sell" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                                                {t('createListing')} →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {myListings.map((listing: any) => (
                                                <div key={listing._id} className="bg-gray-50 dark:bg-blue-800/50 rounded-xl p-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold">{listing.skin?.weapon} | {listing.skin?.name}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            {listing.status === 'active' ? `🟢 ${t('statusActive')}`
                                                                : listing.status === 'sold' ? `✅ ${t('statusSold')}`
                                                                : listing.status === 'pending_deposit' ? '📦 Emanet Bekleniyor'
                                                                : `🔴 ${t('statusCancelled')}`}
                                                        </p>
                                                    </div>
                                                    <p className="text-green-600 dark:text-green-400 font-bold text-lg">${listing.price}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Favoriler */}
                            {activeTab === 'favorites' && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">{t('favoriteSkins')}</h3>
                                    {favoriteSkins.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                            <p>{t('noFavorites')}</p>
                                            <Link href="/market" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                                                {t('discoverOnMarket')} →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {favoriteSkins.map((skin: any) => (
                                                <div key={skin.id} className="bg-gray-50 dark:bg-blue-800/50 rounded-xl p-4 flex items-center gap-4">
                                                    {skin.image && (
                                                        <img src={cdnUrl(skin.image)} alt={skin.name} className="w-16 h-16 object-contain" />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">{skin.weapon} | {skin.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{skin.rarity}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFavorite(skin.id)}
                                                        className="text-red-500 hover:text-red-700 text-sm"
                                                        title={t('removeFromFavorites')}
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ayarlar */}
                            {activeTab === 'settings' && (
                                <div className="space-y-8">
                                    {/* Profil Bilgileri */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">{t('profileInfo')}</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('fullNameLabel')}</label>
                                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('fullNameLabel')}
                                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('phoneLabel')}</label>
                                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+90 5XX XXX XX XX"
                                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800" />
                                            </div>
                                            <button onClick={handleProfileUpdate}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium">
                                                {t('updateInfo')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Steam Bağlama */}
                                    <div className="border-t border-gray-200 dark:border-blue-700 pt-8">
                                        <h3 className="text-lg font-semibold mb-4">🎮 {t('linkSteamAccount')}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                            {t('linkSteamDescription')}
                                        </p>
                                        <div className="flex gap-3">
                                            <input type="text" value={steamId} onChange={e => setSteamId(e.target.value)}
                                                placeholder={t('steamIdPlaceholder')}
                                                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800" />
                                            <button onClick={handleSteamLink}
                                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all font-medium whitespace-nowrap">
                                                {profileData?.steamId ? t('update') : t('link')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Şifre Değiştir */}
                                    <div className="border-t border-gray-200 dark:border-blue-700 pt-8">
                                        <h3 className="text-lg font-semibold mb-4">{t('changePassword')}</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('currentPasswordLabel')}</label>
                                                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••"
                                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('newPasswordLabel')}</label>
                                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••"
                                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                            </div>
                                            <button onClick={handlePasswordChange}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium">
                                                {t('changePasswordButton')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Hesap Silme */}
                                    <div className="border-t border-gray-200 dark:border-blue-700 pt-8">
                                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">{t('dangerZone')}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                            {t('deleteAccountDescription')}
                                        </p>
                                        <button onClick={handleDeleteAccount}
                                            className="px-6 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                                            {t('deleteAccount')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

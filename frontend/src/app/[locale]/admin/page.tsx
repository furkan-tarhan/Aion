'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import 'swagger-ui-react/swagger-ui.css';

// SwaggerUI tarayıcı API'lerine (window) ihtiyaç duyar, SSR'da render edilemez.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    sold: 'bg-blue-500',
    cancelled: 'bg-gray-500',
};

const formatPrice = (price: number, currency = 'USD') => {
    if (price === undefined || price === null) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency,
        minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(price);
};

type Tab = 'overview' | 'users' | 'listings' | 'withdrawals' | 'apidocs';

export default function AdminPage() {
    const t = useTranslations('admin');
    const locale = useLocale();
    const { isAuthenticated, user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [message, setMessage] = useState({ text: '', type: '' });

    const statusLabels: Record<string, string> = {
        active: t('statusActive'),
        sold: t('statusSold'),
        cancelled: t('statusCancelled'),
        pending: t('statusPending'),
        completed: t('statusCompleted'),
        failed: t('statusFailed'),
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Overview
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('');
    const [userBannedFilter, setUserBannedFilter] = useState('');
    const [userPagination, setUserPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Listings
    const [listings, setListings] = useState<any[]>([]);
    const [listingsLoading, setListingsLoading] = useState(true);
    const [listingStatusFilter, setListingStatusFilter] = useState('');
    const [listingSearch, setListingSearch] = useState('');
    const [listingPagination, setListingPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Çekimler (kripto withdrawal talepleri)
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
    const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('pending');
    const [withdrawalPagination, setWithdrawalPagination] = useState({ page: 1, pages: 1, total: 0 });

    // API Dokümantasyonu (Swagger)
    const [apiSpec, setApiSpec] = useState<any>(null);
    const [apiSpecLoading, setApiSpecLoading] = useState(true);
    const [apiSpecError, setApiSpecError] = useState(false);

    const isAdmin = isAuthenticated && user?.role === 'admin';

    const fetchStats = useCallback(() => {
        setStatsLoading(true);
        adminApi.getStats()
            .then(data => { if (data.success) setStats(data.data); })
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            setUsersLoading(true);
            const data = await adminApi.getUsers({
                page: userPagination.page,
                limit: 20,
                q: userSearch || undefined,
                role: userRoleFilter || undefined,
                banned: userBannedFilter === '' ? undefined : userBannedFilter === 'true',
            });
            if (data.success) {
                setUsers(data.data);
                setUserPagination(prev => ({ ...prev, pages: data.pagination.pages, total: data.pagination.total }));
            }
        } catch {
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    }, [userPagination.page, userSearch, userRoleFilter, userBannedFilter]);

    const fetchListings = useCallback(async () => {
        try {
            setListingsLoading(true);
            const data = await adminApi.getListings({
                page: listingPagination.page,
                limit: 20,
                status: listingStatusFilter || undefined,
                q: listingSearch || undefined,
            });
            if (data.success) {
                setListings(data.data);
                setListingPagination(prev => ({ ...prev, pages: data.pagination.pages, total: data.pagination.total }));
            }
        } catch {
            setListings([]);
        } finally {
            setListingsLoading(false);
        }
    }, [listingPagination.page, listingStatusFilter, listingSearch]);

    const fetchWithdrawals = useCallback(async () => {
        try {
            setWithdrawalsLoading(true);
            const data = await adminApi.getWithdrawals({
                page: withdrawalPagination.page,
                limit: 20,
                status: withdrawalStatusFilter || undefined,
            });
            if (data.success) {
                setWithdrawals(data.data);
                setWithdrawalPagination(prev => ({ ...prev, pages: data.pagination.pages, total: data.pagination.total }));
            }
        } catch {
            setWithdrawals([]);
        } finally {
            setWithdrawalsLoading(false);
        }
    }, [withdrawalPagination.page, withdrawalStatusFilter]);

    const fetchApiDocs = useCallback(() => {
        setApiSpecLoading(true);
        setApiSpecError(false);
        adminApi.getApiDocs()
            .then(data => setApiSpec(data))
            .catch(() => setApiSpecError(true))
            .finally(() => setApiSpecLoading(false));
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        if (activeTab === 'overview') fetchStats();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'listings') fetchListings();
        if (activeTab === 'withdrawals') fetchWithdrawals();
        if (activeTab === 'apidocs' && !apiSpec) fetchApiDocs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, activeTab, fetchUsers, fetchListings, fetchWithdrawals]);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const handleBan = async (targetUser: any) => {
        const reason = window.prompt(t('banPromptReason', { username: targetUser.username }));
        if (reason === null) return;
        try {
            await adminApi.banUser(targetUser._id, reason || undefined);
            showMessage(t('userBanned'), 'success');
            fetchUsers();
        } catch (err: any) {
            showMessage(err.message || t('banFailed'), 'error');
        }
    };

    const handleUnban = async (targetUser: any) => {
        if (!confirm(t('unbanConfirm', { username: targetUser.username }))) return;
        try {
            await adminApi.unbanUser(targetUser._id);
            showMessage(t('userUnbanned'), 'success');
            fetchUsers();
        } catch (err: any) {
            showMessage(err.message || t('actionFailed'), 'error');
        }
    };

    const handleRoleChange = async (targetUser: any, role: 'user' | 'admin') => {
        if (role === targetUser.role) return;
        if (!confirm(t('roleChangeConfirm', { username: targetUser.username, role }))) return;
        try {
            await adminApi.setUserRole(targetUser._id, role);
            showMessage(t('roleUpdated'), 'success');
            fetchUsers();
        } catch (err: any) {
            showMessage(err.message || t('actionFailed'), 'error');
        }
    };

    const handleRemoveListing = async (listing: any) => {
        const reason = window.prompt(t('removeListingPromptReason', { title: listing.title }));
        if (reason === null) return;
        try {
            await adminApi.removeListing(listing._id, reason || undefined);
            showMessage(t('listingRemoved'), 'success');
            fetchListings();
        } catch (err: any) {
            showMessage(err.message || t('listingRemoveFailed'), 'error');
        }
    };

    const handleCompleteWithdrawal = async (w: any) => {
        if (!confirm(t('completeWithdrawalConfirm', { amount: formatPrice(Math.abs(w.amount)), address: w.payoutAddress }))) return;
        try {
            await adminApi.completeWithdrawal(w._id);
            showMessage(t('withdrawalCompleted'), 'success');
            fetchWithdrawals();
        } catch (err: any) {
            showMessage(err.message || t('actionFailed'), 'error');
        }
    };

    const handleRejectWithdrawal = async (w: any) => {
        const reason = window.prompt(t('rejectWithdrawalPromptReason'));
        if (reason === null) return;
        try {
            await adminApi.rejectWithdrawal(w._id, reason || undefined);
            showMessage(t('withdrawalRejected'), 'success');
            fetchWithdrawals();
        } catch (err: any) {
            showMessage(err.message || t('actionFailed'), 'error');
        }
    };

    if (!isAuthenticated || !user) {
        return (
            <>
                <Navbar />
                <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-blue-800 p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('loginRequiredTitle')}</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {t('loginRequiredMessage')}
                            </p>
                            <Link href="/login" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-center block">
                                {t('login')}
                            </Link>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    if (!isAdmin) {
        return (
            <>
                <Navbar />
                <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-blue-800 p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('unauthorizedTitle')}</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {t('unauthorizedMessage')}
                            </p>
                            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                                {t('backToHome')}
                            </Link>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 text-black dark:text-gray-100">
                <div className="container mx-auto px-4 py-12">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                            {t('title')}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">{t('subtitle')}</p>
                    </div>

                    {message.text && (
                        <div className={`mb-6 p-4 rounded-lg text-center ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                            }`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    {/* Sekmeler */}
                    <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-blue-800">
                        {([
                            { id: 'overview', label: t('tabOverview') },
                            { id: 'users', label: t('tabUsers') },
                            { id: 'listings', label: t('tabListings') },
                            { id: 'withdrawals', label: t('tabWithdrawals') },
                            { id: 'apidocs', label: t('tabApiDocs') },
                        ] as { id: Tab; label: string }[]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Genel Bakış */}
                    {activeTab === 'overview' && (
                        <div>
                            {statsLoading ? (
                                <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
                            ) : !stats ? (
                                <p className="text-gray-500 dark:text-gray-400">{t('statsLoadError')}</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                                        <StatCard label={t('totalUsers')} value={stats.totalUsers} sub={t('newUsersSub', { count: stats.newUsersLast7Days })} />
                                        <StatCard label={t('bannedUsers')} value={stats.bannedUsers} />
                                        <StatCard label={t('totalListings')} value={stats.totalListings} sub={t('activeSub', { count: stats.listingsByStatus.active })} />
                                        <StatCard label={t('totalSkins')} value={stats.totalSkins} />
                                        <StatCard label={t('soldListings')} value={stats.totalSalesCount} />
                                        <StatCard label={t('totalSalesVolume')} value={formatPrice(stats.totalSalesVolume, 'USD')} />
                                        <StatCard label={t('activeListingsLabel')} value={stats.listingsByStatus.active} />
                                        <StatCard label={t('cancelledListings')} value={stats.listingsByStatus.cancelled} />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-6">
                                            <h3 className="text-lg font-bold mb-4">{t('recentlyRegisteredUsers')}</h3>
                                            <div className="space-y-2">
                                                {stats.recentUsers.map((u: any) => (
                                                    <div key={u._id} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                                                        <div>
                                                            <p className="font-medium">{u.username}</p>
                                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{u.email}</p>
                                                        </div>
                                                        <span className="text-gray-400 text-xs">{formatDate(u.createdAt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-6">
                                            <h3 className="text-lg font-bold mb-4">{t('recentlyCreatedListings')}</h3>
                                            <div className="space-y-2">
                                                {stats.recentListings.map((l: any) => (
                                                    <div key={l._id} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
                                                        <div>
                                                            <p className="font-medium">{l.title}</p>
                                                            <p className="text-gray-500 dark:text-gray-400 text-xs">{l.seller?.username || t('unknown')}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${statusColors[l.status]}`}>
                                                            {statusLabels[l.status]}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Kullanıcılar */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="flex flex-wrap gap-3 mb-6">
                                <input
                                    type="text"
                                    placeholder={t('userSearchPlaceholder')}
                                    value={userSearch}
                                    onChange={e => { setUserSearch(e.target.value); setUserPagination(p => ({ ...p, page: 1 })); }}
                                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={userRoleFilter}
                                    onChange={e => { setUserRoleFilter(e.target.value); setUserPagination(p => ({ ...p, page: 1 })); }}
                                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{t('allRoles')}</option>
                                    <option value="user">{t('roleUser')}</option>
                                    <option value="admin">{t('roleAdmin')}</option>
                                </select>
                                <select
                                    value={userBannedFilter}
                                    onChange={e => { setUserBannedFilter(e.target.value); setUserPagination(p => ({ ...p, page: 1 })); }}
                                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{t('all')}</option>
                                    <option value="false">{t('statusUserActive')}</option>
                                    <option value="true">{t('statusUserBanned')}</option>
                                </select>
                            </div>

                            <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-gray-200 dark:border-blue-800 text-gray-500 dark:text-gray-400">
                                            <th className="p-3">{t('columnUser')}</th>
                                            <th className="p-3">{t('columnEmail')}</th>
                                            <th className="p-3">{t('columnRole')}</th>
                                            <th className="p-3">{t('columnStatus')}</th>
                                            <th className="p-3">{t('columnRegisteredAt')}</th>
                                            <th className="p-3">{t('columnActions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersLoading ? (
                                            <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">{t('loading')}</td></tr>
                                        ) : users.length === 0 ? (
                                            <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">{t('noUsersFound')}</td></tr>
                                        ) : (
                                            users.map(u => (
                                                <tr key={u._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <td className="p-3 font-medium">{u.username}</td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                                                    <td className="p-3">
                                                        <select
                                                            value={u.role}
                                                            onChange={e => handleRoleChange(u, e.target.value as 'user' | 'admin')}
                                                            className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-xs"
                                                        >
                                                            <option value="user">user</option>
                                                            <option value="admin">admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        {u.isBanned ? (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500 text-white" title={u.banReason}>{t('statusUserBanned')}</span>
                                                        ) : (
                                                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500 text-white">{t('statusUserActive')}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(u.createdAt)}</td>
                                                    <td className="p-3">
                                                        {u.isBanned ? (
                                                            <button onClick={() => handleUnban(u)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">
                                                                {t('removeBan')}
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleBan(u)} className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium">
                                                                {t('banAction')}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination pagination={userPagination} setPagination={setUserPagination} />
                        </div>
                    )}

                    {/* İlanlar */}
                    {activeTab === 'listings' && (
                        <div>
                            <div className="flex flex-wrap gap-3 mb-6">
                                <input
                                    type="text"
                                    placeholder={t('listingSearchPlaceholder')}
                                    value={listingSearch}
                                    onChange={e => { setListingSearch(e.target.value); setListingPagination(p => ({ ...p, page: 1 })); }}
                                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={listingStatusFilter}
                                    onChange={e => { setListingStatusFilter(e.target.value); setListingPagination(p => ({ ...p, page: 1 })); }}
                                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{t('allStatuses')}</option>
                                    <option value="active">{t('statusActive')}</option>
                                    <option value="sold">{t('statusSold')}</option>
                                    <option value="cancelled">{t('statusCancelled')}</option>
                                </select>
                            </div>

                            <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-gray-200 dark:border-blue-800 text-gray-500 dark:text-gray-400">
                                            <th className="p-3">{t('columnListing')}</th>
                                            <th className="p-3">{t('columnSeller')}</th>
                                            <th className="p-3">{t('columnPrice')}</th>
                                            <th className="p-3">{t('columnStatus')}</th>
                                            <th className="p-3">{t('columnCreatedAt')}</th>
                                            <th className="p-3">{t('columnActions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listingsLoading ? (
                                            <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">{t('loading')}</td></tr>
                                        ) : listings.length === 0 ? (
                                            <tr><td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">{t('noListingsFound')}</td></tr>
                                        ) : (
                                            listings.map(l => (
                                                <tr key={l._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <td className="p-3 font-medium">
                                                        {l.isStatTrak && <span className="text-orange-500 mr-1">StatTrak™</span>}
                                                        {l.title}
                                                    </td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{l.seller?.username || t('unknown')}</td>
                                                    <td className="p-3">{formatPrice(l.price, l.currency)}</td>
                                                    <td className="p-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${statusColors[l.status]}`}>
                                                            {statusLabels[l.status]}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(l.createdAt)}</td>
                                                    <td className="p-3">
                                                        {l.status === 'active' && (
                                                            <button onClick={() => handleRemoveListing(l)} className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium">
                                                                {t('removeAction')}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination pagination={listingPagination} setPagination={setListingPagination} />
                        </div>
                    )}

                    {/* Çekimler */}
                    {activeTab === 'withdrawals' && (
                        <div>
                            <div className="flex flex-wrap gap-3 mb-6">
                                <select
                                    value={withdrawalStatusFilter}
                                    onChange={e => { setWithdrawalStatusFilter(e.target.value); setWithdrawalPagination(p => ({ ...p, page: 1 })); }}
                                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="pending">{t('statusPending')}</option>
                                    <option value="completed">{t('statusCompleted')}</option>
                                    <option value="failed">{t('statusFailed')}</option>
                                    <option value="all">{t('all')}</option>
                                </select>
                            </div>

                            <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-gray-200 dark:border-blue-800 text-gray-500 dark:text-gray-400">
                                            <th className="p-3">{t('columnUser')}</th>
                                            <th className="p-3">{t('columnAmount')}</th>
                                            <th className="p-3">{t('columnNetwork')}</th>
                                            <th className="p-3">{t('columnWalletAddress')}</th>
                                            <th className="p-3">{t('columnStatus')}</th>
                                            <th className="p-3">{t('columnCreatedAt')}</th>
                                            <th className="p-3">{t('columnActions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withdrawalsLoading ? (
                                            <tr><td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-400">{t('loading')}</td></tr>
                                        ) : withdrawals.length === 0 ? (
                                            <tr><td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-400">{t('noWithdrawalsFound')}</td></tr>
                                        ) : (
                                            withdrawals.map(w => (
                                                <tr key={w._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                    <td className="p-3">
                                                        <p className="font-medium">{w.user?.username || t('unknown')}</p>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs">{w.user?.email}</p>
                                                    </td>
                                                    <td className="p-3 font-semibold">{formatPrice(Math.abs(w.amount))}</td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{w.payoutNetwork}</td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400 max-w-[220px] truncate" title={w.payoutAddress}>{w.payoutAddress}</td>
                                                    <td className="p-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${w.status === 'completed' ? 'bg-green-500' : w.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                                            {statusLabels[w.status] || w.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(w.createdAt)}</td>
                                                    <td className="p-3">
                                                        {w.status === 'pending' && (
                                                            <div className="flex gap-3">
                                                                <button onClick={() => handleCompleteWithdrawal(w)} className="text-green-600 dark:text-green-400 hover:underline text-xs font-medium">
                                                                    {t('markCompleted')}
                                                                </button>
                                                                <button onClick={() => handleRejectWithdrawal(w)} className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium">
                                                                    {t('rejectAction')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination pagination={withdrawalPagination} setPagination={setWithdrawalPagination} />
                        </div>
                    )}

                    {/* API Dokümantasyonu */}
                    {activeTab === 'apidocs' && (
                        <div>
                            {apiSpecLoading ? (
                                <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
                            ) : apiSpecError || !apiSpec ? (
                                <p className="text-gray-500 dark:text-gray-400">{t('statsLoadError')}</p>
                            ) : (
                                <div className="bg-white rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-hidden">
                                    <SwaggerUI spec={apiSpec} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-blue-800 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

function Pagination({ pagination, setPagination }: { pagination: { page: number; pages: number; total: number }; setPagination: (fn: (p: any) => any) => void }) {
    const t = useTranslations('admin');
    if (pagination.pages <= 1) return null;
    return (
        <div className="flex justify-center items-center gap-4 mt-6">
            <button
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors text-sm"
            >
                ← {t('previousPage')}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
                {t('pageIndicator', { current: pagination.page, total: pagination.pages, count: pagination.total })}
            </span>
            <button
                onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors text-sm"
            >
                {t('nextPage')} →
            </button>
        </div>
    );
}

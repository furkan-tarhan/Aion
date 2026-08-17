'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { walletApi } from '@/lib/api';

export default function WalletPage() {
    const t = useTranslations('wallet');
    const locale = useLocale();
    const { isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [balance, setBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ text: '', type: '' });

    const typeLabels: Record<string, string> = {
        deposit: t('typeDeposit'),
        withdrawal: t('typeWithdrawal'),
        purchase: t('typePurchase'),
        sale: t('typeSale'),
    };

    const statusLabels: Record<string, { text: string; className: string }> = {
        pending: { text: t('statusPending'), className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
        completed: { text: t('statusCompleted'), className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
        failed: { text: t('statusFailed'), className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };

    // Para yatırma formu
    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [identityNumber, setIdentityNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [depositSubmitting, setDepositSubmitting] = useState(false);

    // Para çekme formu
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [iban, setIban] = useState('');
    const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

    const loadWallet = async () => {
        try {
            setLoading(true);
            const data = await walletApi.getWallet();
            if (data.success) {
                setBalance(data.data.balance);
                setTransactions(data.data.recentTransactions);
            }
        } catch { /* token geçersiz olabilir */ } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        loadWallet();

        // Deposit callback sonucu: /wallet?deposit=success|failed
        const params = new URLSearchParams(window.location.search);
        const depositResult = params.get('deposit');
        if (depositResult === 'success') {
            setMessage({ text: `${t('depositSuccess')} 🎉`, type: 'success' });
        } else if (depositResult === 'failed') {
            setMessage({ text: t('depositFailed'), type: 'error' });
        }
        if (depositResult) {
            window.history.replaceState({}, '', '/wallet');
            setTimeout(() => setMessage({ text: '', type: '' }), 6000);
        }
    }, [isAuthenticated]);

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        if (!amount || Number(amount) < 10) {
            setMessage({ text: t('minDepositAmount'), type: 'error' });
            return;
        }
        if (!name || !surname || !phone || !address || !city) {
            setMessage({ text: t('fillAllFields'), type: 'error' });
            return;
        }
        if (!/^\d{11}$/.test(identityNumber)) {
            setMessage({ text: t('invalidIdentityNumber'), type: 'error' });
            return;
        }

        try {
            setDepositSubmitting(true);
            const res = await walletApi.deposit({
                amount: Number(amount), name, surname, identityNumber, phone, address, city,
            });
            if (res.success && res.data.paymentPageUrl) {
                window.location.href = res.data.paymentPageUrl;
            } else {
                setMessage({ text: t('paymentPageError'), type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || t('depositStartError'), type: 'error' });
        } finally {
            setDepositSubmitting(false);
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        if (!withdrawAmount || Number(withdrawAmount) < 50) {
            setMessage({ text: t('minWithdrawAmount'), type: 'error' });
            return;
        }
        if (!iban || iban.replace(/\s/g, '').length < 15) {
            setMessage({ text: t('invalidIban'), type: 'error' });
            return;
        }

        try {
            setWithdrawSubmitting(true);
            const res = await walletApi.withdraw({ amount: Number(withdrawAmount), iban });
            setMessage({ text: res.message, type: 'success' });
            setBalance(res.data.balance);
            setWithdrawAmount('');
            setIban('');
            loadWallet();
        } catch (err: any) {
            setMessage({ text: err.message || t('withdrawRequestError'), type: 'error' });
        } finally {
            setWithdrawSubmitting(false);
        }
    };

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);

    const handleTestDeposit = async () => {
        try {
            setMessage({ text: '', type: '' });
            const res = await walletApi.testDeposit(1000); // 1000 TRY test bakiyesi
            if (res.success) {
                setMessage({ text: '1000 TRY Test Bakiyesi Eklendi!', type: 'success' });
                setBalance(res.balance);
                loadWallet();
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'Test yüklemesi başarısız', type: 'error' });
        }
    };

    if (!isAuthenticated) {
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6.75A2.25 2.25 0 0018.75 4.5H5.25A2.25 2.25 0 003 6.75V9" />
                            </svg>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('loginRequiredTitle')}</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {t('loginRequiredMessage')}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link href="/login" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold text-center">
                                    {t('login')}
                                </Link>
                            </div>
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
                <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
                    <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
                </div>

                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <div className="text-center mb-10">
                        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                            {t('title')}
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            {t('subtitle')}
                        </p>
                    </div>

                    {/* Bakiye Kartı */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
                        <p className="text-sm opacity-80 mb-2">{t('totalBalance')}</p>
                        <p className="text-4xl font-bold">
                            {loading ? '...' : formatMoney(balance || 0)}
                        </p>
                    </div>

                    {message.text && (
                        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                            }`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    {/* Tab Menü */}
                    <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-blue-800 overflow-hidden mb-8">
                        <div className="border-b border-gray-200 dark:border-blue-700">
                            <nav className="flex">
                                <button
                                    onClick={() => setActiveTab('deposit')}
                                    className={`flex-1 py-4 px-6 text-center font-medium transition-colors text-sm ${activeTab === 'deposit'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    💳 {t('depositTab')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('withdraw')}
                                    className={`flex-1 py-4 px-6 text-center font-medium transition-colors text-sm ${activeTab === 'withdraw'
                                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    🏦 {t('withdrawTab')}
                                </button>
                            </nav>
                        </div>

                        <div className="p-8">
                            {activeTab === 'deposit' && (
                                <div className="space-y-4">
                                    {/* Test Bakiye Yükleme Butonu — backend production'da bu endpoint'i 404 döner, o yüzden UI'da da gizlenir */}
                                    {process.env.NODE_ENV !== 'production' && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 p-4 rounded-xl flex items-center justify-between mb-8 shadow-sm">
                                            <div>
                                                <h3 className="text-yellow-800 dark:text-yellow-400 font-bold mb-1">Geliştirici Testi</h3>
                                                <p className="text-yellow-700/80 dark:text-yellow-500/80 text-sm">Ödeme altyapısını atlayarak anında 1000 TRY test bakiyesi yükleyebilirsiniz.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleTestDeposit}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-md whitespace-nowrap"
                                            >
                                                +1000 TRY Test Ekle
                                            </button>
                                        </div>
                                    )}

                                    <form onSubmit={handleDeposit} className="space-y-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {t('depositSecurityNote')}
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('amountLabel')}</label>
                                        <input type="number" min="10" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                                            placeholder="100.00"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('nameLabel')}</label>
                                            <input type="text" value={name} onChange={e => setName(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('surnameLabel')}</label>
                                            <input type="text" value={surname} onChange={e => setSurname(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('identityNumberLabel')}</label>
                                            <input type="text" value={identityNumber} onChange={e => setIdentityNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                                placeholder={t('identityNumberPlaceholder')}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('phoneLabel')}</label>
                                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                                placeholder="+90 5XX XXX XX XX"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('cityLabel')}</label>
                                            <input type="text" value={city} onChange={e => setCity(e.target.value)}
                                                placeholder="İstanbul"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('addressLabel')}</label>
                                            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                                                placeholder={t('addressPlaceholder')}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={depositSubmitting}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                        {depositSubmitting ? t('redirecting') : t('goToPaymentPage')}
                                    </button>
                                </form>
                                </div>
                            )}

                            {activeTab === 'withdraw' && (
                                <form onSubmit={handleWithdraw} className="space-y-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {t('withdrawNote')}
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('amountLabel')}</label>
                                        <input type="number" min="50" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                                            placeholder="100.00"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">IBAN</label>
                                        <input type="text" value={iban} onChange={e => setIban(e.target.value.toUpperCase())}
                                            placeholder="TR00 0000 0000 0000 0000 0000 00"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-800 placeholder-gray-400" />
                                    </div>
                                    <button type="submit" disabled={withdrawSubmitting}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                        {withdrawSubmitting ? t('submitting') : t('createWithdrawRequest')}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* İşlem Geçmişi */}
                    <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-blue-800 p-8">
                        <h3 className="text-lg font-semibold mb-4">{t('transactionHistory')}</h3>
                        {loading ? (
                            <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t('loading')}</p>
                        ) : transactions.length === 0 ? (
                            <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t('noTransactions')}</p>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx: any) => (
                                    <div key={tx._id} className="flex items-center justify-between bg-gray-50 dark:bg-blue-800/50 rounded-xl p-4">
                                        <div>
                                            <p className="font-semibold text-sm">{typeLabels[tx.type] || tx.type}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {tx.description || ''} • {new Date(tx.createdAt).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabels[tx.status]?.className || ''}`}>
                                                {statusLabels[tx.status]?.text || tx.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

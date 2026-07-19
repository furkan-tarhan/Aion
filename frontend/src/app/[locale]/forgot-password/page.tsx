'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
    const t = useTranslations('auth.forgotPassword');
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authApi.forgotPassword(email);
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('genericError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center px-4">
                <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
                    <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
                </div>

                <div className="w-full max-w-md">
                    <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-blue-800 p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                                {t('title')}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">
                                {t('subtitle')}
                            </p>
                        </div>

                        {sent ? (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600 dark:text-green-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('emailSentTitle')}</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    {t('emailSentMessageBefore')} <strong>{email}</strong> {t('emailSentMessageAfter')}
                                </p>
                                <Link href="/login" className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                                    ← {t('backToLogin')}
                                </Link>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            {t('emailLabel')}
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="ornek@email.com"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black dark:text-white dark:bg-gray-800 placeholder-gray-400 transition-all"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? t('submitting') : t('submit')}
                                    </button>
                                </form>

                                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                                    {t('rememberedPassword')}{' '}
                                    <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium transition-colors">
                                        {t('loginLink')}
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

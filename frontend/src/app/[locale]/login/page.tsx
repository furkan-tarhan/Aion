'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function LoginPage() {
    const t = useTranslations('auth.login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authApi.login(email, password);
            login(data.token);
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('failedDefault'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="relative min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center px-4">
                {/* Arka plan */}
                <div className="fixed inset-0 -z-10 overflow-hidden opacity-10 dark:opacity-20">
                    <div className="absolute inset-0 bg-[url('/logo.png')] bg-no-repeat bg-center bg-contain"></div>
                </div>

                <div className="w-full max-w-md">
                    <div className="bg-white/90 dark:bg-blue-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-blue-800 p-8">
                        {/* Başlık */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                                {t('title')}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">
                                {t('subtitle')}
                            </p>
                        </div>

                        {/* Hata Mesajı */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Email
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

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('passwordLabel')}
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black dark:text-white dark:bg-gray-800 placeholder-gray-400 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end">
                                <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                                    {t('forgotPassword')}
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? t('submitting') : t('submit')}
                            </button>
                        </form>

                        {/* Alt Link */}
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                            {t('noAccount')}{' '}
                            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors">
                                {t('registerLink')}
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
}

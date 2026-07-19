'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    userId: string;
    username: string;
    email: string;
    role: 'user' | 'admin';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('zade_token');
        if (savedToken) {
            try {
                const payload = JSON.parse(atob(savedToken.split('.')[1]));
                // Token süresi dolmuş mu kontrol et
                if (payload.exp * 1000 > Date.now()) {
                    setToken(savedToken);
                    setUser({ userId: payload.userId, username: payload.username, email: payload.email, role: payload.role || 'user' });
                } else {
                    localStorage.removeItem('zade_token');
                }
            } catch {
                localStorage.removeItem('zade_token');
            }
        }
    }, []);

    const login = (newToken: string) => {
        localStorage.setItem('zade_token', newToken);
        setToken(newToken);
        try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            setUser({ userId: payload.userId, username: payload.username, email: payload.email, role: payload.role || 'user' });
        } catch {
            console.error('Token parse hatası');
        }
    };

    const logout = () => {
        localStorage.removeItem('zade_token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

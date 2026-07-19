// '??' kullanılıyor: NEXT_PUBLIC_API_URL="" (Nginx reverse proxy arkasında relative path) ile
// tanımsız/eksik env değişkeninden (lokal geliştirme varsayılanı) ayırt edebilmek için.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('zade_token') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Bir hata oluştu' }));
        throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
}

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        request<{ message: string; token: string }>('/api/users/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    register: (username: string, email: string, password: string) =>
        request<{ message: string }>('/api/users', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        }),

    forgotPassword: (email: string) =>
        request<{ message: string }>('/api/users/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),
};

// Skins API
export const skinsApi = {
    getByWeapon: (weapon: string) =>
        request<{ success: boolean; data: any[]; weapon: string }>(`/api/skins/weapon/${weapon}`),

    getById: (skinId: string) =>
        request<{ success: boolean; data: any }>(`/api/skins/skin/${skinId}`),

    getCategories: () =>
        request<{ success: boolean; data: any[] }>('/api/skins/categories'),

    getPopular: () =>
        request<{ success: boolean; data: any[] }>('/api/skins/popular'),

    search: (query: string) =>
        request<{ success: boolean; data: any[] }>(`/api/skins/search?q=${encodeURIComponent(query)}`),

    getPriceHistory: (skinId: string) =>
        request<{ success: boolean; data: { history: { date: string; avgPrice: number; minPrice: number; maxPrice: number; volume: number }[]; currentSteamPrice: number | null } }>(`/api/skins/${skinId}/price-history`),
};

// Steam API
export const steamApi = {
    getProfile: (steamId: string) =>
        request<{ success: boolean; data: any }>(`/api/steam/profile/${steamId}`),

    getInventory: (steamId: string) =>
        request<{ success: boolean; data: any }>(`/api/steam/inventory/${steamId}`),

    getInventoryValue: (steamId: string) =>
        request<{ success: boolean; data: any }>(`/api/steam/inventory/${steamId}/value`),
};

// Listings API
export const listingsApi = {
    getAll: (params?: { page?: number; limit?: number; sort?: string; weapon?: string; rarity?: string; minPrice?: number; maxPrice?: number; wear?: string; statTrak?: boolean; minFloat?: number; maxFloat?: number }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.sort) query.set('sort', params.sort);
        if (params?.weapon) query.set('weapon', params.weapon);
        if (params?.rarity) query.set('rarity', params.rarity);
        if (params?.minPrice) query.set('minPrice', String(params.minPrice));
        if (params?.maxPrice) query.set('maxPrice', String(params.maxPrice));
        if (params?.wear) query.set('wear', params.wear);
        if (params?.statTrak !== undefined) query.set('statTrak', String(params.statTrak));
        if (params?.minFloat !== undefined) query.set('minFloat', String(params.minFloat));
        if (params?.maxFloat !== undefined) query.set('maxFloat', String(params.maxFloat));
        return request<{ success: boolean; data: any[]; pagination: any }>(`/api/listings?${query.toString()}`);
    },

    getById: (id: string) =>
        request<{ success: boolean; data: any }>(`/api/listings/${id}`),

    create: (data: { skinId: string; price: number; steamTradeUrl: string; wear?: string; floatValue?: number; isStatTrak?: boolean }) =>
        request<{ success: boolean; message: string; data: any }>('/api/listings', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: { price?: number; steamTradeUrl?: string }) =>
        request<{ success: boolean; message: string; data: any }>(`/api/listings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    cancel: (id: string) =>
        request<{ success: boolean; message: string }>(`/api/listings/${id}`, {
            method: 'DELETE',
        }),

    getMyListings: () =>
        request<{ success: boolean; data: any[] }>('/api/listings/my/listings'),

    buy: (id: string) =>
        request<{ success: boolean; message: string; data: { listing: any; balance: number } }>(`/api/listings/${id}/buy`, {
            method: 'POST',
        }),
};

// User API
export const userApi = {
    getMe: () =>
        request<{ success: boolean; data: any }>('/api/users/me'),

    updateProfile: (data: { fullName?: string; phone?: string; address?: string; avatar?: string }) =>
        request<{ success: boolean; message: string; profile: any }>('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    changePassword: (userId: string, data: { password: string }) =>
        request<{ success: boolean; message: string }>(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    linkSteam: (steamId: string) =>
        request<{ success: boolean; message: string; data: any }>('/api/users/link-steam', {
            method: 'PUT',
            body: JSON.stringify({ steamId }),
        }),

    deleteAccount: (userId: string) =>
        request<{ success: boolean; message: string }>(`/api/users/${userId}`, {
            method: 'DELETE',
        }),
};

// Favorites API
export const favoritesApi = {
    getAll: () =>
        request<{ success: boolean; data: string[] }>('/api/favorites'),

    add: (skinId: string) =>
        request<{ success: boolean; message: string; data: string[] }>('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ skinId }),
        }),

    remove: (skinId: string) =>
        request<{ success: boolean; message: string; data: string[] }>(`/api/favorites/${skinId}`, {
            method: 'DELETE',
        }),
};

// Cüzdan (Wallet) API
export const walletApi = {
    getWallet: () =>
        request<{ success: boolean; data: { balance: number; currency: string; recentTransactions: any[] } }>('/api/wallet'),

    getTransactions: (page = 1, limit = 20) =>
        request<{ success: boolean; data: any[]; pagination: any }>(`/api/wallet/transactions?page=${page}&limit=${limit}`),

    deposit: (data: { amount: number; name: string; surname: string; identityNumber: string; phone: string; address: string; city: string }) =>
        request<{ success: boolean; message?: string; data: { token: string; paymentPageUrl: string; checkoutFormContent?: string } }>('/api/wallet/deposit', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    withdraw: (data: { amount: number; iban: string }) =>
        request<{ success: boolean; message: string; data: { balance: number; transaction: any } }>('/api/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Bildirimler (Notifications) API
export const notificationsApi = {
    getAll: (page = 1, limit = 20) =>
        request<{ success: boolean; data: any[]; pagination: any }>(`/api/notifications?page=${page}&limit=${limit}`),

    getUnreadCount: () =>
        request<{ success: boolean; data: { count: number } }>('/api/notifications/unread-count'),

    markRead: (id: string) =>
        request<{ success: boolean; data: any }>(`/api/notifications/${id}/read`, {
            method: 'PATCH',
        }),

    markAllRead: () =>
        request<{ success: boolean; message: string }>('/api/notifications/read-all', {
            method: 'PATCH',
        }),
};

// Admin API
export const adminApi = {
    getStats: () =>
        request<{ success: boolean; data: any }>('/api/admin/stats'),

    getUsers: (params?: { page?: number; limit?: number; q?: string; role?: string; banned?: boolean }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.q) query.set('q', params.q);
        if (params?.role) query.set('role', params.role);
        if (params?.banned !== undefined) query.set('banned', String(params.banned));
        return request<{ success: boolean; data: any[]; pagination: any }>(`/api/admin/users?${query.toString()}`);
    },

    banUser: (id: string, reason?: string) =>
        request<{ success: boolean; message: string }>(`/api/admin/users/${id}/ban`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        }),

    unbanUser: (id: string) =>
        request<{ success: boolean; message: string }>(`/api/admin/users/${id}/unban`, {
            method: 'PATCH',
        }),

    setUserRole: (id: string, role: 'user' | 'admin') =>
        request<{ success: boolean; message: string; data: any }>(`/api/admin/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        }),

    getListings: (params?: { page?: number; limit?: number; status?: string; q?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.status) query.set('status', params.status);
        if (params?.q) query.set('q', params.q);
        return request<{ success: boolean; data: any[]; pagination: any }>(`/api/admin/listings?${query.toString()}`);
    },

    removeListing: (id: string, reason?: string) =>
        request<{ success: boolean; message: string }>(`/api/admin/listings/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),

    // OpenAPI spec JSON'ı döner — SwaggerUI'a doğrudan spec objesi olarak geçirilir
    // (SwaggerUI'ın kendi başına URL'den fetch etmesine izin verirsek JWT header'ı gönderemez).
    getApiDocs: () => request<any>('/api/admin/docs'),
};

// Reviews API
export const reviewsApi = {
    create: (data: { revieweeId: string; listingId?: string; rating: number; comment: string }) =>
        request<{ success: boolean; message: string; data: any }>('/api/reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getByUser: (userId: string) =>
        request<{ success: boolean; data: { reviews: any[]; averageRating: number; totalRatings: number } }>(`/api/reviews/user/${userId}`),
};

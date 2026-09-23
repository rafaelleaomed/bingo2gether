import api from './api';

const VAPID_PUBLIC_KEY = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const notificationService = {
    registerSw: async () => {
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered', reg);
                return reg;
            } catch (err) {
                console.error('Service Worker registration failed', err);
            }
        }
    },

    subscribeUser: async () => {
        if (!('serviceWorker' in navigator)) return false;

        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID Public Key not found');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed to avoid spamming
            const existingSub = await (registration as any).pushManager.getSubscription();
            if (existingSub) {
                // Update query to server to ensure it is synced?
                // For now, assume if it exists in browser, we re-send to be safe, or return true
                await api.post('/notifications/subscribe', { subscription: existingSub });
                return true;
            }

            const subscription = await (registration as any).pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            await api.post('/notifications/subscribe', { subscription });
            console.log('User subscribed to notifications');
            return true;
        } catch (error) {
            console.error('Failed to subscribe', error);
            return false;
        }
    }
};

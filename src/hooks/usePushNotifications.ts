import { useEffect, useCallback } from 'react';
import api from '../services/api';

const VAPID_PUBLIC_KEY = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;

export const usePushNotifications = (isAuthenticated: boolean) => {
    const subscribeUser = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // Get existing subscription
            let subscription = await (registration as any).pushManager.getSubscription();

            if (!subscription) {
                // Subscribe new user
                subscription = await (registration as any).pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: VAPID_PUBLIC_KEY
                });
            }

            // Send to backend
            await api.post('/notifications/subscribe', subscription);
            console.log('Push subscription successful');
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            // Register SW if not already
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(() => {
                        // Request permission
                        if (Notification.permission === 'default') {
                            Notification.requestPermission().then(permission => {
                                if (permission === 'granted') {
                                    subscribeUser();
                                }
                            });
                        } else if (Notification.permission === 'granted') {
                            subscribeUser();
                        }
                    });
            }
        }
    }, [isAuthenticated, subscribeUser]);
};

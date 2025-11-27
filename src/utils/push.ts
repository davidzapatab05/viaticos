import { getVapidPublicKey, subscribeToNotifications, unsubscribeFromNotifications } from '../services/api';

export function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
    }

    const registration = await navigator.serviceWorker.ready;

    // Get public key from backend
    const { publicKey } = await getVapidPublicKey();
    console.log('VAPID Public Key received:', publicKey);

    if (!publicKey) {
        throw new Error('VAPID Public Key is missing from server response');
    }

    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    console.log('VAPID Key converted successfully. Length:', convertedVapidKey.length);

    if (convertedVapidKey.length !== 65) {
        console.error('CRITICAL: VAPID Public Key length is incorrect. Expected 65 bytes, got ' + convertedVapidKey.length);
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
        // Check if the existing subscription key matches the new VAPID key
        const existingKey = existingSubscription.options.applicationServerKey;

        // Convert both to comparable format (Uint8Array) if possible, or just rely on re-subscribing if needed.
        // Since comparing ArrayBuffers is tricky across browsers, a safer approach for key rotation
        // is to compare the base64 strings or just re-subscribe if we suspect a change.

        // However, converting the new key to Uint8Array is already done.
        // Let's compare byte by byte.
        const newKeyArray = convertedVapidKey;
        const existingKeyArray = existingKey ? new Uint8Array(existingKey) : null;

        let keysMatch = true;
        if (existingKeyArray && newKeyArray.length === existingKeyArray.length) {
            for (let i = 0; i < newKeyArray.length; i++) {
                if (newKeyArray[i] !== existingKeyArray[i]) {
                    keysMatch = false;
                    break;
                }
            }
        } else {
            keysMatch = false;
        }

        if (keysMatch) {
            // Keys match, just update backend to ensure it's linked to current user
            await subscribeToNotifications(existingSubscription);
            return existingSubscription;
        } else {
            // Keys don't match (VAPID rotation), unsubscribe and resubscribe
            console.log("VAPID key changed, resubscribing...");
            await existingSubscription.unsubscribe();
        }
    }

    // Helper to wait for active SW
    const waitForActiveSW = async (reg: ServiceWorkerRegistration) => {
        if (reg.active && reg.active.state === 'activated') {
            return reg.active;
        }
        return new Promise<ServiceWorker>((resolve) => {
            const serviceWorker = reg.installing || reg.waiting || reg.active;
            if (!serviceWorker) {
                // Should not happen if we waited for .ready, but safety check
                return;
            }
            if (serviceWorker.state === 'activated') {
                resolve(serviceWorker);
                return;
            }
            serviceWorker.addEventListener('statechange', () => {
                if (serviceWorker.state === 'activated') {
                    resolve(serviceWorker);
                }
            });
        });
    };

    try {
        // Ensure SW is fully active before subscribing
        await waitForActiveSW(registration);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        // Send subscription to backend (explicitly use toJSON to ensure keys are included)
        const subscriptionJSON = subscription.toJSON();
        await subscribeToNotifications(subscriptionJSON as any);

        return subscription;
    } catch (error) {
        console.error('Error subscribing to push:', error);

        // Hard Reset Strategy: Unregister SW and try one more time
        // This fixes "ghost" subscriptions or corrupted SW states
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('no active Service Worker'))) {
            console.warn('Subscription error detected. Attempting Service Worker Hard Reset...');
            await registration.unregister();

            if ('serviceWorker' in navigator) {
                const newReg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
                await waitForActiveSW(newReg); // Wait for the new one to be active

                // Try subscribing again with the new registration
                const newSub = await newReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });

                const newSubJSON = newSub.toJSON();
                await subscribeToNotifications(newSubJSON as any);
                return newSub;
            }
        }
        throw error;
    }
}

export async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        // Notify backend to remove subscription
        await unsubscribeFromNotifications(subscription.endpoint)
            .catch(err => console.error('Error unsubscribing from backend:', err));

        // Unsubscribe locally
        // await subscription.unsubscribe(); 
    }
}

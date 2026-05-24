import { createApp } from 'vue';
import { MotionPlugin } from '@vueuse/motion';
import App from './App.vue';
import './style.css';

const app = createApp(App);

app.use(MotionPlugin);
app.mount('#app');

window.deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
});
window.addEventListener('appinstalled', () => {
    window.deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
});

if ('serviceWorker' in navigator) {
    const isLocalDev = window.location.hostname.includes('localhost') || window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
    if (isLocalDev) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
                registration.unregister().then(unregistered => {
                    if (unregistered) console.log('[PWA] Unregistered stale service worker for local development.');
                });
            }
        });
    } else {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[PWA] Service Worker registered successfully:', reg.scope))
                .catch(err => console.error('[PWA] Service Worker registration failed:', err));
        });
    }
}

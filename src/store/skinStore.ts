import { create } from 'zustand';

export type SkinTheme = 'carbon' | 'matrimoney' | 'viagem' | 'carro';

const PREMIUM_SKINS: SkinTheme[] = ['matrimoney', 'viagem', 'carro'];

interface SkinState {
    theme: SkinTheme;
    setTheme: (theme: SkinTheme) => void;
    isPremiumSkin: () => boolean;
    reset: () => void;
}

export const useSkinStore = create<SkinState>((set, get) => ({
    // Initialize from localStorage synchronously
    theme: (localStorage.getItem('b2g_active_skin') as SkinTheme) || 'carbon',

    setTheme: (theme: SkinTheme) => {
        set({ theme });
        localStorage.setItem('b2g_active_skin', theme);

        const root = document.documentElement;
        // Remove existing theme classes
        root.classList.remove('theme-carbon', 'theme-matrimoney', 'theme-viagem', 'theme-carro');
        // Add new one
        root.classList.add(`theme-${theme}`);
    },

    isPremiumSkin: () => {
        return PREMIUM_SKINS.includes(get().theme);
    },

    reset: () => {
        localStorage.removeItem('b2g_active_skin');
        set({ theme: 'carbon' });
        const root = document.documentElement;
        root.classList.remove('theme-carbon', 'theme-matrimoney', 'theme-viagem', 'theme-carro');
        root.classList.add('theme-carbon');
    }
}));

// Sync initialization for app boot
export const initTheme = () => {
    const theme = useSkinStore.getState().theme;
    const root = document.documentElement;
    root.classList.remove('theme-carbon', 'theme-matrimoney', 'theme-viagem', 'theme-carro');
    root.classList.add(`theme-${theme}`);
};

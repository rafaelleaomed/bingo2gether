import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        // Check if already installed as PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (navigator as any).standalone === true;
        if (isStandalone) return;

        // Check if dismissed recently
        const dismissedAt = localStorage.getItem('b2g_pwa_dismissed');
        if (dismissedAt) {
            const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) return;
        }

        // Detect iOS
        const ua = navigator.userAgent;
        const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        setIsIOS(isiOS);

        // On iOS, show the manual instructions banner
        if (isiOS) {
            setTimeout(() => setShowBanner(true), 3000);
            return;
        }

        // On Android/Chrome, listen for beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        setInstalling(true);
        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
        } catch {
            // ignore
        } finally {
            setInstalling(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setShowIOSInstructions(false);
        localStorage.setItem('b2g_pwa_dismissed', Date.now().toString());
    };

    if (!showBanner) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[250] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
                <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl shadow-black/50">
                    {/* iOS Manual Instructions */}
                    {isIOS && showIOSInstructions ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold text-sm">Como instalar no iPhone</h3>
                                <button onClick={handleDismiss} className="p-1 text-slate-500 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">1</div>
                                    <p className="text-slate-300 text-xs">Toque no botão <Share size={14} className="inline text-blue-400" /> <span className="font-bold text-white">Compartilhar</span> (na barra inferior do Safari)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">2</div>
                                    <p className="text-slate-300 text-xs">Role para baixo e toque em <span className="font-bold text-white">"Adicionar à Tela de Início"</span></p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">3</div>
                                    <p className="text-slate-300 text-xs">Toque em <span className="font-bold text-white">"Adicionar"</span> no canto superior</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="w-full py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-xs"
                            >
                                Entendi, fechar
                            </button>
                        </div>
                    ) : (
                        /* Standard Install Prompt */
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-brand-purple to-brand-gold rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-purple/30">
                                <Download size={22} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-sm">Instalar Bingo2Gether</h3>
                                <p className="text-slate-400 text-[11px] mt-0.5">Acesse direto da sua tela inicial — rápido e sem navegador!</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={handleDismiss} className="p-2 text-slate-600 hover:text-slate-300 transition-colors">
                                    <X size={18} />
                                </button>
                                <button
                                    onClick={isIOS ? () => setShowIOSInstructions(true) : handleInstall}
                                    disabled={installing}
                                    className="px-5 py-2.5 bg-gradient-to-r from-brand-gold to-[#c9a75e] text-brand-purple rounded-xl font-black text-xs shadow-lg shadow-brand-gold/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {installing ? '...' : 'Instalar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InstallPrompt;

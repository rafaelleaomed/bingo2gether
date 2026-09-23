import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Onboarding, { BingoLogo } from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { GameState } from './types';
import { DEFAULT_GAME_STATE } from './constants';
import { ThemeProvider } from './ThemeContext';
import { useAuthStore, ADMIN_EMAILS } from './store/authStore';
import AuthModal from './components/auth/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Shield } from 'lucide-react';
import { usePushNotifications } from './hooks/usePushNotifications';
import LoginPage from './components/auth/LoginPage';
import AcceptInvitePage from './components/auth/AcceptInvitePage';
import { initTheme, useSkinStore } from './store/skinStore';
import { ImmersiveBackground } from './components/ui/ImmersiveBackground';
import InstallPrompt from './components/pwa/InstallPrompt';

const AppContent: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => JSON.parse(JSON.stringify(DEFAULT_GAME_STATE)));
  const [loaded, setLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Skip splash if user has logged in before
    return !localStorage.getItem('hasLoggedInBefore');
  });
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  const { isAuthenticated, checkAuth, user } = useAuthStore();

  usePushNotifications(isAuthenticated);

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initAuthListener();

    const init = async () => {
      initTheme();

      // Only load local state if NOT authenticated, as authenticated users should pull from server
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        const saved = localStorage.getItem('saveTogetherState');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.isSetup) {
              if (!parsed.lastDraw) parsed.lastDraw = null;
              setGameState(parsed);
            }
          } catch (e) {
            console.error("Failed to load save state", e);
          }
        }
      }
      setLoaded(true);
    };

    init();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, localStorage.getItem('hasLoggedInBefore') ? 0 : 4500);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const { theme, setTheme } = useSkinStore();

  useEffect(() => {
    // Force reset to carbon if user is not PRO but a premium skin is active
    const isPremium = ['matrimoney', 'viagem', 'carro'].includes(theme);
    if (!useAuthStore.getState().isLoading && isAuthenticated && !user?.isPro && isPremium) {
      console.log('Non-PRO user with premium skin detected, resetting to carbon');
      setTheme('carbon');
    }
  }, [isAuthenticated, user?.isPro, theme, setTheme]);

  useEffect(() => {
    if (isAuthenticated && user?.coupleId) {
      const fetchServerState = async () => {
        try {
          const { data } = await supabase
            .from('games')
            .select('state')
            .eq('couple_id', user.coupleId!)
            .maybeSingle();
          if (data?.state && (data.state as any).isSetup) {
            setGameState(data.state as unknown as GameState);
          }
        } catch (error) {
          console.error("Failed to fetch server state", error);
        }
      };
      fetchServerState();
    }
  }, [isAuthenticated, user?.coupleId]);

  useEffect(() => {
    if (user && typeof user.isPro === 'boolean') {
      if (gameState.settings.isPro !== user.isPro) {
        setGameState(prev => ({
          ...prev,
          settings: { ...prev.settings, isPro: user.isPro }
        }));
      }
    }
  }, [user, gameState.settings.isPro]);

  // Sync game state to database
  useEffect(() => {
    if (loaded && isAuthenticated && gameState.isSetup && user?.coupleId) {
      const timer = setTimeout(async () => {
        try {
          const { data: existing } = await supabase
            .from('games')
            .select('id')
            .eq('couple_id', user.coupleId!)
            .maybeSingle();

          if (existing) {
            await supabase.from('games').update({
              state: gameState as any,
              is_setup: gameState.isSetup,
              last_played_at: new Date().toISOString(),
            }).eq('id', existing.id);
          } else {
            await supabase.from('games').insert({
              couple_id: user.coupleId!,
              state: gameState as any,
              is_setup: gameState.isSetup,
              last_played_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Failed to sync game state", error);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, loaded, isAuthenticated, user?.coupleId]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('saveTogetherState', JSON.stringify(gameState));
    }
  }, [gameState, loaded]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setInviteToken(invite);
    }

    if (params.get('payment') === 'success' || window.location.pathname.includes('/payment/success')) {
      const celebrate = async () => {
        await checkAuth();
        await useAuthStore.getState().checkPlanStatus();
        setShowSuccessModal(true);
        window.history.replaceState({}, document.title, "/");
      };
      celebrate();
    }
  }, [checkAuth]);

  const handleSetupComplete = (data: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...data }));
  };

  const handleReset = () => {
    const freshState = JSON.parse(JSON.stringify(DEFAULT_GAME_STATE));
    freshState.settings.targetDate = new Date().toISOString();
    freshState.settings.startDate = new Date().toISOString();
    setGameState(freshState);
    localStorage.removeItem('saveTogetherState');
    window.scrollTo(0, 0);
  };

  if (inviteToken) {
    return <AcceptInvitePage token={inviteToken} onSuccess={() => {
      setInviteToken(null);
      window.history.replaceState({}, document.title, "/");
      useAuthStore.getState().checkAuth();
    }} />;
  }

  if (!loaded) return null;

  return (
    <>
      <ImmersiveBackground />
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 3.5 }}
            onAnimationComplete={() => setShowSplash(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <BingoLogo className="w-32 h-32 border-4 border-brand-gold shadow-[0_0_60px_rgba(230,194,110,0.4)]" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-6 text-3xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent"
            >
              Bingo2Gether
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="mt-2 text-slate-500 text-sm font-medium"
            >
              Construindo o futuro juntos
            </motion.p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isAuthenticated && !showSplash ? (
            <motion.div key="mandatory-login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120]">
              <LoginPage onSuccess={() => setShowLoginPage(false)} />
            </motion.div>
          ) : isAuthenticated && !user?.coupleId && !gameState.isSetup && !showSplash ? (
            <motion.div key="onboarding-with-code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Onboarding onComplete={handleSetupComplete} isPro={user?.isPro || false} onStepChange={setOnboardingStep} />
            </motion.div>
          ) : !gameState.isSetup && !showSplash ? (
            <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Onboarding onComplete={handleSetupComplete} isPro={user?.isPro || false} onStepChange={setOnboardingStep} />
            </motion.div>
          ) : !showSplash ? (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard gameState={gameState} onUpdateState={setGameState} onReset={handleReset} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

        {/* Floating Admin Button - only visible to admin users */}
        {isAuthenticated && user && ADMIN_EMAILS.includes(user.email.toLowerCase()) && (
          <a
            href="/admin"
            className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-full shadow-xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', color: '#fff', fontWeight: 700, fontSize: 13, border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Shield size={18} />
            Admin
          </a>
        )}

        <AnimatePresence>
          {showSuccessModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowSuccessModal(false)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
              />
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 50 }}
                className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-brand-purple p-8 rounded-[2.5rem] border border-white/20 text-center shadow-2xl"
              >
                <div className="w-24 h-24 bg-brand-gold rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(230,192,110,0.4)]">
                  <Crown className="text-brand-purple w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Você é PRO!</h2>
                <p className="text-slate-300 text-sm font-medium mb-8">Parabéns! Sua conta foi atualizada e todos os recursos exclusivos estão desbloqueados.</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-4 bg-brand-gold text-brand-purple rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Começar agora
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PWA Install Banner */}
        {isAuthenticated && <InstallPrompt />}
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;

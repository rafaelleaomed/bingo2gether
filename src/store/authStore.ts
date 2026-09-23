import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useSkinStore } from './skinStore';

// Owner gets lifetime PRO automatically. Admins can access /admin panel.
export const OWNER_EMAIL = 'rafaelleaobh@gmail.com';
export const ADMIN_EMAILS = ['bingotwogether@gmail.com', 'rafaelleaobh@gmail.com'];

interface User {
    id: string;
    email: string;
    name?: string;
    role: 'owner' | 'partner' | null;
    coupleId: string | null;
    isPro: boolean;
    planType: 'free' | 'mensal' | 'anual' | 'vitalicio';
    planExpiresAt: string | null;
    partnerEmail: string | null;
    partnerName: string | null;
    source?: string;
    inviteCode?: string | null;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string, marketingOptIn?: boolean) => Promise<void>;
    googleLogin: () => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    initAuthListener: () => () => void;
    devLogin: () => void;
    sendPasswordReset: (email: string) => Promise<void>;
    resendVerificationEmail: () => Promise<void>;

    createCouple: () => Promise<void>;
    invitePartner: (email: string) => Promise<any>;
    acceptInvite: (token: string, keepInviterData?: boolean) => Promise<void>;
    checkPlanStatus: () => Promise<void>;
}

async function buildUserFromProfile(supabaseUser: SupabaseUser): Promise<User> {
    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

    // If profile doesn't exist yet (trigger timing), create it inline
    if (!profile) {
        const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
                id: supabaseUser.id,
                email: supabaseUser.email || '',
                name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
                source: supabaseUser.app_metadata?.provider === 'google' ? 'google' : 'email',
            }, { onConflict: 'id' })
            .select('*')
            .maybeSingle();
        profile = newProfile;
    }

    let coupleData: any = null;
    let partnerProfile: any = null;

    if (profile?.couple_id) {
        const { data: couple } = await supabase
            .from('couples')
            .select('*')
            .eq('id', profile.couple_id)
            .maybeSingle();
        coupleData = couple;

        if (couple) {
            const partnerId = couple.owner_user_id === supabaseUser.id
                ? couple.partner_user_id
                : couple.owner_user_id;
            if (partnerId) {
                const { data: partner } = await supabase
                    .from('profiles')
                    .select('name, email')
                    .eq('id', partnerId)
                    .maybeSingle();
                partnerProfile = partner;
            }
        }
    }

    const email = supabaseUser.email || '';
    const isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    return {
        id: supabaseUser.id,
        email,
        name: profile?.name || supabaseUser.user_metadata?.full_name || '',
        role: profile?.role as 'owner' | 'partner' | null,
        coupleId: profile?.couple_id || null,
        isPro: isOwner ? true : (coupleData ? coupleData.plan_type !== 'free' : false),
        planType: isOwner ? 'vitalicio' : (coupleData?.plan_type || 'free'),
        planExpiresAt: coupleData?.plan_expires_at || null,
        partnerEmail: partnerProfile?.email || null,
        partnerName: partnerProfile?.name || null,
        source: profile?.source || 'email',
    };
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (email: string, password: string) => {
        // Clear any old local state to prevent leaking previous user's game/skin
        localStorage.removeItem('saveTogetherState');
        localStorage.removeItem('b2g_active_skin');
        useSkinStore.getState().reset();

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('hasLoggedInBefore', 'true');
        const user = await buildUserFromProfile(data.user);
        set({ user, token: data.session?.access_token || null, isAuthenticated: true });
    },

    register: async (email: string, password: string, name?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name || '' },
                emailRedirectTo: window.location.origin,
            },
        });
        if (error) throw error;
        if (data.user) {
            // Update name in profile if needed
            if (name) {
                await supabase.from('profiles').update({ name }).eq('id', data.user.id);
            }

            // Clear any old local state to prevent leaking previous user's game/skin
            localStorage.removeItem('saveTogetherState');
            localStorage.removeItem('b2g_active_skin');

            const user = await buildUserFromProfile(data.user);
            set({ user, token: data.session?.access_token || null, isAuthenticated: true });
        }
    },

    googleLogin: async () => {
        // Clear any old local state
        localStorage.removeItem('saveTogetherState');
        localStorage.removeItem('b2g_active_skin');
        useSkinStore.getState().reset();

        localStorage.setItem('hasLoggedInBefore', 'true');
        
        const isLovableSandbox = import.meta.env.VITE_SUPABASE_PROJECT_ID === 'wsmbsudorcvpdalgbyfy';
        
        if (isLovableSandbox) {
            const result = await lovable.auth.signInWithOAuth('google', {
                redirect_uri: window.location.origin,
            });
            if (result.error) {
                localStorage.removeItem('hasLoggedInBefore');
                throw result.error;
            }
        } else {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) {
                localStorage.removeItem('hasLoggedInBefore');
                throw error;
            }
        }
    },

    logout: () => {
        supabase.auth.signOut();
        localStorage.removeItem('saveTogetherState');
        localStorage.removeItem('b2g_active_skin');
        useSkinStore.getState().reset();
        set({ user: null, token: null, isAuthenticated: false });
        window.location.href = '/';
    },

    sendPasswordReset: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
    },

    resendVerificationEmail: async () => {
        // Supabase handles this via resend
        const { error } = await supabase.auth.resend({ type: 'signup', email: get().user?.email || '' });
        if (error) throw error;
    },

    checkAuth: async () => {
        let session;
        try {
            const result = await supabase.auth.getSession();
            session = result.data.session;
        } catch (err) {
            console.warn('Silent checkAuth error (likely early abort):', err);
            set({ isLoading: false });
            return;
        }

        if (!session?.user) {
            set({ isLoading: false });
            return;
        }
        try {
            const user = await buildUserFromProfile(session.user);
            set({ user, token: session.access_token, isAuthenticated: true, isLoading: false });
        } catch (err) {
            console.warn('checkAuth: buildUserFromProfile failed, using fallback:', err);
            const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || '',
                role: null,
                coupleId: null,
                isPro: false,
                planType: 'free',
                planExpiresAt: null,
                partnerEmail: null,
                partnerName: null,
                source: session.user.app_metadata?.provider || 'email',
            };
            set({ user: fallbackUser, token: session.access_token, isAuthenticated: true, isLoading: false });
        }
    },

    initAuthListener: () => {
        const buildOrFallback = async (sessionUser: SupabaseUser, accessToken: string) => {
            try {
                const user = await buildUserFromProfile(sessionUser);
                localStorage.setItem('hasLoggedInBefore', 'true');
                set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
            } catch (err) {
                console.warn('buildUserFromProfile failed, using fallback:', err);
                // Still authenticate with minimal data so the user isn't stuck on login
                const fallbackUser: User = {
                    id: sessionUser.id,
                    email: sessionUser.email || '',
                    name: sessionUser.user_metadata?.full_name || '',
                    role: null,
                    coupleId: null,
                    isPro: false,
                    planType: 'free',
                    planExpiresAt: null,
                    partnerEmail: null,
                    partnerName: null,
                    source: sessionUser.app_metadata?.provider || 'email',
                };
                localStorage.setItem('hasLoggedInBefore', 'true');
                set({ user: fallbackUser, token: accessToken, isAuthenticated: true, isLoading: false });
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await buildOrFallback(session.user, session.access_token);
            } else {
                set({ user: null, token: null, isAuthenticated: false, isLoading: false });
            }
        });

        // onAuthStateChange handles the initial session load and URL hash parsing automatically.
        // Calling getSession() here causes a race condition that aborts the OAuth token exchange.

        return () => subscription.unsubscribe();
    },

    devLogin: () => {
        const mockUser: User = {
            id: 'demo-user-id',
            email: 'rafaelleaomed@gmail.com',
            name: 'Rafael Leão (Demo)',
            role: 'owner',
            coupleId: 'demo-couple-id',
            isPro: true,
            planType: 'vitalicio',
            planExpiresAt: '2099-12-31',
            partnerEmail: 'parceira@exemplo.com',
            partnerName: 'Parceira Demo',
            source: 'demo',
        };
        set({ user: mockUser, isAuthenticated: true, isLoading: false, token: 'demo-token' });
        localStorage.setItem('hasLoggedInBefore', 'true');
    },

    createCouple: async () => {
        const userId = get().user?.id;
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('couples')
            .insert({ owner_user_id: userId })
            .select()
            .single();
        if (error) throw error;

        // Update profile with couple_id and role
        await supabase.from('profiles').update({ couple_id: data.id, role: 'owner' }).eq('id', userId);
        await get().checkAuth();
    },

    invitePartner: async (email: string) => {
        const coupleId = get().user?.coupleId;
        if (!coupleId) throw new Error('No couple found');

        const { data, error } = await supabase
            .from('invites')
            .insert({ couple_id: coupleId, email })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    acceptInvite: async (token: string, keepInviterData: boolean = true) => {
        const userId = get().user?.id;
        if (!userId) throw new Error('Not authenticated');

        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .maybeSingle();

        if (inviteError || !invite) throw new Error('Código inválido ou expirado.');

        // Check expiry
        if (new Date(invite.expires_at) < new Date()) {
            throw new Error('Código expirado.');
        }

        // Call the new RPC to handle the complex merge logic
        // @ts-ignore - The new accept_invite_merge RPC is not yet in the generated TypeScript definitions
        const { error: rpcError } = await supabase.rpc('accept_invite_merge', {
            invite_token: token,
            keep_inviter_data: keepInviterData
        });

        if (rpcError) throw new Error('Falha ao processar convite no servidor.');

        await get().checkAuth();
    },


    checkPlanStatus: async () => {
        const coupleId = get().user?.coupleId;
        if (!coupleId) return;

        try {
            const { data: couple } = await supabase
                .from('couples')
                .select('plan_type, plan_expires_at')
                .eq('id', coupleId)
                .maybeSingle();

            if (couple) {
                const isPro = couple.plan_type !== 'free';
                set((state) => ({
                    user: state.user ? {
                        ...state.user,
                        planType: couple.plan_type as any,
                        planExpiresAt: couple.plan_expires_at,
                        isPro,
                    } : null,
                }));
            }
        } catch (err) {
            console.warn('Silent checkPlanStatus error (likely early abort):', err);
        }
    },
}));

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_EMAILS } from '@/store/authStore';
import { Shield, Crown, Search, ArrowLeft, UserCheck, UserX, Users, Loader2 } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    couple_id: string | null;
    role: string | null;
    created_at: string;
    plan_type?: string;
}

const AdminPage: React.FC = () => {
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'free' | 'pro'>('all');
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        // Listen for auth state changes reactively
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setAdminEmail(session?.user?.email?.toLowerCase() || null);
            setAuthReady(true);
        });

        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setAdminEmail(session?.user?.email?.toLowerCase() || null);
            setAuthReady(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const isAdmin = authReady && adminEmail && ADMIN_EMAILS.includes(adminEmail);

    useEffect(() => {
        if (isAdmin) fetchUsers();
    }, [isAdmin]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const enriched: UserProfile[] = [];
            for (const p of (profiles || [])) {
                let plan_type = 'free';
                if (p.couple_id) {
                    const { data: couple } = await supabase
                        .from('couples')
                        .select('plan_type')
                        .eq('id', p.couple_id)
                        .maybeSingle();
                    plan_type = couple?.plan_type || 'free';
                }
                enriched.push({ ...p, plan_type });
            }

            setUsers(enriched);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const grantPro = async (profile: UserProfile, planType: string = 'vitalicio') => {
        try {
            if (profile.couple_id) {
                await supabase
                    .from('couples')
                    .update({ plan_type: planType, plan_expires_at: null })
                    .eq('id', profile.couple_id);
            } else {
                const { data: couple } = await supabase
                    .from('couples')
                    .insert({ owner_user_id: profile.id, plan_type: planType })
                    .select('id')
                    .single();

                if (couple) {
                    await supabase
                        .from('profiles')
                        .update({ couple_id: couple.id, role: 'owner' })
                        .eq('id', profile.id);
                }
            }
            setFeedback(`✅ PRO ${planType} concedido para ${profile.email}`);
            setTimeout(() => setFeedback(null), 3000);
            fetchUsers();
        } catch (err) {
            setFeedback(`❌ Erro ao conceder PRO: ${err}`);
        }
    };

    const revokePro = async (profile: UserProfile) => {
        if (!profile.couple_id) return;
        try {
            await supabase
                .from('couples')
                .update({ plan_type: 'free', plan_expires_at: null })
                .eq('id', profile.couple_id);
            setFeedback(`🔄 PRO revogado de ${profile.email}`);
            setTimeout(() => setFeedback(null), 3000);
            fetchUsers();
        } catch (err) {
            setFeedback(`❌ Erro ao revogar PRO: ${err}`);
        }
    };

    if (!authReady) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a1a', color: '#fff', flexDirection: 'column', gap: 16 }}>
                <Loader2 size={40} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#999' }}>Verificando permissões...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a1a', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <Shield size={64} style={{ color: '#ef4444', marginBottom: 16 }} />
                    <h1 style={{ fontSize: 24, marginBottom: 8 }}>Acesso Negado</h1>
                    <p style={{ color: '#999' }}>Você não tem permissão para acessar esta página.</p>
                    <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Logado como: {adminEmail || 'não autenticado'}</p>
                    <a href="/" style={{ color: '#a78bfa', marginTop: 24, display: 'inline-block' }}>← Voltar ao app</a>
                </div>
            </div>
        );
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = !search ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' ||
            (filter === 'pro' && u.plan_type !== 'free') ||
            (filter === 'free' && u.plan_type === 'free');
        return matchesSearch && matchesFilter;
    });

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', padding: '24px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                    <a href="/" style={{ color: '#a78bfa' }}><ArrowLeft size={24} /></a>
                    <Shield size={28} style={{ color: '#a78bfa' }} />
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Painel Admin</h1>
                    <span style={{ fontSize: 12, background: '#7c3aed22', color: '#a78bfa', padding: '4px 10px', borderRadius: 12 }}>
                        {adminEmail}
                    </span>
                </div>

                {feedback && (
                    <div style={{ background: '#1e1e3a', border: '1px solid #7c3aed44', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                        {feedback}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: '#111128', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                        <Users size={24} style={{ color: '#60a5fa', marginBottom: 8 }} />
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{users.length}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>Total Usuários</div>
                    </div>
                    <div style={{ background: '#111128', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                        <Crown size={24} style={{ color: '#fbbf24', marginBottom: 8 }} />
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{users.filter(u => u.plan_type !== 'free').length}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>Usuários PRO</div>
                    </div>
                    <div style={{ background: '#111128', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                        <UserCheck size={24} style={{ color: '#34d399', marginBottom: 8 }} />
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{users.filter(u => u.plan_type === 'free').length}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>Usuários Free</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Buscar por email ou nome..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 40px', background: '#111128', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }}
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as any)}
                        style={{ padding: '10px 16px', background: '#111128', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }}
                    >
                        <option value="all">Todos</option>
                        <option value="free">Free</option>
                        <option value="pro">PRO</option>
                    </select>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Carregando usuários...</div>
                ) : (
                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #222' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#111128' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600 }}>USUÁRIO</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600 }}>PLANO</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600 }}>CADASTRO</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#999', fontWeight: 600 }}>AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} style={{ borderTop: '1px solid #1a1a2e' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600 }}>{u.name || '—'}</div>
                                            <div style={{ fontSize: 12, color: '#999' }}>{u.email}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                                                background: u.plan_type !== 'free' ? '#7c3aed22' : '#333',
                                                color: u.plan_type !== 'free' ? '#a78bfa' : '#999'
                                            }}>
                                                {u.plan_type === 'free' ? 'FREE' : `PRO ${u.plan_type?.toUpperCase()}`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#999' }}>
                                            {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {u.plan_type === 'free' ? (
                                                <button
                                                    onClick={() => grantPro(u)}
                                                    style={{ padding: '6px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                                >
                                                    <Crown size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                    Conceder PRO
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => revokePro(u)}
                                                    style={{ padding: '6px 14px', background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                                >
                                                    <UserX size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                    Revogar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
                                Nenhum usuário encontrado.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;

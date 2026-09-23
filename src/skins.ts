export type SkinType = 'default' | 'carbon' | 'matrimoney' | 'viagem' | 'carro';

export interface SkinConfig {
    id: SkinType;
    name: string;
    fonts: {
        header: string;
        body: string;
    };
    colors: {
        background: string; // Gradient or solid
        cardBg: string; // Glass or solid
        textMain: string;
        textMuted: string;
        primary: string; // Buttons, highlights
        border: string;
        accent: string;
    };
    effects: {
        shadow: string;
        glassBlur: string;
        borderRadius: string;
        borderWidth: string;
    };
    extraEffects?: {
        particleColor?: string;
        glowColor?: string;
        overlayGradient?: string;
    };
    icons: {
        goal: string;
        player1: string;
        player2: string;
    };
}

export const SKINS: Record<SkinType, SkinConfig> = {
    default: {
        id: 'default',
        name: 'Bingo Tradicional',
        fonts: {
            header: '"Inter", sans-serif',
            body: '"Inter", sans-serif'
        },
        colors: {
            background: 'linear-gradient(135deg, #fdfbf7 0%, #fff0f5 100%)',
            cardBg: 'rgba(255, 255, 255, 0.9)',
            textMain: '#1e293b',
            textMuted: '#64748b',
            primary: '#C13C7A', // Magenta
            accent: '#E6C26E', // Gold
            border: 'rgba(193, 60, 122, 0.1)'
        },
        effects: {
            shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            glassBlur: '0px',
            borderRadius: '1.5rem',
            borderWidth: '1px'
        },
        icons: {
            goal: '🎯',
            player1: '👤',
            player2: '👤'
        }
    },
    matrimoney: {
        id: 'matrimoney',
        name: 'MatriMoney 💍',
        fonts: {
            header: '"Playfair Display", serif',
            body: '"Lato", sans-serif'
        },
        colors: {
            background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #1e0f35 70%, #0d0618 100%)',
            cardBg: 'rgba(45, 27, 78, 0.70)', // Slightly more opaque for better contrast
            textMain: '#ffffff',       // Pure white for crisp contrast where it matters
            textMuted: '#C4A882',      // Muted gold
            primary: '#D4AF37',        // Gold metálico
            accent: '#B76E79',         // Rose Gold
            border: 'rgba(212, 175, 55, 0.35)'
        },
        effects: {
            shadow: '0 10px 60px -15px rgba(212, 175, 55, 0.25), 0 0 30px rgba(183, 110, 121, 0.1)',
            glassBlur: '20px',
            borderRadius: '2rem',
            borderWidth: '1px'
        },
        extraEffects: {
            particleColor: '#D4AF37',
            glowColor: 'rgba(212, 175, 55, 0.15)',
            overlayGradient: 'radial-gradient(ellipse at 50% 0%, rgba(183, 110, 121, 0.15) 0%, transparent 60%)'
        },
        icons: {
            goal: '💍',
            player1: '🤵',
            player2: '👰'
        }
    },
    carbon: {
        id: 'carbon',
        name: 'Carbon PRO',
        fonts: {
            header: '"Orbitron", sans-serif',
            body: '"Rajdhani", sans-serif'
        },
        colors: {
            background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
            cardBg: 'rgba(15, 15, 15, 0.85)',
            textMain: '#ffffff',
            textMuted: '#94a3b8',
            primary: '#E6C26E', // Gold
            accent: '#00F3FF', // Cyan glow
            border: 'rgba(255, 255, 255, 0.08)'
        },
        effects: {
            shadow: '0 0 20px rgba(0, 243, 255, 0.05)',
            glassBlur: '5px',
            borderRadius: '0.75rem',
            borderWidth: '1px'
        },
        icons: {
            goal: '💎',
            player1: '👑',
            player2: '👑'
        }
    },
    viagem: {
        id: 'viagem',
        name: 'Viagem & Aventura',
        fonts: {
            header: '"Abril Fatface", cursive',
            body: '"Montserrat", sans-serif'
        },
        colors: {
            background: 'linear-gradient(to bottom, #e0f7fa 0%, #fff3e0 100%)',
            cardBg: '#ffffff',
            textMain: '#004D40', // Deep Teals
            textMuted: '#5D4037',
            primary: '#006994', // Ocean Blue
            accent: '#ff6f00', // Amber
            border: 'rgba(0, 105, 148, 0.15)'
        },
        effects: {
            shadow: '5px 5px 15px rgba(0,0,0,0.1)', // Polaroid shadow
            glassBlur: '0px',
            borderRadius: '0.25rem', // Polaroid sharp corners
            borderWidth: '0px'
        },
        icons: {
            goal: '✈️',
            player1: '🎒',
            player2: '📸'
        }
    },
    carro: {
        id: 'carro',
        name: 'Carro Novo',
        fonts: {
            header: '"Orbitron", sans-serif',
            body: '"Inter", sans-serif'
        },
        colors: {
            background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
            cardBg: 'rgba(30, 30, 30, 0.7)',
            textMain: '#ffffff',
            textMuted: '#a1a1aa',
            primary: '#ef4444', // Red
            accent: '#e4e4e7', // Silver
            border: 'rgba(239, 68, 68, 0.2)'
        },
        effects: {
            shadow: '0 10px 40px -10px rgba(239, 68, 68, 0.2)',
            glassBlur: '12px',
            borderRadius: '1rem',
            borderWidth: '1px'
        },
        icons: {
            goal: '🏎️',
            player1: '🏁',
            player2: '🔥'
        }
    }
};

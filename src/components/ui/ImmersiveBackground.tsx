import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSkinStore } from '@/store/skinStore';

const SKIN_ASSETS: Record<string, string> = {
    matrimoney: '/assets/skins/matrimoney.png',
    viagem: '/assets/skins/viagem.png',
    carro: '/assets/skins/carro.png',
    carbon: '', // O Carbon PRO usa apenas as cores CSS e o fundo Aurora que já existe
};

export const ImmersiveBackground: React.FC = () => {
    const theme = useSkinStore((state) => state.theme);

    // Se for o tema carbon, não exibe imagem, confia apenas no CSS de bg-slate-950 ou bg-aurora
    if (theme === 'carbon') {
        return null;
    }

    const bgImage = SKIN_ASSETS[theme];

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
            <AnimatePresence>
                {bgImage && (
                    <motion.div
                        key={theme}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full"
                        style={{
                            backgroundImage: `url(${bgImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        }}
                    />
                )}
            </AnimatePresence>
            {/* Overlay translúcido sobre a imagem para garantir a legibilidade do texto sempre */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
        </div>
    );
};

export default ImmersiveBackground;

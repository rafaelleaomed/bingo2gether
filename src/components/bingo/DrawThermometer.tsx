import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface DrawThermometerProps {
    current: number;
    target: number;
    isTurbo?: boolean;
}

const DrawThermometer: React.FC<DrawThermometerProps> = ({ current, target, isTurbo = false }) => {
    const percentage = Math.min(100, (current / target) * 100);
    const isComplete = current >= target;

    return (
        <div className="relative w-full max-w-[280px] mx-auto py-6 px-4">
            {/* Label and Progress Info */}
            <div className="flex justify-between items-end mb-2 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Progresso do Mês</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{current}</span>
                        <span className="text-sm font-bold text-white/30">/ {target}</span>
                    </div>
                </div>
                {isComplete && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-brand-gold text-brand-purple px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-brand-gold/20"
                    >
                        Meta Batida! 💍
                    </motion.div>
                )}
            </div>

            {/* Main Thermometer Track */}
            <div className="relative h-6 bg-white/5 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm">
                {/* Animated Liquid Filling */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                        type: "spring",
                        stiffness: isTurbo ? 300 : 100,
                        damping: 20
                    }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                        background: `linear-gradient(90deg, var(--skin-primary), var(--skin-accent))`,
                        boxShadow: `0 0 20px rgba(var(--skin-primary-rgb), 0.5)`,
                    }}
                >
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]" />

                    {/* Bubbles / Sparkles inside the liquid when drawing */}
                    <AnimatePresence>
                        {isTurbo && (
                            <motion.div
                                key="sparkles"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 overflow-hidden"
                            >
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute bg-white rounded-full"
                                        style={{
                                            width: Math.random() * 4 + 2,
                                            height: Math.random() * 4 + 2,
                                            left: `${Math.random() * 100}%`,
                                            bottom: '-10px',
                                        }}
                                        animate={{
                                            y: -40,
                                            opacity: [0, 1, 0],
                                        }}
                                        transition={{
                                            duration: 1 + Math.random(),
                                            repeat: Infinity,
                                            delay: Math.random(),
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Milestone Markers */}
                <div className="absolute inset-0 flex justify-evenly items-center pointer-events-none">
                    {[25, 50, 75].map(m => (
                        <div
                            key={m}
                            className={`w-[1px] h-2 bg-white/20 transition-opacity ${percentage >= m ? 'opacity-0' : 'opacity-100'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Decorative Sparkles near top when high progress */}
            {percentage > 90 && !isComplete && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -right-2 top-0 text-brand-gold opacity-60"
                >
                    <Sparkles size={20} />
                </motion.div>
            )}
        </div>
    );
};

export default DrawThermometer;

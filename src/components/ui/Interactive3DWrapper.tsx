import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Interactive3DWrapperProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const Interactive3DWrapper: React.FC<Interactive3DWrapperProps> = ({ children, className = '', style = {} }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);
    const [scale, setScale] = useState(1);
    const [isHovered, setIsHovered] = useState(false);

    const calculateRotation = (clientX: number, clientY: number) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Limits the rotation to subtle amounts
        setRotateX(((y - centerY) / centerY) * -5);
        setRotateY(((x - centerX) / centerX) * 5);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        calculateRotation(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length > 0) {
            calculateRotation(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setRotateX(0);
        setRotateY(0);
        setScale(1);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        setScale(1.01);
    };

    const handleTouchStart = () => {
        setIsHovered(true);
        setScale(1.01);
    };

    return (
        <div style={{ perspective: 1200 }}>
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleMouseEnter}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleMouseLeave}
                animate={{ rotateX, rotateY, scale }}
                transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
                className={`${className} transition-shadow duration-300`}
                style={{
                    ...style,
                    transformStyle: 'preserve-3d',
                    boxShadow: isHovered ? '0 30px 60px rgba(0,0,0,0.4)' : style.boxShadow || '0 10px 30px rgba(0,0,0,0.2)'
                }}
            >
                <div style={{ transform: 'translateZ(20px)' }} className="h-full">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

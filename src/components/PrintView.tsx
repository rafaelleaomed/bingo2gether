import React, { useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Table, Grid3X3, Share2, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { BingoCard } from '../types';

const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

interface PrintViewProps {
    maxNumber: number;
    numberOwners: Map<number, 'p1' | 'p2'>;
    onClose: () => void;
    bingoCardsV2?: BingoCard[];
    playerNames?: { p1: string; p2: string };
    playerAvatars?: { p1: string; p2: string };
}

const PrintView: React.FC<PrintViewProps> = ({ maxNumber, numberOwners, onClose, bingoCardsV2, playerNames, playerAvatars }) => {
    const [printMode, setPrintMode] = useState<'table' | 'cards'>('table');
    const [isExporting, setIsExporting] = useState(false);
    const [cardsPerPage, setCardsPerPage] = useState<2 | 4 | 6>(4);
    const printRef = useRef<HTMLDivElement>(null);
    const pngExportRef = useRef<HTMLDivElement>(null);

    const allNumbers = useMemo(() =>
        Array.from({ length: maxNumber }, (_, i) => i + 1),
        [maxNumber]
    );

    // Legacy sequential cards (fallback)
    const legacyCards = useMemo(() => {
        const cards: { id: number; numbers: number[] }[] = [];
        for (let i = 0; i < maxNumber; i += 25) {
            const chunk = Array.from(
                { length: Math.min(25, maxNumber - i) },
                (_, j) => i + j + 1
            );
            cards.push({ id: i / 25 + 1, numbers: chunk });
        }
        return cards;
    }, [maxNumber]);

    // Auto-calculate grid cols so table fits one page
    const tableGridCols = useMemo(() => {
        if (maxNumber <= 50) return 5;
        if (maxNumber <= 100) return 10;
        if (maxNumber <= 200) return 10;
        if (maxNumber <= 300) return 15;
        if (maxNumber <= 500) return 20;
        return 25;
    }, [maxNumber]);

    // Smaller cells for larger numbers to fit on one page
    const cellSizeClass = useMemo(() => {
        if (maxNumber <= 50) return 'text-lg p-2';
        if (maxNumber <= 100) return 'text-sm p-1.5';
        if (maxNumber <= 200) return 'text-[10px] p-1';
        if (maxNumber <= 300) return 'text-[9px] p-0.5';
        if (maxNumber <= 500) return 'text-[8px] p-0.5';
        return 'text-[7px] p-0.5';
    }, [maxNumber]);

    // All V2 cards in order (no grouping by owner for print — just flat list with owner label per card)
    const cardsToRender = useMemo(() => {
        if (bingoCardsV2) return bingoCardsV2;
        return null;
    }, [bingoCardsV2]);

    const getOwnerLabel = (ownerId: 'p1' | 'p2' | 'shared') => {
        if (ownerId === 'shared') return '🤝 Compartilhada';
        const name = escapeHtml(playerNames?.[ownerId] || (ownerId === 'p1' ? 'Jogador 1' : 'Jogador 2'));
        const avatar = escapeHtml(playerAvatars?.[ownerId] || '👤');
        return `${avatar} ${name}`;
    };

    const totalCards = cardsToRender?.length || legacyCards.length;

    const handlePrint = () => {
        window.print();
    };

    const handleExportPng = useCallback(async () => {
        setIsExporting(true);
        try {
            // Create a temporary visible container for capture
            const container = document.createElement('div');
            container.className = 'png-export-container';
            container.style.cssText = 'position:fixed;left:0;top:0;width:794px;background:white;z-index:99999;padding:16px;box-sizing:border-box;';
            document.body.appendChild(container);

            const cards = cardsToRender || legacyCards;
            const pages: (typeof cards)[] = [];
            for (let i = 0; i < cards.length; i += cardsPerPage) {
                pages.push(cards.slice(i, i + cardsPerPage));
            }

            const blobs: Blob[] = [];

            for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
                const page = pages[pageIdx];
                const gridCols = cardsPerPage <= 2 ? 1 : 2;
                const gridRows = Math.ceil(cardsPerPage / gridCols);
                // Build page HTML with watermark
                container.innerHTML = `
                    <div style="padding:16px;background:white;font-family:system-ui,sans-serif;position:relative;overflow:hidden;">
                        <!-- Watermark -->
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:60px;font-weight:900;color:rgba(75,30,109,0.06);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:0.05em;">
                            BINGO2GETHER
                        </div>
                        <div style="position:relative;z-index:1;">
                            <div style="text-align:center;margin-bottom:12px;">
                                <h2 style="font-size:16px;font-weight:900;color:#1e293b;margin:0;">Bingo2Gether — Cartelas</h2>
                                <p style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:2px 0;">
                                    ${totalCards} cartelas • Pág. ${pageIdx + 1}/${pages.length} • ${new Date().toLocaleDateString('pt-BR')}
                                </p>
                                <p style="font-size:8px;color:#4B1E6D;font-weight:700;margin:0;">📸 @bingo2gether</p>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(${gridCols},1fr);gap:8px;">
                                ${page.map(card => {
                                    const v2Card = cardsToRender ? (card as BingoCard) : null;
                                    const ownerLabel = v2Card ? getOwnerLabel(v2Card.ownerId) : 'Bingo2Gether';
                                    const isComplete = v2Card?.isComplete;
                                    return `
                                        <div style="border:2px solid #1e293b;border-radius:8px;padding:8px;">
                                            <div style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
                                                <span>Cartela #${card.id}</span>
                                                <span style="font-size:8px;">${ownerLabel}</span>
                                            </div>
                                            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1px;">
                                                ${card.numbers.map(num => {
                                                    const isMarked = v2Card
                                                        ? v2Card.markedNumbers.includes(num)
                                                        : !!numberOwners.get(num);
                                                    return `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid #cbd5e1;font-size:13px;font-weight:700;${isMarked ? 'background:#e2e8f0;text-decoration:line-through;color:#94a3b8;' : 'color:#334155;'}">${num}</div>`;
                                                }).join('')}
                                            </div>
                                            ${isComplete ? '<div style="text-align:center;margin-top:2px;font-size:8px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:0.1em;">✅ BINGO!</div>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div style="text-align:center;margin-top:8px;">
                                <p style="font-size:7px;color:#94a3b8;">@bingo2gether</p>
                            </div>
                        </div>
                    </div>
                `;

                const dataUrl = await toPng(container, {
                    backgroundColor: '#ffffff',
                    pixelRatio: 2,
                    width: 794,
                });

                const res = await fetch(dataUrl);
                blobs.push(await res.blob());
            }

            document.body.removeChild(container);

            // Try Web Share API on mobile
            if (navigator.share && blobs.length > 0) {
                try {
                    const files = blobs.map((blob, i) =>
                        new File([blob], `bingo2gether-cartelas-${i + 1}.png`, { type: 'image/png' })
                    );
                    if (navigator.canShare?.({ files })) {
                        await navigator.share({
                            title: 'Bingo2Gether - Cartelas',
                            text: 'Minhas cartelas do Bingo2Gether! 🎯',
                            files,
                        });
                        setIsExporting(false);
                        return;
                    }
                } catch { /* fallback to download */ }
            }

            // Fallback: download each page
            blobs.forEach((blob, i) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bingo2gether-cartelas-${i + 1}.png`;
                a.click();
                URL.revokeObjectURL(url);
            });
        } catch (err) {
            console.error('Erro ao exportar PNG:', err);
        } finally {
            setIsExporting(false);
        }
    }, [cardsToRender, legacyCards, totalCards, cardsPerPage, numberOwners, getOwnerLabel]);


    const renderCard = (card: BingoCard | { id: number; numbers: number[] }, isV2: boolean) => {
        const v2Card = isV2 ? (card as BingoCard) : null;
        return (
            <div key={card.id} className="print-card-item border-2 border-slate-800 rounded-lg p-2">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex justify-between items-center border-b border-slate-200 pb-1">
                    <span>Cartela #{card.id}</span>
                    <span className="text-[8px]">
                        {v2Card ? getOwnerLabel(v2Card.ownerId) : 'Bingo2Gether'}
                    </span>
                </div>
                <div className="grid gap-[1px]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    {card.numbers.map(num => {
                        const isMarked = v2Card
                            ? v2Card.markedNumbers.includes(num)
                            : !!numberOwners.get(num);
                        return (
                            <div
                                key={num}
                                className={`flex items-center justify-center border border-slate-300 text-xs font-bold p-1
                                    ${isMarked ? 'bg-slate-200 line-through text-slate-400' : 'text-slate-700'}
                                `}
                            >
                                {num}
                            </div>
                        );
                    })}
                </div>
                {v2Card?.isComplete && (
                    <div className="text-center mt-0.5 text-[8px] font-black text-green-600 uppercase tracking-widest">✅ BINGO!</div>
                )}
            </div>
        );
    };

    // Split cards into pages based on cardsPerPage
    const cardPages = useMemo(() => {
        const cards = cardsToRender || legacyCards;
        const pages: (typeof cards)[] = [];
        for (let i = 0; i < cards.length; i += cardsPerPage) {
            pages.push(cards.slice(i, i + cardsPerPage));
        }
        return pages;
    }, [cardsToRender, legacyCards, cardsPerPage]);

    // Build the print content that will be portalled to document.body
    const printContent = printMode === 'table' ? (
        <div>
            <div className="print-header text-center mb-3">
                <h2 className="text-base font-black text-slate-800 tracking-tight">Bingo2Gether — Tabela de Números</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    Números de 1 a {maxNumber} • {new Date().toLocaleDateString('pt-BR')}
                </p>
                <p className="text-[8px] text-brand-purple font-bold mt-0.5">📸 @bingo2gether</p>
            </div>
            <div
                className="print-table-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${tableGridCols}, 1fr)`,
                    gap: '1px',
                    width: '100%',
                }}
            >
                {allNumbers.map(num => {
                    const owner = numberOwners.get(num);
                    return (
                        <div
                            key={num}
                            className={`border border-slate-200 text-center font-bold ${cellSizeClass}
                                ${owner ? 'bg-slate-100 line-through text-slate-400' : 'text-slate-700'}
                            `}
                        >
                            {num}
                        </div>
                    );
                })}
            </div>
            <div className="print-footer text-center mt-2">
                <p className="text-[7px] text-slate-300 uppercase tracking-widest">
                    ✓ = já sorteado • Marque os números sorteados com caneta
                </p>
                <p className="text-[8px] text-brand-purple font-bold mt-0.5">Siga @bingo2gether no Instagram 💜</p>
            </div>
        </div>
    ) : (
        <div>
            {cardPages.map((page, pageIndex) => (
                <div key={pageIndex} className="print-page">
                    <div className="print-header text-center mb-2">
                        <h2 className="text-sm font-black text-slate-800 tracking-tight">Bingo2Gether — Cartelas</h2>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                            {totalCards} cartelas • Pág. {pageIndex + 1}/{cardPages.length} • {new Date().toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[7px] text-brand-purple font-bold">📸 @bingo2gether</p>
                    </div>
                    <div className="print-cards-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${cardsPerPage <= 2 ? 1 : 2}, 1fr)`, gap: '8px' }}>
                        {page.map(card => renderCard(card, !!cardsToRender))}
                    </div>
                    <div className="text-center mt-1">
                        <p className="text-[6px] text-slate-400">@bingo2gether</p>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            {/* Modal UI - visible on screen only */}
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 shrink-0">
                        <h3 className="font-black flex items-center gap-2 text-brand-purple dark:text-brand-gold uppercase tracking-widest text-sm">
                            <Printer size={18} /> Imprimir
                        </h3>
                        <button onClick={onClose} className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mode Selector */}
                    <div className="p-6 pb-0 shrink-0">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPrintMode('table')}
                                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${printMode === 'table'
                                    ? 'border-brand-purple bg-brand-purple/10 text-brand-purple'
                                    : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                <Table size={16} /> Tabela corrida
                            </button>
                            <button
                                onClick={() => setPrintMode('cards')}
                                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${printMode === 'cards'
                                    ? 'border-brand-magenta bg-brand-magenta/10 text-brand-magenta'
                                    : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                <Grid3X3 size={16} /> Cartelas de bingo
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-widest text-center">
                            {printMode === 'table' ? `${maxNumber} números • 1 página` : `${totalCards} cartelas • ${cardPages.length} página(s)`}
                        </p>

                        {/* Cards per page selector */}
                        {printMode === 'cards' && (
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cartelas/página:</span>
                                {([2, 4, 6] as const).map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setCardsPerPage(n)}
                                        className={`w-8 h-8 rounded-xl font-black text-xs transition-all border-2 ${
                                            cardsPerPage === n
                                                ? 'border-brand-magenta bg-brand-magenta/10 text-brand-magenta'
                                                : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview (screen only, not used for print) */}
                    <div className="flex-1 overflow-auto p-6">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
                            <div ref={printRef}>
                                {printMode === 'table' ? (
                                    <div>
                                        <div className="text-center mb-3">
                                            <h2 className="text-base font-black text-slate-800 tracking-tight">Bingo2Gether — Tabela de Números</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                Números de 1 a {maxNumber} • {new Date().toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${tableGridCols}, 1fr)`,
                                                gap: '1px',
                                                width: '100%',
                                            }}
                                        >
                                            {allNumbers.map(num => {
                                                const owner = numberOwners.get(num);
                                                return (
                                                    <div
                                                        key={num}
                                                        className={`border border-slate-200 text-center font-bold ${cellSizeClass}
                                                            ${owner ? 'bg-slate-100 line-through text-slate-400' : 'text-slate-700'}
                                                        `}
                                                    >
                                                        {num}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-center mb-2">
                                            <h2 className="text-base font-black text-slate-800 tracking-tight">Bingo2Gether — Cartelas</h2>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                {totalCards} cartelas
                                            </p>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                            {(cardsToRender || legacyCards).slice(0, 4).map(card => renderCard(card, !!cardsToRender))}
                                        </div>
                                        {totalCards > 4 && (
                                            <p className="text-center text-[9px] text-slate-400 mt-2">
                                                ... e mais {totalCards - 4} cartelas
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-6 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex-1 py-4 bg-brand-purple text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            <Printer size={18} /> Imprimir / PDF
                        </button>
                        {printMode === 'cards' && (
                            <button
                                onClick={handleExportPng}
                                disabled={isExporting}
                                className="flex-1 py-4 bg-brand-magenta text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Exportando...</>
                                ) : navigator.share ? (
                                    <><Share2 size={18} /> Compartilhar</>
                                ) : (
                                    <><Download size={18} /> Salvar PNG</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Portal: print content rendered directly on document.body, hidden on screen, visible only in @media print */}
            {createPortal(
                <div id="print-content-area">
                    {printContent}
                </div>,
                document.body
            )}
        </>
    );
};

export default PrintView;

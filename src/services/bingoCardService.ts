import { BingoCard } from '../types';

const CARD_SIZE = 25; // 5x5

/**
 * Shuffle array using Fisher-Yates
 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate and distribute bingo cards for V2 system.
 * Numbers 1..maxNumber are shuffled and split into 5x5 cards,
 * then distributed equally between p1 and p2.
 */
export function generateBingoCardsV2(maxNumber: number): BingoCard[] {
  const allNumbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
  const shuffled = shuffleArray(allNumbers);

  const cards: BingoCard[] = [];
  let cardId = 1;

  for (let i = 0; i < shuffled.length; i += CARD_SIZE) {
    const chunk = shuffled.slice(i, i + CARD_SIZE);
    cards.push({
      id: cardId++,
      numbers: chunk, // Random order inside the card
      ownerId: 'p1', // Will be assigned below
      markedNumbers: [],
      isComplete: false,
    });
  }

  // Distribute: first half p1, second half p2, odd last one = shared
  const half = Math.floor(cards.length / 2);
  cards.forEach((card, index) => {
    if (index < half) {
      card.ownerId = 'p1';
    } else if (index < half * 2) {
      card.ownerId = 'p2';
    } else {
      card.ownerId = 'shared';
    }
  });

  return cards;
}

/**
 * Update cards after a number is drawn.
 * Returns updated cards and any newly completed card IDs.
 */
export function updateCardsAfterDraw(
  cards: BingoCard[],
  drawnNumber: number
): { updatedCards: BingoCard[]; newlyCompleted: BingoCard[] } {
  const newlyCompleted: BingoCard[] = [];

  const updatedCards = cards.map(card => {
    if (!card.numbers.includes(drawnNumber)) return card;
    if (card.markedNumbers.includes(drawnNumber)) return card;

    const newMarked = [...card.markedNumbers, drawnNumber];
    const isComplete = newMarked.length === card.numbers.length;

    const updatedCard: BingoCard = {
      ...card,
      markedNumbers: newMarked,
      isComplete,
    };

    if (isComplete && !card.isComplete) {
      newlyCompleted.push(updatedCard);
    }

    return updatedCard;
  });

  return { updatedCards, newlyCompleted };
}

/**
 * Bulk update cards with multiple drawn numbers (for batch mode).
 */
export function updateCardsAfterBatchDraw(
  cards: BingoCard[],
  drawnNumbers: number[]
): { updatedCards: BingoCard[]; newlyCompleted: BingoCard[] } {
  let currentCards = cards;
  const allNewlyCompleted: BingoCard[] = [];

  for (const num of drawnNumbers) {
    const { updatedCards, newlyCompleted } = updateCardsAfterDraw(currentCards, num);
    currentCards = updatedCards;
    allNewlyCompleted.push(...newlyCompleted);
  }

  return { updatedCards: currentCards, newlyCompleted: allNewlyCompleted };
}

/**
 * Re-sync cards with already drawn numbers (for loading existing game state).
 */
export function syncCardsWithDrawnNumbers(
  cards: BingoCard[],
  drawnNumbers: number[]
): BingoCard[] {
  const drawnSet = new Set(drawnNumbers);
  return cards.map(card => {
    const markedNumbers = card.numbers.filter(n => drawnSet.has(n));
    return {
      ...card,
      markedNumbers,
      isComplete: markedNumbers.length === card.numbers.length,
    };
  });
}

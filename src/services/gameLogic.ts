
import { GameState, Player, RetentionState } from '../types';

export const calculateTotalPot = (maxNumber: number): number => {
  return (maxNumber * (maxNumber + 1)) / 2;
};

export const calculateMonthlyTarget = (remainingNumbersCount: number, remainingMonths: number): number => {
  if (remainingMonths <= 0) return remainingNumbersCount;
  return Math.ceil(remainingNumbersCount / remainingMonths);
};

export const initializeAvailableNumbers = (maxNumber: number): number[] => {
  return Array.from({ length: maxNumber }, (_, i) => i + 1);
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const calculateIncomeRatio = (income1: number, income2: number): number => {
  const total = income1 + income2;
  if (total === 0) return 50; 
  const p2Share = (income2 / total) * 100;
  return Math.round(p2Share);
};

export const findNumbersForExtraValue = (
  availableNumbers: number[], 
  extraAmount: number
): { numbers: number[], remainder: number } => {
  let remaining = extraAmount;
  const numbersToRemove: number[] = [];
  
  // Sort descending to knock out big numbers first
  const sortedAvailable = [...availableNumbers].sort((a, b) => b - a);

  for (const num of sortedAvailable) {
    if (remaining >= num) {
      remaining -= num;
      numbersToRemove.push(num);
    }
    if (remaining === 0) break;
  }

  return { numbers: numbersToRemove, remainder: remaining };
};

/**
 * THE FAIRNESS ALGORITHM (POWER LAW)
 */
export const drawWeightedNumber = (
  availableNumbers: number[],
  player: Player,
  allAvailableNumbersSorted: number[] 
): number => {
  if (availableNumbers.length === 0) return 0;
  const sorted = [...availableNumbers].sort((a, b) => a - b);
  const safeShare = Math.max(1, Math.min(99, player.incomeShare));
  const k = (100 - safeShare) / safeShare;
  const r = Math.random();
  const weightedR = Math.pow(r, k);
  const index = Math.floor(weightedR * sorted.length);
  const safeIndex = Math.min(sorted.length - 1, Math.max(0, index));
  return sorted[safeIndex];
};

/**
 * RETENTION LOGIC
 * Calculates updates for streaks and survival mode without punitive resets.
 */
export const calculateRetentionUpdate = (currentState: RetentionState): RetentionState => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastActivity = new Date(currentState.lastActivityDate);
  const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Check Survival Mode (Inactive > 14 days)
  const isSurvival = diffDays > 14;

  // Streak Logic (Non-punitive)
  // If playing today, streak doesn't change unless it was updated yesterday.
  // If last play was yesterday, streak++.
  // If last play was > 1 day ago, streak pauses (stays same), doesn't reset to 0.
  // We encourage picking up where left off.
  
  let newStreak = currentState.coupleStreak;
  let lastPlayDate = currentState.lastPlayDate;

  if (lastPlayDate !== todayStr) {
    if (!lastPlayDate) {
      newStreak = 1; // First game
    } else {
      const lastDate = new Date(lastPlayDate);
      const daysSinceLastPlay = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastPlay <= 1) {
        // Consecutive day (or missed just one cycle logic if we were strict, but here roughly 24h)
        // Simplified: if date string is yesterday, increment.
        // Actually, let's keep it simple: Any new distinct day of play increments the counter.
        // The "Streak" here acts more like a "Days Played Together" level.
        newStreak += 1;
      } else {
        // Gap > 1 day. 
        // Rule: "Se houver pausa, NÃO zerar". 
        // We do NOT reset. We just increment to show they are back!
        // Effectively, this becomes a cumulative count of active days.
        newStreak += 1; 
      }
    }
    lastPlayDate = todayStr;
  }

  return {
    coupleStreak: newStreak,
    lastPlayDate: lastPlayDate,
    survivalMode: isSurvival, // Updates based on inactivity calculated BEFORE this action
    lastActivityDate: now.toISOString()
  };
};

export const checkInactivity = (currentState: RetentionState): boolean => {
    const now = new Date();
    const lastActivity = new Date(currentState.lastActivityDate);
    const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 14;
};

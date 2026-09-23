
export interface Player {
  id: 'p1' | 'p2';
  name: string;
  avatar: string; // Emoji
  incomeShare: number; // 0 to 100 representing percentage of contribution logic
  estimatedIncome: number; // Raw monthly income value
  totalContributed: number;
}

export interface Transaction {
  id: string;
  number: number;
  playerId: 'p1' | 'p2';
  date: string; // ISO string
  type: 'monthly' | 'extra' | 'bonus'; // Added 'bonus' for extra values
  loserName?: string; // For penalties
  timestamp: number;
}

export interface RetentionState {
  coupleStreak: number;
  lastPlayDate: string | null; // ISO string of last DRAW
  survivalMode: boolean; // Activates if inactivity > 14 days
  lastActivityDate: string; // ISO string of last interaction
  coachUsage?: {
    lastUsageMonth: string; // Format: YYYY-MM
    count: number;
  };
}

export interface GameSettings {
  goalCategory: string; // 'marriage' | 'travel' | 'house' | 'car' | 'other'
  maxNumber: number; // e.g., 500
  targetDate: string; // ISO string
  startDate: string; // ISO string for summary calculation
  deadlineMonths: number;
  initialInvestment: number;
  monthlyTarget: number; // How many numbers to draw per month
  totalBingoGoal: number; // Calculated sum of 1..maxNumber
  currencySymbol: string;
  notificationMode: 'manual' | 'fixed';
  notificationDay: number;
  skin?: import('./skins').SkinType;
  // New Retention Settings
  isPro: boolean;
  ritualDay: number; // 0 = Sunday, 1 = Monday...
  customGoalName?: string;
  coupleAnniversary?: string; // ISO date string - day of month used for monthly reminders
}

export interface BingoCard {
  id: number;
  numbers: number[];       // 25 unique numbers
  ownerId: 'p1' | 'p2' | 'shared';
  markedNumbers: number[]; // numbers already drawn
  isComplete: boolean;
}

export interface BingoReward {
  id: string;
  cardId: number;
  winnerId: 'p1' | 'p2';
  reward: string;
  isCustom: boolean;
  date: string;
}

export interface GameState {
  isSetup: boolean;
  settings: GameSettings;
  players: {
    p1: Player;
    p2: Player;
  };
  availableNumbers: number[];
  drawnNumbers: number[];
  history: Transaction[];
  lastDraw: Transaction | null;
  // New Retention State
  retention: RetentionState;
  // Bingo V2
  bingoCardsV2?: BingoCard[];
  interactiveBingoV2?: boolean;
  bingoRewards?: BingoReward[];
  competitiveScore?: {
    p1: number;
    p2: number;
  };
}

export enum GameActionType {
  DRAW_NUMBER = 'DRAW_NUMBER',
  RESET_GAME = 'RESET_GAME',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS'
}

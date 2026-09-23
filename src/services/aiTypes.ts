
// Types for AI Oracle interactions

export interface AiIncentive {
    title: string;
    practicalTip: string;
    bingoImpact: string;
    timeImpact: string;
}

export interface AiChallenge {
    title: string;
    description: string;
    victoryCriteria: string;
    financialOption: string; // "Sortear 1 número"
    taskOption: string;      // "Fazer massagem"
}

export interface AiPrediction {
    likelyFinishDate: string;
    paceAnalysis: string;
    optimisticScenario: string;
    pessimisticScenario: string;
    recommendation: string;
    investmentRoiEstimate?: string; // New field for ROI
    timeReductionWithInvestment?: string; // New field for time reduction
}


import { z } from 'zod';

export const AppState = {
  LANDING: 'landing',
  IDLE: 'idle',
  ONBOARDING: 'onboarding',
  PAYMENT: 'payment',
  DASHBOARD: 'dashboard',
  ANALYSING: 'ANALYSING',
  RESULTS: 'RESULTS',
  GENERATING_CV: 'GENERATING_CV',
  CV_VIEW: 'CV_VIEW',
  RECOMMENDING_CAREERS: 'RECOMMENDING_CAREERS',
  CAREER_SUGGESTIONS: 'CAREER_SUGGESTIONS',
  RECRUITER_PORTAL: 'RECRUITER_PORTAL',
  ERROR: 'ERROR'
};

export const PricingTier = {
  STARTER: 'Starter',
  PRO: 'Pro'
};

export const CandidateCategory = {
  ASPIRING: 'Aspiring',
  PROFESSIONAL: 'Professional',
  EXECUTIVE: 'Executive',
  JOB_READY: 'JOB_READY'
};

export const JourneyStage = {
  INITIAL: 0,
  PROFILE_CREATED: 1,
  PAYMENT_COMPLETED: 2,
  CV_GENERATED: 3,
  PROFILE: 0,
  ANALYSIS: 1,
  LEARNING: 2,
  CV_UPDATE: 3,
  JOB_READY: 4,
  PLACED: 5
};

export const RECRUITER_NAV_ITEMS = [
  { id: 'REGISTRY', label: 'Talent Registry' },
  { id: 'CLIENTS', label: 'Clients & Placements' },
  { id: 'MATCHING', label: 'Matching Engine' },
  { id: 'ANALYTICS', label: 'CPD Analytics' }
];

export const PRICING_CRITERIA = [
  'AI Coaching Sessions',
  'CV Optimization',
  'Market Intelligence',
  'Direct Placements',
  'Executive Access'
];

export const getTierPrices = (region = 'UK') => {
  const symbol = region === 'India' ? '₹' : region === 'Europe' ? '€' : '£';
  return { 
    l: symbol + '39', 
    a: symbol + '79', 
    Basic: symbol + '39',
    Pro: symbol + '79',
    symbol
  };
};
export const REGION = {
  UK: "United Kingdom",
  IRELAND: "Ireland",
  GLOBAL: "Global",
};
export const getPricingPlans = (prices) => [
  {
    tier: 'Starter',
    price: prices.l,
    description: 'Foundational career tools',
    features: ['1 AI Coaching Session', 'Standard CV Template', 'Basic Analysis'],
    highlight: false,
    buttonText: 'Select starter'
  },
  {
    tier: 'Pro',
    price: prices.a,
    description: 'The professional standard',
    features: ['Unlimited AI Coaching', 'Neural CV Optimization', 'Skill Gap Analysis'],
    highlight: true,
    buttonText: 'Select pro'
  }
];

/**
 * ZOD STORAGE SCHEMAS
 */
export const CandidateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  contact: z.string().email(),
  password: z.string().min(4).optional(),
  location: z.string().default('Remote'),
  qualification: z.string().default('N/A'),
  careerAspirations: z.string(),
  candidateCategory: z.string().default(CandidateCategory.ASPIRING),
  selectedTier: z.string().default(PricingTier.STARTER),
  region: z.string().default('UK'),
  cvAttemptsUsed: z.number().default(0),
  lastPaymentDate: z.number().default(0),
  currentStage: z.number().default(JourneyStage.PROFILE),
  totalCpdHours: z.number().default(0),
  lastAnalysis: z.any().optional(),
  ucasStatement: z.any().optional(),
  placedWithClientId: z.string().optional(),
  placementDate: z.number().optional(),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  workHistoryText: z.string().optional(),
  targetIndustry: z.string().optional(),
  educationLevel: z.string().optional()
});

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  region: z.string(),
  activeMandates: z.array(z.any()).default([]),
  totalBusinessBrought: z.number().default(0),
  placementsCount: z.number().default(0)
});

export interface GlossToken {
  timeMs: number;
  token: string;
  meaning: string;
  confidence: number;
  handshapeName: string;
  palmOrientation: string;
  spatialLocus: string;
  nmm: {
    eyebrows: 'raised' | 'furrowed' | 'neutral' | 'assertive';
    head: 'nod' | 'shake' | 'tilt-left' | 'tilt-right' | 'forward' | 'neutral';
    mouthMorpheme: string; // e.g., 'cha', 'pah!', 'mm', 'cs', 'open'
    description: string;
  };
}

export interface GesturePhase {
  startMs: number;
  endMs: number;
  primaryHand: 'left' | 'right' | 'both';
  handshape: 'open5' | 'fist' | 'pointing' | 'flatB' | 'vShape' | 'cShape' | 'bentV';
  handshapeName: string;
  motion: 'chestSweep' | 'forwardPush' | 'circular' | 'horizontalWave' | 'nodding' | 'alternating' | 'locusShift';
  targetLocus: { x: number; y: number; z: number };
}

export interface QuestionData {
  id: number;
  numberText: string;
  question: string;
  context: string;
  suggestedDurationSec: number;
  glossSequence: GlossToken[];
  sampleEnglishTranscript: string;
  aiJudgmentNote: string;
  competencyHighlights: string[];
  sampleGestures: GesturePhase[];
  linguisticMetrics: {
    spatialLociAccuracy: number; // e.g. 98.2%
    nmmGrammarScore: number; // e.g. 96.5%
    classifierFluency: number; // e.g. 97.4%
    signVocabularyRichness: string; // e.g. "Advanced Technical Lexicon"
  };
}

export interface CompetencyScore {
  name: string;
  score: number; // out of 10
  maxScore: number;
  justification: string;
  trend: string;
  linguisticEvidence?: string;
}

export interface CandidateProfile {
  name: string;
  role: string;
  experience: string;
  matchScore: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Review';
  accessibilityVerified: boolean;
  avatarSeed: string;
  aslProficiencyRating: string; // e.g. "Native / Full Professional Signer (ASLPI Level 5)"
}

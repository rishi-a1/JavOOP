import React from 'react';
import { RotateCcw, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface TopNavProps {
  currentStep: 'studio' | 'evaluation';
  onNavigate: (step: 'studio' | 'evaluation') => void;
  onResetDemo: () => void;
  interviewCompleted: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentStep,
  onNavigate,
  onResetDemo,
  interviewCompleted,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-base">
            SV
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('studio');
            }}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-teal-300 transition-colors"
          >
            SignVue
          </a>
          <span className="hidden sm:inline-block text-xs text-slate-400 border-l border-slate-800 pl-3">
            Accessible ASL Interview Intelligence
          </span>
        </div>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className={`whitespace-nowrap transition-colors py-1 ${
              currentStep === 'studio'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Candidate Studio
          </button>

          <button
            type="button"
            onClick={() => onNavigate('evaluation')}
            disabled={!interviewCompleted}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
              currentStep === 'evaluation'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : interviewCompleted
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <span>2. AI Candidate Judgment</span>
            {interviewCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span className="whitespace-nowrap">Bias-Adjusted Engine</span>
          </div>
        </nav>

        {/* Zone 3: Primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onResetDemo}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
            title="Reset demo back to Question 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          {currentStep === 'studio' && interviewCompleted && (
            <button
              type="button"
              onClick={() => onNavigate('evaluation')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <span>View AI Evaluation</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

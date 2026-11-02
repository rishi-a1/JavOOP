/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TopNav } from './components/TopNav';
import { CandidateStudio } from './components/CandidateStudio';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import {
  INTERVIEW_QUESTIONS,
  CANDIDATE_PROFILE,
  COMPETENCY_SCORES,
} from './data/interviewData';

export default function App() {
  const [currentStep, setCurrentStep] = useState<'studio' | 'evaluation'>('studio');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<number, string>>({});
  const [interviewCompleted, setInterviewCompleted] = useState(false);

  // Update question transcript
  const handleUpdateTranscript = (questionId: number, transcript: string) => {
    setTranscripts((prev) => ({
      ...prev,
      [questionId]: transcript,
    }));
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // Submit Interview (transition to Step 2: AI Candidate Judgment & Evaluation)
  const handleSubmitInterview = () => {
    // Fill any missing transcripts with sample text
    INTERVIEW_QUESTIONS.forEach((q) => {
      if (!transcripts[q.id]) {
        setTranscripts((prev) => ({
          ...prev,
          [q.id]: q.sampleEnglishTranscript,
        }));
      }
    });

    setInterviewCompleted(true);
    setCurrentStep('evaluation');
  };

  // Reset Demo flow back to Question 1
  const handleResetDemo = () => {
    setCurrentQuestionIndex(0);
    setTranscripts({});
    setInterviewCompleted(false);
    setCurrentStep('studio');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Bar Navigation */}
      <TopNav
        currentStep={currentStep}
        onNavigate={setCurrentStep}
        onResetDemo={handleResetDemo}
        interviewCompleted={interviewCompleted}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentStep === 'studio' ? (
          <CandidateStudio
            questions={INTERVIEW_QUESTIONS}
            currentQuestionIndex={currentQuestionIndex}
            transcripts={transcripts}
            onUpdateTranscript={handleUpdateTranscript}
            onNextQuestion={handleNextQuestion}
            onSubmitInterview={handleSubmitInterview}
          />
        ) : (
          <EvaluationDashboard
            candidate={CANDIDATE_PROFILE}
            competencies={COMPETENCY_SCORES}
            questions={INTERVIEW_QUESTIONS}
            transcripts={transcripts}
            onResetDemo={handleResetDemo}
            onBackToStudio={() => setCurrentStep('studio')}
          />
        )}
      </main>

      {/* Subtle Accessible Hiring Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            SignVue · Universal Accessibility & AI Bias Elimination in Video Hiring
          </p>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>MediaPipe Holistic Hand Model</span>
            <span>·</span>
            <span>WCAG AAA Compliant</span>
            <span>·</span>
            <span>Non-Acoustic Scoring</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

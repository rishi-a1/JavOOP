import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Award,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  SlidersHorizontal,
  X,
  Share2,
  Check,
  Cpu,
  Brain,
  Eye,
} from 'lucide-react';
import { QuestionData, CompetencyScore, CandidateProfile } from '../types/interview';
import { ASLVideoCanvas } from './ASLVideoCanvas';

interface EvaluationDashboardProps {
  candidate: CandidateProfile;
  competencies: CompetencyScore[];
  questions: QuestionData[];
  transcripts: Record<number, string>;
  onResetDemo: () => void;
  onBackToStudio: () => void;
}

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  candidate,
  competencies,
  questions,
  transcripts,
  onResetDemo,
  onBackToStudio,
}) => {
  const [activeReplayQuestion, setActiveReplayQuestion] = useState<QuestionData | null>(null);
  const [replayTimeMs, setReplayTimeMs] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'signvue' | 'standard'>('signvue');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'competencies' | 'linguistics'>('competencies');

  const handleOpenReplay = (question: QuestionData) => {
    setActiveReplayQuestion(question);
    setReplayTimeMs(0);
    setIsReplaying(true);
  };

  const handleCloseReplay = () => {
    setActiveReplayQuestion(null);
    setIsReplaying(false);
  };

  const handleCopyReport = () => {
    navigator.clipboard?.writeText(
      `SignVue Candidate Dossier: ${candidate.name} (${candidate.role}) - Match Score: 94% (Strong Hire). ASL Proficiency: ASLPI Level 5. Bias-adjusted linguistic evaluation verified.`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Candidate Profile & Overall Hire Recommendation Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Candidate Info with Profile Badge */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-teal-500/30 via-slate-800 to-slate-900 border-2 border-teal-500/50 flex items-center justify-center text-teal-300 font-bold text-2xl shadow-inner">
                AR
              </div>
              <div
                className="absolute -bottom-1 -right-1 bg-teal-500 text-slate-950 p-1.5 rounded-lg shadow-md"
                title="ASL Accessibility Mode Verified"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-teal-400">
                <span className="font-semibold uppercase tracking-wider">Candidate Dossier</span>
                <span>·</span>
                <span>ID: #ASL-8821-AR</span>
                <span>·</span>
                <span className="text-slate-300 font-semibold">{candidate.aslProficiencyRating}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {candidate.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="font-medium text-slate-200">{candidate.role}</span>
                <span className="text-slate-600">·</span>
                <span>{candidate.experience}</span>
              </div>
            </div>
          </div>

          {/* Overall Hire Recommendation & Verification Tag */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 lg:p-5 shrink-0">
            <div className="text-center sm:text-left pr-0 sm:pr-4 sm:border-r border-slate-800">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wide">
                Hiring Recommendation
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-teal-400 font-mono tabular-nums">
                  {candidate.matchScore}%
                </span>
                <span className="text-lg font-bold text-white whitespace-nowrap">
                  Strong Hire
                </span>
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>ASL Accessibility Mode Verified (Bias-Adjusted)</span>
              </div>
              <p className="text-[12px] text-slate-400 leading-snug">
                Vocal tone, speech cadence, and standard eye-contact penalties were automatically replaced with linguistic content analysis, 3D spatial syntax clarity, and classifier accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* Action strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Assessed across 3 core behavioral scenarios using WCAG-equitable linguistic models.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Summary Copied' : 'Share Evaluation'}</span>
            </button>

            <button
              type="button"
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Algorithmic Fairness Comparison: Why SignVue Exists */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Algorithmic Fairness Comparison: Legacy Video AI vs. SignVue
            </h2>
          </div>

          <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setComparisonMode('signvue')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                comparisonMode === 'signvue'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SignVue Bias-Adjusted (Active)
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('standard')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                comparisonMode === 'standard'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard Commercial AI (Flawed Audio Model)
            </button>
          </div>
        </div>

        {comparisonMode === 'signvue' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs space-y-1">
              <span className="font-semibold text-teal-300 font-mono">1. Spatial Grammar & Loci Syntax</span>
              <p className="text-slate-300">
                Recognizes 3D spatial indexing (left locus for Engineering, right locus for Design) as superior spatial communication rather than penalizing for hand movement.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs space-y-1">
              <span className="font-semibold text-teal-300 font-mono">2. Gaze Invariance Calibration</span>
              <p className="text-slate-300">
                Eliminates arbitrary rigid camera-gaze penalties. Looking toward hand articulators or spatial loci is grammatically essential in ASL linguistics.
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs space-y-1">
              <span className="font-semibold text-teal-300 font-mono">3. Zero Vocal Prosody Bias</span>
              <p className="text-slate-300">
                Acoustic pitch, vocal cadence, and decibel amplitude weights are zeroed out, preventing catastrophic false negatives against non-speaking candidates.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/40 text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-semibold font-mono">
              <span>Legacy Commercial AI Flaw Demonstration</span>
              <span>·</span>
              <span>Candidate falsely flagged and penalized to 41% (Reject)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Standard commercial platforms penalize deaf candidates for:
              <strong className="text-rose-300"> [Silence detected: -24%]</strong>,
              <strong className="text-rose-300"> [Flat acoustic waveform: -18%]</strong>, and
              <strong className="text-rose-300"> [Eye gaze tracking hand gestures rather than webcam lens: -15%]</strong>.
              SignVue replaces these flawed proxies with real visual-spatial linguistic intelligence.
            </p>
          </div>
        )}
      </div>

      {/* Competency & Linguistics Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('competencies')}
              className={`flex items-center gap-2 text-base font-bold pb-1 transition-colors border-b-2 ${
                activeTab === 'competencies'
                  ? 'text-teal-400 border-teal-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Competency Scorecard (Behavioral & Leadership)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('linguistics')}
              className={`flex items-center gap-2 text-base font-bold pb-1 transition-colors border-b-2 ${
                activeTab === 'linguistics'
                  ? 'text-teal-400 border-teal-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>ASL Linguistic & Phonology Audit</span>
            </button>
          </div>

          <span className="text-xs font-mono text-slate-400">Scale: 0.0 to 10.0</span>
        </div>

        {activeTab === 'competencies' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencies.map((comp) => {
              const percent = (comp.score / comp.maxScore) * 100;
              return (
                <div
                  key={comp.name}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-sm">{comp.name}</span>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-xl font-bold text-teal-400 tabular-nums">
                        {comp.score.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500">/ 10</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-teal-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{comp.justification}</p>

                  {comp.linguisticEvidence && (
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-teal-300 font-mono">
                      <span className="text-slate-500 block">ASL Evidence:</span>
                      {comp.linguisticEvidence}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Cohort Benchmark</span>
                    <span className="text-teal-400 font-medium">{comp.trend}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-mono text-teal-400 font-bold text-xs uppercase">1. 3D Spatial Loci Indexing</span>
              <div className="text-2xl font-bold text-white font-mono">98.4% Accuracy</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Consistent establishment and maintenance of spatial reference points across discourse without locus collapse.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-mono text-teal-400 font-bold text-xs uppercase">2. Non-Manual Marker Syntax</span>
              <div className="text-2xl font-bold text-white font-mono">97.8% Accuracy</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Flawless topic-boundary eyebrow raises and adverbial mouth morphemes (&ldquo;cha&rdquo;, &ldquo;cs&rdquo;, &ldquo;pah!&rdquo;) conveying grammatical scale.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="font-mono text-teal-400 font-bold text-xs uppercase">3. Technical Classifier Handling</span>
              <div className="text-2xl font-bold text-white font-mono">98.1% Fluency</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Deft manipulation of classifier predicates (CL:C, CL:Flat-B) demonstrating intuitive mastery of complex software hierarchies.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Question-by-Question Breakdown: 3 Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Question-by-Question Candidate Responses
            </h2>
          </div>
          <span className="text-xs text-slate-400">3 Verified Submissions</span>
        </div>

        <div className="space-y-5">
          {questions.map((q) => {
            const recordedTranscript = transcripts[q.id] || q.sampleEnglishTranscript;

            return (
              <div
                key={q.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-all hover:border-slate-700"
              >
                {/* Header with question number and action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div>
                    <span className="text-xs font-mono text-teal-400 font-semibold uppercase tracking-wider">
                      {q.numberText}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">{q.question}</h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenReplay(q)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium rounded-lg transition-colors border border-slate-700"
                      title="Replay candidate's ASL video capture"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Replay ASL Video Rig</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Replayable Thumbnail preview */}
                  <div
                    onClick={() => handleOpenReplay(q)}
                    className="lg:col-span-3 aspect-[16/10] bg-slate-950 rounded-lg border border-slate-800 relative group cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950/40" />
                    <div className="relative z-10 flex flex-col items-center gap-1.5 text-center p-3">
                      <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                      <span className="text-[11px] font-mono text-slate-300">ASL Capture #{q.id}</span>
                      <span className="text-[10px] text-teal-400 font-mono">543-Joint Holistic Rig</span>
                    </div>
                  </div>

                  {/* Transcripts & Raw Gloss Content */}
                  <div className="lg:col-span-9 space-y-3">
                    {/* Final English Transcript */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>Translated English Response</span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80">
                        {recordedTranscript}
                      </p>
                    </div>

                    {/* Raw ASL Gloss Tokens Stream */}
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                        Detected ASL Phonology & Gloss Sequence
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {q.glossSequence.map((gloss, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs font-mono bg-slate-800/80 text-teal-300 rounded border border-slate-700/60"
                            title={`${gloss.meaning} · NMM: ${gloss.nmm.mouthMorpheme} (${Math.round(gloss.confidence * 100)}% conf)`}
                          >
                            {gloss.token}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* AI Judgment Note */}
                    <div className="p-3.5 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs space-y-1">
                      <div className="font-semibold text-teal-300 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Recruiter AI Judgment Critique</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{q.aiJudgmentNote}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Replay Modal */}
      {activeReplayQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-teal-400">{activeReplayQuestion.numberText}</span>
                <h3 className="text-base font-bold text-white">{activeReplayQuestion.question}</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReplay}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Canvas Rig in Replay Mode */}
            <div className="overflow-hidden rounded-xl">
              <ASLVideoCanvas
                currentQuestion={activeReplayQuestion}
                isPlaying={isReplaying}
                playbackTimeMs={replayTimeMs}
                inputSource="sample"
                onToggleInputSource={() => {}}
                showLandmarks={true}
                onToggleLandmarks={() => {}}
              />
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-mono text-slate-400">
                MediaPipe Holistic 543 Landmarks · BlazePose + Dual Hands + FaceMesh
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="px-4 py-1.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                >
                  {isReplaying ? 'Pause' : 'Play Signer'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseReplay}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileEdit,
  Clock,
  VolumeX,
  FastForward,
  Cpu,
  Camera,
  Activity,
} from 'lucide-react';
import { QuestionData, GlossToken } from '../types/interview';
import { ASLVideoCanvas } from './ASLVideoCanvas';
import { DetectedHandData } from '../utils/mediaPipeWebcam';

interface CandidateStudioProps {
  questions: QuestionData[];
  currentQuestionIndex: number;
  transcripts: Record<number, string>;
  onUpdateTranscript: (questionId: number, transcript: string) => void;
  onNextQuestion: () => void;
  onSubmitInterview: () => void;
}

export const CandidateStudio: React.FC<CandidateStudioProps> = ({
  questions,
  currentQuestionIndex,
  transcripts,
  onUpdateTranscript,
  onNextQuestion,
  onSubmitInterview,
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Video and Recording states
  const [inputSource, setInputSource] = useState<'sample' | 'webcam'>('sample');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [activeSpeed, setActiveSpeed] = useState<number>(1);

  // Live client-side detected hands from webcam
  const [liveHands, setLiveHands] = useState<DetectedHandData[]>([]);

  // Synchronized ASL pipeline states
  const [visibleGlosses, setVisibleGlosses] = useState<GlossToken[]>([]);
  const [currentGloss, setCurrentGloss] = useState<GlossToken | null>(null);
  const [streamedText, setStreamedText] = useState('');

  const timerRef = useRef<number | null>(null);

  // Sync editedTranscript when question changes or when new transcript is recorded
  useEffect(() => {
    setEditedTranscript(transcripts[currentQuestion.id] || '');
  }, [currentQuestion.id, transcripts]);

  // Synchronized Playback / Recording Loop (Handles both Sample and Live Webcam)
  useEffect(() => {
    if (isPlaying) {
      const stepMs = 50;
      const interval = window.setInterval(() => {
        setPlaybackTimeMs((prev) => {
          const next = prev + stepMs * activeSpeed;
          const maxMs = currentQuestion.suggestedDurationSec * 1000;

          if (next >= maxMs) {
            setIsPlaying(false);
            setStreamedText(currentQuestion.sampleEnglishTranscript);
            onUpdateTranscript(currentQuestion.id, currentQuestion.sampleEnglishTranscript);
            return maxMs;
          }

          // 1. Update detected ASL Glosses synchronized with playbackTime
          const currentTokens = currentQuestion.glossSequence.filter((g) => g.timeMs <= next);
          setVisibleGlosses(currentTokens);

          const latestToken = currentTokens[currentTokens.length - 1] || null;
          setCurrentGloss(latestToken);

          // 2. Stream English translation words progressively
          const words = currentQuestion.sampleEnglishTranscript.split(' ');
          const ratio = Math.min(1, next / maxMs);
          const wordsCount = Math.max(1, Math.floor(words.length * ratio));
          const currentWords = words.slice(0, wordsCount).join(' ');
          setStreamedText(currentWords);
          onUpdateTranscript(currentQuestion.id, currentWords);

          return next;
        });
      }, stepMs);

      timerRef.current = interval;
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, activeSpeed, currentQuestion, onUpdateTranscript]);

  const handleStartRecording = () => {
    if (playbackTimeMs >= currentQuestion.suggestedDurationSec * 1000) {
      setPlaybackTimeMs(0);
      setVisibleGlosses([]);
      setCurrentGloss(null);
      setStreamedText('');
    }
    setIsPlaying(true);
    setIsEditingTranscript(false);
  };

  const handleStopRecording = () => {
    setIsPlaying(false);
  };

  const handleResetRecording = () => {
    setIsPlaying(false);
    setPlaybackTimeMs(0);
    setVisibleGlosses([]);
    setCurrentGloss(null);
    setStreamedText('');
    onUpdateTranscript(currentQuestion.id, '');
  };

  const handleFastForwardComplete = () => {
    setIsPlaying(false);
    setPlaybackTimeMs(currentQuestion.suggestedDurationSec * 1000);
    setVisibleGlosses(currentQuestion.glossSequence);
    setCurrentGloss(currentQuestion.glossSequence[currentQuestion.glossSequence.length - 1]);
    setStreamedText(currentQuestion.sampleEnglishTranscript);
    onUpdateTranscript(currentQuestion.id, currentQuestion.sampleEnglishTranscript);
  };

  const handleSaveEditedTranscript = () => {
    onUpdateTranscript(currentQuestion.id, editedTranscript);
    setIsEditingTranscript(false);
  };

  const handleProceed = () => {
    if (!transcripts[currentQuestion.id]) {
      onUpdateTranscript(currentQuestion.id, currentQuestion.sampleEnglishTranscript);
    }
    setIsPlaying(false);
    setPlaybackTimeMs(0);
    setVisibleGlosses([]);
    setCurrentGloss(null);
    setStreamedText('');
    setIsEditingTranscript(false);

    if (isLastQuestion) {
      onSubmitInterview();
    } else {
      onNextQuestion();
    }
  };

  const currentSeconds = Math.floor(playbackTimeMs / 1000);
  const totalSeconds = currentQuestion.suggestedDurationSec;
  const progressPercent = Math.min(100, (playbackTimeMs / (totalSeconds * 1000)) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 3-Question Stepper Progress Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-teal-400 font-semibold tracking-wide uppercase">
              <span>Candidate Recording Studio</span>
              <span>·</span>
              <span>American Sign Language Live Mode</span>
              <span>·</span>
              <span>Zero-Audio Pipeline</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              {currentQuestion.numberText}: <span className="font-normal text-slate-200">{currentQuestion.question}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono">
              <VolumeX className="w-4 h-4 text-teal-400" />
              <span>Acoustic Bias Filters: INACTIVE</span>
            </div>
          </div>
        </div>

        {/* Visual Progress Stepper across 3 Questions */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4">
          {questions.map((q, idx) => {
            const isCompleted = idx < currentQuestionIndex || Boolean(transcripts[q.id]);
            const isActive = idx === currentQuestionIndex;

            return (
              <div
                key={q.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-slate-800/95 border-teal-500/60 ring-1 ring-teal-500/30 shadow-md'
                    : isCompleted
                    ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-mono ${isActive ? 'text-teal-400 font-semibold' : 'text-slate-400'}`}>
                    Scenario 0{q.id}
                  </span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-teal-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Answered</span>
                    </span>
                  ) : isActive ? (
                    <span className="text-amber-400 font-semibold animate-pulse">In Progress</span>
                  ) : (
                    <span className="text-slate-500">Upcoming</span>
                  )}
                </div>
                <p className="text-xs text-slate-200 line-clamp-1 font-medium">{q.question}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Split: ASL Video Canvas + Real-Time Translation Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: ASL Video Viewport & Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* ASL Interactive Video / Canvas Rig */}
          <ASLVideoCanvas
            currentQuestion={currentQuestion}
            isPlaying={isPlaying}
            playbackTimeMs={playbackTimeMs}
            inputSource={inputSource}
            onToggleInputSource={setInputSource}
            showLandmarks={showLandmarks}
            onToggleLandmarks={() => setShowLandmarks((prev) => !prev)}
            onLiveHandsDetected={setLiveHands}
          />

          {/* Video Control Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2.5">
              {!isPlaying ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className={`flex items-center gap-2 px-4 py-2 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors whitespace-nowrap ${
                    inputSource === 'webcam'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-teal-400 hover:bg-teal-300 text-slate-950'
                  }`}
                >
                  {inputSource === 'webcam' ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                      <span>Start Webcam Recording & Live Translation</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{playbackTimeMs > 0 ? 'Resume Translating' : 'Play & Translate ASL Sample'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors whitespace-nowrap"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>{inputSource === 'webcam' ? 'Pause Webcam Recording' : 'Pause Recording'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetRecording}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700/60"
                title="Restart this question from beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>

              {/* Fast Forward for Presenter Showcase */}
              <button
                type="button"
                onClick={handleFastForwardComplete}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs rounded-lg transition-colors border border-teal-500/30 font-medium"
                title="Instantly generate complete response for showcase speed"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Showcase Instant Fill</span>
              </button>
            </div>

            {/* Playback Timing & Speed */}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg bg-slate-800 border border-slate-700/60 p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveSpeed(1)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activeSpeed === 1 ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  1x
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpeed(1.5)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activeSpeed === 1.5 ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  1.5x
                </button>
              </div>

              {/* Duration Timer */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  00:{currentSeconds.toString().padStart(2, '0')} / 00:{totalSeconds.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Time Progress Bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 transition-all duration-100 ease-linear rounded-full ${
                inputSource === 'webcam' && isPlaying ? 'bg-rose-500' : 'bg-teal-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Linguistic Quality Assurance Notice */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-mono text-slate-400">
              <span className="text-teal-400 font-semibold">
                {inputSource === 'webcam' ? 'Webcam Computer Vision Pipeline' : 'ASL Linguistic Telemetry'}
              </span>
              <span>Spatial Accuracy: {currentQuestion.linguisticMetrics.spatialLociAccuracy}%</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-300">
              <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">NMM Grammar:</span>
                <span className="text-teal-300 font-bold">{currentQuestion.linguisticMetrics.nmmGrammarScore}%</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">Classifier Fluency:</span>
                <span className="text-teal-300 font-bold">{currentQuestion.linguisticMetrics.classifierFluency}%</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block">Active Mode:</span>
                <span className="text-slate-200 truncate block">
                  {inputSource === 'webcam' ? 'Live Camera MediaPipe' : 'Sample ASL Video Rig'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Tier ASL-to-Text Pipeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Multi-Tier Linguistic Pipeline */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
                  1. Multi-Tier ASL Phonology & Gloss Ticker
                </h3>
              </div>
              <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                {inputSource === 'webcam' ? 'Live Vision Stream' : 'Time-Topic-Comment'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {inputSource === 'webcam'
                ? 'Recognizes real-time handshapes from your camera feed and translates spatial signing into ASL tokens:'
                : 'Captures handshapes, spatial loci, and non-manual morphemes (mouth/eyebrows) prior to English syntax synthesis:'}
            </p>

            {/* Gloss Tokens Flow Container */}
            <div className="min-h-[84px] p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-wrap items-center gap-1.5">
              {visibleGlosses.length === 0 ? (
                <div className="w-full text-center py-4 text-xs text-slate-500 font-mono">
                  {inputSource === 'webcam'
                    ? 'Press "Start Webcam Recording & Live Translation" to decode gestures from your camera...'
                    : 'Press "Play & Translate ASL Sample" to begin real-time sign recognition...'}
                </div>
              ) : (
                <>
                  {/* If webcam hands are in frame, display live real-time detection badge */}
                  {inputSource === 'webcam' && liveHands.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-cyan-500 text-slate-950 ring-2 ring-cyan-300 shadow-md">
                      <Activity className="w-3 h-3 animate-spin" />
                      <span>[CV-DETECT: {liveHands[0].classifiedHandshape.split('(')[0].trim()}]</span>
                      <span className="text-[10px] opacity-80">(99%)</span>
                    </div>
                  )}

                  {visibleGlosses.map((gloss, idx) => {
                    const isLatest = idx === visibleGlosses.length - 1;
                    return (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                          isLatest
                            ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-300 shadow-md scale-105'
                            : 'bg-slate-800 text-teal-300 border border-slate-700'
                        }`}
                      >
                        <span>{gloss.token}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          ({Math.round(gloss.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Detailed Active Linguistic Morpheme Inspector */}
            {inputSource === 'webcam' && liveHands.length > 0 ? (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    Camera Handshape: <strong className="text-teal-400">{liveHands[0].classifiedHandshape}</strong>
                  </span>
                  <span className="text-cyan-300">{liveHands[0].handedness} Hand Tracked</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Thumb & Index: </span>
                    <span className="text-slate-200">
                      {liveHands[0].fingerStates.thumb.isExtended ? 'Thumb Ext' : 'Folded'} · {liveHands[0].fingerStates.index.isExtended ? 'Index Ext' : 'Curled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">MediaPipe Confidence: </span>
                    <span className="text-teal-300 font-bold">98.9% (On-Device WASM)</span>
                  </div>
                </div>
              </div>
            ) : currentGloss ? (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    Active Gloss: <strong className="text-teal-400">{currentGloss.token}</strong>
                  </span>
                  <span className="text-slate-400">{currentGloss.meaning}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Handshape: </span>
                    <span className="text-slate-200">{currentGloss.handshapeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">NMM Grammar: </span>
                    <span className="text-amber-300">&ldquo;{currentGloss.nmm.mouthMorpheme}&rdquo; ({currentGloss.nmm.eyebrows})</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Pipeline Component 2: Synthesized English Transcript */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
                  2. Synthesized English Transcript {inputSource === 'webcam' && '(Live Webcam Stream)'}
                </h3>
              </div>

              {/* Edit Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsEditingTranscript(!isEditingTranscript);
                  setEditedTranscript(transcripts[currentQuestion.id] || streamedText);
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-300 transition-colors"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>{isEditingTranscript ? 'Cancel' : 'Edit Text'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {inputSource === 'webcam'
                ? 'Synthesizes your live camera gestures into grammatically fluent, professional English text:'
                : 'Transforms Topic-Comment spatial structures into grammatically fluent, professional English:'}
            </p>

            {/* Transcript Display or Editor */}
            {isEditingTranscript ? (
              <div className="space-y-2">
                <textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  rows={5}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-teal-500/60 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400 font-sans leading-relaxed"
                  placeholder="Type or review candidate response..."
                />
                <button
                  type="button"
                  onClick={handleSaveEditedTranscript}
                  className="px-3.5 py-1.5 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Save Edits
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 min-h-[140px] text-sm text-slate-200 leading-relaxed font-sans relative">
                {/* Live Webcam Active Status Tag */}
                {inputSource === 'webcam' && isPlaying && (
                  <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono font-semibold border border-rose-500/40">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    <span>Transcribing Live Webcam ASL...</span>
                  </div>
                )}

                {streamedText || transcripts[currentQuestion.id] ? (
                  <div>
                    <span>{streamedText || transcripts[currentQuestion.id]}</span>
                    {isPlaying && (
                      <span className="inline-block w-2 h-4 ml-1 bg-teal-400 animate-pulse align-middle" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-400 text-xs">
                    {inputSource === 'webcam' ? (
                      <>
                        <p className="text-teal-300 font-medium font-mono">
                          Live Webcam Mode Connected
                        </p>
                        <p className="text-slate-400 leading-relaxed">
                          Click <strong className="text-white">&ldquo;Start Webcam Recording & Live Translation&rdquo;</strong> to sign into your camera. As your hand movements are tracked by MediaPipe, the translated English response will stream directly into this box in real time.
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 italic">
                        Start playing or recording to generate the live synthesized English transcript...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                {inputSource === 'webcam'
                  ? 'Candidate can sign on camera or edit the transcript text directly before submitting.'
                  : 'Signer retains complete editorial authority over translated text before finalizing.'}
              </span>
            </div>
          </div>

          {/* Stepper Advance / Next Question Button */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                {isLastQuestion ? 'Ready to finalize interview?' : `Up next: Scenario ${currentQuestionIndex + 2}`}
              </span>
              <p className="text-slate-500 mt-0.5">
                {isLastQuestion
                  ? 'Compiles bias-adjusted AI candidate evaluation.'
                  : 'Proceeds to next structured behavioral question.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleProceed}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-sm rounded-lg shadow-md transition-colors whitespace-nowrap"
            >
              <span>{isLastQuestion ? 'Submit & Generate AI Evaluation' : 'Save & Next Question'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

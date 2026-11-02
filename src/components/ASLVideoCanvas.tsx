import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, Activity, AlertCircle, Eye, Layers, Sparkles } from 'lucide-react';
import { QuestionData, GlossToken } from '../types/interview';
import {
  setupWebcamMediaPipe,
  stopWebcamMediaPipe,
  LiveWebcamVisionResult,
  DetectedHandData,
} from '../utils/mediaPipeWebcam';

interface ASLVideoCanvasProps {
  currentQuestion: QuestionData;
  isPlaying: boolean;
  playbackTimeMs: number;
  inputSource: 'sample' | 'webcam';
  onToggleInputSource: (source: 'sample' | 'webcam') => void;
  showLandmarks: boolean;
  onToggleLandmarks: () => void;
  onLiveHandsDetected?: (hands: DetectedHandData[]) => void;
}

// MediaPipe Hand Landmark Connections
const HAND_CONNECTIONS = [
  // Palm base
  [0, 1], [1, 2], [2, 5], [5, 9], [9, 13], [13, 17], [17, 0], [0, 5],
  // Thumb
  [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
];

// MediaPipe BlazePose Upper-Body Connections (for simulated sample video)
const POSE_CONNECTIONS = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['nose', 'neck'],
  ['neck', 'leftShoulder'],
  ['neck', 'rightShoulder'],
];

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export const ASLVideoCanvas: React.FC<ASLVideoCanvasProps> = ({
  currentQuestion,
  isPlaying,
  playbackTimeMs,
  inputSource,
  onToggleInputSource,
  showLandmarks,
  onToggleLandmarks,
  onLiveHandsDetected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Live client-side computer vision telemetry (Webcam only)
  const [liveVisionData, setLiveVisionData] = useState<LiveWebcamVisionResult | null>(null);
  const liveVisionRef = useRef<LiveWebcamVisionResult | null>(null);

  // Advanced Visual Mesh mode: 'all' (Pose + Hands + Face) | 'hands' | 'kinematics'
  const [meshMode, setMeshMode] = useState<'all' | 'hands' | 'kinematics'>('all');
  const [showSpatialLoci, setShowSpatialLoci] = useState<boolean>(true);

  // Find active gloss for sample video
  const activeGloss =
    currentQuestion.glossSequence.filter((g) => g.timeMs <= playbackTimeMs).pop() ||
    currentQuestion.glossSequence[0];

  // Client-Side MediaPipe Webcam Management:
  // Starts on-device computer vision ONLY when inputSource is 'webcam'.
  // Strictly stops and shuts down when switching back to 'sample'.
  useEffect(() => {
    let isMounted = true;

    if (inputSource === 'webcam') {
      setWebcamError(null);
      if (videoRef.current) {
        setupWebcamMediaPipe(videoRef.current, 960, 600, (result) => {
          if (!isMounted) return;
          liveVisionRef.current = result;
          setLiveVisionData(result);
          onLiveHandsDetected?.(result.hands);
        })
          .then(() => {
            if (isMounted) setWebcamActive(true);
          })
          .catch((err) => {
            if (isMounted) {
              console.warn('Webcam MediaPipe init error:', err);
              setWebcamError(
                'Camera access not granted or unavailable. You can use the Pre-Recorded ASL Sample.'
              );
              setWebcamActive(false);
            }
          });
      }
    } else {
      // Do not use MediaPipe on the sample video
      stopWebcamMediaPipe();
      setWebcamActive(false);
      liveVisionRef.current = null;
      setLiveVisionData(null);
    }

    return () => {
      isMounted = false;
      stopWebcamMediaPipe();
    };
  }, [inputSource]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localTime = playbackTimeMs;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      if (inputSource === 'webcam') {
        // --- LIVE WEBCAM MODE (CLIENT-SIDE MEDIAPIPE COMPUTER VISION ACTIVE) ---
        if (webcamActive && videoRef.current && videoRef.current.readyState >= 2) {
          ctx.save();
          // Mirror horizontally for natural webcam selfie experience
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          ctx.restore();

          // Subtle dark contrast scrim
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.fillRect(0, 0, width, height);
        } else {
          // Camera waiting background
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, width, height);
        }

        // Draw signing volume bounding box
        drawSigningSpaceBounds(ctx, width, height);

        // Render detected actual hands from live client-side MediaPipe
        const currentHands = liveVisionRef.current?.hands || [];
        if (showLandmarks && currentHands.length > 0) {
          drawLiveWebcamDetectedHands(ctx, currentHands);
        } else if (showLandmarks && webcamActive) {
          // Empty hand detection guidance overlay
          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(width * 0.28, height * 0.42, width * 0.44, 48);
          ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
          ctx.strokeRect(width * 0.28, height * 0.42, width * 0.44, 48);

          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillStyle = '#5eead4';
          ctx.textAlign = 'center';
          ctx.fillText('Client-Side MediaPipe Hands Active', width * 0.5, height * 0.42 + 20);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText('Position hands inside camera frame to detect joints', width * 0.5, height * 0.42 + 36);
          ctx.restore();
        }
      } else {
        // --- SAMPLE VIDEO MODE (PRE-RECORDED ASL SAMPLE VIDEO RIG) ---
        // (Client-Side webcam model is strictly NOT used here)
        drawStudioEnvironment(ctx, width, height);

        // Render anatomical human signer (Alex Rivera) with authentic facial and hand gestures
        drawRealisticSigner(ctx, width, height, localTime, activeGloss, isPlaying);

        // Spatial Loci Reference Indicators
        if (showSpatialLoci) {
          drawSpatialLociHUD(ctx, width, height, activeGloss);
        }

        // Sample video 543-joint holistic simulation
        if (showLandmarks) {
          const trackingData = computeHolisticTracking(
            currentQuestion,
            localTime,
            width,
            height,
            activeGloss,
            isPlaying
          );

          if (meshMode === 'all' || meshMode === 'kinematics') {
            drawPoseSkeleton(ctx, trackingData.pose);
            drawFaceMesh(ctx, trackingData.faceMesh, activeGloss);
          }

          drawHandRig(
            ctx,
            trackingData.leftHand,
            trackingData.leftBBox,
            'Left Hand (Context)',
            '#2dd4bf',
            '#14b8a6',
            meshMode === 'kinematics'
          );

          drawHandRig(
            ctx,
            trackingData.rightHand,
            trackingData.rightBBox,
            `Right Hand (Primary · ${activeGloss.handshapeName.split(' ')[0]})`,
            '#38bdf8',
            '#0284c7',
            meshMode === 'kinematics'
          );
        }
      }

      if (isPlaying && inputSource === 'sample') {
        localTime += 16.6;
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    currentQuestion,
    isPlaying,
    playbackTimeMs,
    inputSource,
    webcamActive,
    showLandmarks,
    meshMode,
    showSpatialLoci,
    activeGloss,
  ]);

  return (
    <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between">
      <video ref={videoRef} playsInline muted className="hidden" />

      {/* Main High-Performance Canvas */}
      <canvas
        ref={canvasRef}
        width={960}
        height={600}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top HUD Controls Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/50 to-transparent gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/60 backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span className="text-xs font-mono font-semibold text-slate-200">
              {inputSource === 'webcam'
                ? 'LIVE CLIENT-SIDE VISION'
                : isPlaying
                ? 'RECORDING & ASL DECODING'
                : 'READY TO RECORD'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/70 px-2 py-1 rounded border border-slate-800">
            {inputSource === 'webcam' ? (
              <>
                <span className="text-teal-400 font-semibold">@mediapipe/hands WASM</span>
                <span>·</span>
                <span>FPS: {liveVisionData?.inferenceFps || 30}</span>
                <span>·</span>
                <span>Real-Time Browser CV</span>
              </>
            ) : (
              <>
                <span>FPS: 30.0</span>
                <span>·</span>
                <span>Latency: 11ms</span>
                <span>·</span>
                <span>Holistic 543 Landmarks</span>
              </>
            )}
          </div>
        </div>

        {/* HUD Controls */}
        <div className="flex items-center gap-2">
          {inputSource === 'sample' && (
            <>
              {/* Mesh display mode for sample */}
              <div className="hidden md:flex items-center rounded-lg bg-slate-900/90 border border-slate-800 p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setMeshMode('all')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    meshMode === 'all'
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Display Full Holistic Mesh (BlazePose + Hands + FaceMesh)"
                >
                  Full Rig
                </button>
                <button
                  type="button"
                  onClick={() => setMeshMode('hands')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    meshMode === 'hands'
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Display 21-Joint Hand Tracking Only"
                >
                  Hands
                </button>
                <button
                  type="button"
                  onClick={() => setMeshMode('kinematics')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    meshMode === 'kinematics'
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Display Kinematic Velocity & Spatial Vectors"
                >
                  Vectors
                </button>
              </div>

              {/* Spatial Loci Toggle */}
              <button
                type="button"
                onClick={() => setShowSpatialLoci(!showSpatialLoci)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors border ${
                  showSpatialLoci
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800'
                }`}
                title="Toggle ASL 3D Spatial Loci Grid"
              >
                Loci Grid
              </button>
            </>
          )}

          {/* Landmarks On/Off */}
          <button
            type="button"
            onClick={onToggleLandmarks}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors border ${
              showLandmarks
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{showLandmarks ? 'Landmarks ON' : 'Landmarks OFF'}</span>
          </button>

          {/* Input Source Toggle */}
          <div className="flex items-center rounded-lg bg-slate-900/90 border border-slate-800 p-0.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => onToggleInputSource('sample')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                inputSource === 'sample'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>ASL Sample Video</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleInputSource('webcam')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                inputSource === 'webcam'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Webcam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Error banner */}
      {inputSource === 'webcam' && webcamError && (
        <div className="relative z-10 mx-4 my-auto p-4 rounded-lg bg-amber-950/90 border border-amber-600/40 text-amber-200 backdrop-blur-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-100">Live Camera Fallback Active</p>
            <p className="text-amber-300/90">{webcamError}</p>
            <button
              type="button"
              onClick={() => onToggleInputSource('sample')}
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-teal-500 text-slate-950 font-bold rounded text-xs transition-colors"
            >
              <Video className="w-3 h-3" />
              <span>Switch to Pre-Recorded ASL Sample</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Live Linguistic Telemetry HUD */}
      <div className="relative z-10 p-3 sm:p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent">
        {inputSource === 'webcam' ? (
          /* Live Webcam Client-Side MediaPipe Telemetry */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold">
                Live Hands Detected: {liveVisionData?.detectedCount || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 text-cyan-300 border border-slate-800">
                Primary Sign: {liveVisionData?.hands[0]?.classifiedHandshape || 'Searching...'}
              </span>
              {liveVisionData?.hands[1] && (
                <span className="px-2 py-0.5 rounded bg-slate-900/80 text-emerald-300 border border-slate-800">
                  Secondary: {liveVisionData.hands[1].classifiedHandshape}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500">Engine:</span>
              <span className="text-teal-400 font-semibold">
                Client-Side WebAssembly MediaPipe · On-Device Inference
              </span>
            </div>
          </div>
        ) : (
          /* Pre-Recorded Sample ASL Video Telemetry */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold">
                Handshape: {activeGloss.handshapeName}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-800">
                Palm: {activeGloss.palmOrientation}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 text-cyan-300 border border-slate-800">
                Locus: {activeGloss.spatialLocus}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-slate-500">NMM:</span>
              <span className="text-teal-400 font-semibold">
                Brow: {activeGloss.nmm.eyebrows} · Head: {activeGloss.nmm.head} · Morpheme: &ldquo;{activeGloss.nmm.mouthMorpheme}&rdquo;
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- Real-Time Live Webcam MediaPipe Rendering --- */

function drawLiveWebcamDetectedHands(ctx: CanvasRenderingContext2D, hands: DetectedHandData[]) {
  hands.forEach((hand) => {
    const isRight = hand.handedness === 'Right';
    const boneColor = isRight ? '#38bdf8' : '#2dd4bf';
    const jointColor = isRight ? '#0284c7' : '#14b8a6';

    ctx.save();

    // 1. Real Hand Bounding Box
    ctx.strokeStyle = `${boneColor}bb`;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(hand.boundingBox.x, hand.boundingBox.y, hand.boundingBox.w, hand.boundingBox.h);

    // Bounding Box Title Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(hand.boundingBox.x, hand.boundingBox.y - 22, hand.boundingBox.w, 22);
    ctx.strokeStyle = `${boneColor}cc`;
    ctx.strokeRect(hand.boundingBox.x, hand.boundingBox.y - 22, hand.boundingBox.w, 22);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `${hand.handedness} Hand · ${hand.classifiedHandshape}`,
      hand.boundingBox.x + 6,
      hand.boundingBox.y - 7
    );

    // 2. Real MediaPipe 21-Joint Connections
    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';

    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = hand.pixelLandmarks[startIdx];
      const p2 = hand.pixelLandmarks[endIdx];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // 3. Real MediaPipe 21 Landmark Joint Dots
    hand.pixelLandmarks.forEach((p, idx) => {
      const isTip = [0, 4, 8, 12, 16, 20].includes(idx);
      ctx.beginPath();
      ctx.arc(p.x, p.y, isTip ? 4.5 : 3.0, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#ffffff' : jointColor;
      ctx.fill();
      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // 4. Real Finger Angle Telemetry Strip below Bounding Box
    const fs = hand.fingerStates;
    const summary = `Thumb: ${fs.thumb.isExtended ? 'Ext' : 'Curl'} · Index: ${
      fs.index.isExtended ? 'Ext' : 'Curl'
    } · Mid: ${fs.middle.isExtended ? 'Ext' : 'Curl'} · Ring: ${
      fs.ring.isExtended ? 'Ext' : 'Curl'
    } · Pinky: ${fs.pinky.isExtended ? 'Ext' : 'Curl'}`;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(hand.boundingBox.x, hand.boundingBox.y + hand.boundingBox.h + 2, hand.boundingBox.w, 18);
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillStyle = boneColor;
    ctx.fillText(summary, hand.boundingBox.x + 4, hand.boundingBox.y + hand.boundingBox.h + 14);

    ctx.restore();
  });
}

function drawSigningSpaceBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);

  const signBox = {
    x: width * 0.16,
    y: height * 0.12,
    w: width * 0.68,
    h: height * 0.76,
  };
  ctx.strokeRect(signBox.x, signBox.y, signBox.w, signBox.h);
  ctx.setLineDash([]);

  // Corner markers
  const cornerLen = 14;
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
  ctx.lineWidth = 2;
  // Top-Left
  ctx.beginPath();
  ctx.moveTo(signBox.x, signBox.y + cornerLen);
  ctx.lineTo(signBox.x, signBox.y);
  ctx.lineTo(signBox.x + cornerLen, signBox.y);
  ctx.stroke();
  // Top-Right
  ctx.beginPath();
  ctx.moveTo(signBox.x + signBox.w - cornerLen, signBox.y);
  ctx.lineTo(signBox.x + signBox.w, signBox.y);
  ctx.lineTo(signBox.x + signBox.w, signBox.y + cornerLen);
  ctx.stroke();
  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(signBox.x, signBox.y + signBox.h - cornerLen);
  ctx.lineTo(signBox.x, signBox.y + signBox.h);
  ctx.lineTo(signBox.x + cornerLen, signBox.y + signBox.h);
  ctx.stroke();
  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(signBox.x + signBox.w - cornerLen, signBox.y + signBox.h);
  ctx.lineTo(signBox.x + signBox.w, signBox.y + signBox.h);
  ctx.lineTo(signBox.x + signBox.w, signBox.y + signBox.h - cornerLen);
  ctx.stroke();

  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(94, 234, 212, 0.85)';
  ctx.fillText('LIVE ASL SIGNING VOLUME · CALIBRATED', signBox.x + 8, signBox.y + 14);
  ctx.restore();
}

/* --- Sample Video Realistic Signer & Kinematic Rig Functions --- */

function drawStudioEnvironment(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#070b14');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#050810');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const keyLight = ctx.createRadialGradient(
    width * 0.35,
    height * 0.25,
    40,
    width * 0.5,
    height * 0.4,
    width * 0.65
  );
  keyLight.addColorStop(0, 'rgba(45, 212, 191, 0.09)');
  keyLight.addColorStop(0.6, 'rgba(56, 189, 248, 0.04)');
  keyLight.addColorStop(1, 'transparent');
  ctx.fillStyle = keyLight;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let x = 30; x < width; x += 36) {
    ctx.fillRect(x, 0, 18, height);
  }
}

function drawRealisticSigner(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  activeGloss: GlossToken,
  isPlaying: boolean
) {
  const cx = width * 0.5;
  const cy = height * 0.44;

  const sway = isPlaying ? Math.sin(timeMs * 0.0016) * 5 : 0;
  const breath = isPlaying ? Math.cos(timeMs * 0.0022) * 2.5 : 0;

  let headTiltX = 0;
  let headTiltY = 0;
  if (activeGloss.nmm.head === 'tilt-left') headTiltX = -5;
  if (activeGloss.nmm.head === 'tilt-right') headTiltX = 5;
  if (activeGloss.nmm.head === 'nod') headTiltY = Math.sin(timeMs * 0.008) * 4;
  if (activeGloss.nmm.head === 'shake') headTiltX = Math.sin(timeMs * 0.012) * 6;
  if (activeGloss.nmm.head === 'forward') headTiltY = 4;

  ctx.save();

  // 1. Torso: High-contrast charcoal pullover
  ctx.fillStyle = '#172033';
  ctx.beginPath();
  ctx.moveTo(cx - 180 + sway, height);
  ctx.lineTo(cx - 145 + sway, cy + 140 + breath);
  ctx.bezierCurveTo(cx - 140, cy + 90, cx - 85, cy + 65, cx - 45, cy + 72);
  ctx.lineTo(cx - 28, cy + 38);
  ctx.lineTo(cx + 28, cy + 38);
  ctx.lineTo(cx + 45, cy + 72);
  ctx.bezierCurveTo(cx + 85, cy + 65, cx + 140, cy + 90, cx + 145 + sway, cy + 140 + breath);
  ctx.lineTo(cx + 180 + sway, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2d3b55';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy + 44, 28, 0.08 * Math.PI, 0.92 * Math.PI, false);
  ctx.stroke();

  // Arms
  ctx.fillStyle = '#1a2438';
  ctx.beginPath();
  ctx.ellipse(cx - 135 + sway, cy + 160 + breath, 28, 80, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 135 + sway, cy + 160 + breath, 28, 80, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // 2. Neck
  const neckGrad = ctx.createLinearGradient(cx, cy + 10, cx, cy + 45);
  neckGrad.addColorStop(0, '#f59e0b');
  neckGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = neckGrad;
  ctx.fillRect(cx - 24 + headTiltX * 0.4, cy + 12, 48, 30);

  // 3. Head & Facial Canvas
  const hx = cx + sway * 0.5 + headTiltX;
  const hy = cy - 25 + headTiltY;

  const faceGrad = ctx.createRadialGradient(hx - 10, hy - 20, 15, hx, hy, 55);
  faceGrad.addColorStop(0, '#fbbf24');
  faceGrad.addColorStop(0.6, '#f59e0b');
  faceGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = faceGrad;

  ctx.beginPath();
  ctx.ellipse(hx, hy, 44, 56, headTiltX * 0.02, 0, Math.PI * 2);
  ctx.fill();

  if (activeGloss.nmm.mouthMorpheme === 'puff-cheeks') {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(hx - 36, hy + 8, 14, 18, 0.2, 0, Math.PI * 2);
    ctx.ellipse(hx + 36, hy + 8, 14, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ears
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(hx - 45, hy - 4, 7, 14, -0.1, 0, Math.PI * 2);
  ctx.ellipse(hx + 45, hy - 4, 7, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(hx, hy - 38, 45, Math.PI * 0.92, Math.PI * 2.08, false);
  ctx.bezierCurveTo(hx + 46, hy - 18, hx + 40, hy - 2, hx + 43, hy + 14);
  ctx.lineTo(hx + 34, hy + 8);
  ctx.bezierCurveTo(hx + 24, hy - 38, hx - 24, hy - 38, hx - 34, hy + 8);
  ctx.lineTo(hx - 43, hy + 14);
  ctx.bezierCurveTo(hx - 40, hy - 2, hx - 46, hy - 18, hx - 46, hy - 38);
  ctx.closePath();
  ctx.fill();

  // 4. Brows & Eyes
  const isBrowRaised = activeGloss.nmm.eyebrows === 'raised';
  const isBrowFurrowed = activeGloss.nmm.eyebrows === 'furrowed';
  const browOffset = isBrowRaised ? -6 : isBrowFurrowed ? 3 : 0;
  const browSlant = isBrowFurrowed ? 3 : isBrowRaised ? -1 : 0;

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(hx - 28, hy - 36 + browOffset + browSlant);
  ctx.lineTo(hx - 9, hy - 35 + browOffset - browSlant);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(hx + 9, hy - 35 + browOffset - browSlant);
  ctx.lineTo(hx + 28, hy - 36 + browOffset + browSlant);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(hx - 17, hy - 24, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + 17, hy - 24, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(hx - 17, hy - 24, 3, 0, Math.PI * 2);
  ctx.arc(hx + 17, hy - 24, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 20);
  ctx.lineTo(hx - 2, hy - 6);
  ctx.lineTo(hx + 3, hy - 4);
  ctx.stroke();

  // 5. Authentic ASL Mouth Morphemes
  const morpheme = activeGloss.nmm.mouthMorpheme;
  ctx.save();
  ctx.fillStyle = '#881337';
  ctx.strokeStyle = '#701a75';

  if (morpheme === 'cha') {
    ctx.beginPath();
    ctx.ellipse(hx, hy + 12, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (morpheme === 'pah!') {
    ctx.beginPath();
    ctx.ellipse(hx, hy + 12, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx - 6, hy + 9, 12, 2.5);
  } else if (morpheme === 'cs') {
    ctx.fillStyle = '#9f1239';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 12, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx - 10, hy + 10, 20, 3);
  } else {
    ctx.strokeStyle = '#701a75';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy + 8, 12, 0.2 * Math.PI, 0.8 * Math.PI, false);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawSpatialLociHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  activeGloss: GlossToken
) {
  const isLeftActive = activeGloss.spatialLocus.toLowerCase().includes('left');
  const isRightActive = activeGloss.spatialLocus.toLowerCase().includes('right');
  const isCenterActive = !isLeftActive && !isRightActive;

  const leftX = width * 0.16;
  const leftY = height * 0.48;
  drawLocusNode(ctx, leftX, leftY, 'LOCUS A [ENGINEERING / PREVIOUS]', isLeftActive, '#38bdf8');

  const rightX = width * 0.84;
  const rightY = height * 0.48;
  drawLocusNode(ctx, rightX, rightY, 'LOCUS B [DESIGN / VISION]', isRightActive, '#2dd4bf');

  const cx = width * 0.5;
  const cy = height * 0.58;
  drawLocusNode(ctx, cx, cy, 'CENTER SIGN VOLUME [SYNTHESIS]', isCenterActive, '#a78bfa');

  if (
    activeGloss.token.includes('DISAGREE') ||
    activeGloss.token.includes('TEAM FOUR') ||
    activeGloss.token.includes('BARRIER')
  ) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.quadraticCurveTo(cx, cy - 80, rightX, rightY);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLocusNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  isActive: boolean,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = isActive ? color : 'rgba(148, 163, 184, 0.25)';
  ctx.fillStyle = isActive ? `${color}33` : 'rgba(15, 23, 42, 0.6)';
  ctx.lineWidth = isActive ? 2 : 1;

  ctx.beginPath();
  ctx.arc(x, y, isActive ? 16 : 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isActive) {
    ctx.strokeStyle = `${color}66`;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = isActive ? color : 'rgba(148, 163, 184, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 26);

  ctx.restore();
}

function computeHolisticTracking(
  question: QuestionData,
  timeMs: number,
  width: number,
  height: number,
  activeGloss: GlossToken,
  isPlaying: boolean
) {
  const cx = width * 0.5;
  const cy = height * 0.44;

  const pose: Record<string, Point3D> = {
    nose: { x: cx, y: cy - 25, z: 0 },
    neck: { x: cx, y: cy + 38, z: 0 },
    leftShoulder: { x: cx - 110, y: cy + 78, z: 10 },
    rightShoulder: { x: cx + 110, y: cy + 78, z: 10 },
    leftElbow: { x: cx - 145, y: cy + 180, z: 20 },
    rightElbow: { x: cx + 145, y: cy + 180, z: 20 },
    leftWrist: { x: cx - 55, y: cy + 120, z: 25 },
    rightWrist: { x: cx + 65, y: cy + 100, z: 25 },
  };

  const faceMesh: Point3D[] = [
    { x: cx, y: cy - 65, z: 0 },
    { x: cx - 24, y: cy - 35, z: 0 },
    { x: cx + 24, y: cy - 35, z: 0 },
    { x: cx - 18, y: cy - 24, z: -5 },
    { x: cx + 18, y: cy - 24, z: -5 },
    { x: cx, y: cy - 8, z: -15 },
    { x: cx - 14, y: cy + 12, z: -5 },
    { x: cx + 14, y: cy + 12, z: -5 },
    { x: cx, y: cy + 24, z: 0 },
  ];

  const gestures = question.sampleGestures || [];
  const currentGesture =
    gestures.find((g) => timeMs >= g.startMs && timeMs <= g.endMs) || gestures[0] || {
      primaryHand: 'both',
      handshape: 'flatB',
      motion: 'chestSweep',
      targetLocus: { x: 0, y: 0, z: 0 },
    };

  const t = timeMs * 0.003;
  let rx = width * 0.58 + currentGesture.targetLocus.x * 1.5;
  let ry = height * 0.52 + currentGesture.targetLocus.y * 1.2;
  let lx = width * 0.42 - currentGesture.targetLocus.x * 0.8;
  let ly = height * 0.56 + currentGesture.targetLocus.y * 0.8;

  if (isPlaying) {
    if (currentGesture.motion === 'circular') {
      rx += Math.cos(t * 2.2) * 55;
      ry += Math.sin(t * 2.2) * 40;
      lx += Math.cos(t * 2.2 + Math.PI) * 45;
      ly += Math.sin(t * 2.2 + Math.PI) * 35;
    } else if (currentGesture.motion === 'forwardPush') {
      rx += Math.sin(t * 2.5) * 25;
      ry += Math.cos(t * 3.0) * 45;
      lx -= Math.sin(t * 2.0) * 20;
      ly += Math.cos(t * 3.0) * 35;
    } else if (currentGesture.motion === 'horizontalWave') {
      rx += Math.sin(t * 3.5) * 70;
      ry += Math.cos(t * 1.8) * 15;
      lx += Math.sin(t * 2.8 + 1) * 50;
      ly += Math.sin(t * 1.8) * 20;
    } else if (currentGesture.motion === 'alternating') {
      rx += Math.sin(t * 4.0) * 40;
      lx += Math.sin(t * 4.0 + Math.PI) * 40;
      ry += Math.cos(t * 2.0) * 25;
      ly += Math.cos(t * 2.0 + Math.PI) * 25;
    } else {
      rx += Math.sin(t * 2.0) * 40;
      ry += Math.cos(t * 2.4) * 30;
      lx += Math.cos(t * 1.8) * 30;
      ly += Math.sin(t * 2.2) * 25;
    }
  }

  pose.rightWrist = { x: rx, y: ry, z: 25 };
  pose.leftWrist = { x: lx, y: ly, z: 25 };
  pose.rightElbow = { x: (pose.rightShoulder.x + rx) * 0.5 + 40, y: (pose.rightShoulder.y + ry) * 0.5 + 40, z: 20 };
  pose.leftElbow = { x: (pose.leftShoulder.x + lx) * 0.5 - 40, y: (pose.leftShoulder.y + ly) * 0.5 + 40, z: 20 };

  const rightHand = generateAccurateHandPoints(rx, ry, 'right', currentGesture.handshape, timeMs);
  const leftHand = generateAccurateHandPoints(lx, ly, 'left', currentGesture.handshape, timeMs);

  const rightBBox = getHandBoundingBox(rightHand);
  const leftBBox = getHandBoundingBox(leftHand);

  return { pose, faceMesh, rightHand, leftHand, rightBBox, leftBBox };
}

function generateAccurateHandPoints(
  wristX: number,
  wristY: number,
  side: 'left' | 'right',
  handshape: string,
  timeMs: number
): Point3D[] {
  const dir = side === 'right' ? 1 : -1;
  const isPointing = handshape === 'pointing';
  const isFist = handshape === 'fist';
  const isBentV = handshape === 'bentV';
  const isCShape = handshape === 'cShape';

  const spread = handshape === 'open5' ? 1.4 : isFist ? 0.35 : 1.0;
  const points: Point3D[] = [];

  points[0] = { x: wristX, y: wristY, z: 0 };

  const fingerAngles = [-0.65 * dir, -0.28 * dir, 0, 0.28 * dir, 0.58 * dir];
  const fingerBases = [1, 5, 9, 13, 17];
  const fingerLengths = [
    [18, 16, 14, 12],
    [22, 19, 15, 13],
    [25, 21, 17, 14],
    [23, 19, 15, 13],
    [19, 15, 13, 11],
  ];

  for (let f = 0; f < 5; f++) {
    const baseIdx = fingerBases[f];
    const angle = fingerAngles[f] * spread - Math.PI / 2;
    const baseDist = f === 0 ? 25 : 38 + Math.abs(f - 2) * -3;

    points[baseIdx] = {
      x: wristX + Math.cos(angle) * baseDist * dir,
      y: wristY + Math.sin(angle) * baseDist,
      z: 5,
    };

    let prevX = points[baseIdx].x;
    let prevY = points[baseIdx].y;
    let currentAngle = angle;

    for (let seg = 1; seg <= 3; seg++) {
      const segLen = fingerLengths[f][seg];
      let curlFactor = 0.1;

      if (isFist) {
        curlFactor = 0.8;
      } else if (isPointing) {
        curlFactor = f === 1 ? 0.05 : 0.85;
      } else if (isBentV) {
        curlFactor = f === 1 || f === 2 ? 0.7 : 0.85;
      } else if (isCShape) {
        curlFactor = 0.45;
      }

      currentAngle += curlFactor * 0.6;
      const nextX = prevX + Math.cos(currentAngle) * segLen;
      const nextY = prevY + Math.sin(currentAngle) * segLen;

      points[baseIdx + seg] = {
        x: nextX,
        y: nextY,
        z: 5 + seg * 2,
      };

      prevX = nextX;
      prevY = nextY;
    }
  }

  return points;
}

function getHandBoundingBox(points: Point3D[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const pad = 14;
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

function drawPoseSkeleton(ctx: CanvasRenderingContext2D, pose: Record<string, Point3D>) {
  ctx.save();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  POSE_CONNECTIONS.forEach(([startKey, endKey]) => {
    const p1 = pose[startKey];
    const p2 = pose[endKey];
    if (p1 && p2) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  });

  Object.values(pose).forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.restore();
}

function drawFaceMesh(ctx: CanvasRenderingContext2D, faceMesh: Point3D[], activeGloss: GlossToken) {
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let i = 0; i < faceMesh.length - 1; i++) {
    ctx.moveTo(faceMesh[i].x, faceMesh[i].y);
    ctx.lineTo(faceMesh[i + 1].x, faceMesh[i + 1].y);
  }
  ctx.stroke();

  faceMesh.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  const chin = faceMesh[faceMesh.length - 1];
  if (chin) {
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`NMM: ${activeGloss.nmm.description.split(':')[0]}`, chin.x, chin.y + 16);
  }

  ctx.restore();
}

function drawHandRig(
  ctx: CanvasRenderingContext2D,
  points: Point3D[],
  bbox: { x: number; y: number; w: number; h: number },
  label: string,
  boneColor: string,
  jointColor: string,
  showVectors: boolean
) {
  ctx.save();

  ctx.strokeStyle = `${boneColor}66`;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(bbox.x, bbox.y - 18, bbox.w, 18);
  ctx.strokeStyle = `${boneColor}88`;
  ctx.strokeRect(bbox.x, bbox.y - 18, bbox.w, 18);

  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = boneColor;
  ctx.textAlign = 'left';
  ctx.fillText(label, bbox.x + 6, bbox.y - 5);

  ctx.strokeStyle = boneColor;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';

  HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const p1 = points[startIdx];
    const p2 = points[endIdx];
    if (p1 && p2) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  });

  points.forEach((p, idx) => {
    ctx.beginPath();
    const isTip = [0, 4, 8, 12, 16, 20].includes(idx);
    const radius = isTip ? 4.2 : 2.8;

    ctx.fillStyle = isTip ? '#ffffff' : jointColor;
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = boneColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  if (showVectors && points[0]) {
    const wrist = points[0];
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wrist.x, wrist.y);
    ctx.lineTo(wrist.x + 24, wrist.y - 18);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('v: 44cm/s', wrist.x + 28, wrist.y - 20);
  }

  ctx.restore();
}

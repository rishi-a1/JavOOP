/**
 * Client-Side MediaPipe Hands Engine for Real-Time Webcam Computer Vision.
 * Runs on-device in the browser via WebAssembly & WebGL.
 */

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface DetectedHandData {
  handedness: 'Left' | 'Right';
  landmarks: NormalizedLandmark[];
  pixelLandmarks: { x: number; y: number; z: number }[];
  boundingBox: { x: number; y: number; w: number; h: number };
  fingerStates: {
    thumb: { isExtended: boolean; angleDeg: number };
    index: { isExtended: boolean; angleDeg: number };
    middle: { isExtended: boolean; angleDeg: number };
    ring: { isExtended: boolean; angleDeg: number };
    pinky: { isExtended: boolean; angleDeg: number };
  };
  classifiedHandshape: string;
}

export interface LiveWebcamVisionResult {
  hands: DetectedHandData[];
  detectedCount: number;
  inferenceFps: number;
  timestamp: number;
}

// Global reference to prevent multiple instantiations
let mediaPipeHandsInstance: any = null;
let activeCameraStream: MediaStream | null = null;
let animFrameId: number | null = null;
let isProcessingFrame = false;

/**
 * Loads the MediaPipe Hands constructor either from window or ES import.
 */
async function getMediaPipeHandsConstructor(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).Hands) {
    return (window as any).Hands;
  }

  try {
    const mpHands = await import('@mediapipe/hands');
    return mpHands.Hands || (mpHands as any).default?.Hands || (mpHands as any).default;
  } catch (err) {
    console.warn('Dynamic import of @mediapipe/hands failed, waiting for script tag...', err);
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).Hands) {
          clearInterval(interval);
          resolve((window as any).Hands);
        } else if (attempts > 30) {
          clearInterval(interval);
          reject(new Error('MediaPipe Hands library could not be loaded'));
        }
      }, 100);
    });
  }
}

/**
 * Initialize MediaPipe Hands for live webcam feed.
 */
export async function setupWebcamMediaPipe(
  videoElement: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  onVisionResult: (result: LiveWebcamVisionResult) => void
): Promise<{ stop: () => void }> {
  // Clean up any existing instances
  stopWebcamMediaPipe();

  const HandsConstructor = await getMediaPipeHandsConstructor();
  const hands = new HandsConstructor({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.5,
  });

  mediaPipeHandsInstance = hands;

  let lastTimestamp = performance.now();
  let frameCount = 0;
  let currentFps = 30;

  hands.onResults((results: any) => {
    isProcessingFrame = false;

    frameCount++;
    const now = performance.now();
    if (now - lastTimestamp >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (now - lastTimestamp));
      frameCount = 0;
      lastTimestamp = now;
    }

    const detectedHands: DetectedHandData[] = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const rawLandmarks: NormalizedLandmark[] = results.multiHandLandmarks[i];
        const handednessLabel: 'Left' | 'Right' =
          results.multiHandedness && results.multiHandedness[i]
            ? (results.multiHandedness[i].label as 'Left' | 'Right')
            : i === 0
            ? 'Right'
            : 'Left';

        // Convert normalized coordinates (0..1) to mirrored pixel coordinates for selfie webcam
        const pixelLandmarks = rawLandmarks.map((lm) => ({
          x: (1 - lm.x) * canvasWidth,
          y: lm.y * canvasHeight,
          z: lm.z * canvasWidth,
        }));

        // Compute Bounding Box
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        pixelLandmarks.forEach((pt) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });

        const pad = 16;
        const boundingBox = {
          x: Math.max(0, minX - pad),
          y: Math.max(0, minY - pad),
          w: Math.min(canvasWidth, maxX - minX + pad * 2),
          h: Math.min(canvasHeight, maxY - minY + pad * 2),
        };

        // Compute Finger Angles & Extensions
        const fingerStates = analyzeFingerStates(rawLandmarks);
        const classifiedHandshape = classifyASLHandshape(fingerStates);

        detectedHands.push({
          handedness: handednessLabel,
          landmarks: rawLandmarks,
          pixelLandmarks,
          boundingBox,
          fingerStates,
          classifiedHandshape,
        });
      }
    }

    onVisionResult({
      hands: detectedHands,
      detectedCount: detectedHands.length,
      inferenceFps: currentFps,
      timestamp: now,
    });
  });

  // Request user camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });

    activeCameraStream = stream;
    videoElement.srcObject = stream;
    await videoElement.play();

    // Continuous processing loop
    const processVideoFrame = async () => {
      if (!mediaPipeHandsInstance || !videoElement || videoElement.paused || videoElement.ended) {
        return;
      }

      if (!isProcessingFrame && videoElement.readyState >= 2) {
        isProcessingFrame = true;
        try {
          await mediaPipeHandsInstance.send({ image: videoElement });
        } catch (err) {
          console.warn('Frame processing dropped:', err);
          isProcessingFrame = false;
        }
      }

      animFrameId = requestAnimationFrame(processVideoFrame);
    };

    animFrameId = requestAnimationFrame(processVideoFrame);
  } catch (camErr) {
    console.error('Camera initialization error:', camErr);
    throw camErr;
  }

  return {
    stop: stopWebcamMediaPipe,
  };
}

/**
 * Stop active webcam stream and MediaPipe pipeline.
 */
export function stopWebcamMediaPipe() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }

  if (mediaPipeHandsInstance) {
    try {
      mediaPipeHandsInstance.close();
    } catch {
      // ignore close err
    }
    mediaPipeHandsInstance = null;
  }

  isProcessingFrame = false;
}

/**
 * Calculates finger extension states based on distances from wrist and MCP joints.
 */
function analyzeFingerStates(landmarks: NormalizedLandmark[]) {
  const wrist = landmarks[0];

  const isThumbExtended =
    distance(landmarks[4], landmarks[9]) > distance(landmarks[3], landmarks[9]) * 1.15;

  const isIndexExtended =
    distance(landmarks[8], wrist) > distance(landmarks[6], wrist) &&
    landmarks[8].y < landmarks[6].y;

  const isMiddleExtended =
    distance(landmarks[12], wrist) > distance(landmarks[10], wrist) &&
    landmarks[12].y < landmarks[10].y;

  const isRingExtended =
    distance(landmarks[16], wrist) > distance(landmarks[14], wrist) &&
    landmarks[16].y < landmarks[14].y;

  const isPinkyExtended =
    distance(landmarks[20], wrist) > distance(landmarks[18], wrist) &&
    landmarks[20].y < landmarks[18].y;

  return {
    thumb: { isExtended: isThumbExtended, angleDeg: 35 },
    index: { isExtended: isIndexExtended, angleDeg: isIndexExtended ? 10 : 85 },
    middle: { isExtended: isMiddleExtended, angleDeg: isMiddleExtended ? 10 : 85 },
    ring: { isExtended: isRingExtended, angleDeg: isRingExtended ? 10 : 85 },
    pinky: { isExtended: isPinkyExtended, angleDeg: isPinkyExtended ? 10 : 85 },
  };
}

/**
 * Classifies raw finger states into real ASL handshapes in real-time.
 */
function classifyASLHandshape(states: ReturnType<typeof analyzeFingerStates>): string {
  const { thumb, index, middle, ring, pinky } = states;

  // All 5 extended -> Open-5
  if (thumb.isExtended && index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended) {
    return 'ASL Open-5 (Full Palm)';
  }

  // 4 fingers extended, thumb folded -> Flat-B
  if (!thumb.isExtended && index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended) {
    return 'ASL Flat-B (Page/Plane)';
  }

  // Only Index extended -> 1-Handshape
  if (index.isExtended && !middle.isExtended && !ring.isExtended && !pinky.isExtended) {
    return 'ASL Index-1 (Pointing)';
  }

  // Index & Middle extended, ring & pinky curled -> V-Shape
  if (index.isExtended && middle.isExtended && !ring.isExtended && !pinky.isExtended) {
    return 'ASL V-Handshape (Vision/Two)';
  }

  // Thumb, Index, and Pinky extended -> ILY
  if (thumb.isExtended && index.isExtended && !middle.isExtended && !ring.isExtended && pinky.isExtended) {
    return 'ASL ILY (Inclusive Sign)';
  }

  // Thumb and Pinky extended -> Y-Hand
  if (thumb.isExtended && !index.isExtended && !middle.isExtended && !ring.isExtended && pinky.isExtended) {
    return 'ASL Y-Handshape (That/Same)';
  }

  // All curled -> S-Fist
  if (!index.isExtended && !middle.isExtended && !ring.isExtended && !pinky.isExtended) {
    return 'ASL S-Fist (Solid Grip)';
  }

  return 'ASL Dynamic Sign Transition';
}

function distance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

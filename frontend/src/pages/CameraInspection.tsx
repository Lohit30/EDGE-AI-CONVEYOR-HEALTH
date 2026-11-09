// =============================================================================
// Camera Inspection Page — Industrial SCADA Vision AI System
// Laptop Webcam Live AI Stream + YOLOv8n-seg Belt Defect Detection (Tears, Holes, Punctures)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VisionStatus {
  model_loaded: boolean;
  model_path: string;
  classes: Record<string, string>;
  fps: number;
  latency_ms: number;
  source_mode: string;
  camera_open: boolean;
  latest_detections: Detection[];
  defect_summary: Record<string, number>;
}

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2]
  is_emergency: boolean;
}

interface ImageDetectionResult {
  count: number;
  detections: Detection[];
  annotated_image_base64: string;
  latency_ms: number;
  has_emergency: boolean;
  defect_summary?: Record<string, number>;
}

const CLASS_PALETTE: Record<string, { color: string; bg: string; emergency?: boolean }> = {
  Tear: { color: '#dc2626', bg: '#fef2f2', emergency: true },
  Human: { color: '#eab308', bg: '#fefce8', emergency: true },
  Hole: { color: '#9333ea', bg: '#faf5ff' },
  Puncture: { color: '#ea580c', bg: '#fff7ed' },
  'impact damage': { color: '#ec4899', bg: '#fdf2f8' },
  'patch work': { color: '#0284c7', bg: '#f0f9ff' },
  'Other Objects': { color: '#d97706', bg: '#fffbeb' },
  Roller: { color: '#10b981', bg: '#f0fdf4' },
};

export const CameraInspection: React.FC = () => {
  // Mode: 'laptop_webcam' | 'simulator'
  const [feedMode, setFeedMode] = useState<'laptop_webcam' | 'simulator'>('laptop_webcam');
  const [backendStatus, setBackendStatus] = useState<VisionStatus | null>(null);

  // WebCam state
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // AI inference state
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scanIntervalMs, setScanIntervalMs] = useState<number>(250); // ~4 FPS inference
  const [confThreshold, setConfThreshold] = useState<number>(0.50);
  const [liveDetections, setLiveDetections] = useState<Detection[]>([]);
  const [lastInferenceTime, setLastInferenceTime] = useState<number>(0);
  const [scanFps, setScanFps] = useState<number>(0);
  const [defectCounts, setDefectCounts] = useState<Record<string, number>>({
    Tear: 0,
    Hole: 0,
    Puncture: 0,
    'impact damage': 0,
    'Other Objects': 0,
    Roller: 0,
    Human: 0,
    'patch work': 0,
  });

  // Upload test
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedResult, setUploadedResult] = useState<ImageDetectionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  const backendBaseUrl = `http://${host}:8000`;

  // ── 1. Fetch Backend Vision Status ──
  useEffect(() => {
    let unmounted = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${backendBaseUrl}/api/vision/status`);
        if (res.ok) {
          const data = await res.json();
          if (!unmounted) setBackendStatus(data);
        }
      } catch {
        // Backend offline / connecting
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => {
      unmounted = true;
      clearInterval(timer);
    };
  }, [backendBaseUrl]);

  // ── 2. Enumerate Video Input Devices ──
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      setCameraError('Camera API (navigator.mediaDevices) not supported in this browser.');
      return;
    }
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      })
      .catch((err) => {
        console.warn('Failed to enumerate video devices:', err);
      });
  }, [selectedDeviceId]);

  // ── 3. Start / Stop User Laptop Webcam ──
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const existing = videoRef.current.srcObject as MediaStream;
        existing.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Camera access error:', err);
      setCameraError(
        msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Camera permission denied. Please allow camera access in your browser.'
          : `Webcam error: ${msg}`
      );
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Auto-start camera when in laptop_webcam mode
  useEffect(() => {
    if (feedMode === 'laptop_webcam') {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [feedMode, selectedDeviceId, startCamera, stopCamera]);

  // ── 4. Continuous AI Defect Scanning Loop ──
  useEffect(() => {
    if (!isCameraActive || !isScanning || feedMode !== 'laptop_webcam') return;

    let unmounted = false;
    let inFlight = false;
    let frameCount = 0;
    let fpsTimer = Date.now();

    const scanInterval = setInterval(async () => {
      if (unmounted || inFlight) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      inFlight = true;

      // Draw video frame to hidden capture canvas
      const capCanvas = captureCanvasRef.current || document.createElement('canvas');
      capCanvas.width = video.videoWidth || 640;
      capCanvas.height = video.videoHeight || 480;
      const ctx = capCanvas.getContext('2d');
      if (!ctx) {
        inFlight = false;
        return;
      }
      ctx.drawImage(video, 0, 0, capCanvas.width, capCanvas.height);

      capCanvas.toBlob(async (blob) => {
        if (!blob || unmounted) {
          inFlight = false;
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'webcam_frame.jpg');

        try {
          const t0 = performance.now();
          const res = await fetch(`${backendBaseUrl}/api/vision/detect_image?conf=${confThreshold}`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok && !unmounted) {
            const data: ImageDetectionResult = await res.json();
            const latency = Math.round(performance.now() - t0);
            setLastInferenceTime(latency);
            setLiveDetections(data.detections || []);

            // Update defect counters
            if (data.detections && data.detections.length > 0) {
              setDefectCounts((prev) => {
                const next = { ...prev };
                for (const d of data.detections) {
                  next[d.class_name] = (next[d.class_name] || 0) + 1;
                }
                return next;
              });
            }

            // Draw bounding boxes on the overlay canvas
            drawOverlay(video, data.detections || []);
          }
        } catch {
          // Backend call failed or offline
        } finally {
          frameCount++;
          const now = Date.now();
          if (now - fpsTimer >= 1000) {
            setScanFps(frameCount);
            frameCount = 0;
            fpsTimer = now;
          }
          inFlight = false;
        }
      }, 'image/jpeg', 0.85);
    }, scanIntervalMs);

    return () => {
      unmounted = true;
      clearInterval(scanInterval);
    };
  }, [isCameraActive, isScanning, feedMode, confThreshold, scanIntervalMs, backendBaseUrl]);

  // ── 5. Render Bounding Boxes & HUD on Overlay Canvas ──
  const drawOverlay = (video: HTMLVideoElement, detections: Detection[]) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const displayW = video.clientWidth;
    const displayH = video.clientHeight;
    if (displayW === 0 || displayH === 0) return;

    canvas.width = displayW;
    canvas.height = displayH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = displayW / (video.videoWidth || 640);
    const scaleY = displayH / (video.videoHeight || 480);

    for (const det of detections) {
      const [x1, y1, x2, y2] = det.bbox;
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      const palette = CLASS_PALETTE[det.class_name] || { color: '#00e5ff', bg: '#002830' };

      // Bounding box border
      ctx.lineWidth = det.is_emergency ? 4 : 3;
      ctx.strokeStyle = palette.color;
      ctx.fillStyle = `${palette.color}22`; // semi-transparent tint
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);

      // Label Tag
      const labelText = `${det.class_name.toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 12px monospace';
      const textMetrics = ctx.measureText(labelText);
      const tagW = textMetrics.width + 10;
      const tagH = 20;

      ctx.fillStyle = palette.color;
      ctx.fillRect(bx, Math.max(0, by - tagH), tagW, tagH);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, bx + 5, Math.max(14, by - 5));

      // Flashing crosshair for emergency defects
      if (det.is_emergency) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2 - 10, by + bh / 2);
        ctx.lineTo(bx + bw / 2 + 10, by + bh / 2);
        ctx.moveTo(bx + bw / 2, by + bh / 2 - 10);
        ctx.lineTo(bx + bw / 2, by + bh / 2 + 10);
        ctx.stroke();
      }
    }
  };

  // ── 6. Snapshot & Save Detected Image ──
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = video.videoWidth || 640;
    snapCanvas.height = video.videoHeight || 480;
    const ctx = snapCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);

    // Draw detections
    for (const det of liveDetections) {
      const [x1, y1, x2, y2] = det.bbox;
      const palette = CLASS_PALETTE[det.class_name] || { color: '#00e5ff' };
      ctx.lineWidth = 3;
      ctx.strokeStyle = palette.color;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = palette.color;
      ctx.fillRect(x1, Math.max(0, y1 - 22), 160, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${det.class_name} ${(det.confidence * 100).toFixed(0)}%`, x1 + 5, Math.max(16, y1 - 6));
    }

    const a = document.createElement('a');
    a.href = snapCanvas.toDataURL('image/jpeg', 0.95);
    a.download = `conveyor_defect_scan_${Date.now()}.jpg`;
    a.click();
  };

  // ── 7. Handle Image File Upload Test ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${backendBaseUrl}/api/vision/detect_image?conf=${confThreshold}`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data: ImageDetectionResult = await res.json();
        setUploadedResult(data);
        if (data.detections && data.detections.length > 0) {
          setDefectCounts((prev) => {
            const next = { ...prev };
            for (const d of data.detections) {
              next[d.class_name] = (next[d.class_name] || 0) + 1;
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Failed to process uploaded image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const hasEmergency = liveDetections.some((d) => d.is_emergency);
  const activeDefects = liveDetections.filter((d) => d.class_name !== 'Roller');

  return (
    <div className="flex flex-col gap-space-md w-full">
      {/* ── TOP HEADER BAR ── */}
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-md">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">WEBCAM BELT INSPECTION SYSTEM</span>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed font-bold rounded">
            YOLOv8n-seg
          </span>
          <span className="font-label-sm text-label-sm text-secondary">
            OPTICAL TEAR & HOLE DEFECT DETECTION • LIVE LAPTOP WEBCAM SCANNER
          </span>
        </div>

        {/* Live Metrics Chips */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-label-sm text-label-sm font-bold ${
              hasEmergency
                ? 'bg-[#dc2626] text-white animate-pulse'
                : activeDefects.length > 0
                  ? 'bg-[#f59e0b] text-slate-900 animate-pulse'
                  : isCameraActive
                    ? 'bg-[#10b981]/20 text-[#047857]'
                    : 'bg-surface-container text-secondary'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-current animate-ping' : 'bg-slate-400'}`} />
            {hasEmergency
              ? '🚨 EMERGENCY TEAR DETECTED'
              : activeDefects.length > 0
                ? `⚠️ ${activeDefects[0].class_name.toUpperCase()} DETECTED`
                : isCameraActive
                  ? 'SCANNING NOMINAL'
                  : 'CAMERA OFFLINE'}
          </div>

          <div className="bg-surface-container-low px-3 py-1.5 rounded text-center">
            <span className="font-label-sm text-label-sm text-secondary uppercase">SCAN FPS:</span>
            <span className="font-label-md text-label-md font-bold text-on-surface ml-1">
              {isCameraActive ? `${scanFps}` : '0'}
            </span>
          </div>

          <div className="bg-surface-container-low px-3 py-1.5 rounded text-center">
            <span className="font-label-sm text-label-sm text-secondary uppercase">LATENCY:</span>
            <span className="font-label-md text-label-md font-bold text-on-surface ml-1">
              {lastInferenceTime ? `${lastInferenceTime}ms` : '—'}
            </span>
          </div>

          <div className="bg-surface-container-low px-3 py-1.5 rounded text-center">
            <span className="font-label-sm text-label-sm text-secondary uppercase">YOLO MODEL:</span>
            <span className={`font-label-md text-label-md font-bold ml-1 ${backendStatus?.model_loaded ? 'text-[#10b981]' : 'text-amber-500'}`}>
              {backendStatus?.model_loaded ? 'LOADED' : 'INITIALIZING'}
            </span>
          </div>
        </div>
      </header>

      {/* ── EMERGENCY DEFECT ALERT BANNER ── */}
      {hasEmergency && (
        <div className="bg-[#dc2626] text-white p-4 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 animate-pulse border-2 border-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[36px]">warning</span>
            <div>
              <div className="font-headline-sm text-headline-sm font-bold tracking-wide">
                CRITICAL CONVEYOR BELT TEAR / SAFETY HAZARD DETECTED!
              </div>
              <div className="text-sm opacity-95">
                Vision AI identified longitudinal tear / safety breach on webcam feed with high confidence. SMS escalation active.
              </div>
            </div>
          </div>
          <button
            onClick={takeSnapshot}
            className="bg-white text-[#dc2626] hover:bg-slate-100 px-4 py-2 rounded font-bold text-xs uppercase shrink-0 shadow flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            Save Evidence Snapshot
          </button>
        </div>
      )}

      {/* ── MAIN GRID: LIVE WEBCAM (8 COLS) + SIDEBAR CONTROLS & DEFECT COUNTS (4 COLS) ── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* Left Column: Live Webcam Viewport */}
        <div className="xl:col-span-8 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm border border-outline-variant">
          {/* Viewport Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-space-xs border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">videocam</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {feedMode === 'laptop_webcam' ? 'LAPTOP WEBCAM FEED (LIVE DETECTION)' : 'SYNTHETIC CONVEYOR SIMULATOR'}
              </span>
            </div>

            {/* Controls: Confidence Slider & Source Mode Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Real-time Confidence Filter Slider */}
              <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded border border-outline-variant">
                <span className="font-label-sm text-label-sm text-secondary font-bold">CONF:</span>
                <input
                  type="range"
                  min="0.25"
                  max="0.85"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-16 h-1.5 accent-primary cursor-pointer"
                  title={`Filter detections below ${(confThreshold * 100).toFixed(0)}% confidence`}
                />
                <span className="font-mono text-xs font-bold text-on-surface w-7 text-right">
                  {(confThreshold * 100).toFixed(0)}%
                </span>
              </div>

              {/* Source Mode Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFeedMode('laptop_webcam')}
                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                    feedMode === 'laptop_webcam'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">laptop</span>
                  Laptop Webcam
                </button>

                <button
                  onClick={() => setFeedMode('simulator')}
                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                    feedMode === 'simulator'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                  Conveyor Simulator
                </button>
              </div>
            </div>
          </div>

          {/* Video Feed Screen */}
          <div className="w-full aspect-[4/3] bg-[#090e17] rounded-lg relative overflow-hidden flex items-center justify-center border border-outline-variant shadow-inner">
            {feedMode === 'laptop_webcam' ? (
              <>
                {/* Real Live Laptop Webcam Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover select-none ${isCameraActive ? 'block' : 'hidden'}`}
                />

                {/* AI Overlay Canvas for Bounding Boxes & Tags */}
                <canvas
                  ref={overlayCanvasRef}
                  className={`absolute top-0 left-0 w-full h-full pointer-events-none ${isCameraActive ? 'block' : 'hidden'}`}
                />

                {/* Hidden Capture Canvas */}
                <canvas ref={captureCanvasRef} className="hidden" />

                {/* Reticle / Live HUD Overlay */}
                {isCameraActive && (
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    LIVE WEBCAM // CV-OPTICAL-01
                  </div>
                )}

                {/* Camera Inactive / Error Fallback Screen */}
                {!isCameraActive && (
                  <div className="text-center p-6 max-w-md">
                    <span className="material-symbols-outlined text-[64px] text-slate-500 mb-3 block">
                      videocam_off
                    </span>
                    <div className="font-headline-sm text-headline-sm text-white mb-2">
                      {cameraError ? 'CAMERA ACCESS NEEDED' : 'WEBCAM PAUSED'}
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      {cameraError ||
                        'Your laptop webcam feed will be scanned in real-time by the YOLOv8n-seg model for conveyor tears, holes, and punctures.'}
                    </p>
                    <button
                      onClick={() => startCamera(selectedDeviceId)}
                      className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 shadow flex items-center gap-2 mx-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      Start Laptop Webcam
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Synthetic Conveyor Stream Mode */
              <img
                src={`${backendBaseUrl}/api/vision/stream?conf=${confThreshold}`}
                alt="Conveyor Belt Simulator Stream"
                className="w-full h-full object-contain select-none"
              />
            )}
          </div>

          {/* Quick Action Bar under camera */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-space-xs">
            <div className="flex items-center gap-2">
              {feedMode === 'laptop_webcam' && (
                <>
                  <button
                    onClick={() => {
                      if (isCameraActive) stopCamera();
                      else startCamera(selectedDeviceId);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isCameraActive
                        ? 'bg-red-600/20 text-red-500 hover:bg-red-600/30'
                        : 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isCameraActive ? 'stop' : 'play_arrow'}
                    </span>
                    {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                  </button>

                  <button
                    onClick={() => setIsScanning((prev) => !prev)}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isScanning
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-amber-600/20 text-amber-500 hover:bg-amber-600/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isScanning ? 'pause' : 'radar'}
                    </span>
                    {isScanning ? 'AI Scan: Active' : 'AI Scan: Paused'}
                  </button>
                </>
              )}

              <button
                onClick={takeSnapshot}
                disabled={!isCameraActive && feedMode === 'laptop_webcam'}
                className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                Capture Snapshot
              </button>
            </div>

            {/* Camera Device Dropdown (if multiple webcams attached) */}
            {availableDevices.length > 1 && feedMode === 'laptop_webcam' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary font-mono">DEVICE:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(e.target.value);
                  }}
                  className="bg-surface-container text-xs p-1.5 rounded border border-outline-variant font-mono"
                >
                  {availableDevices.map((dev, i) => (
                    <option key={dev.deviceId || i} value={dev.deviceId}>
                      {dev.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Controls, Detection Results, Defect Summary */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* AI Settings & Scan Frequency */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
              <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">AI DETECTION SETTINGS</span>
            </div>

            {/* Confidence Threshold Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary font-semibold">Confidence Threshold:</span>
                <span className="font-mono font-bold text-primary">{(confThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-secondary font-mono">
                <span>15% (Sensitive)</span>
                <span>85% (Strict)</span>
              </div>
            </div>

            {/* Scan Speed Selector */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-xs text-secondary font-semibold">Scan Frequency:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Fast (150ms)', val: 150 },
                  { label: 'Normal (250ms)', val: 250 },
                  { label: 'Eco (500ms)', val: 500 },
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setScanIntervalMs(s.val)}
                    className={`py-1 text-[11px] font-bold rounded transition-all ${
                      scanIntervalMs === s.val
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Live Detections Box */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">view_in_ar</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">CURRENT FRAME DETECTIONS</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-container text-secondary">
                {liveDetections.length} OBJECT{liveDetections.length !== 1 ? 'S' : ''}
              </span>
            </div>

            {liveDetections.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {liveDetections.map((det, idx) => {
                  const palette = CLASS_PALETTE[det.class_name] || { color: '#00e5ff', bg: '#002830' };
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded text-xs border"
                      style={{
                        borderColor: `${palette.color}40`,
                        backgroundColor: `${palette.color}10`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: palette.color }}
                        />
                        <span className="font-bold text-on-surface font-mono">
                          {det.class_name.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold" style={{ color: palette.color }}>
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                        {det.is_emergency && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white font-bold text-[9px] rounded uppercase animate-pulse">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-secondary font-mono">
                No surface defects or foreign objects detected in current frame. Belt scan nominal.
              </div>
            )}
          </div>

          {/* Cumulative Defect Classification Summary */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">assessment</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">DEFECT SUMMARY (YOLOv8n-seg)</span>
              </div>
              <button
                onClick={() =>
                  setDefectCounts({
                    Tear: 0,
                    Hole: 0,
                    Puncture: 0,
                    'impact damage': 0,
                    'Other Objects': 0,
                    Roller: 0,
                    Human: 0,
                    'patch work': 0,
                  })
                }
                className="text-[10px] text-secondary hover:text-primary font-mono underline"
              >
                Reset Counters
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(CLASS_PALETTE).map(([name, styling]) => {
                const count = defectCounts[name] || 0;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: styling.color }} />
                      <span className="text-on-surface text-[11px] font-medium truncate">{name}</span>
                    </div>
                    <span className="font-mono font-bold text-[12px]" style={{ color: count > 0 ? styling.color : '#64748b' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline / Static Image Test Uploader */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant flex flex-col gap-2">
            <div className="flex items-center gap-2 pb-1 border-b border-outline-variant">
              <span className="material-symbols-outlined text-[18px] text-primary">file_upload</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">TEST DEFECT IMAGE FILE</span>
            </div>
            <p className="text-[11px] text-secondary">
              Upload any sample conveyor defect photo (tear, hole, puncture) to run single-image verification.
            </p>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-xs font-bold flex items-center justify-center gap-2 border border-outline-variant transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              {isUploading ? 'Analyzing Image...' : 'Choose Conveyor Image File'}
            </button>

            {uploadedResult && (
              <div className="mt-2 p-2 bg-surface-container-low rounded border border-outline-variant flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Detections Found: {uploadedResult.count}</span>
                  <span className="font-mono text-secondary">{uploadedResult.latency_ms}ms</span>
                </div>
                {uploadedResult.annotated_image_base64 && (
                  <img
                    src={uploadedResult.annotated_image_base64}
                    alt="Annotated Defect Result"
                    className="w-full rounded border border-outline-variant"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CameraInspection;

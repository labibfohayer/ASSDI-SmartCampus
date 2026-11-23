'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Keyboard,
  FlipHorizontal,
  Sparkles,
  ShieldCheck,
  WifiOff,
  CloudUpload,
} from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  addScanToOfflineQueue,
  getOfflineQueue,
  syncOfflineAttendanceQueue,
} from '@/lib/offlineAttendance';

interface WebQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WebQRScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: WebQRScannerModalProps) {
  const { isBangla } = useLanguage();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'late' | 'already' | 'error' | 'offline_queued';
    message: string;
  } | null>(null);

  // Offline-first sync states
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [syncingQueue, setSyncingQueue] = useState<boolean>(false);

  useEffect(() => {
    const checkOnline = () => {
      setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    };
    const updateQueueCount = () => {
      setPendingOfflineCount(getOfflineQueue().length);
    };

    checkOnline();
    updateQueueCount();

    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    window.addEventListener('assdi_offline_queue_updated', updateQueueCount);

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
      window.removeEventListener('assdi_offline_queue_updated', updateQueueCount);
    };
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Submit scanned or manual token to backend API
  const handleTokenSubmission = useCallback(
    async (rawToken: string) => {
      if (submitting) return;

      let token = rawToken.trim();
      // Parse JSON if student scanned structured token JSON
      try {
        const parsed = JSON.parse(token);
        if (parsed.token || parsed.qr_token) {
          token = parsed.token || parsed.qr_token;
        }
      } catch {
        // Plain string token
      }

      if (!token) {
        setScanResult({
          status: 'error',
          message: isBangla
            ? 'টোকেন ফাঁকা রাখা যাবে না।'
            : 'Token cannot be empty.',
        });
        return;
      }

      setSubmitting(true);
      setScanResult(null);

      // Stop camera while processing
      stopCamera();

      // Check if device is offline before calling backend
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        addScanToOfflineQueue(token);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([150, 50, 150]);
        }
        setScanResult({
          status: 'offline_queued',
          message: isBangla
            ? 'ইন্টারনেট ড্রপ করায় কিউআর কোডটি অফলাইনে সুরক্ষিতভাবে জমা রাখা হয়েছে। ইন্টারনেট পাওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক হয়ে যাবে।'
            : 'Classroom network is offline. QR attendance has been saved locally and will auto-sync once connection returns.',
        });
        setSubmitting(false);
        return;
      }

      try {
        const response = await api.post('/api/v1/attendance/qr-scan/', {
          qr_token: token,
        });

        const statusVal = response.data?.status || 'present';
        const isLate = statusVal === 'late';

        // Trigger phone/device vibration feedback if supported
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        setScanResult({
          status: isLate ? 'late' : 'success',
          message: isLate
            ? isBangla
              ? 'দেরিতে উপস্থিতি (Late) রেকর্ড হয়েছে।'
              : 'Attendance marked as Late.'
            : isBangla
              ? 'আলহামদুলিল্লাহ! আপনার উপস্থিতি সফলভাবে গ্রহণ করা হয়েছে।'
              : 'Attendance recorded successfully!',
        });

        onSuccess();
      } catch (err: any) {
        const isNetworkError =
          !err.response ||
          err.code === 'ERR_NETWORK' ||
          err.message?.includes('Network Error') ||
          (typeof navigator !== 'undefined' && !navigator.onLine);

        if (isNetworkError) {
          addScanToOfflineQueue(token);
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([150, 50, 150]);
          }
          setScanResult({
            status: 'offline_queued',
            message: isBangla
              ? 'ইন্টারনেট ড্রপ করায় কিউআর কোডটি অফলাইনে সুরক্ষিতভাবে জমা রাখা হয়েছে। ইন্টারনেট পাওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক হয়ে যাবে।'
              : 'Classroom network is offline. QR attendance has been saved locally and will auto-sync once connection returns.',
          });
          return;
        }

        const errorData = err.response?.data;
        const statusCode = err.response?.status;

        if (statusCode === 409 || errorData?.code === 'ALREADY_MARKED') {
          setScanResult({
            status: 'already',
            message: isBangla
              ? 'এই ক্লাসের উপস্থিতি ইতোমধ্যে রেকর্ড করা হয়েছে।'
              : 'Attendance already recorded for this session.',
          });
        } else {
          const detail =
            errorData?.detail ||
            errorData?.qr_token ||
            errorData?.session ||
            (isBangla
              ? 'কিউআর কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে।'
              : 'Invalid or expired QR code.');
          setScanResult({
            status: 'error',
            message: typeof detail === 'string' ? detail : JSON.stringify(detail),
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, isBangla, stopCamera, onSuccess]
  );

  // Manual Trigger to Synchronize Offline Queue
  const handleSyncQueue = async () => {
    setSyncingQueue(true);
    try {
      const res = await syncOfflineAttendanceQueue(() => {
        onSuccess();
      });
      if (res.syncedCount > 0) {
        setScanResult({
          status: 'success',
          message: isBangla
            ? `আলহামদুলিল্লাহ! ${res.syncedCount}টি অফলাইন উপস্থিতি সার্ভারে সফলভাবে সিঙ্ক হয়েছে।`
            : `Success! ${res.syncedCount} offline attendance scan(s) synced to server.`,
        });
        onSuccess();
      } else if (res.errors.length > 0) {
        setScanResult({
          status: 'error',
          message: res.errors[0],
        });
      }
    } finally {
      setSyncingQueue(false);
    }
  };

  // Scan frame loop using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleTokenSubmission(code.data);
        return; // Halt scan loop
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  }, [handleTokenSubmission]);

  // Start camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setScanResult(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        isBangla
          ? 'আপনার ব্রাউজারে ক্যামেরা সাপোর্ট নেই। দয়া করে ক্রোম বা এজ ব্রাউজার ব্যবহার করুন।'
          : 'Camera access is not supported by this browser.'
      );
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err?.name || err?.message);
      let msg = isBangla
        ? 'ক্যামেরা চালু করা সম্ভব হয়নি। ব্রাউজার পারমিশন নিশ্চিত করুন অথবা নিচে ম্যানুয়াল টোকেন কোড প্রবেশ করান।'
        : 'Could not access camera. Please allow camera permissions or enter the code manually below.';
      if (err.name === 'NotAllowedError') {
        msg = isBangla
          ? 'ক্যামেরা ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে ক্যামেরার এক্সেস অনুমতি দিন।'
          : 'Camera permission denied. Please allow camera access in browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = isBangla
          ? 'কোনো ক্যামেরা ডিভাইস পাওয়া যায়নি। আপনি নিচের ট্যাবে টোকেন কোড দিয়ে উপস্থিতি নিশ্চিত করতে পারেন।'
          : 'No camera found. You can enter the token code in the manual tab below.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [stopCamera, isBangla, facingMode, scanFrame]);

  // Lifecycle control
  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setManualToken('');
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Flip camera (back / front)
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl border-t-4 border-t-[#C1982E] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-[#B45309] flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5 text-[#B45309]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#92400E] text-base sm:text-lg flex items-center gap-2">
                {isBangla ? 'উপস্থিতি কিউআর স্ক্যানার' : 'Attendance QR Scanner'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                  Live
                </span>
                {isOffline && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-[#92400E] border border-amber-300 flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-[#B45309]" />
                    <span>{isBangla ? 'অফলাইন মোড' : 'Offline'}</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isBangla
                  ? 'প্রজেক্টরের কিউআর কোডের দিকে ক্যামেরা তাক করুন'
                  : 'Point camera at classroom projector screen'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title={isBangla ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5 mx-6 mt-4 rounded-xl">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isBangla ? 'ব্রাউজার ক্যামেরা' : 'Camera Scanner'}</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('manual');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{isBangla ? 'ম্যানুয়াল টোকেন কোড' : 'Enter Token Code'}</span>
          </button>
        </div>

        {/* Offline Queue Sync Bar */}
        {pendingOfflineCount > 0 && (
          <div className="mx-6 mt-3 p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-[#B45309] shrink-0" />
              <span>
                {isBangla
                  ? `${pendingOfflineCount}টি অফলাইন স্ক্যান সিঙ্কের অপেক্ষায় রয়েছে`
                  : `${pendingOfflineCount} offline scan(s) awaiting sync`}
              </span>
            </div>
            {!isOffline && (
              <button
                type="button"
                onClick={handleSyncQueue}
                disabled={syncingQueue}
                className="px-3 py-1 bg-[#B45309] hover:bg-[#92400E] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${syncingQueue ? 'animate-spin' : ''}`} />
                <span>{isBangla ? 'সিঙ্ক করুন' : 'Sync'}</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Result Alert Message */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 animate-in zoom-in-95 duration-200 ${
                scanResult.status === 'success' || scanResult.status === 'late'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : scanResult.status === 'already'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : scanResult.status === 'offline_queued'
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {scanResult.status === 'success' || scanResult.status === 'late' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : scanResult.status === 'already' ? (
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : scanResult.status === 'offline_queued' ? (
                <WifiOff className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs sm:text-sm font-semibold flex-1">
                <p>{scanResult.message}</p>
                {scanResult.status === 'offline_queued' && (
                  <p className="text-xs font-normal text-amber-800 mt-1">
                    {isBangla
                      ? 'ইন্টারনেট ড্রপ বা ক্লাসরুমের নেটওয়ার্ক বন্ধ থাকলেও আপনার উপস্থিতি সংরক্ষিত থাকবে। ইন্টারনেট সংযোগ পেলেই স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক হবে।'
                      : 'Your attendance is safely saved offline. It will auto-sync to the server as soon as internet connection is restored.'}
                  </p>
                )}
                {(scanResult.status === 'success' || scanResult.status === 'late') && (
                  <p className="text-xs font-normal text-emerald-700 mt-1">
                    {isBangla
                      ? 'ড্যাশবোর্ডে উপস্থিতি হার আপডেট হয়ে গেছে।'
                      : 'Dashboard attendance metrics updated.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: Live Video Camera Viewfinder */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative w-full aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                {/* Live Video */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Off-screen canvas for frame analysis */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Viewfinder Overlay & Laser line */}
                {cameraActive && !submitting && !scanResult && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Darkened vignette surround */}
                    <div className="absolute inset-0 bg-black/35" />

                    {/* Viewfinder Target Box */}
                    <div className="relative w-56 h-56 rounded-2xl border-2 border-[#C1982E]/90 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] z-10 flex items-center justify-center overflow-hidden">
                      {/* Corner Target Markers */}
                      <span className="absolute top-2 left-2 w-4 h-4 border-t-3 border-l-3 border-[#C1982E]" />
                      <span className="absolute top-2 right-2 w-4 h-4 border-t-3 border-r-3 border-[#C1982E]" />
                      <span className="absolute bottom-2 left-2 w-4 h-4 border-b-3 border-l-3 border-[#C1982E]" />
                      <span className="absolute bottom-2 right-2 w-4 h-4 border-b-3 border-r-3 border-[#C1982E]" />

                      {/* Animated Laser Scanning Beam */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C1982E] to-transparent shadow-[0_0_8px_#C1982E] animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Submitting / Decoding Loader */}
                {submitting && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 gap-3">
                    <RefreshCw className="w-8 h-8 text-[#C1982E] animate-spin" />
                    <p className="text-xs sm:text-sm font-bold text-slate-200">
                      {isBangla ? 'উপস্থিতি যাচাই ও রেকর্ড করা হচ্ছে...' : 'Verifying and recording attendance...'}
                    </p>
                  </div>
                )}

                {/* Camera Inactive / Error Display */}
                {(!cameraActive || cameraError) && !submitting && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-slate-300 z-10 bg-slate-900/90 gap-3">
                    <Camera className="w-10 h-10 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-300 max-w-xs">
                      {cameraError ||
                        (isBangla
                          ? 'ক্যামেরা লোড হচ্ছে...'
                          : 'Initializing camera stream...')}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={startCamera}
                        className="px-3.5 py-1.5 rounded-lg bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold border border-[#FCD34D] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-white" />
                        <span>{isBangla ? 'আবার চেষ্টা করুন' : 'Retry Camera'}</span>
                      </button>
                      <button
                        onClick={() => {
                          stopCamera();
                          setActiveTab('manual');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'টোকেন টাইপ করুন' : 'Enter Code'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Controls & Flip */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#C1982E]" />
                  {isBangla
                    ? 'কিউআর ফ্রেমের মাঝখানে রাখুন'
                    : 'Center QR code inside target box'}
                </span>

                <button
                  onClick={toggleCameraFacing}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={isBangla ? 'ক্যামেরা পরিবর্তন করুন' : 'Switch Camera'}
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-slate-600" />
                  <span>{facingMode === 'environment' ? 'Back' : 'Front'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Manual Token Code Input */}
          {activeTab === 'manual' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTokenSubmission(manualToken);
              }}
              className="space-y-4 pt-1"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isBangla ? 'কিউআর টোকেন কোড প্রবেশ করান' : 'Enter QR Token String'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder={
                      isBangla
                        ? 'প্রজেক্টরে প্রদর্শিত টোকেন কোড দিন'
                        : 'Paste or type session token...'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B45309] focus:bg-white"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {isBangla
                    ? 'ক্যামেরা ব্যবহারে সমস্যা হলে প্রজেক্টরে থাকা কিউআর টোকেনটি এখানে পেস্ট বা টাইপ করে জমা দিন।'
                    : 'If your camera has difficulty focusing, you can submit the token directly.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !manualToken.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs sm:text-sm font-bold border border-[#FCD34D] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-white" />
                )}
                <span>
                  {isBangla ? 'উপস্থিতি সাবমিট করুন' : 'Submit Attendance'}
                </span>
              </button>
            </form>
          )}

          {/* Institutional Security Notice */}
          <div className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FCD34D] flex items-start gap-2 text-[11px] text-[#92400E]">
            <ShieldCheck className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <p>
              {isBangla
                ? 'ক্লাস শুরুর নির্ধারিত ১৫ মিনিটের মধ্যে কেবল সক্রিয় ব্যাচের শিক্ষার্থীদের উপস্থিতি গ্রহণযোগ্য। প্রতিটি কিউআর কোড প্রতি ৪৫ সেকেন্ডে নতুন টোকেনে পরিবর্তিত হয়।'
                : 'Attendance is valid within 15 minutes of class start for actively enrolled students. QR tokens rotate every 45s.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/90 flex justify-end gap-2">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {isBangla ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

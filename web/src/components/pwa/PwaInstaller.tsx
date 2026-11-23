'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Smartphone, Share, PlusSquare, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstaller() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Check if already installed / standalone mode
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      setIsStandalone(isStandaloneMode);

      if (isStandaloneMode) {
        return; // Don't show prompts if already installed
      }

      // Check if dismissed recently (within 3 days)
      const dismissedAt = localStorage.getItem('assdi_pwa_dismissed');
      const isDismissedRecently =
        dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 3 * 24 * 60 * 60 * 1000;

      // 3. Detect iOS Safari
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
      setIsIos(isIosDevice);

      // 4. Capture Chrome / Android / Desktop beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        if (!isDismissedRecently) {
          setShowBanner(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Custom event to trigger PWA install dialog on demand from any button
      const handleTriggerCustom = () => {
        if (isIosDevice) {
          setShowIosModal(true);
        } else {
          setShowBanner(true);
        }
      };
      window.addEventListener('assdi:trigger-pwa-install', handleTriggerCustom);

      // Capture installed event
      const handleAppInstalled = () => {
        setInstalledSuccessfully(true);
        setShowBanner(false);
        setDeferredPrompt(null);
        setTimeout(() => setInstalledSuccessfully(false), 5000);
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      // If iOS and not dismissed, show gentle prompt after 4 seconds
      if (isIosDevice && !isDismissedRecently) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 4000);
        return () => clearTimeout(timer);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('assdi:trigger-pwa-install', handleTriggerCustom);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error invoking PWA prompt:', err);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosModal(false);
    localStorage.setItem('assdi_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Success Notification after install */}
      {installedSuccessfully && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#FFFBEB] text-[#0F172A] border border-[#FCD34D] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#14B8A6]/40 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#5EEAD4]" />
          <span className="text-sm font-medium">
            {language === 'bn'
              ? 'আস-সুন্নাহ পোর্টাল সফলভাবে আপনার ডিভাইসে ইনস্টল হয়েছে!'
              : 'ASSDI Portal installed successfully on your device!'}
          </span>
        </div>
      )}

      {/* Modern Floating Bottom PWA Banner */}
      {showBanner && !installedSuccessfully && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white border-2 border-[#FCD34D] shadow-xl rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#B45309]" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-12 h-12 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                <Image
                  src="/logo.png"
                  alt="ASSDI Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#B45309] font-serif">
                    {language === 'bn' ? 'আস-সুন্নাহ অ্যাপ ইনস্টল করুন' : 'Install ASSDI App'}
                  </h4>
                  <span className="bg-[#CCFBF1] text-[#B45309] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#B45309]" /> PWA
                  </span>
                </div>
                <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                  {language === 'bn'
                    ? 'সহজ ও দ্রুত ব্যবহারের জন্য কোনো ডাউনলোড ছাড়াই আপনার ফোনের হোমস্ক্রিনে আসল অ্যাপের মতো যুক্ত করুন।'
                    : 'Add directly to your device home screen for lightning-fast access, offline support, and app experience.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {language === 'bn' ? 'হোমস্ক্রিনে যুক্ত করুন' : 'Add to Home Screen'}
                </span>
              </button>

              <button
                onClick={handleDismiss}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 py-2.5 px-3 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                {language === 'bn' ? 'পরে' : 'Later'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-300 border border-[#E2E8F0]">
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-[#B45309]" />
            </div>

            <h3 className="text-base font-bold text-center text-[#B45309] font-serif mb-2">
              {language === 'bn' ? 'আইফোনে যেভাবে অ্যাপ যুক্ত করবেন' : 'Install on iPhone & iPad'}
            </h3>

            <p className="text-xs text-[#475569] text-center mb-5">
              {language === 'bn'
                ? 'সাফারি ব্রাউজারে মাত্র দুটি সহজ ধাপে হোমস্ক্রিনে অ্যাপ আইকন পেয়ে যান:'
                : 'Follow these 2 simple steps in Safari to add the app to your home screen:'}
            </p>

            <div className="space-y-3.5 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] text-xs text-[#334155]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs">
                  <Share className="w-4 h-4 text-[#B45309]" />
                </div>
                <div>
                  <span className="font-bold text-[#0F172A]">১. </span>
                  {language === 'bn'
                    ? 'সাফারির নিচে থাকা শেয়ার (Share) আইকনে চাপ দিন'
                    : 'Tap the Share button at the bottom of Safari'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-2xs">
                  <PlusSquare className="w-4 h-4 text-[#0F172A]" />
                </div>
                <div>
                  <span className="font-bold text-[#0F172A]">২. </span>
                  {language === 'bn'
                    ? "মেনু স্ক্রোল করে 'Add to Home Screen' চাপ দিন"
                    : "Scroll and tap 'Add to Home Screen'"}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIosModal(false);
                handleDismiss();
              }}
              className="w-full mt-5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer shadow-xs"
            >
              {language === 'bn' ? 'বুঝেছি' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function triggerPwaInstall() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('assdi:trigger-pwa-install'));
  }
}

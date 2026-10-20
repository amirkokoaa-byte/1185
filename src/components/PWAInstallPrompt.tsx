import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { FluentButton, FluentModal } from './FluentUI';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <FluentButton
        variant="secondary"
        size="sm"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        title="تثبيت التطبيق على الجهاز (PWA)"
        className="!px-1.5 sm:!px-3 !py-1 sm:!py-1.5 !text-[10px] sm:!text-xs whitespace-nowrap shrink-0 rounded-lg sm:rounded-xl !gap-1 sm:!gap-2"
      >
        <Download className="w-3 h-3 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
        <span>تثبيت التطبيق</span>
      </FluentButton>

      <FluentModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="تثبيت التطبيق على الهاتف أو الحاسوب (PWA)"
        subtitle="يعمل التطبيق كتطبيق مستقل بكامل الشاشة ويدعم العمل الفوري"
        maxWidth="md"
      >
        <div className="space-y-4 text-sm text-[#F8FAFC]">
          <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex items-start gap-3">
            <Smartphone className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-bold text-sky-300">
                {isIOS ? 'خطوات التثبيت على أجهزة iPhone / iPad:' : 'خطوات التثبيت المباشر من المتصفح:'}
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8]">
                {isIOS ? (
                  <>
                    <li>اضغط على زر المشاركة (Share) في شريط متصفح Safari.</li>
                    <li>اختر &quot;إضافة إلى الشاشة الرئيسية&quot; (Add to Home Screen).</li>
                    <li>اضغط على &quot;إضافة&quot; لتشغيل النظام كتطبيق مستقل.</li>
                  </>
                ) : (
                  <>
                    <li>افتح قائمة المتصفح العلوية (أيقونة النقاط الثلاث في Chrome أو Edge).</li>
                    <li>اختر &quot;تثبيت التطبيق&quot; (Install App) أو &quot;إضافة إلى الشاشة الرئيسية&quot;.</li>
                  </>
                )}
              </ol>
            </div>
          </div>
          <div className="flex justify-end">
            <FluentButton variant="primary" onClick={() => setShowGuideModal(false)}>
              حسناً، فهمت
            </FluentButton>
          </div>
        </div>
      </FluentModal>
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600/95 border border-amber-400 px-3.5 py-2 text-xs font-semibold text-white shadow-xl">
      <WifiOff className="w-4 h-4" />
      <span>وضع عدم الاتصال — يتم الحفظ تلقائياً في التخزين المحلي</span>
    </div>
  );
};

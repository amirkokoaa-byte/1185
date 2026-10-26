import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Smartphone, WifiOff } from 'lucide-react';
import { PlatformSettings } from '../types';
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

interface PWAInstallButtonProps {
  settings?: PlatformSettings;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ settings }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const activeOption = settings?.appDownloadActiveOption || null;
  const hasAnySelectedOption =
    activeOption === 'add_link' ||
    activeOption === 'upload_app' ||
    activeOption === 'app_link';

  const normalizeExternalUrl = (rawUrl?: string) => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleDirectDownloadOrNavigate = () => {
    if (activeOption === 'upload_app') {
      const fileUrl = settings?.appUploadedFileUrl || '';
      if (fileUrl) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = settings?.appUploadedFileName || 'application.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }

    if (activeOption === 'add_link') {
      const targetUrl = normalizeExternalUrl(settings?.appAddLinkUrl);
      if (targetUrl) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }

    if (activeOption === 'app_link') {
      const targetUrl = normalizeExternalUrl(settings?.appExternalLinkUrl);
      if (targetUrl) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }

    // Fallback if another field has a URL/file configured
    if (settings?.appUploadedFileUrl) {
      const link = document.createElement('a');
      link.href = settings.appUploadedFileUrl;
      link.download = settings.appUploadedFileName || 'application.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const fallbackUrl = normalizeExternalUrl(
      settings?.appAddLinkUrl || settings?.appExternalLinkUrl
    );
    if (fallbackUrl) {
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isInstalled && !hasAnySelectedOption) {
    return null;
  }

  return (
    <>
      <FluentButton
        variant="secondary"
        size="sm"
        onClick={async () => {
          if (hasAnySelectedOption) {
            setShowGuideModal(true);
          } else if (isInstallable) {
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

          {hasAnySelectedOption && (
            <button
              type="button"
              onClick={handleDirectDownloadOrNavigate}
              className="fluent-reveal w-full p-4 rounded-xl bg-gradient-to-r from-sky-600/30 via-emerald-600/25 to-sky-600/30 hover:from-sky-500/40 hover:to-emerald-500/40 border-2 border-sky-400/70 flex items-center justify-between gap-3 text-right cursor-pointer shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-[#0A192F] flex items-center justify-center shrink-0 shadow-md">
                  {activeOption === 'app_link' ? (
                    <ExternalLink className="w-5 h-5" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-[#F8FAFC]">
                    {activeOption === 'app_link'
                      ? 'اضغط هنا للتوجه إلى لينك تحميل التطبيق'
                      : 'اضغط هنا لتحميل التطبيق مباشر'}
                  </div>
                  <div className="text-xs text-sky-300 truncate">
                    {activeOption === 'upload_app' && settings?.appUploadedFileName
                      ? `تحميل مباشر: ${settings.appUploadedFileName}`
                      : activeOption === 'app_link'
                      ? 'الانتقال مباشرة إلى صفحة التحميل في الموقع الخارجي'
                      : 'تنزيل وتثبيت التطبيق مباشرة على جهازك'}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-sky-500 text-[#0A192F] text-xs font-extrabold shrink-0">
                تحميل التطبيق
              </span>
            </button>
          )}

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
  const [syncNotice, setSyncNotice] = useState<string>('');

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setSyncNotice('تمت عودة الإنترنت — جاري المزامنة التلقائية مع Firebase...');
      setTimeout(() => setSyncNotice(''), 4000);
    };
    const onOffline = () => {
      setIsOnline(false);
      setSyncNotice('');
    };
    const onSyncEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<{ status?: string }>).detail;
      if (detail?.status === 'synced') {
        setSyncNotice(
          'تمت المزامنة التلقائية لجميع التعديلات والبيانات مع سحابة Firebase بنجاح!'
        );
        setTimeout(() => setSyncNotice(''), 4000);
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('nakhil-offline-sync', onSyncEvent);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('nakhil-offline-sync', onSyncEvent);
    };
  }, []);

  if (isOnline && !syncNotice) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600/95 border border-amber-400 px-3.5 py-2 text-xs font-semibold text-white shadow-xl">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          وضع التصفح بدون إنترنت — يتم الحفظ فوراً في المتصفح والمزامنة تلقائياً فور عودة الإنترنت
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600/95 border border-emerald-400 px-3.5 py-2 text-xs font-semibold text-white shadow-xl">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
      <span>{syncNotice}</span>
    </div>
  );
};

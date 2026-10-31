import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  User,
  Lock,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { PlatformSettings, UserAccount } from '../types';
import { FluentButton, FluentModal } from './FluentUI';
import {
  ABUSIVE_CONTENT_WARNING_MESSAGE,
  containsAbusiveWords,
} from '../services/profanityFilter';

interface FooterAndContactModalProps {
  settings: PlatformSettings;
  currentUser: UserAccount | null;
  onlineCount?: number;
  onSendMessageToAdmin: (content: string, senderUsername: string, senderId: string) => void;
  onOpenAuthModal: () => void;
}

export const FooterAndContactModal: React.FC<FooterAndContactModalProps> = ({
  settings,
  currentUser,
  onlineCount = 1,
  onSendMessageToAdmin,
  onOpenAuthModal,
}) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sentNotice, setSentNotice] = useState(false);
  const [profanityError, setProfanityError] = useState('');

  const readonlyUsername = currentUser ? currentUser.username : 'زائر (غير مسجل)';

  const handleOpenWhatsapp = () => {
    const cleanPhone = settings.adminWhatsapp.replace(/[^0-9]/g, '') || '201000000000';
    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenFacebook = () => {
    const rawUrl = settings.facebookPageUrl?.trim() || 'https://www.facebook.com';
    const targetUrl =
      rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `https://${rawUrl}`;

    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      const intentUrl = `intent://facewebmodal/f?href=${encodeURIComponent(
        targetUrl
      )}#Intent;package=com.facebook.katana;scheme=fb;S.browser_fallback_url=${encodeURIComponent(
        targetUrl
      )};end`;
      window.location.href = intentUrl;
      return;
    }

    if (isIOS) {
      const fbDeepLink = `fb://facewebmodal/f?href=${encodeURIComponent(targetUrl)}`;
      window.location.href = fbDeepLink;
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = targetUrl;
        }
      }, 1200);
      return;
    }

    // Desktop / other platforms: try fb:// protocol first, then navigate to URL
    const fbAppUrl = `fb://facewebmodal/f?href=${encodeURIComponent(targetUrl)}`;
    const link = document.createElement('a');
    link.href = fbAppUrl;
    link.click();
    setTimeout(() => {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }, 400);
  };

  const handleMessageTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Strictly cap at 1000 characters WITHOUT showing any character counter to the user
    const val = e.target.value;
    setProfanityError('');
    if (val.length <= 1000) {
      setMessageContent(val);
    } else {
      setMessageContent(val.slice(0, 1000));
    }
  };

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = messageContent.trim();
    if (!clean) return;

    if (containsAbusiveWords(clean)) {
      setProfanityError(ABUSIVE_CONTENT_WARNING_MESSAGE);
      return;
    }

    onSendMessageToAdmin(
      clean.slice(0, 1000),
      readonlyUsername,
      currentUser?.id || 'guest'
    );

    setSentNotice(true);
    setMessageContent('');
    setProfanityError('');
    setTimeout(() => {
      setSentNotice(false);
      setIsMessageModalOpen(false);
    }, 1400);
  };

  return (
    <>
      <footer className="w-full bg-[#0A192F] border-t border-[#334155] mt-10 py-5 px-2.5 sm:px-8 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-stretch justify-between gap-2.5 sm:gap-6">
          {/* في الهاتف يظهر بالأعلى: للتواصل (واتس اب + فيس بوك + أرسل رسالة) بالعرض في سطر واحد، وفي الكمبيوتر على اليسار */}
          <div className="order-1 sm:order-2 flex flex-col justify-between items-start space-y-2 bg-[#112240]/90 border border-[#334155] rounded-2xl p-3 sm:p-4 min-w-0 sm:min-w-[230px]">
            <h4 className="text-xs font-extrabold text-sky-400 border-b border-[#334155] pb-1.5 w-full text-right">
              للتواصل:
            </h4>

            <div className="w-full grid grid-cols-3 sm:flex sm:flex-col gap-1.5 sm:gap-2">
              {/* 1. WhatsApp Sticker + "واتس اب" */}
              <button
                type="button"
                onClick={handleOpenWhatsapp}
                className="fluent-reveal w-full flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] border border-[#334155] cursor-pointer text-right whitespace-nowrap"
              >
                <span className="relative z-10 w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400 fill-current"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" />
                  </svg>
                </span>
                <span className="relative z-10 text-[10.5px] sm:text-xs font-extrabold text-[#F8FAFC]">
                  واتس اب
                </span>
              </button>

              {/* 2. Facebook Sticker + "فيس بوك" */}
              <button
                type="button"
                onClick={handleOpenFacebook}
                className="fluent-reveal w-full flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] border border-[#334155] cursor-pointer text-right whitespace-nowrap"
              >
                <span className="relative z-10 w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-blue-500/20 border border-blue-400/50 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 fill-current"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                  </svg>
                </span>
                <span className="relative z-10 text-[10.5px] sm:text-xs font-extrabold text-[#F8FAFC]">
                  فيس بوك
                </span>
              </button>

              {/* 3. Email Sticker + "أرسل رسالة" */}
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(true)}
                className="fluent-reveal w-full flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] border border-[#334155] cursor-pointer text-right whitespace-nowrap"
              >
                <span className="relative z-10 w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-sky-500/20 border border-sky-400/50 flex items-center justify-center shrink-0">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-sky-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <span className="relative z-10 text-[10.5px] sm:text-xs font-extrabold text-[#F8FAFC]">
                  أرسل رسالة
                </span>
              </button>
            </div>
          </div>

          {/* في الهاتف يظهر أسفل أزرار التواصل مباشرة (وفي الكمبيوتر على اليمين): اسم الموقع + عدد المتصلين الآن + مع تحيات المطور Amir Lamay */}
          <div className="order-2 sm:order-1 flex flex-col justify-between items-center sm:items-start space-y-2 text-center sm:text-right bg-[#112240]/90 border border-[#334155] rounded-2xl p-3 sm:p-4 min-w-0 sm:min-w-[240px]">
            <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] leading-snug">
              {settings.siteName || 'موقع خدمات النخيل 1185'}
            </div>

            {/* عدد المتصلين الآن */}
            <div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#0A192F] border border-emerald-400/50 text-[11px] sm:text-xs font-extrabold text-emerald-300 shadow">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399] shrink-0" />
                <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                <span>عدد المتصلين الآن:</span>
                <span className="font-mono-tabular text-xs sm:text-sm text-[#F8FAFC]">
                  {onlineCount}
                </span>
              </div>
            </div>

            <div>
              <div className="pt-0.5 inline-block text-[11px] sm:text-sm font-bold text-sky-400 tracking-wide select-all">
                مع تحيات المطور Amir Lamay
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Send Message to Admin Modal */}
      <FluentModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        title="أرسل رسالة مباشرة إلى الإدارة"
        subtitle="تصل رسالتك لحظياً إلى قسم المراسلات في إعدادات الإدارة"
        maxWidth="md"
      >
        {sentNotice ? (
          <div className="p-6 rounded-xl bg-emerald-500/15 border border-emerald-400 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-emerald-200">
              تم إرسال رسالتك إلى الإدارة بنجاح!
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessageSubmit} className="space-y-4">
            {/* Fixed Read-Only Username Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#94A3B8] flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>اسم المستخدم (ثابت لا يمكن تغييره)</span>
                </label>
                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMessageModalOpen(false);
                      onOpenAuthModal();
                    }}
                    className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer"
                  >
                    تسجيل الدخول أولاً؟
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  readOnly
                  value={readonlyUsername}
                  className="w-full rounded-xl bg-[#0A192F]/60 border border-[#334155] px-3.5 py-2.5 text-sky-300 font-bold outline-none cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Textarea up to 1000 chars WITHOUT showing any character counter */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                نص الرسالة
              </label>
              <textarea
                rows={5}
                required
                maxLength={1000}
                value={messageContent}
                onChange={handleMessageTextChange}
                placeholder="اكتب رسالتك أو استفسارك هنا..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 p-3.5 text-[#F8FAFC] outline-none resize-none"
              />
            </div>

            {profanityError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-extrabold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{profanityError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#334155]">
              <FluentButton
                type="button"
                variant="ghost"
                onClick={() => setIsMessageModalOpen(false)}
              >
                إلغاء
              </FluentButton>
              <FluentButton
                type="submit"
                variant="primary"
                disabled={!messageContent.trim()}
              >
                <Send className="w-4 h-4" />
                <span>إرسال</span>
              </FluentButton>
            </div>
          </form>
        )}
      </FluentModal>
    </>
  );
};

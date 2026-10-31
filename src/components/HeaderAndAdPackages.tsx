import React, { useEffect, useState } from 'react';
import {
  Crown,
  UserPlus,
  LogOut,
  Menu,
  Clock,
  Calendar,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Bell,
  Send,
  ExternalLink,
  Mail,
} from 'lucide-react';
import {
  AdminMessage,
  MentionNotificationItem,
  PlatformSettings,
  UserAccount,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { PWAInstallButton } from './PWAInstallPrompt';

interface HeaderAndAdPackagesProps {
  settings: PlatformSettings;
  currentUser: UserAccount | null;
  visitorId?: string;
  messages?: AdminMessage[];
  onMarkUserMessagesRead?: (messageId?: string) => void;
  onReplyToAdminMessage?: (messageId: string, replyText: string) => void;
  onNavigateToMention?: (notification: MentionNotificationItem) => void;
  onRespondFriendRequest?: (
    requestId: string,
    action: 'accepted' | 'rejected'
  ) => void;
  onOpenUserProfile?: (username: string) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenMobileSidebar: () => void;
}

const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const HeaderAndAdPackages: React.FC<HeaderAndAdPackagesProps> = ({
  settings,
  currentUser,
  visitorId,
  messages = [],
  onMarkUserMessagesRead,
  onReplyToAdminMessage,
  onNavigateToMention,
  onRespondFriendRequest,
  onOpenUserProfile,
  onOpenAuthModal,
  onLogout,
  onOpenMobileSidebar,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Bell Notifications & Popup Reply Modal State
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [activePopupMessageId, setActivePopupMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySentFeedback, setReplySentFeedback] = useState('');
  const [instantBellAlert, setInstantBellAlert] = useState<{
    msgId: string;
    senderLabel: string;
    text: string;
  } | null>(null);
  const seenThreadEntryIdsRef = React.useRef<Set<string> | null>(null);

  // Filter and unify messages relevant to current user (each account separate from the other)
  const myMessages = React.useMemo(() => {
    const filtered = messages.filter((m) => {
      if (currentUser) {
        if (currentUser.role === 'admin') {
          return true;
        }
        return (
          m.senderId === currentUser.id ||
          m.senderUsername.trim().toLowerCase() ===
            currentUser.username.trim().toLowerCase() ||
          (currentUser.accountName &&
            m.senderUsername.trim().toLowerCase() ===
              currentUser.accountName.trim().toLowerCase())
        );
      }
      return Boolean(visitorId && m.senderId === visitorId);
    });

    const byAccount = new Map<string, AdminMessage>();
    const chronological = [...filtered].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const msg of chronological) {
      const key = `acct:${msg.senderUsername.trim().toLowerCase()}`;
      const entries =
        msg.thread && msg.thread.length > 0
          ? msg.thread
          : [
              {
                id: msg.id,
                sender: 'user' as const,
                senderName: msg.senderUsername,
                text: msg.content,
                createdAt: msg.createdAt,
              },
            ];
      const existing = byAccount.get(key);
      if (!existing) {
        byAccount.set(key, {
          ...msg,
          thread: [...entries],
        });
      } else {
        const mergedThread = [...(existing.thread || [])];
        for (const e of entries) {
          if (!mergedThread.some((x) => x.id === e.id)) {
            mergedThread.push(e);
          }
        }
        byAccount.set(key, {
          ...existing,
          content: msg.content,
          isRead: existing.isRead && msg.isRead,
          unreadForUserCount:
            (existing.unreadForUserCount || 0) + (msg.unreadForUserCount || 0),
          updatedAt: msg.updatedAt || msg.createdAt,
          thread: mergedThread,
        });
      }
    }

    return Array.from(byAccount.values()).sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [messages, currentUser, visitorId]);

  // Detect any new reply or message in real time and show an instant Bell notification
  useEffect(() => {
    const allEntries: Array<{
      entryId: string;
      msgId: string;
      sender: 'user' | 'admin';
      senderName: string;
      text: string;
    }> = [];

    myMessages.forEach((m) => {
      const th =
        m.thread && m.thread.length > 0
          ? m.thread
          : [
              {
                id: m.id,
                sender: 'user' as const,
                senderName: m.senderUsername,
                text: m.content,
                createdAt: m.createdAt,
              },
            ];
      th.forEach((e) => {
        allEntries.push({
          entryId: e.id,
          msgId: m.id,
          sender: e.sender,
          senderName: e.senderName,
          text: e.text,
        });
      });
    });

    if (seenThreadEntryIdsRef.current === null) {
      seenThreadEntryIdsRef.current = new Set(allEntries.map((x) => x.entryId));
      return;
    }

    const seen = seenThreadEntryIdsRef.current;
    let latestIncoming: (typeof allEntries)[number] | null = null;

    for (const item of allEntries) {
      if (!seen.has(item.entryId)) {
        seen.add(item.entryId);
        const isForMe =
          currentUser?.role === 'admin'
            ? item.sender === 'user'
            : item.sender === 'admin';
        if (isForMe) {
          latestIncoming = item;
        }
      }
    }

    if (latestIncoming) {
      setInstantBellAlert({
        msgId: latestIncoming.msgId,
        senderLabel:
          latestIncoming.sender === 'admin'
            ? 'قام المسؤول بإرسال رد في الجرس'
            : `قام ${latestIncoming.senderName} بإرسال رد في الجرس`,
        text: latestIncoming.text,
      });
      const timer = setTimeout(() => {
        setInstantBellAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [myMessages, currentUser?.role]);

  // Filter mention notifications for current user
  const myMentionNotifications = React.useMemo(() => {
    if (!currentUser) return [];
    const myNorm = currentUser.username.trim().toLowerCase();
    const myAccNorm = (currentUser.accountName || '').trim().toLowerCase();
    return (settings.mentionNotifications || []).filter((n) => {
      const targetNorm = (n.targetUsername || '').trim().toLowerCase();
      return (
        (n.targetUserId && n.targetUserId === currentUser.id) ||
        targetNorm === myNorm ||
        (myAccNorm && targetNorm === myAccNorm)
      );
    });
  }, [settings.mentionNotifications, currentUser]);

  const unreadMentionsCount = myMentionNotifications.filter((n) => !n.isRead).length;

  const myPendingFriendRequests = React.useMemo(() => {
    if (!currentUser) return [];
    const list = Array.isArray(settings.friendRequests)
      ? settings.friendRequests
      : [];
    const myNorm = currentUser.username.trim().toLowerCase();
    const myAccNorm = (currentUser.accountName || '').trim().toLowerCase();
    return list.filter((req) => {
      if (!req || req.status !== 'pending') return false;
      const toNorm = (req.toUsername || '').trim().toLowerCase();
      return toNorm === myNorm || (myAccNorm && toNorm === myAccNorm);
    });
  }, [settings.friendRequests, currentUser]);

  // Calculate unread messages + unread mentions + pending friend requests count for the red badge on the Bell icon
  const unreadBellCount =
    myMessages.reduce((sum, m) => {
      if (currentUser?.role === 'admin') {
        return sum + (!m.isRead ? 1 : 0);
      }
      return sum + (m.unreadForUserCount || 0);
    }, 0) +
    unreadMentionsCount +
    myPendingFriendRequests.length;

  const activePopupMessage =
    myMessages.find((m) => m.id === activePopupMessageId) || null;

  const handleOpenPopupMessage = (msg: AdminMessage) => {
    setActivePopupMessageId(msg.id);
    setIsBellOpen(false);
    setInstantBellAlert(null);
    setReplySentFeedback('');
    onMarkUserMessagesRead?.(msg.id);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePopupMessage || !replyText.trim()) return;
    const clean = replyText.trim();
    onReplyToAdminMessage?.(activePopupMessage.id, clean);
    setReplyText('');
    setReplySentFeedback('تم إرسال ردك لحظياً ووصل في زر الجرس!');
    setTimeout(() => setReplySentFeedback(''), 3500);
  };

  // Ad Packages Duration States
  const [pkg1Days, setPkg1Days] = useState<number>(10); // 1 to 10 days (15 EGP/day, 10 days = 20% off => 120 EGP)
  const [pkg2Days, setPkg2Days] = useState<number>(10); // 1 to 10 days (25 EGP/day, 10 days = 20% off => 200 EGP)
  const [pkg3Days, setPkg3Days] = useState<number>(1); // 1 to 3 days (100 EGP/day)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Day, Date, and 12-hour Clock with Seconds (صباحاً / مساءً)
  const dayName = ARABIC_DAYS[now.getDay()];
  const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}/${String(now.getDate()).padStart(2, '0')}`;

  const rawHours = now.getHours();
  const periodLabel = rawHours >= 12 ? 'مساءً' : 'صباحاً';
  const hours12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const formattedTime = `${String(hours12).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${periodLabel}`;

  // Pricing Calculations (Dynamic from settings.adPackagesPricing)
  const pkg1DailyPrice =
    typeof settings.adPackagesPricing?.pkg1DailyPrice === 'number'
      ? settings.adPackagesPricing.pkg1DailyPrice
      : 15;
  const pkg2DailyPrice =
    typeof settings.adPackagesPricing?.pkg2DailyPrice === 'number'
      ? settings.adPackagesPricing.pkg2DailyPrice
      : 25;
  const pkg3DailyPrice =
    typeof settings.adPackagesPricing?.pkg3DailyPrice === 'number'
      ? settings.adPackagesPricing.pkg3DailyPrice
      : 100;
  const tenDaysDiscountPercent =
    typeof settings.adPackagesPricing?.tenDaysDiscountPercent === 'number'
      ? settings.adPackagesPricing.tenDaysDiscountPercent
      : 20;

  const pkg1OriginalPrice = pkg1Days * pkg1DailyPrice;
  const pkg1FinalPrice =
    pkg1Days === 10
      ? Math.round(pkg1OriginalPrice * (1 - tenDaysDiscountPercent / 100))
      : pkg1OriginalPrice;

  const pkg2OriginalPrice = pkg2Days * pkg2DailyPrice;
  const pkg2FinalPrice =
    pkg2Days === 10
      ? Math.round(pkg2OriginalPrice * (1 - tenDaysDiscountPercent / 100))
      : pkg2OriginalPrice;

  const pkg3OriginalPrice = pkg3Days * pkg3DailyPrice;
  const pkg3FinalPrice =
    pkg3Days === 10
      ? Math.round(pkg3OriginalPrice * (1 - tenDaysDiscountPercent / 100))
      : pkg3OriginalPrice;

  const handleSubscribeWhatsapp = (
    pkgTitle: string,
    days: number,
    price: number,
    hasDiscount: boolean
  ) => {
    const cleanPhone = settings.adminWhatsapp.replace(/[^0-9]/g, '') || '201000000000';
    const userLabel = currentUser ? `المستخدم: ${currentUser.username}` : 'زائر بالموقع';
    const discountNote = hasDiscount
      ? ` (شامل خصم ${tenDaysDiscountPercent}% لباقة الـ 10 أيام)`
      : '';
    const message = `مرحباً إدارة "${settings.siteName}"،\nأرغب في الاشتراك في:\n*${pkgTitle}*\nالمدة المطلوبة: ${days} ${
      days === 1 ? 'يوم' : 'أيام'
    }\nإجمالي التكلفة: ${price} جنيه${discountNote}\n(${userLabel})`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full fluent-acrylic border-b border-[#334155] shadow-lg">
        {/* 1. Very Top Moving News / Ad Ticker (Full width marquee without label) */}
        <div className="w-full bg-[#0A192F] border-b border-[#334155]/80 py-1.5 px-3 overflow-hidden flex items-center">
          <div className="w-full overflow-hidden relative">
            <div className="animate-news-marquee text-xs sm:text-sm font-semibold text-[#F8FAFC]">
              {settings.marqueeText}
            </div>
          </div>
        </div>

        {/* 2. Main Header Row */}
        <div className="max-w-[1600px] mx-auto px-1.5 sm:px-6 py-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 overflow-x-hidden">
          {/* Row 1 on Mobile / Right Side on Desktop: Mobile Drawer Button + Brand + Auth (Account & Logout) + Crown "للإعلانات" + PWA Install + Bell Icon in 1 single line */}
          <div className="flex items-center justify-between lg:justify-start gap-1 sm:gap-2.5 flex-nowrap w-full lg:w-auto min-w-0">
            {/* Mobile Sidebar Trigger */}
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              aria-label="فتح القائمة الجانبية"
              className="lg:hidden fluent-reveal w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#F8FAFC] cursor-pointer shrink-0"
            >
              <Menu className="w-3.5 h-3.5 sm:w-5 sm:h-5 relative z-10" />
            </button>

            {/* Site Brand Title */}
            <div className="hidden sm:flex flex-col shrink-0">
              <span className="text-sm sm:text-base font-extrabold text-[#F8FAFC] tracking-tight whitespace-nowrap">
                {settings.siteName}
              </span>
              <span className="text-[11px] text-[#94A3B8]">
                البوابة الخدمية والتجارية الموحدة
              </span>
            </div>

            {/* Auth Button (Register/Login OR Logged-in Username + Logout in 1 compact group) */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 bg-[#0A192F]/90 border border-[#334155] rounded-lg sm:rounded-xl px-1.5 sm:px-3 py-1 sm:py-1.5 min-w-0 shrink">
                <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                  {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                    <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="text-[10px] sm:text-sm font-bold text-sky-300 truncate max-w-[55px] sm:max-w-none">
                    {currentUser.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="fluent-reveal px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-rose-600/85 hover:bg-rose-500 text-white text-[10px] sm:text-xs font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <LogOut className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 relative z-10 shrink-0" />
                  <span className="relative z-10">خروج</span>
                </button>
              </div>
            ) : (
              <FluentButton
                variant="primary"
                size="sm"
                onClick={onOpenAuthModal}
                className="rounded-lg sm:rounded-xl !px-1.5 sm:!px-3.5 !py-1 sm:!py-1.5 !text-[10px] sm:!text-xs whitespace-nowrap shrink-0 !gap-1 sm:!gap-2"
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>تسجيل الدخول</span>
              </FluentButton>
            )}

            {/* Crown Icon Button with "للإعلانات" */}
            <button
              type="button"
              onClick={() => setIsAdModalOpen(true)}
              className="fluent-reveal flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-b from-amber-500/20 to-[#1E293B] border border-amber-400/50 hover:border-amber-300 text-amber-300 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/30 relative z-10 shrink-0" />
              <span className="relative z-10 text-[10px] sm:text-xs font-extrabold text-amber-200 whitespace-nowrap">
                للإعلانات
              </span>
            </button>

            <PWAInstallButton settings={settings} />

            {/* Bell Icon (أيقونة الجرس بجانب تثبيت التطبيق والإعلانات) */}
            <button
              type="button"
              onClick={() => {
                const nextOpen = !isBellOpen;
                setIsBellOpen(nextOpen);
                setInstantBellAlert(null);
                if (nextOpen && unreadBellCount > 0) {
                  onMarkUserMessagesRead?.();
                }
              }}
              title="المراسلات والإشعارات"
              className="fluent-reveal relative flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-[#0A192F]/90 hover:bg-[#1E293B] border border-sky-400/50 text-sky-300 cursor-pointer shrink-0"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 shrink-0" />
              {unreadBellCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 z-20 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 border border-white text-white text-[10px] font-extrabold font-mono-tabular flex items-center justify-center shadow-lg animate-pulse">
                  {unreadBellCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2 on Mobile (Directly Below Buttons) / Left Side on Desktop: Live Day, Date, and 12-hour Clock with Seconds */}
          <div className="w-full lg:w-auto flex items-center justify-center lg:justify-end gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-xl bg-[#0A192F]/90 border border-[#334155] text-[11px] sm:text-sm whitespace-nowrap">
            <div className="flex items-center gap-1.5 text-[#94A3B8]">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
              <span className="font-bold text-[#F8FAFC]">{dayName}</span>
              <span className="font-mono-tabular text-[#94A3B8]">{formattedDate}</span>
            </div>
            <span className="text-[#334155]">|</span>
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="font-mono-tabular tracking-wide" dir="ltr">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Instant Floating Bell Reply Notification Banner (تصل الرسالة لحظياً للمستخدم في زر الجرس أني بعت رد مع وجود زر فتح الرسالة في شاشة منبثقة والرد) */}
      {instantBellAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-lg p-3.5 rounded-2xl bg-[#112240] border-2 border-rose-500 shadow-[0_12px_40px_rgba(225,29,72,0.45)] space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-rose-300">
              <Bell className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
              <span>{instantBellAlert.senderLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setInstantBellAlert(null)}
              className="text-xs font-bold text-[#94A3B8] hover:text-white cursor-pointer"
            >
              إغلاق
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0A192F] border border-[#334155] text-xs sm:text-sm text-[#F8FAFC] line-clamp-2">
            {instantBellAlert.text}
          </div>
          <div className="flex items-center justify-end gap-2">
            <FluentButton
              variant="primary"
              size="sm"
              onClick={() => {
                const target = myMessages.find(
                  (m) => m.id === instantBellAlert.msgId
                );
                if (target) {
                  handleOpenPopupMessage(target);
                } else {
                  setIsBellOpen(true);
                  setInstantBellAlert(null);
                }
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح الرسالة في شاشة منبثقة والرد</span>
            </FluentButton>
          </div>
        </div>
      )}

      {/* Bell Messages & Mention Notifications Reader Modal / Dropdown Panel */}
      {isBellOpen && (
        <FluentModal
          isOpen={isBellOpen}
          onClose={() => setIsBellOpen(false)}
          title="🔔 إشعارات الجرس (المنشن والمراسلات)"
          subtitle="اضغط على أي إشعار منشن للتوجه مباشرة إلى المنشور أو الكومنت، أو افتح المراسلات للرد المباشر"
          maxWidth="lg"
        >
          {myPendingFriendRequests.length === 0 &&
          myMentionNotifications.length === 0 &&
          myMessages.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#94A3B8] space-y-2">
              <Mail className="w-8 h-8 text-sky-400/50 mx-auto" />
              <p>لا توجد طلبات صداقة أو إشعارات منشن أو رسائل واردة في الجرس حتى الآن.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {/* طلبات الصداقة الواردة في سطر واحد (اسم الحساب بالكامل + قبول + رفض) */}
              {myPendingFriendRequests.map((freq) => (
                <div
                  key={freq.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-sky-950/40 border border-sky-400/60 shadow-md"
                >
                  <div className="flex items-center justify-between gap-1.5 flex-nowrap w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBellOpen(false);
                        onOpenUserProfile?.(freq.fromUsername);
                      }}
                      className="flex items-center gap-1.5 min-w-0 flex-1 text-right"
                    >
                      <UserPlus className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-[11px] sm:text-xs font-black text-white break-words leading-snug">
                        طلب صداقة: <strong className="text-sky-300">{freq.fromUsername}</strong>
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onRespondFriendRequest?.(freq.id, 'accepted')
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-black whitespace-nowrap transition shadow"
                      >
                        قبول
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRespondFriendRequest?.(freq.id, 'rejected')
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] sm:text-xs font-black whitespace-nowrap transition shadow"
                      >
                        رفض
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* إشعارات المنشن (@) في المنشورات والتعليقات */}
              {myMentionNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    setIsBellOpen(false);
                    onNavigateToMention?.(notif);
                  }}
                  className={`p-3.5 rounded-xl border space-y-2 cursor-pointer transition-all ${
                    !notif.isRead
                      ? 'bg-amber-950/35 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                      : 'bg-[#0A192F] border-sky-400/40 hover:border-amber-400/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/60 text-amber-300 text-[10px] font-extrabold">
                        @ إشعار منشن
                      </span>
                      <span className="font-extrabold text-[#F8FAFC]">
                        قام <strong className="text-sky-300">{notif.actorUsername}</strong> بعمل منشن لك في{' '}
                        {notif.commentId ? 'تعليق' : 'منشور'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94A3B8] font-mono-tabular">
                      {new Date(notif.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#112240] border border-[#334155] text-xs text-[#F8FAFC] line-clamp-2">
                    {notif.snippet}
                  </div>

                  <div className="flex items-center justify-end">
                    <FluentButton
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBellOpen(false);
                        onNavigateToMention?.(notif);
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        التوجه مباشرة إلى {notif.commentId ? 'الكومنت' : 'المنشور'}
                      </span>
                    </FluentButton>
                  </div>
                </div>
              ))}

              {myMessages.map((msg) => {
                const threadItems =
                  msg.thread && msg.thread.length > 0
                    ? msg.thread
                    : [
                        {
                          id: msg.id,
                          sender: 'user' as const,
                          senderName: msg.senderUsername,
                          text: msg.content,
                          createdAt: msg.createdAt,
                        },
                      ];
                const lastEntry = threadItems[threadItems.length - 1];
                const hasReply = threadItems.length > 1 || lastEntry.sender === 'admin';
                return (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-xl bg-[#0A192F] border border-sky-400/40 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sky-400">
                          {lastEntry.sender === 'admin'
                            ? 'رد من إدارة الموقع'
                            : `مراسلة: ${msg.senderUsername}`}
                        </span>
                        {hasReply && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold">
                            {lastEntry.sender === 'admin'
                              ? 'تم إرسال رد من الإدارة'
                              : `تم إرسال رد (${lastEntry.senderName})`}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#94A3B8] font-mono-tabular">
                        {new Date(
                          msg.updatedAt || lastEntry.createdAt || msg.createdAt
                        ).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#112240] border border-[#334155] text-xs sm:text-sm text-[#F8FAFC] whitespace-pre-line leading-relaxed">
                      {lastEntry.text}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-emerald-300 font-bold">
                        إجمالي الرسائل في المحادثة: {threadItems.length}
                      </span>
                      <FluentButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenPopupMessage(msg)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الرسالة في شاشة منبثقة والرد</span>
                      </FluentButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FluentModal>
      )}

      {/* Popup Conversation & Direct Reply Modal (فتح الرسالة في شاشة منبثقة وإرسال رد) */}
      {activePopupMessage && (
        <FluentModal
          isOpen={!!activePopupMessage}
          onClose={() => setActivePopupMessageId(null)}
          title={`محادثة مع الإدارة — ${activePopupMessage.senderUsername}`}
          subtitle="يمكنك قراءة كافة الرسائل وإرسال رسالة للرد المباشر"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {replySentFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400/60 text-emerald-200 text-xs font-extrabold flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{replySentFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActivePopupMessageId(null);
                    setIsBellOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-extrabold cursor-pointer shrink-0"
                >
                  عرض في الجرس
                </button>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-[#0A192F] border border-[#334155]">
              {(activePopupMessage.thread && activePopupMessage.thread.length > 0
                ? activePopupMessage.thread
                : [
                    {
                      id: activePopupMessage.id,
                      sender: 'user' as const,
                      senderName: activePopupMessage.senderUsername,
                      text: activePopupMessage.content,
                      createdAt: activePopupMessage.createdAt,
                    },
                  ]
              ).map((entry) => {
                const isAdminSender = entry.sender === 'admin';
                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border text-xs sm:text-sm space-y-1 ${
                      isAdminSender
                        ? 'bg-emerald-950/40 border-emerald-400/50 text-emerald-100 mr-4'
                        : 'bg-[#112240] border-sky-400/40 text-[#F8FAFC] ml-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-extrabold ${
                          isAdminSender ? 'text-emerald-400' : 'text-sky-400'
                        }`}
                      >
                        {isAdminSender ? 'إدارة الموقع' : entry.senderName}
                      </span>
                      <span className="text-[#94A3B8] font-mono-tabular">
                        {new Date(entry.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{entry.text}</p>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendReply} className="space-y-2.5">
              <label className="block text-xs font-bold text-sky-300">
                اكتب رسالتك للرد:
              </label>
              <textarea
                rows={3}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك هنا ليصل فوراً..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 p-3 text-xs sm:text-sm text-[#F8FAFC] outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <FluentButton
                  type="button"
                  variant="ghost"
                  onClick={() => setActivePopupMessageId(null)}
                >
                  إغلاق
                </FluentButton>
                <FluentButton
                  type="submit"
                  variant="primary"
                  disabled={!replyText.trim()}
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال رسالة</span>
                </FluentButton>
              </div>
            </form>
          </div>
        </FluentModal>
      )}

      {/* Ad Packages Modal (Triggered by Crown 👑 "للإعلانات") */}
      <FluentModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        title="👑 باقات الإعلانات المميزة في المنصة"
        subtitle="اختر الباقة والمدة المناسبة لنشاطك التجاري واشترك فوراً عبر واتساب"
        maxWidth="4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Package 1: Moving Square List */}
          <FluentCard className="flex flex-col justify-between space-y-5 border-sky-400/40">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400">الباقة الأولى</span>
                <span className="text-xs font-mono-tabular text-[#94A3B8]">
                  {pkg1DailyPrice} جنيه / اليوم
                </span>
              </div>
              <h4 className="text-lg font-extrabold text-[#F8FAFC]">
                إعلان في القائمة المتحركة
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                يظهر إعلانك بشكل مربع مميز في شريط الإعلانات المربعة المتحركة أسفل البانر الرئيسي
                طوال فترة الاشتراك.
              </p>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#F8FAFC]">
                  اختر المدة (من يوم إلى 10 أيام):
                </label>
                <select
                  value={pkg1Days}
                  onChange={(e) => setPkg1Days(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3 py-2.5 text-[#F8FAFC] outline-none"
                >
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام'}
                      {d === 10 && tenDaysDiscountPercent > 0
                        ? ` (خصم ${tenDaysDiscountPercent}% 🔥)`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>سعر اليوم:</span>
                  <span className="font-mono-tabular">{pkg1DailyPrice} جنيه</span>
                </div>
                {pkg1Days === 10 && tenDaysDiscountPercent > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      خصم {tenDaysDiscountPercent}% لباقة 10 أيام:
                    </span>
                    <span className="line-through text-rose-400 font-mono-tabular">
                      {pkg1OriginalPrice} جنيه
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">الإجمالي المطلوب:</span>
                  <span className="text-xl font-extrabold text-sky-400 font-mono-tabular">
                    {pkg1FinalPrice} جنيه
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                handleSubscribeWhatsapp(
                  'الباقة الأولى (القائمة المتحركة)',
                  pkg1Days,
                  pkg1FinalPrice,
                  pkg1Days === 10 && tenDaysDiscountPercent > 0
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              <span>اشترك</span>
            </FluentButton>
          </FluentCard>

          {/* Package 2: Top Main Banner */}
          <FluentCard className="flex flex-col justify-between space-y-5 border-amber-400/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">الباقة الثانية · الأكثر طلباً</span>
                <span className="text-xs font-mono-tabular text-[#94A3B8]">
                  {pkg2DailyPrice} جنيه / اليوم
                </span>
              </div>
              <h4 className="text-lg font-extrabold text-[#F8FAFC]">
                بانر علوي يظهر لجميع المستخدمين
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                بانر عريض بصدارة الموقع الرئيسية مع إطار مضيء وتبديل تلقائي يضمن أعلى نسبة مشاهدة
                لجميع الزوار.
              </p>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#F8FAFC]">
                  اختر المدة (من يوم إلى 10 أيام):
                </label>
                <select
                  value={pkg2Days}
                  onChange={(e) => setPkg2Days(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] focus:border-amber-400 px-3 py-2.5 text-[#F8FAFC] outline-none"
                >
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام'}
                      {d === 10 && tenDaysDiscountPercent > 0
                        ? ` (خصم ${tenDaysDiscountPercent}% 🔥)`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>سعر اليوم:</span>
                  <span className="font-mono-tabular">{pkg2DailyPrice} جنيه</span>
                </div>
                {pkg2Days === 10 && tenDaysDiscountPercent > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      خصم {tenDaysDiscountPercent}% لباقة 10 أيام:
                    </span>
                    <span className="line-through text-rose-400 font-mono-tabular">
                      {pkg2OriginalPrice} جنيه
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">الإجمالي المطلوب:</span>
                  <span className="text-xl font-extrabold text-amber-400 font-mono-tabular">
                    {pkg2FinalPrice} جنيه
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant="emerald"
              size="lg"
              className="w-full"
              onClick={() =>
                handleSubscribeWhatsapp(
                  'الباقة الثانية (بانر علوي يظهر لجميع المستخدمين)',
                  pkg2Days,
                  pkg2FinalPrice,
                  pkg2Days === 10 && tenDaysDiscountPercent > 0
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              <span>اشترك</span>
            </FluentButton>
          </FluentCard>

          {/* Package 3: Entry Popup Ad */}
          <FluentCard className="flex flex-col justify-between space-y-5 border-indigo-400/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">الباقة الثالثة · VIP</span>
                <span className="text-xs font-mono-tabular text-[#94A3B8]">
                  {pkg3DailyPrice} جنيه / اليوم
                </span>
              </div>
              <h4 className="text-lg font-extrabold text-[#F8FAFC]">
                شاشة منبثقة عند دخول الموقع
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                إعلان حصري يظهر كشاشة منبثقة (Pop-up) في منتصف الشاشة تلقائياً لكل زائر فور فتح
                الموقع.
              </p>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#F8FAFC]">
                  اختر المدة (من يوم إلى 3 أيام):
                </label>
                <select
                  value={pkg3Days}
                  onChange={(e) => setPkg3Days(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] focus:border-indigo-400 px-3 py-2.5 text-[#F8FAFC] outline-none"
                >
                  <option value={1}>يوم واحد ({pkg3DailyPrice} جنيه)</option>
                  <option value={2}>يومين ({pkg3DailyPrice * 2} جنيه)</option>
                  <option value={3}>3 أيام ({pkg3DailyPrice * 3} جنيه)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>سعر اليوم:</span>
                  <span className="font-mono-tabular">{pkg3DailyPrice} جنيه</span>
                </div>
                <div className="pt-2 border-t border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">الإجمالي المطلوب:</span>
                  <span className="text-xl font-extrabold text-indigo-400 font-mono-tabular">
                    {pkg3FinalPrice} جنيه
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                handleSubscribeWhatsapp(
                  'الباقة الثالثة (شاشة منبثقة عند دخول الموقع)',
                  pkg3Days,
                  pkg3FinalPrice,
                  false
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              <span>اشترك</span>
            </FluentButton>
          </FluentCard>
        </div>
      </FluentModal>
    </>
  );
};

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  Flag,
  Smile,
  Palette,
  Radio,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
  ChevronDown,
  Ban,
  MessageSquare,
  Users,
  ShieldAlert,
  UserX,
  Eye,
  Check,
  CheckCheck,
} from 'lucide-react';
import {
  ChatModerationPenalty,
  ChatTypingEntry,
  CommunityReportReason,
  LiveChatMessageItem,
  PrivateChatMessageItem,
  PrivateChatReportItem,
  PrivateChatStatus,
  UserAccount,
} from '../types';
import {
  ABUSIVE_CONTENT_WARNING_MESSAGE,
  containsAbusiveWords,
} from '../services/profanityFilter';

interface LiveCommunityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: LiveChatMessageItem[];
  currentUser: UserAccount | null;
  users?: UserAccount[];
  onlineCount: number;
  cooldownConfigSeconds?: number;
  autoClearMinutes?: number;
  lastClearedAt?: string;
  chatPenalties?: ChatModerationPenalty[];
  privateChatMessages?: PrivateChatMessageItem[];
  privateChatStatuses?: Record<string, PrivateChatStatus>;
  chatTypingMap?: Record<string, ChatTypingEntry>;
  userBlockedMap?: Record<string, string[]>;
  privateChatReports?: PrivateChatReportItem[];
  onOpenAuthModal: () => void;
  onSendChatMessage: (
    text: string,
    textColor: string,
    isSystemNotification?: boolean,
    targetUsername?: string
  ) => void;
  onReportChatMessage: (msgId: string, reason: CommunityReportReason) => void;
  onDeleteChatMessage: (msgId: string, notifyUsername?: string) => void;
  onUpdateChatCooldown?: (seconds: number) => void;
  onUpdateAutoClearMinutes?: (minutes: number) => void;
  onClearPublicChatNow?: () => void;
  onClearPrivateChatSession?: (keepOnlyPartnerUsername?: string) => void;
  onApplyChatPenalty?: (
    targetUserId: string,
    targetUsername: string,
    actionType: 'ban' | 'suspend',
    durationLabel: 'ساعة' | 'ساعتين' | 'يوم'
  ) => void;
  onSendPrivateMessage?: (
    receiverId: string,
    receiverUsername: string,
    text: string,
    textColor?: string
  ) => void;
  onMarkPrivateMessagesRead?: (partnerUsername: string) => void;
  onSetChatTypingStatus?: (targetKey: string, isTyping: boolean) => void;
  onRespondPrivateChatRequest?: (
    senderKey: string,
    status: PrivateChatStatus
  ) => void;
  onBlockUserInChat?: (
    blockedUserId: string,
    blockedUsername: string,
    reportReason?: string,
    sampleMessage?: string
  ) => void;
  onDeleteUserAccountFromChat?: (
    targetUserId: string,
    targetUsername: string
  ) => void;
}

const CHAT_TEXT_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#F8FAFC', label: 'أبيض' },
  { hex: '#38BDF8', label: 'سماوي' },
  { hex: '#34D399', label: 'أخضر زمردي' },
  { hex: '#FBBF24', label: 'ذهبي' },
  { hex: '#F472B6', label: 'وردي' },
  { hex: '#A78BFA', label: 'بنفسجي' },
  { hex: '#FB923C', label: 'برتقالي' },
];

const QUICK_CHAT_EMOJIS: string[] = [
  '😀', '😂', '🤣', '😍', '🥰', '😎', '🤩', '🥳', '🤔', '🫡',
  '👍', '👎', '❤️', '🔥', '✨', '🌹', '🎉', '💯', '🙏', '🤝',
  '👏', '💪', '🌟', '⚡', '☕', '🛒', '🚗', '📱', '💰', '💎',
];

const REPORT_REASONS: CommunityReportReason[] = [
  'إبلاغ عن إساءة',
  'إبلاغ عن محتوى غير لائق',
  'إبلاغ عن محتوى كاذب',
  'الإبلاغ عن محتوى غير صادق',
];

const PENALTY_DURATIONS: Array<'ساعة' | 'ساعتين' | 'يوم'> = [
  'ساعة',
  'ساعتين',
  'يوم',
];

interface ChatMessageRowProps {
  msg: LiveChatMessageItem;
  isOwn: boolean;
  canModerate: boolean;
  openReportId: string | null;
  openModMenuId: string | null;
  modSubAction: 'ban' | 'suspend' | null;
  onToggleReportMenu: (id: string | null) => void;
  onToggleModMenu: (id: string | null) => void;
  onSelectModSubAction: (action: 'ban' | 'suspend' | null) => void;
  onSelectReportReason: (id: string, reason: CommunityReportReason) => void;
  onDeleteWithNotice: (msg: LiveChatMessageItem) => void;
  onApplyPenalty: (
    msg: LiveChatMessageItem,
    actionType: 'ban' | 'suspend',
    durationLabel: 'ساعة' | 'ساعتين' | 'يوم'
  ) => void;
  onClickUsernameForPrivateChat: (userId: string, username: string) => void;
}

/**
 * Memoized Chat Row for zero-lag high-speed rendering
 * Sender's own messages appear on the LEFT ("على اليسار")
 * Other users' messages appear on the RIGHT ("على اليمين")
 */
const ChatMessageRow = memo<ChatMessageRowProps>(
  ({
    msg,
    isOwn,
    canModerate,
    openReportId,
    openModMenuId,
    modSubAction,
    onToggleReportMenu,
    onToggleModMenu,
    onSelectModSubAction,
    onSelectReportReason,
    onDeleteWithNotice,
    onApplyPenalty,
    onClickUsernameForPrivateChat,
  }) => {
    const timeStr = (() => {
      try {
        return new Date(msg.createdAt).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return '';
      }
    })();

    if (msg.isSystemNotification) {
      return (
        <div className="my-1.5 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center text-[11px] font-extrabold text-rose-200 shadow">
          {msg.text}
        </div>
      );
    }

    return (
      <div
        dir="ltr"
        className={`w-full flex ${isOwn ? 'justify-start' : 'justify-end'}`}
      >
        <div
          dir="rtl"
          className={`relative w-[86%] sm:w-[82%] p-3 rounded-2xl border transition-colors ${
            isOwn
              ? 'bg-[#1E293B]/95 border-sky-400/60 rounded-tl-sm'
              : 'bg-[#0A192F]/95 border-[#334155] rounded-tr-sm'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 relative">
              {/* Clickable Username to open Private Side-Chat */}
              <button
                type="button"
                onClick={() => {
                  if (!isOwn) {
                    onClickUsernameForPrivateChat(
                      msg.authorId,
                      msg.authorUsername
                    );
                  }
                }}
                title={
                  isOwn
                    ? 'أنت'
                    : `اضغط لمراسلة ${msg.authorUsername} في الشات الخاص`
                }
                className={`text-xs font-extrabold truncate ${
                  isOwn
                    ? 'text-emerald-300 cursor-default'
                    : 'text-sky-400 hover:text-sky-300 hover:underline cursor-pointer'
                }`}
              >
                {msg.authorUsername}
              </button>

              {/* Small Arrow next to every username for Admin (Ban / Delete / Suspend with 1h, 2h, 1d) */}
              {canModerate && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectModSubAction(null);
                      onToggleModMenu(
                        openModMenuId === msg.id ? null : msg.id
                      );
                    }}
                    title="خيارات المشرف (حظر / حذف / تعليق)"
                    className="w-5 h-5 rounded-md bg-[#112240] hover:bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {openModMenuId === msg.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#0A192F] border border-amber-400/70 shadow-2xl p-1.5 z-40 space-y-1 text-right"
                    >
                      {/* 1. حظر (Ban: 1h, 2h, 1d) */}
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectModSubAction(
                              modSubAction === 'ban' ? null : 'ban'
                            )
                          }
                          className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-rose-300 hover:bg-rose-600/20 flex items-center justify-between cursor-pointer"
                        >
                          <span>🚫 حظر المستخدم</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {modSubAction === 'ban' && (
                          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                            {PENALTY_DURATIONS.map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                onClick={() => onApplyPenalty(msg, 'ban', dur)}
                                className="px-1.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold text-center cursor-pointer"
                              >
                                {dur}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. حذف (Delete with notification) */}
                      <button
                        type="button"
                        onClick={() => onDeleteWithNotice(msg)}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-amber-300 hover:bg-amber-500/20 flex items-center justify-between cursor-pointer"
                      >
                        <span>🗑️ حذف الرسالة</span>
                      </button>

                      {/* 3. تعليق (Suspend: 1h, 2h, 1d) */}
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectModSubAction(
                              modSubAction === 'suspend' ? null : 'suspend'
                            )
                          }
                          className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-sky-300 hover:bg-sky-600/20 flex items-center justify-between cursor-pointer"
                        >
                          <span>⏳ تعليق المستخدم</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {modSubAction === 'suspend' && (
                          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                            {PENALTY_DURATIONS.map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                onClick={() =>
                                  onApplyPenalty(msg, 'suspend', dur)
                                }
                                className="px-1.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold text-center cursor-pointer"
                              >
                                {dur}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <span className="text-[10px] text-[#94A3B8] font-mono-tabular shrink-0">
                {timeStr}
              </span>
            </div>

            {/* Report button ("إبلاغ") in front of every message */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    onToggleReportMenu(openReportId === msg.id ? null : msg.id)
                  }
                  title="إبلاغ عن الرسالة"
                  className="px-2 py-0.5 rounded-lg bg-[#112240] hover:bg-rose-600/20 text-[#94A3B8] hover:text-rose-300 border border-[#334155] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Flag className="w-2.5 h-2.5 text-rose-400" />
                  <span>إبلاغ</span>
                </button>

                {openReportId === msg.id && (
                  <div className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-[#0A192F] border border-rose-400/60 shadow-2xl p-1.5 z-30 space-y-1 text-right">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onSelectReportReason(msg.id, r)}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#F8FAFC] hover:bg-rose-600/25 hover:text-rose-200 cursor-pointer block"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Text with User's Chosen Color */}
          <p
            style={{ color: msg.textColor || '#F8FAFC' }}
            className="text-xs sm:text-sm font-bold leading-relaxed break-words whitespace-pre-wrap"
          >
            {msg.text}
          </p>
        </div>
      </div>
    );
  }
);

ChatMessageRow.displayName = 'ChatMessageRow';

export const LiveCommunityChatModal: React.FC<LiveCommunityChatModalProps> = ({
  isOpen,
  onClose,
  messages,
  currentUser,
  users = [],
  onlineCount,
  cooldownConfigSeconds = 5,
  autoClearMinutes = 60,
  lastClearedAt,
  chatPenalties = [],
  privateChatMessages = [],
  privateChatStatuses = {},
  chatTypingMap = {},
  userBlockedMap = {},
  privateChatReports = [],
  onOpenAuthModal,
  onSendChatMessage,
  onReportChatMessage,
  onDeleteChatMessage,
  onUpdateChatCooldown,
  onUpdateAutoClearMinutes,
  onClearPublicChatNow,
  onClearPrivateChatSession,
  onApplyChatPenalty,
  onSendPrivateMessage,
  onMarkPrivateMessagesRead,
  onSetChatTypingStatus,
  onRespondPrivateChatRequest,
  onBlockUserInChat,
  onDeleteUserAccountFromChat,
}) => {
  const isStrictAdmin = currentUser?.role === 'admin';
  const canModerate =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const myUserId = currentUser?.id || 'guest';
  const myUsername = currentUser?.username || 'زائر';
  const myUsernameNorm = myUsername.trim().toLowerCase();
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Top Switcher: 'public' (الشات العام) vs 'private' (الشات الخاص)
  const [activeChatTab, setActiveChatTab] = useState<'public' | 'private'>(
    'public'
  );
  // Active Private Chat Partner (Strictly ONE private chat allowed at a time)
  const [activePrivatePartner, setActivePrivatePartner] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  // Previewing incoming private request message
  const [previewRequestPartner, setPreviewRequestPartner] = useState<string | null>(
    null
  );
  // Blocking modal / prompt with optional Report to Admin Gear
  const [blockingTarget, setBlockingTarget] = useState<{
    userId: string;
    username: string;
    sampleMessage?: string;
  } | null>(null);
  const [blockWithReport, setBlockWithReport] = useState<boolean>(true);
  const [blockReportReason, setBlockReportReason] = useState<string>(
    'إزعاج أو رسائل غير لائقة في الشات الخاص'
  );

  // Admin Gear Panel State ("ترس صغير يظهر لـ Admin فقط")
  const [isAdminGearOpen, setIsAdminGearOpen] = useState(false);
  const [gearCooldownInput, setGearCooldownInput] = useState<number>(
    cooldownConfigSeconds
  );
  const [gearAutoClearInput, setGearAutoClearInput] = useState<number>(
    autoClearMinutes
  );

  // Privacy Shield against Screenshots / PrintScreen
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState(false);

  useEffect(() => {
    setGearCooldownInput(cooldownConfigSeconds);
    // Clamp active cooldown immediately when Admin changes cooldown setting in real time
    setCooldownSeconds((prev) => Math.min(prev, cooldownConfigSeconds));
  }, [cooldownConfigSeconds]);

  useEffect(() => {
    setGearAutoClearInput(autoClearMinutes);
  }, [autoClearMinutes]);

  // Screenshot & PrintScreen & Copy Protection when chat is open
  useEffect(() => {
    if (!isOpen) return;

    const triggerScreenshotProtection = () => {
      setIsPrivacyShieldActive(true);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      } catch {
        // ignore
      }
      setStatusFeedback({
        type: 'warn',
        text: '🔒 حماية الخصوصية: لا يمكن أخذ لقطة شاشة (Screenshot) أو نسخ المحادثات.',
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        e.code === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key)) ||
        (e.ctrlKey && e.shiftKey && ['s', 'S', 'i', 'I'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && ['p', 'P', 'c', 'C'].includes(e.key))
      ) {
        if ((e.ctrlKey || e.metaKey) && ['c', 'C'].includes(e.key)) {
          e.preventDefault();
          setStatusFeedback({
            type: 'warn',
            text: '🔒 نسخ النصوص غير مسموح به داخل المحادثة.',
          });
          return;
        }
        e.preventDefault();
        triggerScreenshotProtection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        triggerScreenshotProtection();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPrivacyShieldActive(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen]);

  const [draftText, setDraftText] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('#F8FAFC');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [openReportMsgId, setOpenReportMsgId] = useState<string | null>(null);
  const [openModMenuId, setOpenModMenuId] = useState<string | null>(null);
  const [modSubAction, setModSubAction] = useState<'ban' | 'suspend' | null>(
    null
  );

  // Cooldown State between messages
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const lastSentNormalizedRef = useRef<string>('');
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'warn' | 'ok';
    text: string;
  } | null>(null);

  // Real-time tick every 500ms for instant typing status, auto-clear countdown & active bans/suspensions
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const lastTypingBroadcastRef = useRef<number>(0);
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const remainingAutoClearSeconds = useMemo(() => {
    if (!autoClearMinutes || autoClearMinutes <= 0) return null;
    const baseMs = lastClearedAt ? new Date(lastClearedAt).getTime() : nowMs;
    const targetMs = baseMs + autoClearMinutes * 60 * 1000;
    const diffSec = Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
    return diffSec;
  }, [autoClearMinutes, lastClearedAt, nowMs]);

  const formatCountdown = (totalSec: number | null) => {
    if (totalSec === null) return '';
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Users blocked by ME (their messages are hidden from ME in both Public and Private chat, but visible to everyone else)
  const myBlockedList = useMemo(() => {
    const byId = userBlockedMap[myUserId] || [];
    const byName = userBlockedMap[myUsername] || [];
    const byNameNorm = userBlockedMap[myUsernameNorm] || [];
    return Array.from(new Set([...byId, ...byName, ...byNameNorm]));
  }, [userBlockedMap, myUserId, myUsername, myUsernameNorm]);

  const isBlockedByMe = (userId: string, username: string) => {
    const uNorm = username.trim().toLowerCase();
    return (
      myBlockedList.includes(userId) ||
      myBlockedList.includes(username) ||
      myBlockedList.includes(uNorm)
    );
  };

  // Check if the other person blocked ME (so I cannot send them private messages)
  const hasPartnerBlockedMe = (partnerId: string, partnerUsername: string) => {
    const pNorm = partnerUsername.trim().toLowerCase();
    const partnerBlockedById = userBlockedMap[partnerId] || [];
    const partnerBlockedByName = userBlockedMap[partnerUsername] || [];
    const partnerBlockedByNorm = userBlockedMap[pNorm] || [];
    const combined = [
      ...partnerBlockedById,
      ...partnerBlockedByName,
      ...partnerBlockedByNorm,
    ];
    return (
      combined.includes(myUserId) ||
      combined.includes(myUsername) ||
      combined.includes(myUsernameNorm)
    );
  };

  // Active Ban or Suspension for current user
  const myActivePenalty = useMemo(() => {
    return chatPenalties.find(
      (p) =>
        (p.targetUserId === myUserId ||
          p.targetUsername.trim().toLowerCase() === myUsernameNorm) &&
        new Date(p.expiresAt).getTime() > nowMs
    );
  }, [chatPenalties, myUserId, myUsernameNorm, nowMs]);

  // Filter Public Messages: strictly keep only the latest 50 messages ("لا يتم حفظ في الشات السابق إلا 50 رسالة فقط ويتم حذف السابق ولا يمكن الرجوع إليه")
  const visiblePublicMessages = useMemo(() => {
    return messages
      .filter((m) => !isBlockedByMe(m.authorId, m.authorUsername))
      .slice(-50);
  }, [messages, myBlockedList]);

  // Private Chat Conversations & Incoming Pending Requests for ME
  const myPrivateMessages = useMemo(() => {
    return privateChatMessages.filter((pm) => {
      const sNorm = pm.senderUsername.trim().toLowerCase();
      const rNorm = pm.receiverUsername.trim().toLowerCase();
      const involvesMe =
        sNorm === myUsernameNorm ||
        rNorm === myUsernameNorm ||
        (currentUser &&
          (pm.senderId === currentUser.id || pm.receiverId === currentUser.id));
      if (!involvesMe) return false;
      const isMeSender =
        sNorm === myUsernameNorm ||
        Boolean(currentUser && pm.senderId === currentUser.id);
      const otherId = isMeSender ? pm.receiverId : pm.senderId;
      const otherName = isMeSender ? pm.receiverUsername : pm.senderUsername;
      if (isBlockedByMe(otherId, otherName)) return false;
      return true;
    });
  }, [privateChatMessages, myUsernameNorm, currentUser, myBlockedList]);

  // Unique Private Partners list
  const privatePartnersList = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        username: string;
        lastMessage: PrivateChatMessageItem;
        isIncomingRequest: boolean;
        status: PrivateChatStatus;
      }
    >();

    myPrivateMessages.forEach((pm) => {
      const sNorm = pm.senderUsername.trim().toLowerCase();
      const isMeSender =
        sNorm === myUsernameNorm ||
        Boolean(currentUser && pm.senderId === currentUser.id);
      const partnerName = isMeSender ? pm.receiverUsername : pm.senderUsername;
      const partnerNorm = partnerName.trim().toLowerCase();
      const partnerId = isMeSender ? pm.receiverId : pm.senderId;

      const threadKey1 = `${partnerName}__${myUsername}`;
      const reverseKey1 = `${myUsername}__${partnerName}`;
      const threadKeyNorm = `${partnerNorm}__${myUsernameNorm}`;
      const reverseKeyNorm = `${myUsernameNorm}__${partnerNorm}`;
      const idKey1 = `${myUserId}__${partnerName}`;
      const idKey2 = `${myUserId}__${partnerId}`;

      const status: PrivateChatStatus =
        privateChatStatuses[reverseKeyNorm] ||
        privateChatStatuses[threadKeyNorm] ||
        privateChatStatuses[reverseKey1] ||
        privateChatStatuses[threadKey1] ||
        privateChatStatuses[idKey1] ||
        privateChatStatuses[idKey2] ||
        (isMeSender ? 'accepted' : 'pending');

      if (status === 'rejected' && !isMeSender) return;

      map.set(partnerNorm, {
        userId: partnerId,
        username: partnerName,
        lastMessage: pm,
        isIncomingRequest: !isMeSender && status === 'pending',
        status,
      });
    });

    return Array.from(map.values());
  }, [myPrivateMessages, myUsername, myUsernameNorm, myUserId, currentUser, privateChatStatuses]);

  const incomingPendingRequests = useMemo(
    () => privatePartnersList.filter((p) => p.isIncomingRequest),
    [privatePartnersList]
  );

  // Messages with currently selected private partner
  const activePartnerMessages = useMemo(() => {
    if (!activePrivatePartner) return [];
    const activePartnerNorm = activePrivatePartner.username.trim().toLowerCase();
    return myPrivateMessages.filter((pm) => {
      const sNorm = pm.senderUsername.trim().toLowerCase();
      const rNorm = pm.receiverUsername.trim().toLowerCase();
      return (
        (sNorm === myUsernameNorm && rNorm === activePartnerNorm) ||
        (sNorm === activePartnerNorm && rNorm === myUsernameNorm)
      );
    });
  }, [myPrivateMessages, activePrivatePartner, myUsernameNorm]);

  // Reported public chat messages for Admin Gear
  const reportedPublicMessages = useMemo(
    () => messages.filter((m) => Array.isArray(m.reports) && m.reports.length > 0),
    [messages]
  );

  // Auto-select the active private partner if user switches to Private Chat tab and has an existing conversation
  useEffect(() => {
    if (activeChatTab === 'private' && !activePrivatePartner && privatePartnersList.length > 0) {
      const accepted =
        privatePartnersList.find((p) => p.status === 'accepted') ||
        privatePartnersList[0];
      if (accepted) {
        setActivePrivatePartner({
          userId: accepted.userId,
          username: accepted.username,
        });
      }
    }
  }, [activeChatTab, activePrivatePartner, privatePartnersList]);

  // Automatically mark incoming private messages from activePrivatePartner as read when viewing Private Chat
  useEffect(() => {
    if (!isOpen || activeChatTab !== 'private' || !activePrivatePartner) return;
    const partnerNorm = activePrivatePartner.username.trim().toLowerCase();
    const hasUnreadFromPartner = activePartnerMessages.some(
      (pm) =>
        pm.senderUsername.trim().toLowerCase() === partnerNorm &&
        !pm.isRead
    );
    if (hasUnreadFromPartner) {
      onMarkPrivateMessagesRead?.(activePrivatePartner.username);
    }
  }, [
    isOpen,
    activeChatTab,
    activePrivatePartner,
    activePartnerMessages,
    onMarkPrivateMessagesRead,
  ]);

  // Determine whether a user is currently online or offline
  const isUserOnlineNow = (userId?: string, username?: string): boolean => {
    if (!username && !userId) return false;
    const uNorm = (username || '').trim().toLowerCase();
    if (uNorm === myUsernameNorm && Boolean(currentUser)) return true;

    // Check active typing within last 60 seconds
    const typingEntry = chatTypingMap[uNorm];
    if (typingEntry && nowMs - typingEntry.updatedAt < 60000) {
      return true;
    }

    // Check registered user account isOnline flag
    const foundUser = users.find(
      (u) =>
        (userId && u.id === userId) ||
        u.username.trim().toLowerCase() === uNorm
    );
    if (foundUser && typeof foundUser.isOnline === 'boolean') {
      return foundUser.isOnline;
    }

    // Check recent message activity within last 10 minutes
    const recentPublic = messages.some(
      (m) =>
        m.authorUsername.trim().toLowerCase() === uNorm &&
        nowMs - new Date(m.createdAt).getTime() < 10 * 60 * 1000
    );
    const recentPrivate = privateChatMessages.some(
      (pm) =>
        pm.senderUsername.trim().toLowerCase() === uNorm &&
        nowMs - new Date(pm.createdAt).getTime() < 10 * 60 * 1000
    );
    return recentPublic || recentPrivate;
  };

  // Check if the other person in private chat is currently typing to me
  const otherPrivateTyperName = useMemo(() => {
    const TYPING_TTL_MS = 8000;
    const entries = Object.values(chatTypingMap);
    const activeOtherEntries = entries.filter((entry) => {
      if (!entry || nowMs - entry.updatedAt >= TYPING_TTL_MS) return false;
      const entryUserNorm = (entry.username || '').trim().toLowerCase();
      if (!entryUserNorm || entryUserNorm === myUsernameNorm) return false;
      if (currentUser && entry.userId === currentUser.id) return false;
      return true;
    });

    if (activePrivatePartner) {
      const partnerNorm = activePrivatePartner.username.trim().toLowerCase();
      const matchedPartner = activeOtherEntries.find((entry) => {
        const entryUserNorm = entry.username.trim().toLowerCase();
        const targetNorm = (entry.targetKey || entry.targetUsername || '')
          .trim()
          .toLowerCase();
        const isFromPartner =
          entryUserNorm === partnerNorm ||
          Boolean(
            activePrivatePartner.userId &&
              entry.userId === activePrivatePartner.userId
          );
        const isTargetingMeOrPrivate =
          targetNorm === myUsernameNorm ||
          targetNorm === 'private' ||
          entry.chatType === 'private' ||
          targetNorm === partnerNorm;
        return isFromPartner && isTargetingMeOrPrivate;
      });
      if (matchedPartner) {
        return activePrivatePartner.username;
      }
    }

    // Also check if any other user is typing a private message specifically targeting me
    const targetingMe = activeOtherEntries.find((entry) => {
      const targetNorm = (entry.targetKey || entry.targetUsername || '')
        .trim()
        .toLowerCase();
      return (
        targetNorm === myUsernameNorm ||
        (activeChatTab === 'private' && entry.chatType === 'private')
      );
    });
    if (targetingMe) {
      return targetingMe.username;
    }

    return null;
  }, [
    chatTypingMap,
    nowMs,
    myUsernameNorm,
    currentUser,
    activePrivatePartner,
    activeChatTab,
  ]);

  // Compute active typing indicator text showing the OTHER person while they are typing
  const activeTypingBannerText = useMemo(() => {
    const TYPING_TTL_MS = 8000;

    if (activeChatTab === 'private') {
      if (otherPrivateTyperName) {
        return `${otherPrivateTyperName} يكتب الآن...`;
      }
      return null;
    }

    // Public chat typing check (other users typing in public chat or private targeting me)
    if (otherPrivateTyperName) {
      return `${otherPrivateTyperName} يكتب لك في الشات الخاص الآن...`;
    }

    const activePublicTypers = Object.values(chatTypingMap).filter(
      (entry) =>
        entry &&
        nowMs - entry.updatedAt < TYPING_TTL_MS &&
        entry.targetKey === 'public' &&
        entry.username.trim().toLowerCase() !== myUsernameNorm &&
        (!currentUser || entry.userId !== currentUser.id)
    );
    if (activePublicTypers.length > 0) {
      return `${activePublicTypers[0].username} يكتب الآن...`;
    }
    return null;
  }, [
    activeChatTab,
    otherPrivateTyperName,
    chatTypingMap,
    nowMs,
    myUsernameNorm,
    currentUser,
  ]);

  // Smooth scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isOpen) return;
    const el = feedContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [
    visiblePublicMessages.length,
    activePartnerMessages.length,
    activeChatTab,
    isOpen,
  ]);

  if (!isOpen) return null;

  // Enforce up to 2 lines in mobile size (max 1 newline and max 140 characters) + broadcast live typing status
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    const lines = val.split('\n');
    if (lines.length > 2) {
      val = `${lines[0]}\n${lines.slice(1).join(' ')}`;
    }
    if (val.length > 140) {
      val = val.slice(0, 140);
    }
    setDraftText(val);

    const targetKey =
      activeChatTab === 'private'
        ? activePrivatePartner
          ? activePrivatePartner.username.trim().toLowerCase()
          : 'private'
        : 'public';

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    if (val.trim().length > 0) {
      const now = Date.now();
      if (now - lastTypingBroadcastRef.current > 1200) {
        lastTypingBroadcastRef.current = now;
        onSetChatTypingStatus?.(targetKey, true);
      }
      typingStopTimerRef.current = setTimeout(() => {
        lastTypingBroadcastRef.current = 0;
        onSetChatTypingStatus?.(targetKey, false);
      }, 4500);
    } else {
      lastTypingBroadcastRef.current = 0;
      onSetChatTypingStatus?.(targetKey, false);
    }
  };

  // Open Private Chat with a user: strictly 1 private chat allowed at a time; opening another deletes the previously open private chat!
  const handleOpenPrivateChatWithUser = (userId: string, username: string) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (username === myUsername) return;
    if (isBlockedByMe(userId, username)) {
      setStatusFeedback({
        type: 'warn',
        text: `لقد قمت بحظر ${username} مسبقاً.`,
      });
      return;
    }
    // Delete any previously open private chat with another user ("في حالة فتح شات آخر يجب حذف الشات الخاص المفتوح")
    onClearPrivateChatSession?.(username);
    setActivePrivatePartner({ userId, username });
    setActiveChatTab('private');
  };

  // Close Private Chat via X button: deletes open private chat and returns to Public Chat only ("زر X في الشات الخاص لإغلاق الشات الخاص ويظل الشات العام فقط")
  const handleClosePrivateChatAndReturnToPublic = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onClearPrivateChatSession?.();
    setActivePrivatePartner(null);
    setPreviewRequestPartner(null);
    setActiveChatTab('public');
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusFeedback(null);

    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    // Check if user is banned or suspended in chat
    if (myActivePenalty) {
      const actionLabel =
        myActivePenalty.actionType === 'ban' ? 'حظرك' : 'تعليقك';
      setStatusFeedback({
        type: 'warn',
        text: `تم ${actionLabel} من الشات لمدة ${myActivePenalty.durationLabel}. لا يمكنك إرسال رسائل حالياً.`,
      });
      return;
    }

    const clean = draftText.trim();
    if (!clean) return;

    // Profanity & Abusive Language Check ("حظر أي كلمات مسيئة ... ولا تظهر الرسالة وإعلام المرسل")
    if (containsAbusiveWords(clean)) {
      setStatusFeedback({
        type: 'warn',
        text: ABUSIVE_CONTENT_WARNING_MESSAGE,
      });
      return;
    }

    // Sending in Private Chat
    if (activeChatTab === 'private') {
      if (!activePrivatePartner) {
        setStatusFeedback({
          type: 'warn',
          text: 'اختر مستخدماً من الشات العام أو القائمة لمراسلته خاص.',
        });
        return;
      }

      if (
        isBlockedByMe(
          activePrivatePartner.userId,
          activePrivatePartner.username
        ) ||
        hasPartnerBlockedMe(
          activePrivatePartner.userId,
          activePrivatePartner.username
        )
      ) {
        setStatusFeedback({
          type: 'warn',
          text: 'لا يمكن إرسال أو استقبال رسائل مع هذا المستخدم بسبب الحظر.',
        });
        return;
      }

      onSendPrivateMessage?.(
        activePrivatePartner.userId,
        activePrivatePartner.username,
        clean,
        selectedColor
      );
      onSetChatTypingStatus?.(
        activePrivatePartner.username.trim().toLowerCase(),
        false
      );
      setDraftText('');
      setShowEmojiPicker(false);
      setShowColorPicker(false);
      return;
    }

    // Sending in Public Chat:
    // 1. Check configurable cooldown
    if (cooldownSeconds > 0) {
      setStatusFeedback({
        type: 'warn',
        text: `يرجى الانتظار ${cooldownSeconds} ثوانٍ قبل إرسال رسالة أخرى.`,
      });
      return;
    }

    // 2. Prevent repeating / copy-pasting the same message again
    const normalized = clean.replace(/\s+/g, ' ').toLowerCase();
    const recentSameUserDuplicate = messages
      .slice(-8)
      .some(
        (m) =>
          m.authorUsername === myUsername &&
          m.text.trim().replace(/\s+/g, ' ').toLowerCase() === normalized
      );

    if (
      normalized === lastSentNormalizedRef.current ||
      recentSameUserDuplicate
    ) {
      setStatusFeedback({
        type: 'warn',
        text: 'منع التكرار: لا يمكن إرسال نفس الرسالة (كوبي بيست) مرة أخرى لعدم إزعاج المستخدمين.',
      });
      return;
    }

    onSendChatMessage(clean, selectedColor);
    onSetChatTypingStatus?.('public', false);
    lastSentNormalizedRef.current = normalized;
    setDraftText('');
    setShowEmojiPicker(false);
    setShowColorPicker(false);
    if (cooldownConfigSeconds > 0) {
      setCooldownSeconds(cooldownConfigSeconds);
    }
  };

  const handleSelectReportReason = (
    msgId: string,
    reason: CommunityReportReason
  ) => {
    onReportChatMessage(msgId, reason);
    setOpenReportMsgId(null);
    setStatusFeedback({
      type: 'ok',
      text: 'تم إرسال البلاغ للإدارة بنجاح.',
    });
    setTimeout(() => setStatusFeedback(null), 2500);
  };

  const handleAdminDeleteWithNotice = (msg: LiveChatMessageItem) => {
    onDeleteChatMessage(msg.id, msg.authorUsername);
    setOpenModMenuId(null);
    setModSubAction(null);
  };

  const handleAdminApplyPenalty = (
    msg: LiveChatMessageItem,
    actionType: 'ban' | 'suspend',
    durationLabel: 'ساعة' | 'ساعتين' | 'يوم'
  ) => {
    onApplyChatPenalty?.(
      msg.authorId,
      msg.authorUsername,
      actionType,
      durationLabel
    );
    setOpenModMenuId(null);
    setModSubAction(null);
  };

  const handleConfirmBlockUser = () => {
    if (!blockingTarget) return;
    onBlockUserInChat?.(
      blockingTarget.userId,
      blockingTarget.username,
      blockWithReport ? blockReportReason : undefined,
      blockingTarget.sampleMessage
    );
    if (
      activePrivatePartner &&
      activePrivatePartner.username === blockingTarget.username
    ) {
      setActivePrivatePartner(null);
    }
    setBlockingTarget(null);
    setStatusFeedback({
      type: 'ok',
      text: blockWithReport
        ? `تم حظر ${blockingTarget.username} وإخفاء جميع رسائله عنك وإرسال بلاغ للإدارة.`
        : `تم حظر ${blockingTarget.username} وإخفاء جميع رسائله عنك.`,
    });
  };

  const totalGearAlertsCount =
    reportedPublicMessages.length + privateChatReports.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0A192F]/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Large Mobile-Proportioned Modal with Glowing Borders, Anti-Copy/Screenshot Protection, and Top-Left X Close Button */}
      <div
        onClick={() => {
          setOpenReportMsgId(null);
          setOpenModMenuId(null);
        }}
        onCopy={(e) => {
          e.preventDefault();
          setStatusFeedback({
            type: 'warn',
            text: '🔒 نسخ المحادثات غير مسموح به لحماية الخصوصية.',
          });
        }}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        className="fluent-reveal relative w-[95vw] max-w-[440px] h-[88vh] max-h-[760px] rounded-3xl bg-[#112240] border-2 border-sky-400/70 shadow-[0_0_40px_-5px_rgba(56,189,248,0.45)] flex flex-col justify-between overflow-hidden select-none"
      >
        {/* Privacy Shield Overlay when Screenshot / PrintScreen / Tab Switch is detected */}
        {isPrivacyShieldActive && (
          <div className="absolute inset-0 z-50 bg-[#0A192F]/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <h4 className="text-base font-extrabold text-white">
              🔒 حماية الخصوصية ومنع التصوير
            </h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              لا يُسمح بأخذ لقطة شاشة (Screenshot) أو نسخ الرسائل في المحادثة المباشرة والخاصة حفاظاً على خصوصية جميع المستخدمين.
            </p>
            <button
              type="button"
              onClick={() => setIsPrivacyShieldActive(false)}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer shadow-lg"
            >
              العودة للمحادثة
            </button>
          </div>
        )}

        {/* 1. Top Header: "محادثة لايف" + Small Admin Gear Icon ("ترس صغير يظهر لـ Admin فقط") + Top-Left X Close Button */}
        <div className="px-3.5 py-2.5 bg-[#0A192F]/95 border-b border-[#334155] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_#34d399]" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] truncate">
                  محادثة لايف
                </h3>

                {/* عرض اسم المستخدم وبجانبه الحالة متصل أو أوف لاين بالأعلى */}
                <span className="px-2 py-0.5 rounded-full bg-[#112240] border border-[#334155] text-[10px] font-extrabold flex items-center gap-1">
                  <span className="text-sky-300 truncate max-w-[90px]">
                    {myUsername}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentUser ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  <span
                    className={
                      currentUser ? 'text-emerald-400' : 'text-slate-400'
                    }
                  >
                    {currentUser ? 'متصل' : 'أوف لاين'}
                  </span>
                </span>

                {/* Small Gear Button for Admin Only ("ترس صغير يظهر لـ admin فقط") */}
                {canModerate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAdminGearOpen((v) => !v);
                    }}
                    title="إعدادات وبلاغات الشات (Admin)"
                    className={`relative px-2 py-1 rounded-lg border text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                      isAdminGearOpen
                        ? 'bg-amber-500 text-[#0A192F] border-amber-300'
                        : 'bg-[#112240] text-amber-300 border-amber-400/50 hover:bg-amber-500/20'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {totalGearAlertsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono-tabular">
                        {totalGearAlertsCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="text-[10px] text-emerald-400 font-bold flex flex-wrap items-center gap-1.5">
                <Radio className="w-3 h-3" />
                <span>المتصلون الآن: {onlineCount} · آخر 50 رسالة فقط</span>
                {remainingAutoClearSeconds !== null && (
                  <span className="text-amber-300 font-mono-tabular">
                    · مسح تلقائي خلال {formatCountdown(remainingAutoClearSeconds)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Left Side at Top ("وزر X للإغلاق ويكون مكانه على اليسار بالأعلى") */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الشات"
            className="fluent-reveal w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-400/50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          </button>
        </div>

        {/* 2. Top Switcher Bar: Switch between Public Chat ("الشات العام") & Private Chat ("الشات الخاص") with X Close Button */}
        <div className="px-3 py-2 bg-[#1E293B]/80 border-b border-[#334155] space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveChatTab('public');
                setIsAdminGearOpen(false);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                activeChatTab === 'public' && !isAdminGearOpen
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>الشات العام</span>
            </button>

            <div
              className={`rounded-xl text-xs font-extrabold flex items-center justify-between px-2.5 py-1 transition-all ${
                activeChatTab === 'private' && !isAdminGearOpen
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveChatTab('private');
                  setIsAdminGearOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-0.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {activePrivatePartner
                    ? `خاص: ${activePrivatePartner.username}`
                    : 'الشات الخاص'}
                </span>
                {incomingPendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono-tabular animate-pulse">
                    {incomingPendingRequests.length}
                  </span>
                )}
              </button>

              {/* X Button on Private Chat Tab to close Private Chat and keep only Public Chat ("زر X في الشات الخاص لإغلاق الشات الخاص ويظل الشات العام فقط") */}
              {(activeChatTab === 'private' ||
                activePrivatePartner !== null ||
                privatePartnersList.length > 0) && (
                <button
                  type="button"
                  onClick={handleClosePrivateChatAndReturnToPublic}
                  title="إغلاق وحذف الشات الخاص والبقاء في الشات العام فقط"
                  className="w-5 h-5 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center shrink-0 cursor-pointer mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Incoming Private Message Notification Alert ("يظهر للمستقبل رسالة باسم المرسل أنه يرسل رسالة يمكن الاطلاع عليها وقبول ورفض وحظر") */}
          {incomingPendingRequests.map((req) => (
            <div
              key={req.username}
              className="p-2.5 rounded-xl bg-[#0A192F] border border-amber-400/70 space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-amber-300">
                  📩 رسالة خاصة من:{' '}
                  <strong className="text-white">{req.username}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextPreview =
                      previewRequestPartner === req.username
                        ? null
                        : req.username;
                    setPreviewRequestPartner(nextPreview);
                    if (nextPreview) {
                      onMarkPrivateMessagesRead?.(req.username);
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>الاطلاع على الرسالة</span>
                </button>
              </div>

              {previewRequestPartner === req.username && (
                <div className="p-2 rounded-lg bg-[#112240] border border-[#334155] text-xs text-[#F8FAFC] break-words">
                  {req.lastMessage.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    // Delete any previously open private chat with another user before opening this one
                    onClearPrivateChatSession?.(req.username);
                    onRespondPrivateChatRequest?.(req.username, 'accepted');
                    onMarkPrivateMessagesRead?.(req.username);
                    setActivePrivatePartner({
                      userId: req.userId,
                      username: req.username,
                    });
                    setActiveChatTab('private');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>قبول</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRespondPrivateChatRequest?.(req.username, 'rejected')
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] text-[11px] font-extrabold cursor-pointer"
                >
                  رفض
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBlockingTarget({
                      userId: req.userId,
                      username: req.username,
                      sampleMessage: req.lastMessage.text,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Ban className="w-3 h-3" />
                  <span>حظر</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active Penalty Banner if current user is Banned or Suspended */}
        {myActivePenalty && (
          <div className="px-3.5 py-2 bg-rose-950/90 border-b border-rose-500/60 text-rose-200 text-xs font-extrabold flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              إشعار: تم{' '}
              {myActivePenalty.actionType === 'ban' ? 'حظرك' : 'تعليق حسابك'} في
              الشات لمدة ({myActivePenalty.durationLabel}) حتى{' '}
              {new Date(myActivePenalty.expiresAt).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Block + Report Confirmation Overlay inside Chat */}
        {blockingTarget && (
          <div className="p-3.5 bg-[#0A192F] border-b border-rose-500/60 space-y-2.5 shrink-0">
            <div className="text-xs font-extrabold text-rose-300 flex items-center justify-between">
              <span>حظر المستخدم: {blockingTarget.username}</span>
              <button
                type="button"
                onClick={() => setBlockingTarget(null)}
                className="text-[#94A3B8] hover:text-white text-[11px] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              عند حظر هذا المستخدم لن يتمكن من مراسلتك مجدداً ولن تظهر لك أي رسائل
              خاصة أو عامة منه نهائياً.
            </p>
            <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={blockWithReport}
                onChange={(e) => setBlockWithReport(e.target.checked)}
                className="w-4 h-4 accent-rose-500"
              />
              <span>إرسال رسالة إبلاغ عن هذا المستخدم إلى الإدارة (الترس)</span>
            </label>
            {blockWithReport && (
              <input
                type="text"
                value={blockReportReason}
                onChange={(e) => setBlockReportReason(e.target.value)}
                placeholder="سبب البلاغ للإدارة..."
                className="w-full rounded-lg bg-[#112240] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC] outline-none"
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlockingTarget(null)}
                className="px-3 py-1 rounded-lg bg-[#1E293B] text-xs font-bold text-[#94A3B8] cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmBlockUser}
                className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer shadow"
              >
                تأكيد الحظر {blockWithReport ? 'والإبلاغ' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
            ADMIN GEAR VIEW ("شاشة الترس لـ Admin فقط: المدة بين كل رسالة + البلاغات + حذف حساب المستخدم")
           ==================================================================== */}
        {canModerate && isAdminGearOpen ? (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 bg-[#0A192F]/90">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                <Settings className="w-4 h-4" />
                <span>إعدادات وبلاغات محادثة لايف (Admin)</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAdminGearOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[11px] font-bold cursor-pointer"
              >
                العودة للشات
              </button>
            </div>

            {/* 1. تحديد المدة التي بين كل رسالة (تحديث لحظي لجميع المستخدمين) */}
            <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] space-y-2.5">
              <label className="block text-xs font-extrabold text-sky-300">
                1. تحديد المدة الفاصلة بين كل رسالة والأخرى (بالثواني - تحديث لحظي):
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'بدون فاصل (0ث)', val: 0 },
                  { label: '2 ثانية', val: 2 },
                  { label: '5 ثوانٍ', val: 5 },
                  { label: '10 ثوانٍ', val: 10 },
                  { label: '30 ثانية', val: 30 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setGearCooldownInput(preset.val);
                      onUpdateChatCooldown?.(preset.val);
                      setStatusFeedback({
                        type: 'ok',
                        text: `تم تحديث المدة الفاصلة لحظياً لجميع المستخدمين إلى ${preset.val} ثانية.`,
                      });
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border ${
                      cooldownConfigSeconds === preset.val
                        ? 'bg-sky-500 text-[#0A192F] border-sky-300'
                        : 'bg-[#0A192F] text-[#94A3B8] border-[#334155] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={gearCooldownInput}
                  onChange={(e) => {
                    const nextVal = Math.max(0, Number(e.target.value) || 0);
                    setGearCooldownInput(nextVal);
                  }}
                  className="w-24 rounded-xl bg-[#0A192F] border border-[#334155] px-3 py-1.5 text-xs font-mono-tabular font-bold text-[#F8FAFC] outline-none"
                />
                <span className="text-xs text-[#94A3B8]">ثانية</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateChatCooldown?.(gearCooldownInput);
                    setStatusFeedback({
                      type: 'ok',
                      text: `تم تحديث المدة بين كل رسالة لحظياً إلى ${gearCooldownInput} ثانية بنجاح.`,
                    });
                  }}
                  className="mr-auto px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  حفظ المدة لحظياً
                </button>
              </div>
            </div>

            {/* 1-B. خانة التحكم في مدة كل قد إيه يتم مسح الشات في الشات العام (لحظياً) */}
            <div className="p-3 rounded-xl bg-[#112240] border border-amber-400/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="block text-xs font-extrabold text-amber-300">
                  2. التحكم في مدة مسح الشات العام تلقائياً (تحديث لحظي):
                </label>
                {remainingAutoClearSeconds !== null && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-mono-tabular font-extrabold">
                    المسح القادم خلال: {formatCountdown(remainingAutoClearSeconds)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '1 دقيقة', val: 1 },
                  { label: '2 دقيقة', val: 2 },
                  { label: '5 دقائق', val: 5 },
                  { label: '15 دقيقة', val: 15 },
                  { label: '30 دقيقة', val: 30 },
                  { label: 'ساعة (60 د)', val: 60 },
                  { label: '3 ساعات', val: 180 },
                  { label: 'يوم (24 س)', val: 1440 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setGearAutoClearInput(preset.val);
                      onUpdateAutoClearMinutes?.(preset.val);
                      setStatusFeedback({
                        type: 'ok',
                        text: `تم ضبط المسح التلقائي للشات العام لحظياً كل ${preset.val} دقيقة.`,
                      });
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border ${
                      autoClearMinutes === preset.val
                        ? 'bg-amber-500 text-[#0A192F] border-amber-300'
                        : 'bg-[#0A192F] text-[#94A3B8] border-[#334155] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={gearAutoClearInput}
                  onChange={(e) =>
                    setGearAutoClearInput(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-24 rounded-xl bg-[#0A192F] border border-[#334155] px-3 py-1.5 text-xs font-mono-tabular font-bold text-[#F8FAFC] outline-none"
                />
                <span className="text-xs text-[#94A3B8]">دقيقة</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateAutoClearMinutes?.(gearAutoClearInput);
                    setStatusFeedback({
                      type: 'ok',
                      text: `تم ضبط المسح التلقائي للشات العام لحظياً كل ${gearAutoClearInput} دقيقة.`,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  حفظ مدة المسح
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearPublicChatNow?.();
                    setStatusFeedback({
                      type: 'ok',
                      text: 'تم مسح جميع رسائل الشات العام لحظياً لدى جميع المستخدمين.',
                    });
                  }}
                  className="mr-auto px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح الشات الآن</span>
                </button>
              </div>
              <p className="text-[10px] text-[#94A3B8]">
                ملاحظة: يحتفظ الشات العام بآخر 50 رسالة كحد أقصى ويتم حذف الرسائل الأقدم تلقائياً ولا يمكن الرجوع إليها.
              </p>
            </div>

            {/* 3. بلاغات الشات الخاص وحظر المستخدمين (مع إمكانية حذف حساب المستخدم) */}
            <div className="p-3 rounded-xl bg-[#112240] border border-rose-500/40 space-y-2.5">
              <div className="text-xs font-extrabold text-rose-300 flex items-center justify-between">
                <span>3. بلاغات الحظر والمستخدمين ({privateChatReports.length})</span>
              </div>

              {privateChatReports.length === 0 ? (
                <p className="text-[11px] text-[#94A3B8] py-2">
                  لا توجد بلاغات حظر من الشات الخاص حالياً.
                </p>
              ) : (
                <div className="space-y-2">
                  {privateChatReports.map((rep) => {
                    const targetAccount = users.find(
                      (u) =>
                        u.id === rep.reportedUserId ||
                        u.username === rep.reportedUsername
                    );
                    return (
                      <div
                        key={rep.id}
                        className="p-2.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#F8FAFC]">
                            المبلَّغ عنه:{' '}
                            <strong className="text-rose-400">
                              {rep.reportedUsername}
                            </strong>
                          </span>
                          <span className="text-[10px] text-[#94A3B8]">
                            بواسطة: {rep.reporterUsername}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-300">
                          السبب: {rep.reason}
                        </div>
                        {rep.sampleMessage && (
                          <div className="p-1.5 rounded bg-[#112240] text-[11px] text-[#E2E8F0]">
                            الرسالة: &quot;{rep.sampleMessage}&quot;
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteUserAccountFromChat?.(
                                targetAccount?.id || rep.reportedUserId,
                                rep.reportedUsername
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>حذف حساب المستخدم نهائياً</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. خانة البلاغات عن الرسائل في الشات العام */}
            <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] space-y-2.5">
              <div className="text-xs font-extrabold text-sky-300">
                4. البلاغات عن الرسائل في الشات العام ({reportedPublicMessages.length})
              </div>

              {reportedPublicMessages.length === 0 ? (
                <p className="text-[11px] text-[#94A3B8] py-2">
                  لا توجد رسائل مبلغ عنها في الشات العام حالياً.
                </p>
              ) : (
                <div className="space-y-2">
                  {reportedPublicMessages.map((rm) => {
                    const authorAcc = users.find(
                      (u) =>
                        u.id === rm.authorId || u.username === rm.authorUsername
                    );
                    return (
                      <div
                        key={rm.id}
                        className="p-2.5 rounded-xl bg-[#0A192F] border border-rose-500/40 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sky-300">
                            المرسل: {rm.authorUsername}
                          </span>
                          <span className="text-[10px] text-rose-400 font-bold">
                            {rm.reports.length} بلاغ (
                            {rm.reports.map((r) => r.reason).join('، ')})
                          </span>
                        </div>
                        <p className="p-2 rounded bg-[#112240] text-[#F8FAFC]">
                          {rm.text}
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAdminDeleteWithNotice(rm)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0A192F] text-[11px] font-extrabold cursor-pointer"
                          >
                            حذف الرسالة
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteUserAccountFromChat?.(
                                authorAcc?.id || rm.authorId,
                                rm.authorUsername
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>حذف حساب المستخدم</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeChatTab === 'private' ? (
          /* ====================================================================
             PRIVATE SIDE-CHAT VIEW ("الشات الخاص — محادثة واحدة فقط وزر X للإغلاق والعودة للعام")
             ==================================================================== */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0A192F]/60">
            {/* Active Partner Header with Online/Offline Status beside Name, Block Button & X Close Private Chat Button */}
            <div className="px-3.5 py-2 bg-[#112240] border-b border-[#334155] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="text-xs font-extrabold text-emerald-300 truncate">
                  {activePrivatePartner
                    ? activePrivatePartner.username
                    : 'الشات الخاص (محادثة واحدة فقط)'}
                </div>

                {/* يظهر بجانب الاسم بالأعلى الحالة سواء متصل أو أوف لاين */}
                {activePrivatePartner && (() => {
                  const partnerOnline = isUserOnlineNow(
                    activePrivatePartner.userId,
                    activePrivatePartner.username
                  );
                  return (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0 border ${
                        partnerOnline
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                          : 'bg-slate-700/40 text-slate-300 border-slate-500/50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          partnerOnline
                            ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span>{partnerOnline ? 'متصل' : 'أوف لاين'}</span>
                    </span>
                  );
                })()}

                {/* يظهر بجانب الاسم في الشات الخاص عندما يكتب الطرف الآخر */}
                {otherPrivateTyperName && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/50 text-[10px] font-extrabold flex items-center gap-1 shrink-0 animate-pulse">
                    <span>يكتب الآن...</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activePrivatePartner && (
                  <button
                    type="button"
                    onClick={() =>
                      setBlockingTarget({
                        userId: activePrivatePartner.userId,
                        username: activePrivatePartner.username,
                        sampleMessage:
                          activePartnerMessages[activePartnerMessages.length - 1]
                            ?.text,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Ban className="w-3 h-3" />
                    <span>حظر وإبلاغ</span>
                  </button>
                )}

                {/* X Button in Private Chat to close Private Chat and return to Public Chat only */}
                <button
                  type="button"
                  onClick={handleClosePrivateChatAndReturnToPublic}
                  title="إغلاق الشات الخاص والعودة للشات العام فقط"
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إغلاق الخاص</span>
                </button>
              </div>
            </div>

            {/* Private Messages Feed */}
            <div
              ref={feedContainerRef}
              className="flex-1 overflow-y-auto p-3.5 space-y-2.5"
            >
              {!activePrivatePartner ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]">
                  <MessageSquare className="w-8 h-8 text-emerald-400 opacity-75" />
                  <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
                    الشات الخاص
                  </div>
                  <p className="text-[11px]">
                    اضغط على أي اسم مستخدم في الشات العام لفتح محادثة جانبية خاصة
                    معه فوراً.
                  </p>
                </div>
              ) : activePartnerMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]">
                  <div className="text-xs font-extrabold text-[#F8FAFC]">
                    ابدأ المحادثة الخاصة مع {activePrivatePartner.username}
                  </div>
                  <p className="text-[11px]">
                    سيصل للمستقبل إشعار باسمك للاطلاع على رسالتك وقبول المحادثة.
                  </p>
                </div>
              ) : (
                activePartnerMessages.map((pm) => {
                  const isMe =
                    pm.senderUsername.trim().toLowerCase() === myUsernameNorm ||
                    Boolean(currentUser && pm.senderId === currentUser.id);
                  const isSeen = Boolean(pm.isRead);
                  return (
                    <div
                      key={pm.id}
                      dir="ltr"
                      className={`w-full flex ${
                        isMe ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        dir="rtl"
                        className={`w-[84%] p-3 rounded-2xl border ${
                          isMe
                            ? 'bg-[#1E293B] border-emerald-400/50 rounded-tl-sm'
                            : 'bg-[#0A192F] border-[#334155] rounded-tr-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mb-1">
                          <span className="font-extrabold text-emerald-300">
                            {pm.senderUsername}
                          </span>
                          <div className="flex items-center gap-1">
                            <span>
                              {new Date(pm.createdAt).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {/* علامتين صح مثل الواتساب: زرقاء عند المشاهدة، وغير زرقاء (رمادية) عندما لم يرها بعد */}
                            <span
                              title={
                                isSeen
                                  ? 'تمت المشاهدة (قرأ المستقبل الرسالة)'
                                  : 'لم تتم المشاهدة بعد'
                              }
                              className={`inline-flex items-center gap-0.5 font-extrabold transition-colors ${
                                isSeen
                                  ? 'text-[#38BDF8] drop-shadow-[0_0_5px_rgba(56,189,248,0.85)]'
                                  : 'text-[#94A3B8]'
                              }`}
                            >
                              <CheckCheck className="w-4 h-4 stroke-[2.6]" />
                            </span>
                          </div>
                        </div>
                        <p
                          style={{ color: pm.textColor || '#F8FAFC' }}
                          className="text-xs sm:text-sm font-bold break-words whitespace-pre-wrap"
                        >
                          {pm.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* فقاعة فورية داخل الشات الخاص تظهر للشخص الآخر عندما يكتب الطرف المقابل */}
              {otherPrivateTyperName && (
                <div dir="ltr" className="w-full flex justify-end">
                  <div
                    dir="rtl"
                    className="px-3.5 py-2 rounded-2xl rounded-tr-sm bg-[#0A192F] border border-sky-400/50 text-sky-300 text-xs font-extrabold flex items-center gap-2 shadow-md animate-pulse"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                    <span>{otherPrivateTyperName} يكتب الآن...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ====================================================================
             PUBLIC GENERAL CHAT FEED ("الشات العام")
             ==================================================================== */
          <div
            ref={feedContainerRef}
            style={{ contain: 'content' }}
            className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#0A192F]/60"
          >
            {visiblePublicMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]">
                <Radio className="w-8 h-8 text-sky-400 opacity-75" />
                <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
                  لا توجد رسائل في المحادثة المباشرة حالياً
                </div>
                <p className="text-[11px]">
                  ابدأ المحادثة الآن، أو اضغط على أي اسم لمراسلته على الخاص!
                </p>
              </div>
            ) : (
              visiblePublicMessages.map((msg) => (
                <ChatMessageRow
                  key={msg.id}
                  msg={msg}
                  isOwn={
                    Boolean(currentUser && msg.authorId === currentUser.id) ||
                    msg.authorUsername === myUsername
                  }
                  canModerate={canModerate}
                  openReportId={openReportMsgId}
                  openModMenuId={openModMenuId}
                  modSubAction={modSubAction}
                  onToggleReportMenu={setOpenReportMsgId}
                  onToggleModMenu={setOpenModMenuId}
                  onSelectModSubAction={setModSubAction}
                  onSelectReportReason={handleSelectReportReason}
                  onDeleteWithNotice={handleAdminDeleteWithNotice}
                  onApplyPenalty={handleAdminApplyPenalty}
                  onClickUsernameForPrivateChat={handleOpenPrivateChatWithUser}
                />
              ))
            )}
          </div>
        )}

        {/* Status / Anti-Spam / Profanity / Cooldown Notice */}
        {statusFeedback && (
          <div
            className={`px-3.5 py-2 text-[11px] font-bold flex items-center gap-1.5 border-t ${
              statusFeedback.type === 'warn'
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
            }`}
          >
            {statusFeedback.type === 'warn' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>{statusFeedback.text}</span>
          </div>
        )}

        {/* Popover Panels: Text Color Palette & Emoji Picker */}
        {showColorPicker && (
          <div className="px-3.5 py-2.5 bg-[#0A192F] border-t border-[#334155] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-bold text-[#94A3B8]">
              تلوين النص:
            </span>
            <div className="flex items-center gap-2">
              {CHAT_TEXT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    setSelectedColor(c.hex);
                    setShowColorPicker(false);
                  }}
                  title={c.label}
                  style={{ backgroundColor: c.hex }}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                    selectedColor === c.hex
                      ? 'border-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {showEmojiPicker && (
          <div className="p-2.5 bg-[#0A192F] border-t border-[#334155] grid grid-cols-10 gap-1 max-h-32 overflow-y-auto shrink-0">
            {QUICK_CHAT_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() =>
                  setDraftText((prev) =>
                    (prev + em).length <= 140 ? prev + em : prev
                  )
                }
                className="p-1.5 rounded-lg hover:bg-[#1E293B] text-base text-center cursor-pointer"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Composer: Textarea (max 2 lines mobile) + Tools + Send Button on Left */}
        {!isAdminGearOpen && (
          <form
            onSubmit={handleSend}
            className="p-3 bg-[#0A192F] border-t border-[#334155] space-y-2 shrink-0"
          >
            {/* أعلى خانة تلوين النص: يظهر "يكتب الآن..." لحظياً عند كتابة المرسل أو المستقبل أي رسالة */}
            {activeTypingBannerText && (
              <div className="px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-400/40 text-sky-300 text-[11px] font-extrabold flex items-center gap-2 animate-pulse">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span>{activeTypingBannerText}</span>
              </div>
            )}

            {/* Formatting Toolbar: Color Picker + Emoji Picker + Cooldown Indicator */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowColorPicker((v) => !v);
                    setShowEmojiPicker(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#112240] hover:bg-[#1E293B] border border-[#334155] text-[11px] font-bold text-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>تلوين النص</span>
                  <span
                    style={{ backgroundColor: selectedColor }}
                    className="w-3 h-3 rounded-full border border-white/40"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker((v) => !v);
                    setShowColorPicker(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#112240] hover:bg-[#1E293B] border border-[#334155] text-[11px] font-bold text-[#F8FAFC] flex items-center gap-1 cursor-pointer"
                >
                  <Smile className="w-3.5 h-3.5 text-amber-400" />
                  <span>إيموشن</span>
                </button>
              </div>

              {activeChatTab === 'public' && cooldownSeconds > 0 ? (
                <span className="text-[11px] font-mono-tabular font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>انتظر {cooldownSeconds} ث</span>
                </span>
              ) : (
                <span className="text-[10px] text-[#94A3B8]">
                  {activeChatTab === 'private'
                    ? 'محادثة خاصة مباشرة'
                    : `سطران كحد أقصى · فاصل ${cooldownConfigSeconds} ثوانٍ`}
                </span>
              )}
            </div>

            {/* Input Row: Textarea on Right + Send Button on Left ("ويوجد على اليسار زر إرسال") */}
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={draftText}
                onChange={handleDraftChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                style={{ color: selectedColor }}
                placeholder={
                  activeChatTab === 'private'
                    ? activePrivatePartner
                      ? `اكتب رسالة خاصة إلى ${activePrivatePartner.username}...`
                      : 'اختر مستخدماً لمراسلته خاص...'
                    : 'اكتب رسالتك هنا (حتى سطرين)...'
                }
                className="flex-1 rounded-2xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3.5 py-2 text-xs sm:text-sm font-bold outline-none resize-none leading-snug"
              />

              {/* Send Button on the Left ("وعلى اليسار زر إرسال") */}
              <button
                type="submit"
                disabled={
                  (activeChatTab === 'public' && cooldownSeconds > 0) ||
                  !draftText.trim() ||
                  Boolean(myActivePenalty)
                }
                className="fluent-reveal h-11 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-lg"
              >
                <Send className="w-4 h-4 relative z-10" />
                <span className="relative z-10">
                  {activeChatTab === 'public' && cooldownSeconds > 0
                    ? `${cooldownSeconds}ث`
                    : 'إرسال'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

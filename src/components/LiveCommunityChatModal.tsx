import React, { memo, useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import {
  CommunityReportReason,
  LiveChatMessageItem,
  UserAccount,
} from '../types';

interface LiveCommunityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: LiveChatMessageItem[];
  currentUser: UserAccount | null;
  onlineCount: number;
  onOpenAuthModal: () => void;
  onSendChatMessage: (text: string, textColor: string) => void;
  onReportChatMessage: (msgId: string, reason: CommunityReportReason) => void;
  onDeleteChatMessage: (msgId: string) => void;
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

interface ChatMessageRowProps {
  msg: LiveChatMessageItem;
  isOwn: boolean;
  canModerate: boolean;
  openReportId: string | null;
  onToggleReportMenu: (id: string | null) => void;
  onSelectReportReason: (id: string, reason: CommunityReportReason) => void;
  onDelete: (id: string) => void;
}

/**
 * Memoized Chat Row for zero-lag high-speed rendering
 */
const ChatMessageRow = memo<ChatMessageRowProps>(
  ({
    msg,
    isOwn,
    canModerate,
    openReportId,
    onToggleReportMenu,
    onSelectReportReason,
    onDelete,
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

    return (
      <div
        className={`relative p-3 rounded-2xl border transition-colors ${
          isOwn
            ? 'bg-[#1E293B]/95 border-sky-400/50'
            : 'bg-[#0A192F]/90 border-[#334155]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-extrabold text-sky-400 truncate">
              {msg.authorUsername}
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono-tabular">
              {timeStr}
            </span>
          </div>

          {/* Report button ("إبلاغ") in front of every message + Moderator/Admin Delete */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  onToggleReportMenu(openReportId === msg.id ? null : msg.id)
                }
                title="إبلاغ عن الرسالة"
                className="px-2 py-0.5 rounded-lg bg-[#112240] hover:bg-rose-600/20 text-[#94A3B8] hover:text-rose-300 border border-[#334155] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3 text-rose-400" />
                <span>إبلاغ</span>
              </button>

              {openReportId === msg.id && (
                <div className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-[#0A192F] border border-rose-400/60 shadow-2xl p-1.5 z-30 space-y-1">
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

            {canModerate && (
              <button
                type="button"
                onClick={() => onDelete(msg.id)}
                title="حذف الرسالة"
                className="p-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Message Text with User's Chosen Color (up to 2 lines mobile proportion) */}
        <p
          style={{ color: msg.textColor || '#F8FAFC' }}
          className="text-xs sm:text-sm font-bold leading-relaxed break-words whitespace-pre-wrap"
        >
          {msg.text}
        </p>
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
  onlineCount,
  onOpenAuthModal,
  onSendChatMessage,
  onReportChatMessage,
  onDeleteChatMessage,
}) => {
  const canModerate = currentUser?.role === 'admin';

  const [draftText, setDraftText] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('#F8FAFC');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [openReportMsgId, setOpenReportMsgId] = useState<string | null>(null);

  // 5-Second Cooldown State between messages
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  // Anti-duplicate / anti-copy-paste tracking per user
  const lastSentNormalizedRef = useRef<string>('');
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'warn' | 'ok';
    text: string;
  } | null>(null);

  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Countdown timer for the 5-second rule
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Smooth zero-jank scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isOpen) return;
    const el = feedContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, isOpen]);

  if (!isOpen) return null;

  // Enforce up to 2 lines in mobile size (max 1 newline and max 140 characters)
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
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusFeedback(null);

    const clean = draftText.trim();
    if (!clean) return;

    // 1. Check 5-second cooldown
    if (cooldownSeconds > 0) {
      setStatusFeedback({
        type: 'warn',
        text: `يرجى الانتظار ${cooldownSeconds} ثوانٍ قبل إرسال رسالة أخرى.`,
      });
      return;
    }

    // 2. Prevent repeating / copy-pasting the same message again
    const normalized = clean.replace(/\s+/g, ' ').toLowerCase();
    const currentUsername = currentUser?.username || 'زائر';
    const recentSameUserDuplicate = messages
      .slice(-8)
      .some(
        (m) =>
          m.authorUsername === currentUsername &&
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
    lastSentNormalizedRef.current = normalized;
    setDraftText('');
    setShowEmojiPicker(false);
    setShowColorPicker(false);
    setCooldownSeconds(5);
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

  // Windowed rendering: show latest 80 messages in DOM for guaranteed 60fps speed
  const windowedMessages = messages.slice(-80);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#0A192F]/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Large Mobile-Proportioned Modal with Glowing Borders and Top-Left X Close Button */}
      <div className="fluent-reveal w-[95vw] max-w-[430px] h-[85vh] max-h-[740px] rounded-3xl bg-[#112240] border-2 border-sky-400/70 shadow-[0_0_40px_-5px_rgba(56,189,248,0.45)] flex flex-col justify-between overflow-hidden">
        {/* Top Header: Title on Right + Close Button (X) on Top-Left ("علي اليسار بالأعلى") */}
        <div className="px-4 py-3 bg-[#0A192F]/95 border-b border-[#334155] flex items-center justify-between gap-2 shrink-0">
          {/* Right Side: Live Chat Title & Online Count */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_#34d399]" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] truncate">
                محادثة لايف — شات المجتمع العام
              </h3>
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <Radio className="w-3 h-3" />
                <span>المتصلون الآن: {onlineCount}</span>
              </div>
            </div>
          </div>

          {/* Left Side at Top ("وزر X للإغلاق ويكون مكانه على اليسار بالأعلى") */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق الشات"
            className="fluent-reveal w-9 h-9 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-400/50 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5 relative z-10" />
          </button>
        </div>

        {/* User Identity Strip */}
        <div className="px-3.5 py-1.5 bg-[#1E293B]/70 border-b border-[#334155] flex items-center justify-between text-[11px] shrink-0">
          <span className="text-[#94A3B8]">
            تشارك باسم:{' '}
            <strong className="text-sky-300">
              {currentUser ? currentUser.username : 'زائر'}
            </strong>
          </span>
          {!currentUser && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-sky-400 font-bold hover:underline cursor-pointer"
            >
              تسجيل حساب؟
            </button>
          )}
        </div>

        {/* Center General Chat Feed (Hardware-accelerated, windowed for zero lag) */}
        <div
          ref={feedContainerRef}
          style={{ contain: 'content' }}
          className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#0A192F]/60"
        >
          {windowedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]">
              <Radio className="w-8 h-8 text-sky-400 opacity-75" />
              <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
                لا توجد رسائل في المحادثة المباشرة حالياً
              </div>
              <p className="text-[11px]">
                ابدأ المحادثة الآن، اختر لون خطك المفضل أو أضف إيموشن!
              </p>
            </div>
          ) : (
            windowedMessages.map((msg) => (
              <ChatMessageRow
                key={msg.id}
                msg={msg}
                isOwn={
                  Boolean(currentUser && msg.authorId === currentUser.id) ||
                  msg.authorUsername === (currentUser?.username || 'زائر')
                }
                canModerate={canModerate}
                openReportId={openReportMsgId}
                onToggleReportMenu={setOpenReportMsgId}
                onSelectReportReason={handleSelectReportReason}
                onDelete={onDeleteChatMessage}
              />
            ))
          )}
        </div>

        {/* Status / Anti-Spam / 5s Cooldown Notice */}
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
        <form
          onSubmit={handleSend}
          className="p-3 bg-[#0A192F] border-t border-[#334155] space-y-2 shrink-0"
        >
          {/* Formatting Toolbar: Color Picker + Emoji Picker + 5s Timer Indicator */}
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

            {cooldownSeconds > 0 ? (
              <span className="text-[11px] font-mono-tabular font-bold text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>انتظر {cooldownSeconds} ث</span>
              </span>
            ) : (
              <span className="text-[10px] text-[#94A3B8]">
                سطران كحد أقصى · فاصل 5 ثوانٍ
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
              placeholder="اكتب رسالتك هنا (حتى سطرين)..."
              className="flex-1 rounded-2xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3.5 py-2 text-xs sm:text-sm font-bold outline-none resize-none leading-snug"
            />

            {/* Send Button on the Left ("وعلى اليسار زر إرسال") */}
            <button
              type="submit"
              disabled={cooldownSeconds > 0 || !draftText.trim()}
              className="fluent-reveal h-11 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-lg"
            >
              <Send className="w-4 h-4 relative z-10" />
              <span className="relative z-10">
                {cooldownSeconds > 0 ? `${cooldownSeconds}ث` : 'إرسال'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

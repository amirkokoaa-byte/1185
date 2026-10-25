import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  Smile,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Flag,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  CornerDownLeft,
  Pin,
  Clock,
  Filter,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Radio,
  MoreHorizontal,
  Bookmark,
  Edit3,
  ChevronDown,
  Minus,
  X,
  Ban,
  Heart,
  Bell,
  CheckCheck,
  Eye,
  EyeOff,
  MessageSquareOff,
} from 'lucide-react';
import {
  ChatModerationPenalty,
  ChatTypingEntry,
  CommentEmojiReactionType,
  CommunityCommentItem,
  CommunityCommentReply,
  CommunityPostItem,
  CommunityPostStatus,
  CommunityPostType,
  CommunityReportReason,
  LiveChatMessageItem,
  PrivateChatMessageItem,
  PrivateChatReportItem,
  PrivateChatStatus,
  UserAccount,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { LiveCommunityChatModal } from './LiveCommunityChatModal';
import {
  ABUSIVE_CONTENT_WARNING_MESSAGE,
  containsAbusiveWords,
} from '../services/profanityFilter';
import {
  getOrCreateVisitorId,
  RealOnlinePresenceStats,
} from '../services/storageService';

interface CommunityHubViewProps {
  posts: CommunityPostItem[];
  liveChatMessages: LiveChatMessageItem[];
  onlineCount: number;
  onlineStats?: RealOnlinePresenceStats;
  currentUser: UserAccount | null;
  users?: UserAccount[];
  cooldownConfigSeconds?: number;
  autoClearMinutes?: number;
  lastClearedAt?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  hideLiveChatButton?: boolean;
  savedPostsNamespace?: string;
  allowedPostTypes?: CommunityPostType[];
  topWarningBannerText?: string;
  enableBuySellPrivateChat?: boolean;
  chatOnlyOverlayMode?: boolean;
  externalOpenChatTarget?: {
    partnerId: string;
    partnerUsername: string;
    tick: number;
  } | null;
  externalOpenHistoryModalTick?: number;
  externalLoginNotification?: {
    senderUsername: string;
    partnerId: string;
    partnerUsername: string;
    text: string;
    tick: number;
  } | null;
  chatPenalties?: ChatModerationPenalty[];
  privateChatMessages?: PrivateChatMessageItem[];
  privateChatStatuses?: Record<string, PrivateChatStatus>;
  chatTypingMap?: Record<string, ChatTypingEntry>;
  userBlockedMap?: Record<string, string[]>;
  privateChatReports?: PrivateChatReportItem[];
  onOpenAuthModal: () => void;
  onAddCommunityPost: (post: CommunityPostItem) => void;
  onEditCommunityPost?: (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => void;
  onUpdatePostStatus: (postId: string, status: CommunityPostStatus) => void;
  onDeletePost: (postId: string) => void;
  onTogglePinPost?: (postId: string) => void;
  onTogglePostSold?: (postId: string) => void;
  onTogglePostCommentsDisabled?: (postId: string) => void;
  onTogglePostLike: (postId: string) => void;
  onTogglePostDislike: (postId: string) => void;
  onReportPost: (postId: string, reason: CommunityReportReason) => void;
  onRestoreReportedPost: (postId: string) => void;
  onAddCommentToPost: (postId: string, comment: CommunityCommentItem) => void;
  onToggleCommentLike: (postId: string, commentId: string) => void;
  onToggleCommentEmoji: (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => void;
  onAddReplyToComment: (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => void;
  onReportComment: (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onRestoreReportedComment: (postId: string, commentId: string) => void;
  onTogglePinComment: (postId: string, commentId: string) => void;
  onToggleHideComment?: (postId: string, commentId: string) => void;
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
  onUnblockUserInChat?: (targetUserIdOrName: string) => void;
  onTogglePrivateMessageReaction?: (
    msgId: string,
    reaction: 'like' | 'dislike' | 'heart'
  ) => void;
  onReportPrivateChatMessage?: (
    msgId: string,
    reportedUserId: string,
    reportedUsername: string,
    messageText: string,
    reason: CommunityReportReason
  ) => void;
  onReportUserInPrivateChat?: (
    reportedUserId: string,
    reportedUsername: string,
    reason: string,
    sampleMessage?: string
  ) => void;
  onDismissPrivateChatReport?: (reportId: string) => void;
  onDeleteUserAccountFromChat?: (
    targetUserId: string,
    targetUsername: string
  ) => void;
}

const REPORT_REASONS: CommunityReportReason[] = [
  'إبلاغ عن إساءة',
  'إبلاغ عن محتوى غير لائق',
  'إبلاغ عن محتوى كاذب',
  'الإبلاغ عن محتوى غير صادق',
];

const WHATSAPP_EMOJI_GROUPS: Array<{
  category: string;
  icon: string;
  emojis: string[];
}> = [
  {
    category: 'ابتسامات ووجوه',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳',
      '🤔', '🫡', '🤗', '🤭', '😮', '😲', '🥺', '😢', '😭', '😤',
    ],
  },
  {
    category: 'قلوب وإشارات',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💝',
      '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🫶', '👋', '✌️',
      '👌', '🤞', '☝️', '👇', '👈', '👉', '🔥', '✨', '🌟', '💯',
    ],
  },
  {
    category: 'مناسبات وأنشطة',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '🚀', '⚡', '💡',
      '📢', '🔔', '📌', '📍', '🛒', '💰', '💎', '📱', '💻', '⌚',
      '🚗', '🚕', '🏠', '🏥', '🕌', '📚', '🎓', '⚽', '☕', '🌹',
    ],
  },
];

/**
 * Formats elapsed time since post creation in real time
 * More than 24h shows: منذ يوم -> منذ يومين -> منذ 3 أيام -> منذ 4 أيام ... وهكذا
 */
export function formatTextualArabicElapsedTime(isoDate: string, nowTick?: number): string {
  const nowMs = nowTick || Date.now();
  const createdMs = new Date(isoDate).getTime();
  if (Number.isNaN(createdMs)) return 'منذ لحظات';
  const diffSeconds = Math.max(0, Math.floor((nowMs - createdMs) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) return 'الآن';
  if (diffSeconds < 60) return `منذ ${diffSeconds} ثانية`;
  if (diffMinutes === 1) return 'منذ دقيقة';
  if (diffMinutes === 2) return 'منذ دقيقتين';
  if (diffMinutes <= 10) return `منذ ${diffMinutes} دقائق`;
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffHours === 1) return 'منذ ساعة';
  if (diffHours === 2) return 'منذ ساعتين';
  if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'منذ يوم';
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays === 3) return 'منذ ثلاث أيام';
  if (diffDays <= 10) return `منذ ${diffDays} أيام`;
  return `منذ ${diffDays} يوم`;
}

export function formatArabicPostDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate.slice(0, 10);
  }
}

export function formatArabicDateTimeFull(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

export const CommunityHubView: React.FC<CommunityHubViewProps> = ({
  posts,
  liveChatMessages,
  onlineCount,
  onlineStats,
  currentUser,
  users = [],
  cooldownConfigSeconds = 5,
  autoClearMinutes = 60,
  lastClearedAt,
  sectionTitle = 'مجتمع',
  sectionSubtitle = 'شارك استفساراتك، اقتراحاتك، وإعلانات البيع والشراء مع أهالي المنطقة',
  hideLiveChatButton = false,
  savedPostsNamespace = 'community',
  allowedPostTypes = ['استفسار', 'اقتراح', 'بيع'],
  topWarningBannerText,
  enableBuySellPrivateChat = false,
  chatOnlyOverlayMode = false,
  externalOpenChatTarget = null,
  externalOpenHistoryModalTick = 0,
  externalLoginNotification = null,
  chatPenalties = [],
  privateChatMessages = [],
  privateChatStatuses = {},
  chatTypingMap = {},
  userBlockedMap = {},
  privateChatReports = [],
  onOpenAuthModal,
  onAddCommunityPost,
  onEditCommunityPost,
  onUpdatePostStatus,
  onDeletePost,
  onTogglePinPost,
  onTogglePostSold,
  onTogglePostCommentsDisabled,
  onTogglePostLike,
  onTogglePostDislike,
  onReportPost,
  onRestoreReportedPost,
  onAddCommentToPost,
  onToggleCommentLike,
  onToggleCommentEmoji,
  onAddReplyToComment,
  onReportComment,
  onDeleteComment,
  onRestoreReportedComment,
  onTogglePinComment,
  onToggleHideComment,
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
  onUnblockUserInChat,
  onTogglePrivateMessageReaction,
  onReportPrivateChatMessage,
  onReportUserInPrivateChat,
  onDismissPrivateChatReport,
  onDeleteUserAccountFromChat,
}) => {
  const isStrictAdmin = currentUser?.role === 'admin';
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const visitorId = getOrCreateVisitorId(currentUser);
  const visitorName = currentUser?.username || 'زائر';

  // Live Chat Modal State ("محادثة لايف")
  const [isLiveChatOpen, setIsLiveChatOpen] = useState<boolean>(false);

  // Live Clock Tick to keep "الوقت المنقضي منذ النشر" updated in real-time every second
  const [liveTimeTick, setLiveTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTimeTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // View Mode: Public Community Feed vs Full Internal Admin Management Screen ("إدارة")
  const [isAdminManagementView, setIsAdminManagementView] = useState<boolean>(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'approvals' | 'reports'>(
    'approvals'
  );
  const [reportsFilterType, setReportsFilterType] = useState<
    'posts' | 'comments' | 'chat'
  >('posts');

  // Top-Left Filter Dropdown State: ('الكل' | 'استفسار' | 'اقتراح' | 'بيع')
  const [selectedPostTypeFilter, setSelectedPostTypeFilter] = useState<
    'الكل' | CommunityPostType
  >('الكل');

  // Infinite Scroll Pagination State: Initial 4 posts, auto-load 4 more on scroll to bottom
  const [visiblePostCount, setVisiblePostCount] = useState<number>(4);
  const infiniteScrollSentinelRef = useRef<HTMLDivElement | null>(null);

  // Saved Posts State ("المنشورات المحفوظة") per user
  const savedPostsStorageKey = `fluent_saved_posts_v1_${savedPostsNamespace}_${visitorId}`;
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`fluent_saved_posts_v1_${visitorId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [isSavedPostsModalOpen, setIsSavedPostsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(savedPostsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedPostIds(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setSavedPostIds([]);
  }, [savedPostsStorageKey]);

  const toggleSavePost = (postId: string) => {
    setSavedPostIds((prev) => {
      const exists = prev.includes(postId);
      const next = exists ? prev.filter((id) => id !== postId) : [postId, ...prev];
      try {
        localStorage.setItem(savedPostsStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      setReportFeedbackBanner(
        exists
          ? 'تمت إزالة المنشور من قائمة المنشورات المحفوظة.'
          : 'تم حفظ المنشور في قائمة المنشورات المحفوظة بنجاح!'
      );
      return next;
    });
  };

  // Facebook-style Post Composer States
  const [composerText, setComposerText] = useState<string>('');
  const [composerPostType, setComposerPostType] = useState<CommunityPostType>(
    allowedPostTypes[0] || 'استفسار'
  );
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
  const [activeEmojiGroupIdx, setActiveEmojiGroupIdx] = useState<number>(0);
  const [submissionNotice, setSubmissionNotice] = useState<string>('');
  const [profanityAlert, setProfanityAlert] = useState<string>('');

  useEffect(() => {
    if (!allowedPostTypes.includes(composerPostType)) {
      setComposerPostType(allowedPostTypes[0] || 'استفسار');
    }
    if (
      selectedPostTypeFilter !== 'الكل' &&
      !allowedPostTypes.includes(selectedPostTypeFilter)
    ) {
      setSelectedPostTypeFilter('الكل');
    }
  }, [allowedPostTypes, composerPostType, selectedPostTypeFilter]);

  // Per-Post Interactive UI States ("المزيد" menu, inline editing, reporting)
  const [openMoreMenuPostId, setOpenMoreMenuPostId] = useState<string | null>(null);
  const [openReportSubMenuPostId, setOpenReportSubMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState<string>('');
  const [editingPostType, setEditingPostType] = useState<CommunityPostType>(
    allowedPostTypes[0] || 'استفسار'
  );
  const [openReportMenuId, setOpenReportMenuId] = useState<string | null>(null);
  const [openCommentInputForPost, setOpenCommentInputForPost] = useState<
    Record<string, boolean>
  >({});
  const [expandedAllCommentsForPost, setExpandedAllCommentsForPost] = useState<
    Record<string, boolean>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyingToCommentKey, setReplyingToCommentKey] = useState<string | null>(
    null
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [reportFeedbackBanner, setReportFeedbackBanner] = useState<string>('');

  // Close "المزيد" menu when clicking anywhere outside
  useEffect(() => {
    if (!openMoreMenuPostId) return;
    const handleDocClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && target.closest('[data-more-menu-container="true"]')) {
        return;
      }
      setOpenMoreMenuPostId(null);
      setOpenReportSubMenuPostId(null);
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [openMoreMenuPostId]);

  // ============================================================================
  // Persistent Bottom-Left Square Private Chat Box (Up to 2 Open Chats, Classic FB Minimize '-', Close 'x', Block, Report, Reactions, & 2s Notification)
  // ============================================================================
  const openPopupStorageKey = 'nakhil_1185_buy_sell_open_popup_v1';
  const chatHistoryPartnersStorageKey = `nakhil_1185_buy_sell_history_partners_v1_${visitorId}`;

  const [openChatTabs, setOpenChatTabs] = useState<
    Array<{ partnerId: string; partnerUsername: string }>
  >(() => {
    try {
      const raw = localStorage.getItem(openPopupStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tabs)) {
          return parsed.tabs.slice(0, 2);
        }
        if (parsed && parsed.partnerUsername) {
          return [
            {
              partnerId: parsed.partnerId || parsed.partnerUsername,
              partnerUsername: parsed.partnerUsername,
            },
          ];
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeChatUsername, setActiveChatUsername] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(openPopupStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.activeUsername === 'string') {
          return parsed.activeUsername;
        }
        if (parsed && typeof parsed.partnerUsername === 'string') {
          return parsed.partnerUsername;
        }
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(openPopupStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.isMinimized);
      }
    } catch {
      // ignore
    }
    return false;
  });

  // Sync openChatTabs + activeChatUsername + isChatMinimized to localStorage so it survives page refresh
  useEffect(() => {
    try {
      if (openChatTabs.length === 0) {
        localStorage.removeItem(openPopupStorageKey);
      } else {
        localStorage.setItem(
          openPopupStorageKey,
          JSON.stringify({
            tabs: openChatTabs,
            activeUsername:
              activeChatUsername || openChatTabs[0]?.partnerUsername || '',
            isMinimized: isChatMinimized,
          })
        );
      }
    } catch {
      // ignore
    }
  }, [openChatTabs, activeChatUsername, isChatMinimized]);

  const activeBottomLeftChat = useMemo(() => {
    if (openChatTabs.length === 0) return null;
    const normActive = activeChatUsername.trim().toLowerCase();
    return (
      openChatTabs.find(
        (t) => t.partnerUsername.trim().toLowerCase() === normActive
      ) || openChatTabs[0]
    );
  }, [openChatTabs, activeChatUsername]);

  const [savedHistoryPartners, setSavedHistoryPartners] = useState<
    Array<{ partnerId: string; partnerUsername: string; updatedAt: string }>
  >(() => {
    try {
      const raw = localStorage.getItem(chatHistoryPartnersStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatHistoryPartnersStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedHistoryPartners(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, [chatHistoryPartnersStorageKey]);

  const [isChatHistoryModalOpen, setIsChatHistoryModalOpen] = useState<boolean>(false);
  const [isBlockedUsersModalOpen, setIsBlockedUsersModalOpen] = useState<boolean>(false);
  const [bottomLeftChatDraft, setBottomLeftChatDraft] = useState<string>('');
  const [openChatHeaderReportMenu, setOpenChatHeaderReportMenu] = useState<boolean>(false);
  const [openPrivateMsgReportId, setOpenPrivateMsgReportId] = useState<string | null>(null);
  const [chatActionToast, setChatActionToast] = useState<string>('');
  const bottomLeftMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const bottomLeftTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2-Second On-Screen Notification Toast when messaging or receiving a private message
  const [screenChatNotification, setScreenChatNotification] = useState<{
    id: string;
    senderUsername: string;
    partnerId: string;
    partnerUsername: string;
    text: string;
  } | null>(null);
  const screenNotifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenPrivateMsgIdsRef = useRef<Set<string> | null>(null);

  const triggerScreenChatNotification = (
    senderUsername: string,
    partnerId: string,
    partnerUsername: string,
    text: string
  ) => {
    if (screenNotifTimeoutRef.current) {
      clearTimeout(screenNotifTimeoutRef.current);
    }
    setScreenChatNotification({
      id: `notif-${Date.now()}`,
      senderUsername,
      partnerId: partnerId || partnerUsername,
      partnerUsername,
      text,
    });
    screenNotifTimeoutRef.current = setTimeout(() => {
      setScreenChatNotification(null);
    }, 5000);

    // Also trigger external browser Notification API if available
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const n = new Notification(`رسالة خاصة من ${senderUsername}`, {
            body: text,
          });
          n.onclick = () => {
            window.focus();
            openBottomLeftPrivateChat(partnerId || partnerUsername, partnerUsername);
          };
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      if (screenNotifTimeoutRef.current) {
        clearTimeout(screenNotifTimeoutRef.current);
      }
    };
  }, []);

  const recordPartnerInHistory = (partnerId: string, partnerUsername: string) => {
    const cleanName = partnerUsername.trim();
    if (!cleanName) return;
    setSavedHistoryPartners((prev) => {
      const norm = cleanName.toLowerCase();
      const filtered = prev.filter(
        (item) => item.partnerUsername.trim().toLowerCase() !== norm
      );
      const next = [
        {
          partnerId: partnerId || cleanName,
          partnerUsername: cleanName,
          updatedAt: new Date().toISOString(),
        },
        ...filtered,
      ];
      try {
        localStorage.setItem(chatHistoryPartnersStorageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Open or switch to a partner in the bottom-left chat box (supports up to 2 open chats at the same time)
  const openBottomLeftPrivateChat = (partnerId: string, partnerUsername: string) => {
    const cleanName = partnerUsername.trim();
    if (!cleanName) return;
    const target = {
      partnerId: partnerId || cleanName,
      partnerUsername: cleanName,
    };

    setOpenChatTabs((prev) => {
      const targetNorm = cleanName.toLowerCase();
      const existingIdx = prev.findIndex(
        (t) => t.partnerUsername.trim().toLowerCase() === targetNorm
      );
      if (existingIdx !== -1) {
        return prev;
      }
      if (prev.length < 2) {
        return [...prev, target];
      }
      // If 2 chats are already open, keep the currently active chat tab and open the new one beside it
      const currentActiveNorm = activeChatUsername.trim().toLowerCase();
      const keptTab =
        prev.find(
          (t) => t.partnerUsername.trim().toLowerCase() === currentActiveNorm
        ) || prev[prev.length - 1];
      return [keptTab, target];
    });

    setActiveChatUsername(cleanName);
    setIsChatMinimized(false);
    setOpenChatHeaderReportMenu(false);
    setOpenPrivateMsgReportId(null);
    recordPartnerInHistory(target.partnerId, target.partnerUsername);
    onMarkPrivateMessagesRead?.(target.partnerUsername);
  };

  useEffect(() => {
    if (externalOpenChatTarget && externalOpenChatTarget.tick > 0) {
      openBottomLeftPrivateChat(
        externalOpenChatTarget.partnerId,
        externalOpenChatTarget.partnerUsername
      );
    }
  }, [externalOpenChatTarget?.tick]);

  useEffect(() => {
    if (externalOpenHistoryModalTick && externalOpenHistoryModalTick > 0) {
      setIsChatHistoryModalOpen(true);
    }
  }, [externalOpenHistoryModalTick]);

  useEffect(() => {
    if (externalLoginNotification && externalLoginNotification.tick > 0) {
      recordPartnerInHistory(
        externalLoginNotification.partnerId,
        externalLoginNotification.partnerUsername
      );
      triggerScreenChatNotification(
        externalLoginNotification.senderUsername,
        externalLoginNotification.partnerId,
        externalLoginNotification.partnerUsername,
        externalLoginNotification.text
      );
    }
  }, [externalLoginNotification?.tick]);

  // Close ONLY a single person's chat tab (via the 'x' button next to their name)
  const closeSingleChatTab = (partnerUsernameToClose: string) => {
    const normClose = partnerUsernameToClose.trim().toLowerCase();
    onSetChatTypingStatus?.(`private:${partnerUsernameToClose}`, false);

    setOpenChatTabs((prev) => {
      const remaining = prev.filter(
        (t) => t.partnerUsername.trim().toLowerCase() !== normClose
      );
      if (remaining.length > 0) {
        setActiveChatUsername(remaining[0].partnerUsername);
      } else {
        setActiveChatUsername('');
        setIsChatMinimized(false);
      }
      return remaining;
    });
  };

  // Close all open chat tabs permanently
  const closeAllBottomLeftChats = () => {
    openChatTabs.forEach((t) => {
      onSetChatTypingStatus?.(`private:${t.partnerUsername}`, false);
    });
    setOpenChatTabs([]);
    setActiveChatUsername('');
    setIsChatMinimized(false);
    setOpenChatHeaderReportMenu(false);
    setOpenPrivateMsgReportId(null);
    try {
      localStorage.removeItem(openPopupStorageKey);
    } catch {
      // ignore
    }
  };

  // Compute all conversations involving the current user for "سجل المحادثات"
  const myNormName = visitorName.trim().toLowerCase();

  // Detect new incoming private messages in real-time to show the 2-second notification and record in history
  useEffect(() => {
    const list = privateChatMessages || [];
    if (seenPrivateMsgIdsRef.current === null) {
      seenPrivateMsgIdsRef.current = new Set(list.map((m) => m.id));
      return;
    }
    const seen = seenPrivateMsgIdsRef.current;
    let latestNewIncoming: PrivateChatMessageItem | null = null;
    for (const msg of list) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        const sNorm = msg.senderUsername.trim().toLowerCase();
        const rNorm = msg.receiverUsername.trim().toLowerCase();
        const isMeSender = msg.senderId === visitorId || sNorm === myNormName;
        const isMeReceiver = msg.receiverId === visitorId || rNorm === myNormName;
        if (isMeReceiver && !isMeSender) {
          latestNewIncoming = msg;
        }
      }
    }
    if (latestNewIncoming) {
      recordPartnerInHistory(
        latestNewIncoming.senderId,
        latestNewIncoming.senderUsername
      );
      if (enableBuySellPrivateChat) {
        triggerScreenChatNotification(
          latestNewIncoming.senderUsername,
          latestNewIncoming.senderId,
          latestNewIncoming.senderUsername,
          latestNewIncoming.text
        );
      }
    }
  }, [privateChatMessages, visitorId, myNormName, enableBuySellPrivateChat]);

  const previousConversationsList = useMemo(() => {
    const map = new Map<
      string,
      {
        partnerId: string;
        partnerUsername: string;
        lastMessageText: string;
        lastMessageAt: string;
        unreadCount: number;
        totalMessages: number;
      }
    >();

    // 1. Seed from saved history partners
    savedHistoryPartners.forEach((p) => {
      const norm = p.partnerUsername.trim().toLowerCase();
      if (!norm) return;
      map.set(norm, {
        partnerId: p.partnerId,
        partnerUsername: p.partnerUsername,
        lastMessageText: 'بدأت محادثة خاصة',
        lastMessageAt: p.updatedAt,
        unreadCount: 0,
        totalMessages: 0,
      });
    });

    // 2. Merge actual privateChatMessages involving current user
    (privateChatMessages || []).forEach((msg) => {
      const sNorm = msg.senderUsername.trim().toLowerCase();
      const rNorm = msg.receiverUsername.trim().toLowerCase();
      const isMeSender = msg.senderId === visitorId || sNorm === myNormName;
      const isMeReceiver = msg.receiverId === visitorId || rNorm === myNormName;
      if (!isMeSender && !isMeReceiver) return;

      const partnerUsername = isMeSender
        ? msg.receiverUsername
        : msg.senderUsername;
      const partnerId = isMeSender ? msg.receiverId : msg.senderId;
      const partnerNorm = partnerUsername.trim().toLowerCase();
      if (!partnerNorm) return;

      const existing = map.get(partnerNorm);
      const unreadIncrement = isMeReceiver && !msg.isRead ? 1 : 0;
      map.set(partnerNorm, {
        partnerId: partnerId || existing?.partnerId || partnerUsername,
        partnerUsername: existing?.partnerUsername || partnerUsername,
        lastMessageText: msg.text,
        lastMessageAt: msg.createdAt,
        unreadCount: (existing?.unreadCount || 0) + unreadIncrement,
        totalMessages: (existing?.totalMessages || 0) + 1,
      });
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [savedHistoryPartners, privateChatMessages, visitorId, myNormName]);

  // Messages for the currently active tab in the bottom-left square chat popup
  const activeBottomLeftMessages = useMemo(() => {
    if (!activeBottomLeftChat) return [];
    const targetNorm = activeBottomLeftChat.partnerUsername.trim().toLowerCase();
    return (privateChatMessages || []).filter((msg) => {
      const sNorm = msg.senderUsername.trim().toLowerCase();
      const rNorm = msg.receiverUsername.trim().toLowerCase();
      const isMeSender = msg.senderId === visitorId || sNorm === myNormName;
      const isMeReceiver = msg.receiverId === visitorId || rNorm === myNormName;
      if (targetNorm === myNormName) {
        return isMeSender && isMeReceiver;
      }
      return (
        (isMeSender && rNorm === targetNorm) ||
        (isMeReceiver && sNorm === targetNorm)
      );
    });
  }, [activeBottomLeftChat, privateChatMessages, visitorId, myNormName]);

  // Check if the partner in the bottom-left chat popup is currently typing to us
  const isBottomLeftPartnerTyping = useMemo(() => {
    if (!activeBottomLeftChat) return false;
    const partnerNorm = activeBottomLeftChat.partnerUsername.trim().toLowerCase();
    const now = Date.now();
    return Object.values(chatTypingMap || {}).some((entry) => {
      if (!entry || now - entry.updatedAt >= 6000) return false;
      const entryUserNorm = entry.username.trim().toLowerCase();
      if (entryUserNorm !== partnerNorm) return false;
      const targetClean = (entry.targetUsername || entry.targetKey || '')
        .replace(/^private:/i, '')
        .trim()
        .toLowerCase();
      return targetClean === myNormName || targetClean === visitorId.toLowerCase();
    });
  }, [activeBottomLeftChat, chatTypingMap, myNormName, visitorId]);

  const hasUnreadIncomingInActiveChat = useMemo(() => {
    if (!activeBottomLeftChat) return false;
    return activeBottomLeftMessages.some((m) => {
      const sNorm = m.senderUsername.trim().toLowerCase();
      const isMeSender = m.senderId === visitorId || sNorm === myNormName;
      return !isMeSender && !m.isRead;
    });
  }, [activeBottomLeftChat, activeBottomLeftMessages, visitorId, myNormName]);

  useEffect(() => {
    if (
      activeBottomLeftChat &&
      !isChatMinimized &&
      activeBottomLeftMessages.length > 0
    ) {
      bottomLeftMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (hasUnreadIncomingInActiveChat) {
        onMarkPrivateMessagesRead?.(activeBottomLeftChat.partnerUsername);
      }
    }
  }, [
    activeBottomLeftChat,
    isChatMinimized,
    activeBottomLeftMessages.length,
    hasUnreadIncomingInActiveChat,
    isBottomLeftPartnerTyping,
  ]);

  const myBlockedUserKeys = useMemo(() => {
    const list1 = userBlockedMap[visitorId] || [];
    const list2 = userBlockedMap[visitorName.trim().toLowerCase()] || [];
    return new Set(
      [...list1, ...list2].map((k) => k.trim()).filter(Boolean)
    );
  }, [userBlockedMap, visitorId, visitorName]);

  // Clean deduplicated list of blocked accounts for "قائمة الحظر" modal
  const myBlockedAccountsList = useMemo(() => {
    const rawKeys = Array.from(myBlockedUserKeys);
    const byNormName = new Map<string, { id: string; username: string }>();

    rawKeys.forEach((key) => {
      const cleanKey = key.trim();
      if (!cleanKey) return;
      const keyLower = cleanKey.toLowerCase();

      // Try to resolve if cleanKey is a userId
      const matchedUser = users.find(
        (u) =>
          u.id === cleanKey || u.username.trim().toLowerCase() === keyLower
      );
      if (matchedUser) {
        const uNorm = matchedUser.username.trim().toLowerCase();
        byNormName.set(uNorm, {
          id: matchedUser.id,
          username: matchedUser.username.trim(),
        });
        return;
      }

      // Skip raw generated IDs if we already have or will have their username
      if (
        cleanKey.startsWith('usr-') ||
        cleanKey.startsWith('vis-') ||
        cleanKey.startsWith('u-')
      ) {
        // Check if we can find their username in posts or privateChatMessages
        const postMatch = posts.find((p) => p.authorId === cleanKey);
        if (postMatch) {
          const pNorm = postMatch.authorUsername.trim().toLowerCase();
          byNormName.set(pNorm, {
            id: cleanKey,
            username: postMatch.authorUsername.trim(),
          });
          return;
        }
        const msgMatch = (privateChatMessages || []).find(
          (m) => m.senderId === cleanKey || m.receiverId === cleanKey
        );
        if (msgMatch) {
          const name =
            msgMatch.senderId === cleanKey
              ? msgMatch.senderUsername
              : msgMatch.receiverUsername;
          const mNorm = name.trim().toLowerCase();
          byNormName.set(mNorm, { id: cleanKey, username: name.trim() });
          return;
        }
        return;
      }

      if (!byNormName.has(keyLower)) {
        byNormName.set(keyLower, { id: cleanKey, username: cleanKey });
      }
    });

    return Array.from(byNormName.values());
  }, [myBlockedUserKeys, users, posts, privateChatMessages]);

  // Check if active chat partner is blocked by me or has blocked me
  const isActivePartnerBlockedByMe = useMemo(() => {
    if (!activeBottomLeftChat) return false;
    const pId = activeBottomLeftChat.partnerId.trim();
    const pNorm = activeBottomLeftChat.partnerUsername.trim().toLowerCase();
    return (
      myBlockedUserKeys.has(pId) ||
      myBlockedUserKeys.has(pNorm) ||
      myBlockedUserKeys.has(activeBottomLeftChat.partnerUsername.trim())
    );
  }, [activeBottomLeftChat, myBlockedUserKeys]);

  const amIBlockedByActivePartner = useMemo(() => {
    if (!activeBottomLeftChat) return false;
    const pId = activeBottomLeftChat.partnerId.trim();
    const pNorm = activeBottomLeftChat.partnerUsername.trim().toLowerCase();
    const theirBlocked = new Set([
      ...(userBlockedMap[pId] || []),
      ...(userBlockedMap[pNorm] || []),
      ...(userBlockedMap[activeBottomLeftChat.partnerUsername.trim()] || []),
    ]);
    return (
      theirBlocked.has(visitorId) ||
      theirBlocked.has(myNormName) ||
      theirBlocked.has(visitorName.trim())
    );
  }, [activeBottomLeftChat, userBlockedMap, visitorId, myNormName, visitorName]);

  // Approved Posts Filtered by Type & Sorted so Pinned Posts ("منشور مثبت") always stay at the top
  const approvedPosts = useMemo(() => {
    return posts
      .filter(
        (p) =>
          p.status === 'approved' &&
          !myBlockedUserKeys.has(p.authorId) &&
          !myBlockedUserKeys.has(p.authorUsername.trim().toLowerCase())
      )
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [posts, myBlockedUserKeys]);
  const filteredApprovedPosts = approvedPosts.filter((p) =>
    selectedPostTypeFilter === 'الكل' ? true : p.postType === selectedPostTypeFilter
  );

  const savedPostsList = approvedPosts.filter((p) => savedPostIds.includes(p.id));

  // Reset pagination to 4 when filter changes
  useEffect(() => {
    setVisiblePostCount(4);
  }, [selectedPostTypeFilter]);

  // Automatic Infinite Scroll Observer: Loads 4 more posts each time when scrolling to the bottom
  useEffect(() => {
    const sentinel = infiniteScrollSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          visiblePostCount < filteredApprovedPosts.length
        ) {
          setVisiblePostCount((prev) =>
            Math.min(filteredApprovedPosts.length, prev + 4)
          );
        }
      },
      { threshold: 0.15, rootMargin: '120px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visiblePostCount, filteredApprovedPosts.length, isAdminManagementView]);

  // Pending & Rejected Posts for Current User / Admin
  const pendingPostsAll = posts.filter((p) => p.status === 'pending');
  const myPendingPosts = posts.filter(
    (p) => p.status === 'pending' && p.authorId === visitorId
  );
  const myRejectedPosts = posts.filter(
    (p) => p.status === 'rejected' && p.authorId === visitorId
  );

  // Reported Posts & Reported Comments for Admin "بلاغات" Tab
  const reportedPostsList = posts.filter(
    (p) => Array.isArray(p.reports) && p.reports.length > 0
  );
  const reportedCommentsList: Array<{
    post: CommunityPostItem;
    comment: CommunityCommentItem;
  }> = [];
  posts.forEach((p) => {
    (p.comments || []).forEach((c) => {
      if (Array.isArray(c.reports) && c.reports.length > 0) {
        reportedCommentsList.push({ post: p, comment: c });
      }
    });
  });

  const totalAdminAlertsCount =
    pendingPostsAll.length +
    reportedPostsList.length +
    reportedCommentsList.length +
    (privateChatReports || []).length;

  // Handle New Post Submission ("انشر" - Requires Login + Profanity Filter)
  const handlePublishPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    if (!composerText.trim()) return;

    if (containsAbusiveWords(composerText)) {
      setProfanityAlert(ABUSIVE_CONTENT_WARNING_MESSAGE);
      return;
    }
    setProfanityAlert('');

    const newPost: CommunityPostItem = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorUsername: currentUser.username,
      postType: composerPostType,
      status: 'pending', // Strictly goes to pending for Admin approval first
      content: composerText.trim(),
      likes: [],
      dislikes: [],
      comments: [],
      reports: [],
      createdAt: new Date().toISOString(),
    };

    onAddCommunityPost(newPost);
    setComposerText('');
    setIsEmojiPickerOpen(false);
    setSubmissionNotice('يتم عرض المنشور للموافقة عليه من المسؤول');
  };

  // Badge styling helper for Post Type ('استفسار' | 'اقتراح' | 'بيع' | 'بائع' | 'مشتري')
  const getPostTypeBadgeStyle = (type: CommunityPostType) => {
    switch (type) {
      case 'استفسار':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/50';
      case 'اقتراح':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/50';
      case 'بيع':
      case 'بائع':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50';
      case 'مشتري':
        return 'bg-amber-500/20 text-amber-300 border-amber-400/50';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-400/50';
    }
  };

  // ============================================================================
  // FULL INTERNAL ADMIN MANAGEMENT SCREEN ("شاشة إدارة الداخلية الكاملة")
  // ============================================================================
  if (isAdmin && isAdminManagementView) {
    return (
      <div className="space-y-6 w-full max-w-5xl mx-auto overflow-x-hidden">
        {/* Internal Screen Header */}
        <div className="bg-[#112240]/95 border border-sky-400/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-[#F8FAFC]">
                لوحة إدارة المجتمع والرقابة (Admin)
              </h1>
              <p className="text-xs text-[#94A3B8]">
                مراجعة واعتماد المنشورات الجديدة ومعالجة بلاغات المنشورات والتعليقات
              </p>
            </div>
          </div>

          <FluentButton
            variant="secondary"
            size="md"
            onClick={() => setIsAdminManagementView(false)}
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى شاشة المجتمع</span>
          </FluentButton>
        </div>

        {/* Top 2 Tabs: 1) موافقة المنشورات  2) بلاغات */}
        <div className="grid grid-cols-2 gap-3 bg-[#112240]/90 border border-[#334155] rounded-2xl p-2">
          <button
            type="button"
            onClick={() => setAdminActiveTab('approvals')}
            className={`fluent-reveal py-3 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              adminActiveTab === 'approvals'
                ? 'bg-sky-600 text-white shadow-lg'
                : 'bg-[#0A192F]/80 text-[#94A3B8] hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>موافقة المنشورات</span>
            <span className="px-2 py-0.5 rounded-full bg-[#0A192F]/90 text-sky-300 text-xs font-mono-tabular">
              {pendingPostsAll.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminActiveTab('reports');
              if (
                reportedPostsList.length === 0 &&
                reportedCommentsList.length === 0 &&
                (privateChatReports || []).length > 0
              ) {
                setReportsFilterType('chat');
              }
            }}
            className={`fluent-reveal py-3 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              adminActiveTab === 'reports'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'bg-[#0A192F]/80 text-[#94A3B8] hover:text-white'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>بلاغات</span>
            <span className="px-2 py-0.5 rounded-full bg-[#0A192F]/90 text-rose-300 text-xs font-mono-tabular">
              {reportedPostsList.length +
                reportedCommentsList.length +
                (privateChatReports || []).length}
            </span>
          </button>
        </div>

        {/* TAB 1: موافقة المنشورات */}
        {adminActiveTab === 'approvals' && (
          <div className="space-y-4">
            {pendingPostsAll.length === 0 ? (
              <FluentCard className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-base font-extrabold text-[#F8FAFC]">
                  لا توجد منشورات معلقة بانتظار الموافقة حالياً
                </div>
                <p className="text-xs text-[#94A3B8]">
                  تمت مراجعة جميع المنشورات المرسلة من الأعضاء.
                </p>
              </FluentCard>
            ) : (
              pendingPostsAll.map((post) => (
                <FluentCard
                  key={post.id}
                  className="p-5 space-y-4 border-amber-400/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#334155]/80 pb-3">
                    <div>
                      <div className="text-base font-extrabold text-[#F8FAFC]">
                        {post.authorUsername}
                      </div>
                      <div className="text-xs text-[#94A3B8] flex items-center gap-2 mt-0.5">
                        <span>
                          {formatTextualArabicElapsedTime(
                            post.createdAt,
                            liveTimeTick
                          )}
                        </span>
                        <span>·</span>
                        <span>{formatArabicDateTimeFull(post.createdAt)}</span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${getPostTypeBadgeStyle(
                        post.postType
                      )}`}
                    >
                      {post.postType}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-[#F8FAFC] leading-relaxed whitespace-pre-line bg-[#0A192F] p-4 rounded-xl border border-[#334155]">
                    {post.content}
                  </p>

                  {/* Approve ("موافق") & Reject ("غير موافق") Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => onUpdatePostStatus(post.id, 'approved')}
                      className="fluent-reveal px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>موافق (نشر في المجتمع)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdatePostStatus(post.id, 'rejected')}
                      className="fluent-reveal px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>غير موافق (رفض المنشور)</span>
                    </button>
                  </div>
                </FluentCard>
              ))
            )}
          </div>
        )}

        {/* TAB 2: بلاغات (With Top-Left Dropdown for "المنشورات" or "التعليقات") */}
        {adminActiveTab === 'reports' && (
          <div className="space-y-4">
            {/* Top Bar with Filter Dropdown on the Left */}
            <div className="bg-[#112240]/90 border border-[#334155] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#F8FAFC]">
                  سجل البلاغات المرفوعة للمراجعة
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  اختر نوع العناصر المبلغ عنها (المنشورات أو التعليقات) للحذف النهائي أو الاسترجاع
                </p>
              </div>

              {/* Left Dropdown Filter ("المنشورات" أو "التعليقات" أو "بلاغات المحادثات والشات") */}
              <div className="flex items-center gap-2 mr-auto">
                <Filter className="w-4 h-4 text-rose-400" />
                <select
                  value={reportsFilterType}
                  onChange={(e) =>
                    setReportsFilterType(
                      e.target.value as 'posts' | 'comments' | 'chat'
                    )
                  }
                  className="rounded-xl bg-[#0A192F] border border-[#334155] focus:border-rose-400 px-4 py-2 text-xs sm:text-sm text-[#F8FAFC] font-extrabold outline-none"
                >
                  <option value="posts">
                    المنشورات ({reportedPostsList.length})
                  </option>
                  <option value="comments">
                    التعليقات ({reportedCommentsList.length})
                  </option>
                  <option value="chat">
                    بلاغات المحادثات والشات ({(privateChatReports || []).length})
                  </option>
                </select>
              </div>
            </div>

            {/* Reported Posts View */}
            {reportsFilterType === 'posts' && (
              <div className="space-y-4">
                {reportedPostsList.length === 0 ? (
                  <FluentCard className="p-10 text-center text-sm text-[#94A3B8]">
                    لا توجد بلاغات مسجلة على المنشورات حالياً.
                  </FluentCard>
                ) : (
                  reportedPostsList.map((post) => (
                    <FluentCard
                      key={post.id}
                      className="p-5 space-y-4 border-rose-500/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#334155] pb-3">
                        <div>
                          <div className="text-sm font-extrabold text-[#F8FAFC]">
                            صاحب المنشور: {post.authorUsername}
                          </div>
                          <div className="text-xs text-[#94A3B8]">
                            تاريخ وساعة النشر:{' '}
                            <strong className="text-sky-300">
                              {formatArabicDateTimeFull(post.createdAt)}
                            </strong>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-bold border ${getPostTypeBadgeStyle(
                            post.postType
                          )}`}
                        >
                          منشور: {post.postType}
                        </span>
                      </div>

                      {/* Report Reasons & Timestamps */}
                      <div className="space-y-1.5">
                        {post.reports.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-extrabold text-rose-300 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                              <span>نوع البلاغ: {rep.reason}</span>
                            </span>
                            <span className="text-[#94A3B8]">
                              بواسطة: {rep.reporterUsername} ·{' '}
                              {formatArabicDateTimeFull(rep.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Reported Post Content */}
                      <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] text-sm text-[#F8FAFC] whitespace-pre-line">
                        {post.content}
                      </div>

                      {/* Bottom 2 Buttons: "حذف" & "استرجاع" */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => onRestoreReportedPost(post.id)}
                          className="fluent-reveal px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>استرجاع (إلغاء البلاغ)</span>
                        </button>

                        {isStrictAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeletePost(post.id)}
                            className="fluent-reveal px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>حذف نهائي</span>
                          </button>
                        )}
                      </div>
                    </FluentCard>
                  ))
                )}
              </div>
            )}

            {/* Reported Comments View */}
            {reportsFilterType === 'comments' && (
              <div className="space-y-4">
                {reportedCommentsList.length === 0 ? (
                  <FluentCard className="p-10 text-center text-sm text-[#94A3B8]">
                    لا توجد بلاغات مسجلة على التعليقات حالياً.
                  </FluentCard>
                ) : (
                  reportedCommentsList.map(({ post, comment }) => (
                    <FluentCard
                      key={comment.id}
                      className="p-5 space-y-4 border-rose-500/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#334155] pb-3">
                        <div>
                          <div className="text-sm font-extrabold text-[#F8FAFC]">
                            صاحب التعليق: {comment.authorUsername}
                          </div>
                          <div className="text-xs text-[#94A3B8]">
                            تاريخ وساعة التعليق:{' '}
                            <strong className="text-sky-300">
                              {formatArabicDateTimeFull(comment.createdAt)}
                            </strong>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-[#0A192F] border border-[#334155] text-xs text-[#94A3B8]">
                          على منشور: {post.authorUsername}
                        </span>
                      </div>

                      {/* Report Reasons */}
                      <div className="space-y-1.5">
                        {comment.reports.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-extrabold text-rose-300 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                              <span>نوع البلاغ: {rep.reason}</span>
                            </span>
                            <span className="text-[#94A3B8]">
                              بواسطة: {rep.reporterUsername} ·{' '}
                              {formatArabicDateTimeFull(rep.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Reported Comment Text */}
                      <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] text-sm text-[#F8FAFC]">
                        {comment.text}
                      </div>

                      {/* Bottom 2 Buttons: "حذف" & "استرجاع" */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            onRestoreReportedComment(post.id, comment.id)
                          }
                          className="fluent-reveal px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>استرجاع (إلغاء البلاغ)</span>
                        </button>

                        {isStrictAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeleteComment(post.id, comment.id)}
                            className="fluent-reveal px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>حذف نهائي</span>
                          </button>
                        )}
                      </div>
                    </FluentCard>
                  ))
                )}
              </div>
            )}

            {/* Reported Private Chat Messages & Users View */}
            {reportsFilterType === 'chat' && (
              <div className="space-y-4">
                {(privateChatReports || []).length === 0 ? (
                  <FluentCard className="p-10 text-center text-sm text-[#94A3B8]">
                    لا توجد بلاغات مسجلة من شات المحادثات حالياً.
                  </FluentCard>
                ) : (
                  (privateChatReports || []).map((rep) => (
                    <FluentCard
                      key={rep.id}
                      className="p-5 space-y-3 border-rose-500/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#334155] pb-3">
                        <div>
                          <div className="text-sm font-extrabold text-rose-300 flex items-center gap-1.5">
                            <Flag className="w-4 h-4 text-rose-400" />
                            <span>
                              المُبلَّغ ضده: {rep.reportedUsername}
                            </span>
                          </div>
                          <div className="text-xs text-[#94A3B8] mt-1">
                            تم الإبلاغ بواسطة:{' '}
                            <strong className="text-sky-300">
                              {rep.reporterUsername}
                            </strong>{' '}
                            · {formatArabicDateTimeFull(rep.createdAt)}
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-300 text-xs font-extrabold">
                          {rep.reason}
                        </span>
                      </div>

                      {rep.sampleMessage && (
                        <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] text-xs sm:text-sm text-[#F8FAFC]">
                          <span className="text-[#94A3B8] font-bold block mb-1">
                            محتوى الرسالة / تفاصيل البلاغ:
                          </span>
                          {rep.sampleMessage}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onDismissPrivateChatReport?.(rep.id)}
                          className="fluent-reveal px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تمت المراجعة (إغلاق البلاغ)</span>
                        </button>

                        {isStrictAdmin && onDeleteUserAccountFromChat && (
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteUserAccountFromChat(
                                rep.reportedUserId,
                                rep.reportedUsername
                              )
                            }
                            className="fluent-reveal px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Ban className="w-4 h-4" />
                            <span>حظر الحساب من الموقع</span>
                          </button>
                        )}
                      </div>
                    </FluentCard>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // PUBLIC COMMUNITY VIEW ("شاشة المجتمع وإنشاء المنشورات")
  // ============================================================================
  const visiblePostsSlice = filteredApprovedPosts.slice(0, visiblePostCount);

  return (
    <div
      className={
        chatOnlyOverlayMode
          ? 'w-0 h-0 overflow-visible'
          : 'space-y-4 w-full max-w-4xl mx-auto overflow-x-hidden'
      }
    >
      {!chatOnlyOverlayMode && (
        <>
          {/* رسالة تحذيرية بالأعلى في قسم بيع واشتري */}
          {topWarningBannerText && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400/80 text-amber-200 shadow-lg flex items-start sm:items-center gap-3">
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs sm:text-sm font-extrabold leading-relaxed text-[#F8FAFC]">
            {topWarningBannerText}
          </p>
        </div>
      )}

      {/* 1. Top Bar: Title + Single-Row Controls on Mobile */}
      <div className="bg-[#112240]/95 border border-[#334155] rounded-2xl p-2 sm:p-4 shadow-lg space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 overflow-hidden">
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-lg font-extrabold text-[#F8FAFC] truncate">
                {sectionTitle}
              </h1>
              <p className="text-[11px] text-[#94A3B8] hidden sm:block">
                {sectionSubtitle}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminManagementView(true)}
              className="fluent-reveal sm:hidden px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A192F] text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow shrink-0"
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>إدارة</span>
              {totalAdminAlertsCount > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-[#0A192F] text-amber-300 text-[9px] font-mono-tabular">
                  {totalAdminAlertsCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Single-Row Controls on Mobile */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1 sm:gap-2 flex-nowrap overflow-x-auto">
          {/* زر سجل المحادثات + زر قائمة الحظر في الأعلى في بيع واشتري */}
          {enableBuySellPrivateChat && (
            <>
              <button
                type="button"
                onClick={() => setIsChatHistoryModalOpen(true)}
                className="fluent-reveal flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-400/60 text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">سجل المحادثات</span>
                <span className="px-1 sm:px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-200 text-[9px] sm:text-[10px] font-mono-tabular shrink-0">
                  {previousConversationsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsBlockedUsersModalOpen(true)}
                className="fluent-reveal flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-400/60 text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">قائمة الحظر</span>
                <span className="px-1 sm:px-1.5 py-0.2 rounded-full bg-rose-500/25 text-rose-200 text-[9px] sm:text-[10px] font-mono-tabular shrink-0">
                  {myBlockedAccountsList.length}
                </span>
              </button>
            </>
          )}

          {/* 1. زر المنشورات المحفوظة */}
          <button
            type="button"
            onClick={() => setIsSavedPostsModalOpen(true)}
            className="fluent-reveal flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-sky-300 border border-sky-400/50 text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">المنشورات المحفوظة</span>
            <span className="px-1 sm:px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-200 text-[9px] sm:text-[10px] font-mono-tabular shrink-0">
              {savedPostsList.length}
            </span>
          </button>

          {/* 2. ثم محادثة لايف */}
          {!hideLiveChatButton && (
            <button
              type="button"
              onClick={() => setIsLiveChatOpen(true)}
              className="fluent-reveal flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 border border-emerald-400/60 cursor-pointer shadow-[0_0_16px_-3px_rgba(16,185,129,0.5)] whitespace-nowrap"
            >
              <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse relative z-10 shrink-0" />
              <span className="relative z-10 truncate">محادثة لايف</span>
              <span className="relative z-10 px-1 sm:px-1.5 py-0.2 rounded-full bg-[#0A192F]/80 text-emerald-300 text-[9px] sm:text-[10px] font-mono-tabular shrink-0">
                {liveChatMessages.length}
              </span>
            </button>
          )}

          {/* 3. ثم قائمة منسدلة الفلترة */}
          <div className="flex-1 sm:flex-initial min-w-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-sky-400 shrink-0 hidden sm:block" />
            <select
              value={selectedPostTypeFilter}
              onChange={(e) =>
                setSelectedPostTypeFilter(
                  e.target.value as 'الكل' | CommunityPostType
                )
              }
              className="w-full sm:w-auto rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-1.5 sm:px-3 py-1.5 text-[10px] sm:text-xs text-[#F8FAFC] font-extrabold outline-none truncate"
            >
              <option value="الكل">الكل ({approvedPosts.length})</option>
              {allowedPostTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption} (
                  {approvedPosts.filter((p) => p.postType === typeOption).length})
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAdminManagementView(true)}
              className="fluent-reveal hidden sm:flex px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A192F] text-[11px] sm:text-xs font-extrabold items-center gap-1 cursor-pointer shadow-lg whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>إدارة</span>
              {totalAdminAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0A192F] text-amber-300 text-[10px] font-mono-tabular">
                  {totalAdminAlertsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Profanity Warning Banner */}
      {profanityAlert && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-extrabold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{profanityAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setProfanityAlert('')}
            className="text-xs text-rose-200 underline cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Report / Save Feedback Banner */}
      {reportFeedbackBanner && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center justify-between">
          <span>{reportFeedbackBanner}</span>
          <button
            type="button"
            onClick={() => setReportFeedbackBanner('')}
            className="text-xs text-[#94A3B8] hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 2. Compact New Post Composer Box (بحجم مناسب صغير: الاسم في سطر واحد وعلى أقصى اليسار نوع المنشور) */}
      <div className="bg-[#112240]/95 border border-[#334155] rounded-2xl p-3 sm:p-4 space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-[#334155]/80 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 font-extrabold text-xs shrink-0">
              {visitorName.slice(0, 1)}
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
              {visitorName}
            </div>
          </div>

          {/* على أقصى اليسار نوع المنشور */}
          <div className="flex items-center gap-1.5 shrink-0 mr-auto">
            <label className="text-[11px] font-bold text-[#94A3B8] whitespace-nowrap">
              نوع المنشور:
            </label>
            <select
              value={composerPostType}
              onChange={(e) =>
                setComposerPostType(e.target.value as CommunityPostType)
              }
              className="rounded-xl bg-[#0A192F] border border-sky-400/50 px-2.5 py-1 text-xs text-sky-300 font-extrabold outline-none"
            >
              {allowedPostTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!currentUser ? (
          <div className="p-3 rounded-xl bg-[#0A192F] border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs font-extrabold text-amber-300">
              لا يمكن النشر في المجتمع إلا في حالة تسجيل الدخول لحسابك.
            </div>
            <FluentButton
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenAuthModal}
            >
              <span>تسجيل الدخول / إنشاء حساب للنشر</span>
            </FluentButton>
          </div>
        ) : (
          <form onSubmit={handlePublishPostSubmit} className="space-y-2">
            <textarea
              rows={2}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder={`بم تفكر يا ${visitorName}؟ اكتب منشورك هنا...`}
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 p-2.5 text-xs sm:text-sm text-[#F8FAFC] leading-relaxed outline-none"
            />

            {/* Rich WhatsApp-Style Emoji Picker Panel */}
            {isEmojiPickerOpen && (
              <div className="p-2.5 rounded-xl bg-[#0A192F] border border-sky-400/40 space-y-2">
                <div className="flex items-center justify-between border-b border-[#334155] pb-1.5">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {WHATSAPP_EMOJI_GROUPS.map((grp, idx) => (
                      <button
                        key={grp.category}
                        type="button"
                        onClick={() => setActiveEmojiGroupIdx(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                          activeEmojiGroupIdx === idx
                            ? 'bg-sky-600 text-white'
                            : 'bg-[#112240] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <span>{grp.icon}</span>
                        <span>{grp.category}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEmojiPickerOpen(false)}
                    className="text-[11px] text-[#94A3B8] hover:text-white cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>

                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-32 overflow-y-auto p-1">
                  {WHATSAPP_EMOJI_GROUPS[activeEmojiGroupIdx].emojis.map((emj) => (
                    <button
                      key={emj}
                      type="button"
                      onClick={() => setComposerText((prev) => prev + emj)}
                      className="h-8 rounded-lg hover:bg-[#1E293B] flex items-center justify-center text-lg cursor-pointer transition-transform hover:scale-110"
                    >
                      {emj}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Composer Action Bar: Emoji Picker Toggle + "انشر" Button */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                className="fluent-reveal px-2.5 py-1.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] border border-[#334155] text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                <span>الإيموشنات 😊</span>
              </button>

              <FluentButton type="submit" variant="primary" size="sm">
                <Send className="w-3.5 h-3.5" />
                <span>انشر</span>
              </FluentButton>
            </div>
          </form>
        )}

        {/* Publisher Pending Approval Notice ("يتم عرض المنشور للموافقة عليه من المسؤول") */}
        {(submissionNotice || myPendingPosts.length > 0) && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span>
                يتم عرض المنشور للموافقة عليه من المسؤول
                {myPendingPosts.length > 0 && ` (${myPendingPosts.length} منشور قيد المراجعة)`}
              </span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setIsAdminManagementView(true);
                  setAdminActiveTab('approvals');
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-[#0A192F] text-[11px] font-extrabold cursor-pointer"
              >
                مراجعة واعتماد الآن
              </button>
            )}
          </div>
        )}

        {/* Publisher Rejected Post Notice ("تم رفض المنشور") */}
        {myRejectedPosts.length > 0 && (
          <div className="space-y-1.5">
            {myRejectedPosts.map((rej) => (
              <div
                key={rej.id}
                className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-300">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    تم رفض المنشور: &quot;{rej.content.slice(0, 60)}...&quot;
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeletePost(rej.id)}
                  className="text-xs text-rose-200 underline cursor-pointer"
                >
                  إخفاء الإشعار
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Approved Community Posts Feed (4 Initial + Load 4 More on Scroll, Medium Compact Template) */}
      <div className="space-y-3">
        {visiblePostsSlice.map((post) => {
          const isPostLiked = post.likes.includes(visitorId);
          const isPostDisliked = post.dislikes.includes(visitorId);
          const isPostSaved = savedPostIds.includes(post.id);
          const isPostOwner =
            post.authorId === visitorId ||
            Boolean(
              currentUser &&
                (post.authorId === currentUser.id ||
                  post.authorUsername.trim().toLowerCase() ===
                    currentUser.username.trim().toLowerCase())
            );
          const isMoreMenuOpen = openMoreMenuPostId === post.id;
          const isReportSubMenuOpen = openReportSubMenuPostId === post.id;
          const isEditingThisPost = editingPostId === post.id;

          // Filter comments: hidden comments are only visible as an "إظهار" placeholder to post owner, admin, or comment author
          const visibleForViewerComments = [...post.comments]
            .filter(
              (c) =>
                !c.isHidden ||
                isPostOwner ||
                isAdmin ||
                c.authorId === visitorId
            )
            .sort((a, b) => {
              if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
                return a.isPinned ? -1 : 1;
              }
              return 0;
            });

          // Comments: Pinned comment or First comment shown directly below the post
          const pinnedOrFirstComment =
            visibleForViewerComments.find((c) => c.isPinned && !c.isHidden) ||
            visibleForViewerComments.find((c) => c.isPinned) ||
            visibleForViewerComments[0] ||
            null;
          const isAllCommentsExpanded = Boolean(
            expandedAllCommentsForPost[post.id]
          );
          const commentsToRender = isAllCommentsExpanded
            ? visibleForViewerComments
            : pinnedOrFirstComment
            ? [pinnedOrFirstComment]
            : [];

          return (
            <FluentCard
              key={post.id}
              noPadding
              className={`p-3 sm:p-3.5 space-y-2 border-[#334155] hover:border-sky-400/60 overflow-visible ${
                isMoreMenuOpen ? 'z-40 relative' : 'relative'
              }`}
            >
              {/* السطر الأول: الاسم في سطر واحد على اليمين (وبجانبه محادثة خاصة في بيع واشتري) | وعلى أقصى اليسار نوع المنشور + زر المزيد */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#0A192F] border border-sky-400/40 flex items-center justify-center text-sky-400 font-extrabold text-xs shrink-0">
                    {post.authorUsername.slice(0, 1)}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                    {post.authorUsername}
                  </div>
                  {enableBuySellPrivateChat && (
                    <button
                      type="button"
                      onClick={() =>
                        openBottomLeftPrivateChat(post.authorId, post.authorUsername)
                      }
                      className="fluent-reveal px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-400/60 text-[10px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0 transition-all shadow-sm whitespace-nowrap"
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span>محادثة خاصة</span>
                    </button>
                  )}
                </div>

                {/* على أقصى اليسار: شارة مثبت + شارة تم البيع + نوع المنشور + زر "المزيد" */}
                <div className="flex items-center gap-1.5 shrink-0 relative flex-wrap justify-end">
                  {post.isPinned && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/60 flex items-center gap-1 whitespace-nowrap">
                      <Pin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>مثبت</span>
                    </span>
                  )}

                  {post.isSold && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold bg-rose-600 text-white border border-rose-400 shadow-sm flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>تم البيع</span>
                    </span>
                  )}

                  {post.commentsDisabled && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-1 whitespace-nowrap">
                      <MessageSquareOff className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>التعليقات متوقفة</span>
                    </span>
                  )}

                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border whitespace-nowrap ${getPostTypeBadgeStyle(
                      post.postType
                    )}`}
                  >
                    {post.postType}
                  </span>

                  {/* زر "المزيد" على يسار المنشور في الأعلى */}
                  <div className="relative" data-more-menu-container="true">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMoreMenuPostId(isMoreMenuOpen ? null : post.id);
                        setOpenReportSubMenuPostId(null);
                      }}
                      className="fluent-reveal px-2 py-1 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#334155] text-[11px] font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-sky-400" />
                      <span>المزيد</span>
                      <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                    </button>

                    {/* القائمة المنسدلة لزر "المزيد": عند اختيار أي خيار يتم غلق القائمة مرة أخرى */}
                    {isMoreMenuOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-[#0A192F] border border-sky-400/60 shadow-2xl z-50 py-1.5 overflow-hidden">
                        {/* صلاحيات Admin فقط: تثبيت المنشور في الأعلى أو إلغاء التثبيت */}
                        {isStrictAdmin && onTogglePinPost && (
                          <button
                            type="button"
                            onClick={() => {
                              onTogglePinPost(post.id);
                              setOpenReportSubMenuPostId(null);
                              setOpenMoreMenuPostId(null);
                            }}
                            className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-amber-300 hover:bg-amber-500/20 flex items-center gap-2 cursor-pointer border-b border-[#334155]/60"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {post.isPinned ? 'إلغاء التثبيت' : 'تثبيت المنشور'}
                            </span>
                          </button>
                        )}

                        {isPostOwner ? (
                          /* لصاحب المنشور: تعديل + إيقاف التعليقات + تم البيع + حذف المنشور */
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditingPostContent(post.content);
                                setEditingPostType(post.postType);
                                setOpenReportSubMenuPostId(null);
                                setOpenMoreMenuPostId(null);
                              }}
                              className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-sky-300 hover:bg-sky-500/20 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>تعديل</span>
                            </button>

                            {onTogglePostCommentsDisabled && (
                              <button
                                type="button"
                                onClick={() => {
                                  onTogglePostCommentsDisabled(post.id);
                                  setOpenReportSubMenuPostId(null);
                                  setOpenMoreMenuPostId(null);
                                }}
                                className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-amber-300 hover:bg-amber-500/20 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                              >
                                <MessageSquareOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>
                                  {post.commentsDisabled
                                    ? 'تفعيل التعليقات'
                                    : 'إيقاف التعليقات'}
                                </span>
                              </button>
                            )}

                            {onTogglePostSold && (
                              <button
                                type="button"
                                onClick={() => {
                                  onTogglePostSold(post.id);
                                  setOpenReportSubMenuPostId(null);
                                  setOpenMoreMenuPostId(null);
                                }}
                                className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>
                                  {post.isSold ? 'إلغاء تم البيع' : 'تم البيع'}
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onDeletePost(post.id);
                                setOpenReportSubMenuPostId(null);
                                setOpenMoreMenuPostId(null);
                              }}
                              className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-rose-300 hover:bg-rose-600/25 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>حذف المنشور</span>
                            </button>
                          </>
                        ) : (
                          /* لباقي المستخدمين: حفظ + خيارات الإبلاغ (وعند اختيار أي خيار تُغلق القائمة فوراً) */
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                toggleSavePost(post.id);
                                setOpenReportSubMenuPostId(null);
                                setOpenMoreMenuPostId(null);
                              }}
                              className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-sky-300 hover:bg-sky-500/20 flex items-center gap-2 cursor-pointer"
                            >
                              <Bookmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>{isPostSaved ? 'إلغاء الحفظ ✓' : 'حفظ'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setOpenReportSubMenuPostId(
                                  isReportSubMenuOpen ? null : post.id
                                )
                              }
                              className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-rose-300 hover:bg-rose-600/25 flex items-center justify-between gap-2 cursor-pointer border-t border-[#334155]/60"
                            >
                              <span className="flex items-center gap-2">
                                <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>الإبلاغ</span>
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-rose-300" />
                            </button>

                            {isReportSubMenuOpen && (
                              <div className="bg-[#112240] border-t border-rose-400/40 py-1">
                                {REPORT_REASONS.map((reason) => (
                                  <button
                                    key={reason}
                                    type="button"
                                    onClick={() => {
                                      onReportPost(post.id, reason);
                                      setOpenReportSubMenuPostId(null);
                                      setOpenMoreMenuPostId(null);
                                      setReportFeedbackBanner(
                                        `تم إرسال البلاغ ("${reason}") إلى إدارة المجتمع للمراجعة.`
                                      );
                                    }}
                                    className="w-full text-right px-4 py-1.5 text-[11px] font-bold text-[#F8FAFC] hover:bg-rose-600/25 hover:text-rose-200 transition-colors cursor-pointer block"
                                  >
                                    • {reason}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* صلاحيات الإدارة: إيقاف التعليقات */}
                            {isAdmin && onTogglePostCommentsDisabled && (
                              <button
                                type="button"
                                onClick={() => {
                                  onTogglePostCommentsDisabled(post.id);
                                  setOpenReportSubMenuPostId(null);
                                  setOpenMoreMenuPostId(null);
                                }}
                                className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-amber-300 hover:bg-amber-500/20 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                              >
                                <MessageSquareOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>
                                  {post.commentsDisabled
                                    ? 'تفعيل التعليقات'
                                    : 'إيقاف التعليقات'}
                                </span>
                              </button>
                            )}

                            {/* صلاحيات Admin فقط: تم البيع + حذف أي منشور */}
                            {isStrictAdmin && onTogglePostSold && (
                              <button
                                type="button"
                                onClick={() => {
                                  onTogglePostSold(post.id);
                                  setOpenReportSubMenuPostId(null);
                                  setOpenMoreMenuPostId(null);
                                }}
                                className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>
                                  {post.isSold ? 'إلغاء تم البيع' : 'تم البيع'}
                                </span>
                              </button>
                            )}

                            {isStrictAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeletePost(post.id);
                                  setOpenReportSubMenuPostId(null);
                                  setOpenMoreMenuPostId(null);
                                }}
                                className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-rose-400 hover:bg-rose-600/25 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>حذف المنشور (Admin)</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* السطر الثاني أسفله مباشرة: وقت النشر في سطر واحد */}
              <div className="text-[11px] font-medium text-[#94A3B8] flex items-center gap-1.5 whitespace-nowrap overflow-hidden border-b border-[#334155]/60 pb-1.5">
                <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="text-sky-300 font-bold">
                  {formatTextualArabicElapsedTime(post.createdAt, liveTimeTick)}
                </span>
                <span>·</span>
                <span className="text-[11px] text-[#94A3B8] truncate">
                  {formatArabicPostDate(post.createdAt)}
                </span>
              </div>

              {/* السطر الثالث أسفله: المنشور (أو نافذة التعديل لصاحب المنشور) */}
              {isEditingThisPost ? (
                <div className="p-2.5 rounded-xl bg-[#0A192F] border border-sky-400/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-sky-300">
                      تعديل المنشور:
                    </span>
                    <select
                      value={editingPostType}
                      onChange={(e) =>
                        setEditingPostType(e.target.value as CommunityPostType)
                      }
                      className="rounded-lg bg-[#112240] border border-sky-400/40 px-2 py-1 text-xs text-sky-300 font-bold outline-none"
                    >
                      {allowedPostTypes.map((typeOption) => (
                        <option key={typeOption} value={typeOption}>
                          {typeOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={editingPostContent}
                    onChange={(e) => setEditingPostContent(e.target.value)}
                    className="w-full rounded-lg bg-[#112240] border border-[#334155] p-2 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPostId(null)}
                      className="px-3 py-1 rounded-lg bg-[#1E293B] text-xs font-bold text-[#94A3B8] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const clean = editingPostContent.trim();
                        if (!clean) return;
                        if (containsAbusiveWords(clean)) {
                          setProfanityAlert(ABUSIVE_CONTENT_WARNING_MESSAGE);
                          return;
                        }
                        onEditCommunityPost?.(post.id, clean, editingPostType);
                        setEditingPostId(null);
                      }}
                      className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-extrabold text-white cursor-pointer"
                    >
                      حفظ التعديل
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {post.isSold && (
                    <div className="p-2 rounded-xl bg-rose-600/20 border border-rose-400/70 text-rose-200 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>تم البيع</span>
                    </div>
                  )}
                  <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>
              )}

              {/* أزرار التفاعل الـ 3 بحجم صغير وفي سطر واحد: لايك + ديس لايك + تعليق */}
              <div className="pt-2 border-t border-[#334155]/80 flex flex-row flex-nowrap items-center justify-between gap-1.5 overflow-x-auto">
                <div className="flex flex-row flex-nowrap items-center gap-1.5 shrink-0">
                  {/* 1. زر لايك بحجم صغير */}
                  <button
                    type="button"
                    onClick={() => onTogglePostLike(post.id)}
                    className={`fluent-reveal px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1 border cursor-pointer transition-all whitespace-nowrap ${
                      isPostLiked
                        ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-[0_0_10px_rgba(24,119,242,0.5)]'
                        : 'bg-[#0A192F] text-[#E2E8F0] hover:bg-[#1877F2]/20 border-[#334155]'
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3 shrink-0" />
                    <span>لايك ({post.likes.length})</span>
                  </button>

                  {/* 2. زر ديس لايك بحجم صغير */}
                  <button
                    type="button"
                    onClick={() => onTogglePostDislike(post.id)}
                    className={`fluent-reveal px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1 border cursor-pointer transition-all whitespace-nowrap ${
                      isPostDisliked
                        ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                        : 'bg-[#0A192F] text-[#94A3B8] hover:bg-rose-600/20 border-[#334155]'
                    }`}
                  >
                    <ThumbsDown className="w-3 h-3 shrink-0" />
                    <span>ديس لايك ({post.dislikes.length})</span>
                  </button>

                  {/* 3. زر "تعليق" (أو إشعار إيقاف التعليقات) */}
                  <button
                    type="button"
                    disabled={Boolean(post.commentsDisabled)}
                    onClick={() => {
                      if (post.commentsDisabled) return;
                      setOpenCommentInputForPost((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }));
                    }}
                    className={`fluent-reveal px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-extrabold flex items-center gap-1 whitespace-nowrap ${
                      post.commentsDisabled
                        ? 'bg-[#0A192F]/50 text-amber-300/80 border-amber-500/30 cursor-not-allowed'
                        : 'bg-[#0A192F] hover:bg-[#1E293B] text-sky-300 border-[#334155] cursor-pointer'
                    }`}
                  >
                    {post.commentsDisabled ? (
                      <>
                        <MessageSquareOff className="w-3 h-3 shrink-0 text-amber-400" />
                        <span>
                          التعليقات متوقفة ({visibleForViewerComments.length})
                        </span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span>تعليق ({visibleForViewerComments.length})</span>
                      </>
                    )}
                  </button>
                </div>

                {visibleForViewerComments.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAllCommentsForPost((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isAllCommentsExpanded
                      ? 'إخفاء'
                      : `الكل (${visibleForViewerComments.length})`}
                  </button>
                )}
              </div>

              {/* Add Comment Input Row (Reply to Post) — Blocked when commentsDisabled is true */}
              {!post.commentsDisabled && openCommentInputForPost[post.id] && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentDrafts[post.id] || ''}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="اكتب تعليقك على المنشور..."
                    className="flex-1 rounded-xl bg-[#0A192F] border border-sky-400/50 px-3 py-1.5 text-xs text-[#F8FAFC] outline-none"
                  />
                  <FluentButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (post.commentsDisabled) return;
                      const txt = (commentDrafts[post.id] || '').trim();
                      if (!txt) return;
                      if (containsAbusiveWords(txt)) {
                        setProfanityAlert(ABUSIVE_CONTENT_WARNING_MESSAGE);
                        return;
                      }
                      setProfanityAlert('');
                      onAddCommentToPost(post.id, {
                        id: `cmt-${Date.now()}`,
                        authorId: visitorId,
                        authorUsername: visitorName,
                        text: txt,
                        isPinned: false,
                        isHidden: false,
                        likes: [],
                        reactions: { heart: [], laugh: [], sad: [] },
                        replies: [],
                        reports: [],
                        createdAt: new Date().toISOString(),
                      });
                      setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تعليق</span>
                  </FluentButton>
                </div>
              )}

              {/* Comments Section (Shows First or Pinned Comment immediately below Post) */}
              {commentsToRender.length > 0 && (
                <div className="space-y-2 pt-1.5">
                  {commentsToRender.map((cmt) => {
                    const canManageThisComment = Boolean(
                      isPostOwner || isAdmin || cmt.authorId === visitorId
                    );
                    const canPinThisComment = Boolean(
                      isStrictAdmin || isAdmin || isPostOwner
                    );

                    // If comment is hidden ("مخفي"), show the "إظهار" button in the comment's place for owner/admin/author
                    if (cmt.isHidden) {
                      if (!canManageThisComment) return null;
                      return (
                        <div
                          key={cmt.id}
                          className="p-2.5 rounded-xl bg-[#0A192F]/70 border border-dashed border-amber-400/50 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8]">
                            <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              تم إخفاء هذا التعليق ({cmt.authorUsername}) عن جميع
                              المستخدمين
                            </span>
                          </div>
                          {onToggleHideComment && (
                            <button
                              type="button"
                              onClick={() => onToggleHideComment(post.id, cmt.id)}
                              className="fluent-reveal px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0 shadow"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                              <span>إظهار</span>
                            </button>
                          )}
                        </div>
                      );
                    }

                    const hasLikedCmt = cmt.likes.includes(visitorId);
                    const hasHeart = cmt.reactions.heart.includes(visitorId);
                    const hasLaugh = cmt.reactions.laugh.includes(visitorId);
                    const hasSad = cmt.reactions.sad.includes(visitorId);
                    const replyKey = `${post.id}_${cmt.id}`;
                    const isReplyingToThis = replyingToCommentKey === replyKey;
                    const isCmtReportOpen =
                      openReportMenuId === `cmt-${cmt.id}`;

                    return (
                      <div
                        key={cmt.id}
                        className="p-2.5 rounded-xl bg-[#0A192F]/90 border border-[#334155] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-sky-300">
                              {cmt.authorUsername}
                            </span>
                            {cmt.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                                <Pin className="w-2.5 h-2.5" />
                                تعليق مثبت
                              </span>
                            )}
                            <span className="text-[11px] text-[#94A3B8]">
                              {formatTextualArabicElapsedTime(
                                cmt.createdAt,
                                liveTimeTick
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 relative flex-wrap justify-end">
                            {/* تثبيت التعليق: من صلاحيات Admin وصاحب المنشور أيضاً */}
                            {canPinThisComment && (
                              <button
                                type="button"
                                onClick={() =>
                                  onTogglePinComment(post.id, cmt.id)
                                }
                                title="تثبيت التعليق"
                                className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                              >
                                {cmt.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                              </button>
                            )}

                            {/* إخفاء التعليق: يخفيه عن جميع المستخدمين ويظهر في مكانه زر إظهار */}
                            {canManageThisComment && onToggleHideComment && (
                              <button
                                type="button"
                                onClick={() =>
                                  onToggleHideComment(post.id, cmt.id)
                                }
                                title="إخفاء التعليق عن جميع المستخدمين"
                                className="px-2 py-0.5 rounded-lg bg-[#112240] hover:bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" />
                                <span>إخفاء</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setOpenReportMenuId(
                                  isCmtReportOpen ? null : `cmt-${cmt.id}`
                                )
                              }
                              className="text-[11px] text-[#94A3B8] hover:text-rose-400 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Flag className="w-3 h-3" />
                              <span>إبلاغ</span>
                            </button>

                            {/* صلاحيات Admin فقط: حذف أي تعليق في مجتمع */}
                            {isStrictAdmin && (
                              <button
                                type="button"
                                onClick={() => onDeleteComment(post.id, cmt.id)}
                                title="حذف التعليق (صلاحية Admin فقط)"
                                className="px-2 py-0.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف</span>
                              </button>
                            )}

                            {isCmtReportOpen && (
                              <div className="absolute left-0 top-full mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-[#112240] border border-rose-400/50 shadow-2xl z-50 py-1">
                                {REPORT_REASONS.map((reason) => (
                                  <button
                                    key={reason}
                                    type="button"
                                    onClick={() => {
                                      onReportComment(
                                        post.id,
                                        cmt.id,
                                        reason
                                      );
                                      setOpenReportMenuId(null);
                                      setReportFeedbackBanner(
                                        `تم إرسال بلاغ عن التعليق ("${reason}") إلى الإدارة.`
                                      );
                                    }}
                                    className="w-full text-right px-3 py-1.5 text-xs font-bold text-[#F8FAFC] hover:bg-rose-600/25 cursor-pointer block"
                                  >
                                    {reason}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-[#F8FAFC] leading-relaxed">
                          {cmt.text}
                        </p>

                        {/* Comment Actions: Like Button + 3 Specific Emoji Reactions (❤️, 😂, 😢) + Reply */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {/* زر لايك على التعليق */}
                            <button
                              type="button"
                              onClick={() =>
                                onToggleCommentLike(post.id, cmt.id)
                              }
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-colors ${
                                hasLikedCmt
                                  ? 'bg-sky-600 text-white border-sky-400'
                                  : 'bg-[#112240] text-[#94A3B8] hover:text-white border-[#334155]'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>لايك ({cmt.likes.length})</span>
                            </button>

                            {/* 1. إيموشن قلب ❤️ */}
                            <button
                              type="button"
                              onClick={() =>
                                onToggleCommentEmoji(post.id, cmt.id, 'heart')
                              }
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-transform hover:scale-105 ${
                                hasHeart
                                  ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                                  : 'bg-[#112240] border-[#334155] text-[#94A3B8]'
                              }`}
                            >
                              <span>❤️</span>
                              <span>{cmt.reactions.heart.length}</span>
                            </button>

                            {/* 2. إيموشن ضحك 😂 */}
                            <button
                              type="button"
                              onClick={() =>
                                onToggleCommentEmoji(post.id, cmt.id, 'laugh')
                              }
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-transform hover:scale-105 ${
                                hasLaugh
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                  : 'bg-[#112240] border-[#334155] text-[#94A3B8]'
                              }`}
                            >
                              <span>😂</span>
                              <span>{cmt.reactions.laugh.length}</span>
                            </button>

                            {/* 3. إيموشن حزن 😢 */}
                            <button
                              type="button"
                              onClick={() =>
                                onToggleCommentEmoji(post.id, cmt.id, 'sad')
                              }
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer transition-transform hover:scale-105 ${
                                hasSad
                                  ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200'
                                  : 'bg-[#112240] border-[#334155] text-[#94A3B8]'
                              }`}
                            >
                              <span>😢</span>
                              <span>{cmt.reactions.sad.length}</span>
                            </button>
                          </div>

                          {/* Reply to another person's comment (hidden if commentsDisabled) */}
                          {!post.commentsDisabled && (
                            <button
                              type="button"
                              onClick={() =>
                                setReplyingToCommentKey(
                                  isReplyingToThis ? null : replyKey
                                )
                              }
                              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                            >
                              <CornerDownLeft className="w-3 h-3" />
                              <span>رد ({cmt.replies.length})</span>
                            </button>
                          )}
                        </div>

                        {/* Nested Replies to Comment */}
                        {cmt.replies.length > 0 && (
                          <div className="mr-3 pr-2.5 border-r-2 border-[#334155] space-y-1.5 pt-1">
                            {cmt.replies.map((rep) => (
                              <div
                                key={rep.id}
                                className="p-2 rounded-lg bg-[#112240] border border-[#334155]/80 text-xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-amber-300">
                                    {rep.authorUsername}
                                  </span>
                                  <span className="text-[10px] text-[#94A3B8]">
                                    {formatTextualArabicElapsedTime(
                                      rep.createdAt,
                                      liveTimeTick
                                    )}
                                  </span>
                                </div>
                                <p className="text-[#F8FAFC]">{rep.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input */}
                        {isReplyingToThis && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={replyDrafts[replyKey] || ''}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [replyKey]: e.target.value,
                                }))
                              }
                              placeholder={`الرد على تعليق ${cmt.authorUsername}...`}
                              className="flex-1 rounded-lg bg-[#112240] border border-sky-400/50 px-3 py-1.5 text-xs text-[#F8FAFC] outline-none"
                            />
                            <FluentButton
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                const txt = (replyDrafts[replyKey] || '').trim();
                                if (!txt) return;
                                if (containsAbusiveWords(txt)) {
                                  setProfanityAlert(ABUSIVE_CONTENT_WARNING_MESSAGE);
                                  return;
                                }
                                setProfanityAlert('');
                                onAddReplyToComment(post.id, cmt.id, {
                                  id: `rep-c-${Date.now()}`,
                                  authorId: visitorId,
                                  authorUsername: visitorName,
                                  text: txt,
                                  createdAt: new Date().toISOString(),
                                });
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [replyKey]: '',
                                }));
                                setReplyingToCommentKey(null);
                              }}
                            >
                              إرسال الرد
                            </FluentButton>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </FluentCard>
          );
        })}

        {/* Infinite Scroll Sentinel at Bottom of Screen (Loads 4 more posts each time) */}
        <div
          ref={infiniteScrollSentinelRef}
          className="py-3 text-center text-xs text-[#94A3B8]"
        >
          {visiblePostCount < filteredApprovedPosts.length ? (
            <button
              type="button"
              onClick={() =>
                setVisiblePostCount((prev) =>
                  Math.min(filteredApprovedPosts.length, prev + 4)
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#112240] hover:bg-[#1E293B] border border-sky-400/40 text-sky-300 font-bold cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>
                عرض 4 منشورات إضافية ({visiblePostCount} من{' '}
                {filteredApprovedPosts.length})...
              </span>
            </button>
          ) : (
            <span>
              تم عرض جميع المنشورات المعتمدة ({filteredApprovedPosts.length} منشور)
            </span>
          )}
        </div>
      </div>

      {/* شاشة المنشورات المحفوظة ("عند الضغط عليها يظهر شاشة بها المنشورات التي تم حفظها") */}
      {isSavedPostsModalOpen && (
        <FluentModal
          isOpen={isSavedPostsModalOpen}
          onClose={() => setIsSavedPostsModalOpen(false)}
          title="المنشورات المحفوظة"
          subtitle={`المنشورات التي قمت بحفظها للرجوع إليها (${savedPostsList.length} منشور)`}
          maxWidth="2xl"
        >
          {savedPostsList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Bookmark className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
              <div className="text-sm font-extrabold text-[#F8FAFC]">
                لا توجد منشورات محفوظة حالياً
              </div>
              <p className="text-xs text-[#94A3B8]">
                يمكنك حفظ أي منشور بالضغط على زر &quot;المزيد&quot; أعلى يسار المنشور ثم اختيار &quot;حفظ&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {savedPostsList.map((savedPost) => (
                <div
                  key={savedPost.id}
                  className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                      {savedPost.authorUsername}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${getPostTypeBadgeStyle(
                          savedPost.postType
                        )}`}
                      >
                        {savedPost.postType}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSavePost(savedPost.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold cursor-pointer"
                      >
                        إزالة من المحفوظات
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                    <span className="text-sky-300 font-bold">
                      {formatTextualArabicElapsedTime(
                        savedPost.createdAt,
                        liveTimeTick
                      )}
                    </span>
                    <span>·</span>
                    <span>{formatArabicPostDate(savedPost.createdAt)}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                    {savedPost.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </FluentModal>
      )}
        </>
      )}

      {/* شاشة سجل المحادثات السابقة ("زر باسم سجل المحادثات يوجد به المحادثات السابقه") */}
      {enableBuySellPrivateChat && isChatHistoryModalOpen && (
        <FluentModal
          isOpen={isChatHistoryModalOpen}
          onClose={() => setIsChatHistoryModalOpen(false)}
          title="سجل المحادثات"
          subtitle={`جميع المحادثات السابقة في قسم بيع واشتري (${previousConversationsList.length} محادثة)`}
          maxWidth="lg"
        >
          {previousConversationsList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <div className="text-sm font-extrabold text-[#F8FAFC]">
                لا توجد محادثات سابقة حالياً
              </div>
              <p className="text-xs text-[#94A3B8]">
                اضغط على زر &quot;محادثة خاصة&quot; بجانب اسم صاحب أي منشور لبدء التواصل الفوري.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {previousConversationsList.map((conv) => (
                <div
                  key={conv.partnerUsername}
                  onClick={() => {
                    openBottomLeftPrivateChat(conv.partnerId, conv.partnerUsername);
                    setIsChatHistoryModalOpen(false);
                  }}
                  className="fluent-reveal p-3.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] border border-[#334155] hover:border-emerald-400/60 flex items-center justify-between gap-3 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-extrabold text-sm shrink-0">
                      {conv.partnerUsername.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                          {conv.partnerUsername}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono-tabular font-extrabold">
                            {conv.unreadCount} جديد
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                        {conv.lastMessageText}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-sky-300 font-bold">
                      {formatTextualArabicElapsedTime(conv.lastMessageAt, liveTimeTick)}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600/25 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold">
                      فتح المحادثة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FluentModal>
      )}

      {/* شاشة قائمة الحظر ("زر في الاعلي للمستخدمين قائمه الحظر وعند الضغط عليها يظهر قائمه بها الاسماء التي تم حظرها ويوجد بجانب كل اسم كلمه فك الحظر") */}
      {enableBuySellPrivateChat && isBlockedUsersModalOpen && (
        <FluentModal
          isOpen={isBlockedUsersModalOpen}
          onClose={() => setIsBlockedUsersModalOpen(false)}
          title="قائمة الحظر"
          subtitle={`الحسابات التي قمت بحظرها (${myBlockedAccountsList.length} حساب)`}
          maxWidth="md"
        >
          {myBlockedAccountsList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Ban className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <div className="text-sm font-extrabold text-[#F8FAFC]">
                قائمة الحظر فارغة حالياً
              </div>
              <p className="text-xs text-[#94A3B8]">
                لا توجد أي حسابات محظورة. يمكنك استقبال وإرسال المحادثات مع الجميع.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {myBlockedAccountsList.map((blk) => (
                <div
                  key={blk.username}
                  className="p-3.5 rounded-xl bg-[#0A192F] border border-rose-500/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-300 font-extrabold text-xs shrink-0">
                      {blk.username.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                        {blk.username}
                      </div>
                      <div className="text-[10px] text-rose-300 font-bold">
                        محظور من المراسلة
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onUnblockUserInChat?.(blk.username);
                      if (blk.id && blk.id !== blk.username) {
                        onUnblockUserInChat?.(blk.id);
                      }
                      setReportFeedbackBanner(
                        `تم فك الحظر عن "${blk.username}" بنجاح، ويمكنك الآن استقبال وإرسال المحادثات معه مرة أخرى.`
                      );
                    }}
                    className="fluent-reveal px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>فك الحظر</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </FluentModal>
      )}

      {/* إشعار على الشاشة لمدة 2 ثانية عند إرسال أو استقبال رسالة ("تم ارسال رساله من كذا ومحتوي الرساله وتظل 2 ثانيه وعند الضغط علي الاشعار يفتح المحادثه مباشرة") */}
      {enableBuySellPrivateChat && screenChatNotification && (
        <div
          onClick={() => {
            openBottomLeftPrivateChat(
              screenChatNotification.partnerId,
              screenChatNotification.partnerUsername
            );
            setScreenChatNotification(null);
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] w-[92vw] max-w-md p-3.5 rounded-2xl bg-[#112240] border-2 border-emerald-400 shadow-[0_12px_40px_rgba(16,185,129,0.45)] cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs sm:text-sm font-extrabold text-emerald-300 truncate">
                  تم إرسال رسالة من {screenChatNotification.senderUsername}
                </div>
                <p className="text-xs font-bold text-[#F8FAFC] line-clamp-2 break-words">
                  محتوى الرسالة: &quot;{screenChatNotification.text}&quot;
                </p>
                <div className="text-[10px] font-extrabold text-sky-300">
                  اضغط على الإشعار لفتح المحادثة مباشرة
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold shrink-0">
              فتح الشات
            </span>
          </div>
        </div>
      )}

      {/* شات المحادثة الخاص أسفل يسار الموقع (يدعم فتح 2 شات والتبديل بينهما بسلاسة + زر - للتنزيل استايل الفيس بوك زمان + زر x + حظر + إبلاغ + إغلاق + لايك/ديس لايك/قلب/إبلاغ على كل رسالة) */}
      {enableBuySellPrivateChat &&
        openChatTabs.length > 0 &&
        activeBottomLeftChat &&
        (isChatMinimized ? (
          /* وضع التصغير (تنزيل شاشة الشات بأسفل يسار الموقع مثل استايل الفيس بوك زمان وعند الضغط على المحادثة تظهر مرة أخرى) */
          <div className="fixed bottom-0 left-3 sm:left-5 z-50 flex items-end gap-2 max-w-[calc(100vw-1.5rem)]">
            {openChatTabs.map((tab) => {
              const tabNorm = tab.partnerUsername.trim().toLowerCase();
              const unreadForTab = (privateChatMessages || []).filter((m) => {
                const sNorm = m.senderUsername.trim().toLowerCase();
                const rNorm = m.receiverUsername.trim().toLowerCase();
                return (
                  sNorm === tabNorm &&
                  (rNorm === myNormName || m.receiverId === visitorId) &&
                  !m.isRead
                );
              }).length;

              return (
                <div
                  key={tab.partnerUsername}
                  onClick={() => {
                    setActiveChatUsername(tab.partnerUsername);
                    setIsChatMinimized(false);
                    onMarkPrivateMessagesRead?.(tab.partnerUsername);
                  }}
                  className="fluent-reveal px-3.5 py-2.5 rounded-t-2xl bg-[#112240] hover:bg-[#1E293B] border-2 border-b-0 border-sky-400 shadow-[0_-6px_25px_rgba(0,0,0,0.75)] flex items-center justify-between gap-2.5 cursor-pointer min-w-[165px] sm:min-w-[195px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-xs font-extrabold text-[#F8FAFC] truncate">
                      {tab.partnerUsername}
                    </span>
                    {unreadForTab > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono-tabular font-extrabold shrink-0">
                        {unreadForTab}
                      </span>
                    )}
                  </div>

                  {/* زر x بجانب اسم الحساب لإغلاق المراسلة مع هذا الشخص فقط */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSingleChatTab(tab.partnerUsername);
                    }}
                    title={`إغلاق المحادثة مع ${tab.partnerUsername} فقط`}
                    className="w-5 h-5 rounded-md bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white flex items-center justify-center text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* نافذة الشات المربعة المفتوحة أسفل يسار الموقع */
          <div className="fixed bottom-3 left-3 sm:bottom-5 sm:left-5 z-50 w-[345px] sm:w-[395px] h-[440px] sm:h-[470px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#112240] border-2 border-sky-400 shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
            {/* السطر العلوي الأول: التبديل السلس بين 2 شات (وبجانب كل اسم زر x لإغلاقه وحده) + على اليسار زر - للتنزيل وبجانبه زر x للإغلاق */}
            <div className="px-2.5 py-1.5 bg-[#071120] border-b border-[#334155] flex items-center justify-between gap-1.5 shrink-0">
              {/* التبويبات المفتوحة (حتى 2 شات للتبديل بينهما بسلاسة) */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto">
                {openChatTabs.map((tab) => {
                  const isTabActive =
                    tab.partnerUsername.trim().toLowerCase() ===
                    activeBottomLeftChat.partnerUsername.trim().toLowerCase();
                  const tabNorm = tab.partnerUsername.trim().toLowerCase();
                  const unreadForTab = (privateChatMessages || []).filter(
                    (m) => {
                      const sNorm = m.senderUsername.trim().toLowerCase();
                      const rNorm = m.receiverUsername.trim().toLowerCase();
                      return (
                        sNorm === tabNorm &&
                        (rNorm === myNormName || m.receiverId === visitorId) &&
                        !m.isRead
                      );
                    }
                  ).length;

                  return (
                    <div
                      key={tab.partnerUsername}
                      onClick={() => {
                        setActiveChatUsername(tab.partnerUsername);
                        setOpenChatHeaderReportMenu(false);
                        setOpenPrivateMsgReportId(null);
                        onMarkPrivateMessagesRead?.(tab.partnerUsername);
                      }}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all min-w-0 ${
                        isTabActive
                          ? 'bg-sky-600/35 border-sky-400 text-white shadow-sm'
                          : 'bg-[#112240] border-[#334155] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isTabActive ? 'bg-emerald-400' : 'bg-sky-400/60'
                        }`}
                      />
                      <span className="truncate max-w-[95px]">
                        {tab.partnerUsername}
                      </span>
                      {unreadForTab > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono-tabular font-extrabold shrink-0">
                          {unreadForTab}
                        </span>
                      )}
                      {/* زر x بجانب اسم كل حساب يتم المراسلة معه لإغلاق المراسلة مع الشخص ده بس وليس كل المحادثات */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeSingleChatTab(tab.partnerUsername);
                        }}
                        title={`إغلاق المراسلة مع ${tab.partnerUsername} فقط`}
                        className="w-4 h-4 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* أزرار التحكم بالنافذة على اليسار: زر ( - ) لتنزيل الشات + بجانبه زر ( x ) لإغلاق المحادثة */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChatMinimized(true)}
                  title="تنزيل شاشة الشات للأسفل (استايل الفيس بوك)"
                  className="w-7 h-7 rounded-lg bg-[#1E293B] hover:bg-sky-600 text-[#F8FAFC] border border-[#334155] flex items-center justify-center font-extrabold cursor-pointer transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={closeAllBottomLeftChats}
                  title="إغلاق المحادثة (x)"
                  className="w-7 h-7 rounded-lg bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center font-extrabold cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* السطر الثاني: اسم الحساب النشط + بجانب زر إغلاق الذي بالمحادثة يوجد زر حظر وزر إبلاغ */}
            <div className="px-3 py-2 bg-[#0A192F] border-b border-[#334155] flex items-center justify-between gap-2 shrink-0 relative">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-extrabold text-xs shrink-0">
                  {activeBottomLeftChat.partnerUsername.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                    {activeBottomLeftChat.partnerUsername}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 truncate">
                    {isBottomLeftPartnerTyping
                      ? 'يكتب رسالة الآن...'
                      : isActivePartnerBlockedByMe
                      ? 'تم حظر هذا الحساب'
                      : 'متصل للمحادثة المباشرة'}
                  </div>
                </div>
              </div>

              {/* الأزرار الـ 3 متجاورة: زر حظر + زر إبلاغ + زر إغلاق */}
              <div className="flex items-center gap-1 shrink-0">
                {/* 1. زر حظر (أو فك الحظر) */}
                {isActivePartnerBlockedByMe ? (
                  <button
                    type="button"
                    onClick={() => {
                      onUnblockUserInChat?.(
                        activeBottomLeftChat.partnerUsername
                      );
                      setChatActionToast(
                        `تم فك الحظر عن ${activeBottomLeftChat.partnerUsername}`
                      );
                      setTimeout(() => setChatActionToast(''), 2500);
                    }}
                    className="fluent-reveal px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                    title="فك الحظر عن هذا الحساب"
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>فك الحظر</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onBlockUserInChat?.(
                        activeBottomLeftChat.partnerId,
                        activeBottomLeftChat.partnerUsername
                      );
                      setChatActionToast(
                        `تم حظر "${activeBottomLeftChat.partnerUsername}" ولا يمكن المراسلة معه مرة أخرى.`
                      );
                      setTimeout(() => setChatActionToast(''), 2500);
                    }}
                    className="fluent-reveal px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                    title="حظر هذا الحساب ومنع المراسلة"
                  >
                    <Ban className="w-3 h-3 shrink-0" />
                    <span>حظر</span>
                  </button>
                )}

                {/* 2. زر إبلاغ (يصل في زر الإدارة) */}
                <button
                  type="button"
                  onClick={() =>
                    setOpenChatHeaderReportMenu((prev) => !prev)
                  }
                  className="fluent-reveal px-2 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-400/50 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                  title="إبلاغ إلى الإدارة"
                >
                  <Flag className="w-3 h-3 shrink-0" />
                  <span>إبلاغ</span>
                </button>

                {/* 3. زر إغلاق */}
                <button
                  type="button"
                  onClick={closeAllBottomLeftChats}
                  className="fluent-reveal px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                  title="إغلاق المحادثة نهائياً"
                >
                  <XCircle className="w-3 h-3 shrink-0" />
                  <span>إغلاق</span>
                </button>
              </div>

              {/* قائمة أسباب البلاغ السريع من أعلى الشات (تصل فوراً إلى زر الإدارة) */}
              {openChatHeaderReportMenu && (
                <div className="absolute left-2 top-full mt-1 w-60 rounded-xl bg-[#0A192F] border-2 border-rose-400 shadow-2xl z-50 p-2 space-y-1">
                  <div className="text-[11px] font-extrabold text-rose-300 px-2 py-1 border-b border-[#334155] flex items-center justify-between">
                    <span>اختر سبب الإبلاغ للإدارة:</span>
                    <button
                      type="button"
                      onClick={() => setOpenChatHeaderReportMenu(false)}
                      className="text-[#94A3B8] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        const lastSample =
                          activeBottomLeftMessages[
                            activeBottomLeftMessages.length - 1
                          ]?.text || 'بلاغ على محادثة خاصة في بيع واشتري';
                        onReportUserInPrivateChat?.(
                          activeBottomLeftChat.partnerId,
                          activeBottomLeftChat.partnerUsername,
                          reason,
                          lastSample
                        );
                        setOpenChatHeaderReportMenu(false);
                        setChatActionToast(
                          `تم إرسال البلاغ ("${reason}") إلى زر الإدارة للمراجعة.`
                        );
                        setTimeout(() => setChatActionToast(''), 2500);
                      }}
                      className="w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#F8FAFC] hover:bg-rose-600/25 hover:text-rose-200 cursor-pointer block"
                    >
                      • {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* إشعار تأكيد الإجراء داخل الشات */}
            {chatActionToast && (
              <div className="px-3 py-1.5 bg-emerald-600/25 border-b border-emerald-400/50 text-emerald-200 text-[11px] font-extrabold text-center shrink-0">
                {chatActionToast}
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#0A192F]/85">
              {activeBottomLeftMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-1.5 text-[#94A3B8]">
                  <MessageSquare className="w-7 h-7 text-sky-400 opacity-75" />
                  <div className="text-xs font-extrabold text-[#F8FAFC]">
                    محادثة خاصة مع {activeBottomLeftChat.partnerUsername}
                  </div>
                  <p className="text-[11px]">
                    اكتب رسالتك بالأسفل للتواصل المباشر الفوري بأقصى سرعة.
                  </p>
                </div>
              ) : (
                activeBottomLeftMessages.map((msg) => {
                  const isMine =
                    msg.senderId === visitorId ||
                    msg.senderUsername.trim().toLowerCase() === myNormName;
                  const msgLikes = msg.likes || [];
                  const msgDislikes = msg.dislikes || [];
                  const msgHearts = msg.hearts || [];
                  const hasLikedMsg = msgLikes.includes(visitorId);
                  const hasDislikedMsg = msgDislikes.includes(visitorId);
                  const hasHeartedMsg = msgHearts.includes(visitorId);
                  const isMsgReportOpen = openPrivateMsgReportId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col space-y-1 ${
                        isMine ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs space-y-1 ${
                          isMine
                            ? 'bg-[#0F2942] text-white border border-sky-500/40 rounded-tr-none'
                            : 'bg-[#1E293B] text-[#F8FAFC] border border-[#334155] rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] opacity-90 font-extrabold">
                          <span>{msg.senderUsername}</span>
                          <div className="flex items-center gap-1">
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString(
                                'ar-EG',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                            {isMine && (
                              <span
                                title={
                                  msg.isRead
                                    ? 'تمت القراءة (فتحت الرسالة ✓✓)'
                                    : 'تم الإرسال (لم تُقرأ بعد ✓✓)'
                                }
                                className="inline-flex items-center gap-0.5 mr-0.5"
                              >
                                <CheckCheck
                                  className={`w-4 h-4 stroke-[2.5] transition-colors ${
                                    msg.isRead
                                      ? 'text-[#38BDF8] drop-shadow-[0_0_5px_rgba(56,189,248,0.85)]'
                                      : 'text-[#64748B]'
                                  }`}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="leading-relaxed break-words whitespace-pre-wrap font-bold">
                          {msg.text}
                        </p>
                      </div>

                      {/* شريط التفاعل والإبلاغ أسفل كل رسالة داخل الشات: لايك + ديس لايك + قلب ❤️ + إبلاغ عن الرسالة */}
                      <div className="flex flex-wrap items-center gap-1 relative">
                        {/* 1. لايك */}
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePrivateMessageReaction?.(msg.id, 'like')
                          }
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-0.5 border cursor-pointer transition-all ${
                            hasLikedMsg
                              ? 'bg-sky-600 text-white border-sky-400'
                              : 'bg-[#112240] text-[#94A3B8] hover:text-white border-[#334155]'
                          }`}
                          title="لايك"
                        >
                          <ThumbsUp className="w-2.5 h-2.5" />
                          <span>{msgLikes.length || ''}</span>
                        </button>

                        {/* 2. ديس لايك */}
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePrivateMessageReaction?.(msg.id, 'dislike')
                          }
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-0.5 border cursor-pointer transition-all ${
                            hasDislikedMsg
                              ? 'bg-rose-600 text-white border-rose-400'
                              : 'bg-[#112240] text-[#94A3B8] hover:text-white border-[#334155]'
                          }`}
                          title="ديس لايك"
                        >
                          <ThumbsDown className="w-2.5 h-2.5" />
                          <span>{msgDislikes.length || ''}</span>
                        </button>

                        {/* 3. إيموشن قلب ❤️ */}
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePrivateMessageReaction?.(msg.id, 'heart')
                          }
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-0.5 border cursor-pointer transition-all ${
                            hasHeartedMsg
                              ? 'bg-rose-500/30 text-rose-200 border-rose-400'
                              : 'bg-[#112240] text-[#94A3B8] hover:text-white border-[#334155]'
                          }`}
                          title="قلب ❤️"
                        >
                          <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                          <span>{msgHearts.length || ''}</span>
                        </button>

                        {/* 4. الإبلاغ عن أي رسالة داخل الشات */}
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPrivateMsgReportId(
                              isMsgReportOpen ? null : msg.id
                            )
                          }
                          className="px-1.5 py-0.5 rounded-md bg-[#112240] hover:bg-rose-600/25 text-rose-300 border border-[#334155] text-[10px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                          title="إبلاغ عن هذه الرسالة"
                        >
                          <Flag className="w-2.5 h-2.5 text-rose-400" />
                          <span>إبلاغ</span>
                        </button>

                        {isMsgReportOpen && (
                          <div className="absolute bottom-full mb-1 right-0 w-52 rounded-xl bg-[#0A192F] border border-rose-400 shadow-2xl z-50 p-1.5 space-y-1">
                            <div className="text-[10px] font-extrabold text-rose-300 px-2 py-0.5 border-b border-[#334155]">
                              الإبلاغ عن هذه الرسالة للإدارة:
                            </div>
                            {REPORT_REASONS.map((reason) => (
                              <button
                                key={reason}
                                type="button"
                                onClick={() => {
                                  onReportPrivateChatMessage?.(
                                    msg.id,
                                    msg.senderId,
                                    msg.senderUsername,
                                    msg.text,
                                    reason
                                  );
                                  setOpenPrivateMsgReportId(null);
                                  setChatActionToast(
                                    `تم الإبلاغ عن الرسالة ("${reason}") ووصلت إلى زر الإدارة.`
                                  );
                                  setTimeout(() => setChatActionToast(''), 2500);
                                }}
                                className="w-full text-right px-2 py-1 rounded-lg text-[10px] font-bold text-[#F8FAFC] hover:bg-rose-600/25 cursor-pointer block"
                              >
                                • {reason}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isBottomLeftPartnerTyping && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {activeBottomLeftChat.partnerUsername} يكتب الآن...
                  </span>
                </div>
              )}

              <div ref={bottomLeftMessagesEndRef} />
            </div>

            {/* Input Form (أو تنبيه منع المراسلة في حالة الحظر) */}
            {isActivePartnerBlockedByMe ? (
              <div className="p-2.5 bg-rose-950/60 border-t border-rose-500/50 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] font-extrabold text-rose-200">
                  تم حظر &quot;{activeBottomLeftChat.partnerUsername}&quot; ولا يمكن المراسلة.
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUnblockUserInChat?.(activeBottomLeftChat.partnerUsername)
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold cursor-pointer shrink-0"
                >
                  فك الحظر
                </button>
              </div>
            ) : amIBlockedByActivePartner ? (
              <div className="p-2.5 bg-rose-950/60 border-t border-rose-500/50 text-center text-[11px] font-extrabold text-rose-200 shrink-0">
                لا يمكن إرسال رسائل إلى هذا الحساب حالياً بسبب الحظر.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = bottomLeftChatDraft.trim();
                  if (!clean || !activeBottomLeftChat) return;
                  if (containsAbusiveWords(clean)) {
                    setProfanityAlert(ABUSIVE_CONTENT_WARNING_MESSAGE);
                    return;
                  }
                  recordPartnerInHistory(
                    activeBottomLeftChat.partnerId,
                    activeBottomLeftChat.partnerUsername
                  );
                  onSendPrivateMessage?.(
                    activeBottomLeftChat.partnerId,
                    activeBottomLeftChat.partnerUsername,
                    clean,
                    '#F8FAFC'
                  );
                  triggerScreenChatNotification(
                    visitorName,
                    activeBottomLeftChat.partnerId,
                    activeBottomLeftChat.partnerUsername,
                    clean
                  );
                  setBottomLeftChatDraft('');
                  if (bottomLeftTypingTimeoutRef.current) {
                    clearTimeout(bottomLeftTypingTimeoutRef.current);
                  }
                  onSetChatTypingStatus?.(
                    `private:${activeBottomLeftChat.partnerUsername}`,
                    false
                  );
                }}
                className="p-2.5 bg-[#0A192F] border-t border-[#334155] flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={bottomLeftChatDraft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBottomLeftChatDraft(val);
                    if (!activeBottomLeftChat) return;
                    onSetChatTypingStatus?.(
                      `private:${activeBottomLeftChat.partnerUsername}`,
                      val.trim().length > 0
                    );
                    if (bottomLeftTypingTimeoutRef.current) {
                      clearTimeout(bottomLeftTypingTimeoutRef.current);
                    }
                    if (val.trim().length > 0) {
                      bottomLeftTypingTimeoutRef.current = setTimeout(() => {
                        onSetChatTypingStatus?.(
                          `private:${activeBottomLeftChat.partnerUsername}`,
                          false
                        );
                      }, 3000);
                    }
                  }}
                  placeholder={`اكتب رسالة إلى ${activeBottomLeftChat.partnerUsername}...`}
                  className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs text-[#F8FAFC] outline-none"
                />
                <button
                  type="submit"
                  className="fluent-reveal px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shrink-0 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال</span>
                </button>
              </form>
            )}
          </div>
        ))}

      {/* Live Chat Modal ("محادثة لايف") */}
      <LiveCommunityChatModal
        isOpen={isLiveChatOpen}
        onClose={() => setIsLiveChatOpen(false)}
        messages={liveChatMessages}
        currentUser={currentUser}
        users={users}
        onlineCount={onlineCount}
        onlineStats={onlineStats}
        cooldownConfigSeconds={cooldownConfigSeconds}
        autoClearMinutes={autoClearMinutes}
        lastClearedAt={lastClearedAt}
        chatPenalties={chatPenalties}
        privateChatMessages={privateChatMessages}
        privateChatStatuses={privateChatStatuses}
        chatTypingMap={chatTypingMap}
        userBlockedMap={userBlockedMap}
        privateChatReports={privateChatReports}
        onOpenAuthModal={onOpenAuthModal}
        onSendChatMessage={onSendChatMessage}
        onReportChatMessage={onReportChatMessage}
        onDeleteChatMessage={onDeleteChatMessage}
        onUpdateChatCooldown={onUpdateChatCooldown}
        onUpdateAutoClearMinutes={onUpdateAutoClearMinutes}
        onClearPublicChatNow={onClearPublicChatNow}
        onClearPrivateChatSession={onClearPrivateChatSession}
        onApplyChatPenalty={onApplyChatPenalty}
        onSendPrivateMessage={onSendPrivateMessage}
        onMarkPrivateMessagesRead={onMarkPrivateMessagesRead}
        onSetChatTypingStatus={onSetChatTypingStatus}
        onRespondPrivateChatRequest={onRespondPrivateChatRequest}
        onBlockUserInChat={onBlockUserInChat}
        onDeleteUserAccountFromChat={onDeleteUserAccountFromChat}
      />
    </div>
  );
};

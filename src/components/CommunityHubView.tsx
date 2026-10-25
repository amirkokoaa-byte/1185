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
import { RealOnlinePresenceStats } from '../services/storageService';

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
 * Formats elapsed time since post creation purely in Arabic words WITHOUT showing numeric day counters
 * (e.g., "منذ لحظات"، "منذ دقائق"، "منذ ساعة"، "منذ ساعات"، "منذ يوم"، "منذ يومين"، "منذ أيام"، "منذ أسبوع"، "منذ شهر")
 */
export function formatTextualArabicElapsedTime(isoDate: string, _nowTick?: number): string {
  const createdMs = new Date(isoDate).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 90) return 'منذ لحظات';
  if (diffMinutes < 60) return 'منذ دقائق';
  if (diffHours === 1) return 'منذ ساعة';
  if (diffHours < 24) return 'منذ ساعات';
  if (diffDays === 1) return 'منذ يوم';
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays < 7) return 'منذ أيام';
  if (diffDays < 14) return 'منذ أسبوع';
  if (diffDays < 21) return 'منذ أسبوعين';
  if (diffDays < 30) return 'منذ أسابيع';
  if (diffDays < 60) return 'منذ شهر';
  return 'منذ أشهر';
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
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const visitorId = currentUser?.id || 'guest-visitor';
  const visitorName = currentUser?.username || 'زائر';

  // Live Chat Modal State ("محادثة لايف")
  const [isLiveChatOpen, setIsLiveChatOpen] = useState<boolean>(false);

  // Live Clock Tick to keep "الوقت المنقضي منذ النشر" updated in real-time
  const [liveTimeTick, setLiveTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTimeTick(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // View Mode: Public Community Feed vs Full Internal Admin Management Screen ("إدارة")
  const [isAdminManagementView, setIsAdminManagementView] = useState<boolean>(false);
  const [adminActiveTab, setAdminActiveTab] = useState<'approvals' | 'reports'>(
    'approvals'
  );
  const [reportsFilterType, setReportsFilterType] = useState<'posts' | 'comments'>(
    'posts'
  );

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
  const [composerPostType, setComposerPostType] =
    useState<CommunityPostType>('استفسار');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<boolean>(false);
  const [activeEmojiGroupIdx, setActiveEmojiGroupIdx] = useState<number>(0);
  const [submissionNotice, setSubmissionNotice] = useState<string>('');
  const [profanityAlert, setProfanityAlert] = useState<string>('');

  // Per-Post Interactive UI States ("المزيد" menu, inline editing, reporting)
  const [openMoreMenuPostId, setOpenMoreMenuPostId] = useState<string | null>(null);
  const [openReportSubMenuPostId, setOpenReportSubMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState<string>('');
  const [editingPostType, setEditingPostType] = useState<CommunityPostType>('استفسار');
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

  const myBlockedUserKeys = useMemo(() => {
    const list1 = userBlockedMap[visitorId] || [];
    const list2 = userBlockedMap[visitorName.trim().toLowerCase()] || [];
    return new Set([...list1, ...list2]);
  }, [userBlockedMap, visitorId, visitorName]);

  // Approved Posts Filtered by Type (and hidden for current user only if author is blocked by current user)
  const approvedPosts = posts.filter(
    (p) =>
      p.status === 'approved' &&
      !myBlockedUserKeys.has(p.authorId) &&
      !myBlockedUserKeys.has(p.authorUsername.trim().toLowerCase())
  );
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
    reportedCommentsList.length;

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

  // Badge styling helper for Post Type ('استفسار' | 'اقتراح' | 'بيع')
  const getPostTypeBadgeStyle = (type: CommunityPostType) => {
    switch (type) {
      case 'استفسار':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/50';
      case 'اقتراح':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/50';
      case 'بيع':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50';
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
            onClick={() => setAdminActiveTab('reports')}
            className={`fluent-reveal py-3 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              adminActiveTab === 'reports'
                ? 'bg-rose-600 text-white shadow-lg'
                : 'bg-[#0A192F]/80 text-[#94A3B8] hover:text-white'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>بلاغات</span>
            <span className="px-2 py-0.5 rounded-full bg-[#0A192F]/90 text-rose-300 text-xs font-mono-tabular">
              {reportedPostsList.length + reportedCommentsList.length}
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

              {/* Left Dropdown Filter ("المنشورات" أو "التعليقات") */}
              <div className="flex items-center gap-2 mr-auto">
                <Filter className="w-4 h-4 text-rose-400" />
                <select
                  value={reportsFilterType}
                  onChange={(e) =>
                    setReportsFilterType(e.target.value as 'posts' | 'comments')
                  }
                  className="rounded-xl bg-[#0A192F] border border-[#334155] focus:border-rose-400 px-4 py-2 text-xs sm:text-sm text-[#F8FAFC] font-extrabold outline-none"
                >
                  <option value="posts">
                    المنشورات ({reportedPostsList.length})
                  </option>
                  <option value="comments">
                    التعليقات ({reportedCommentsList.length})
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
    <div className="space-y-4 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* 1. Top Bar: Title + Single-Row Controls on Mobile ("المنشورات المحفوظة" ثم "محادثة لايف" ثم "قائمة منسدلة الفلترة" في سطر واحد بدون مسطرة تحريك يمين أو يسار) */}
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

        {/* Single-Row Controls on Mobile: 1) المنشورات المحفوظة -> 2) محادثة لايف -> 3) قائمة منسدلة الفلترة (No horizontal scrollbar) */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1 sm:gap-2 flex-nowrap overflow-hidden">
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
              <option value="استفسار">
                استفسار ({approvedPosts.filter((p) => p.postType === 'استفسار').length})
              </option>
              <option value="اقتراح">
                اقتراح ({approvedPosts.filter((p) => p.postType === 'اقتراح').length})
              </option>
              <option value="بيع">
                بيع ({approvedPosts.filter((p) => p.postType === 'بيع').length})
              </option>
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
              <option value="استفسار">استفسار</option>
              <option value="اقتراح">اقتراح</option>
              <option value="بيع">بيع</option>
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
          const isPostOwner = Boolean(
            currentUser &&
              (post.authorId === currentUser.id ||
                post.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
          const isMoreMenuOpen = openMoreMenuPostId === post.id;
          const isReportSubMenuOpen = openReportSubMenuPostId === post.id;
          const isEditingThisPost = editingPostId === post.id;

          // Comments: Pinned comment or First comment shown directly below the post
          const pinnedOrFirstComment =
            post.comments.find((c) => c.isPinned) || post.comments[0] || null;
          const isAllCommentsExpanded = Boolean(
            expandedAllCommentsForPost[post.id]
          );
          const commentsToRender = isAllCommentsExpanded
            ? post.comments
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
              {/* السطر الأول: الاسم في سطر واحد على اليمين | وعلى أقصى اليسار نوع المنشور + زر المزيد */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#0A192F] border border-sky-400/40 flex items-center justify-center text-sky-400 font-extrabold text-xs shrink-0">
                    {post.authorUsername.slice(0, 1)}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                    {post.authorUsername}
                  </div>
                </div>

                {/* على أقصى اليسار: نوع المنشور + زر "المزيد" */}
                <div className="flex items-center gap-1.5 shrink-0 relative">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border whitespace-nowrap ${getPostTypeBadgeStyle(
                      post.postType
                    )}`}
                  >
                    {post.postType}
                  </span>

                  {/* زر "المزيد" على يسار المنشور في الأعلى */}
                  <div className="relative">
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

                    {/* القائمة المنسدلة لزر "المزيد": تظهر بالكامل ولا يختفي منها أي جزء في نسخة الهاتف */}
                    {isMoreMenuOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-[#0A192F] border border-sky-400/60 shadow-2xl z-50 py-1.5 overflow-hidden">
                        {isPostOwner ? (
                          /* لصاحب المنشور فقط: تعديل + حذف */
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditingPostContent(post.content);
                                setEditingPostType(post.postType);
                                setOpenMoreMenuPostId(null);
                              }}
                              className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-sky-300 hover:bg-sky-500/20 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePost(post.id);
                                setOpenMoreMenuPostId(null);
                              }}
                              className="w-full text-right px-3.5 py-2 text-xs font-extrabold text-rose-300 hover:bg-rose-600/25 flex items-center gap-2 cursor-pointer border-t border-[#334155]/60"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>حذف</span>
                            </button>
                          </>
                        ) : (
                          /* لباقي المستخدمين: حفظ + الإبلاغ */
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                toggleSavePost(post.id);
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

                            {/* صلاحيات Admin فقط: إمكانية حذف أي منشور */}
                            {isStrictAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeletePost(post.id);
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
                      <option value="استفسار">استفسار</option>
                      <option value="اقتراح">اقتراح</option>
                      <option value="بيع">بيع</option>
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
                <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>
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

                  {/* 3. زر "تعليق" (بدلاً من أضف تعليق) بحجم صغير وفي نفس السطر */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCommentInputForPost((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className="fluent-reveal px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-sky-300 border border-[#334155] text-[11px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span>تعليق ({post.comments.length})</span>
                  </button>
                </div>

                {post.comments.length > 1 && (
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
                      : `الكل (${post.comments.length})`}
                  </button>
                )}
              </div>

              {/* Add Comment Input Row (Reply to Post) */}
              {openCommentInputForPost[post.id] && (
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

                          <div className="flex items-center gap-1.5 relative">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  onTogglePinComment(post.id, cmt.id)
                                }
                                title="تثبيت التعليق"
                                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                              >
                                {cmt.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
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

                          {/* Reply to another person's comment */}
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

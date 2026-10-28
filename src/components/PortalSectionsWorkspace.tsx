import React from 'react';
import { Settings, ShieldAlert } from 'lucide-react';
import {
  CommentEmojiReactionType,
  CommunityCommentItem,
  CommunityCommentReply,
  CommunityPostItem,
  CommunityPostStatus,
  CommunityPostType,
  CommunityReportReason,
  MainSectionId,
  PlatformDatabaseState,
  PlatformSettings,
  PopupAdConfig,
  ServicePhoneEntry,
  SquareMovingAd,
  StoreCommentItem,
  StoreListingItem,
  StoreReplyItem,
  TawsilaRideItem,
  TopBannerAd,
  UserAccount,
  UtilitySubmissionItem,
} from '../types';
import { FluentButton, FluentCard } from './FluentUI';
import { DirectoryStoresView } from './DirectoryStoresView';
import { ServiceNumbersView } from './ServiceNumbersView';
import { TawsilaLiveView } from './TawsilaLiveView';
import { CommunityHubView } from './CommunityHubView';
import { UtilitiesSubmissionsView } from './UtilitiesSubmissionsView';
import { AdminSettingsHubView } from './AdminSettingsHubView';
import { RealOnlinePresenceStats } from '../services/storageService';

interface PortalSectionsWorkspaceProps {
  activeSection: MainSectionId;
  state: PlatformDatabaseState;
  currentUser: UserAccount | null;
  onlineCount: number;
  onlineStats?: RealOnlinePresenceStats;
  connStatus: 'local' | 'firebase_connected' | 'firebase_error';
  connMessage: string;
  onOpenAuthModal: () => void;
  onAddStore: (store: StoreListingItem) => void;
  onUpdateStore: (store: StoreListingItem) => void;
  onIncrementStoreViews: (storeId: string) => void;
  onImportStoresBatch: (stores: StoreListingItem[]) => void;
  onDeleteStore: (id: string) => void;
  onToggleStoreLike: (storeId: string) => void;
  onToggleStoreDislike: (storeId: string) => void;
  onRateStore: (storeId: string, stars: number) => void;
  onAddStoreComment: (storeId: string, comment: StoreCommentItem) => void;
  onDeleteStoreComment: (storeId: string, commentId: string) => void;
  onToggleCommentLike: (storeId: string, commentId: string) => void;
  onAddCommentReply: (storeId: string, commentId: string, reply: StoreReplyItem) => void;
  onAddServiceNumber: (entry: ServicePhoneEntry) => void;
  onUpdateServiceNumber: (entry: ServicePhoneEntry) => void;
  onDeleteServiceNumber: (id: string) => void;
  onAddTawsila: (ride: TawsilaRideItem) => void;
  onUpdateTawsila: (ride: TawsilaRideItem) => void;
  onDeleteTawsila: (id: string) => void;
  onAddCommunityPost: (post: CommunityPostItem) => void;
  onEditCommunityPost?: (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => void;
  onUpdatePostStatus: (postId: string, status: CommunityPostStatus) => void;
  onDeletePost: (postId: string) => void;
  onTogglePinCommunityPost?: (postId: string) => void;
  onToggleCommunityPostSold?: (postId: string) => void;
  onToggleCommunityPostCommentsDisabled?: (postId: string) => void;
  onTogglePostLike: (postId: string) => void;
  onTogglePostDislike: (postId: string) => void;
  onReportPost: (postId: string, reason: CommunityReportReason) => void;
  onRestoreReportedPost: (postId: string) => void;
  onAddCommentToPost: (postId: string, comment: CommunityCommentItem) => void;
  onToggleCommunityCommentLike: (postId: string, commentId: string) => void;
  onToggleCommunityCommentEmoji: (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => void;
  onAddReplyToCommunityComment: (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => void;
  onReportCommunityComment: (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => void;
  onDeleteCommunityComment: (postId: string, commentId: string) => void;
  onRestoreReportedCommunityComment: (postId: string, commentId: string) => void;
  onTogglePinCommunityComment: (postId: string, commentId: string) => void;
  onToggleHideCommunityComment?: (postId: string, commentId: string) => void;
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
    status: 'pending' | 'accepted' | 'rejected'
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
  onDeletePrivateChatMessage?: (msgId: string) => void;
  onDeletePrivateConversation?: (partnerUsername: string) => void;
  onTogglePinPrivateChatMessage?: (msgId: string) => void;
  onUpdateSettings: (settings: PlatformSettings) => void;
  onUpdateUserAccount: (user: UserAccount) => void;
  onDeleteUserAccount: (id: string) => void;
  onAddTopBanner: (banner: TopBannerAd) => void;
  onUpdateTopBanner: (banner: TopBannerAd) => void;
  onDeleteTopBanner: (id: string) => void;
  onAddSquareAd: (ad: SquareMovingAd) => void;
  onUpdateSquareAd: (ad: SquareMovingAd) => void;
  onTogglePinSquareAd: (id: string) => void;
  onDeleteSquareAd: (id: string) => void;
  onUpdatePopupAd: (popup: PopupAdConfig) => void;
  onMarkMessageRead: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onAdminReplyToMessage?: (messageId: string, replyText: string) => void;
  onOpenPrivateChatWithUser?: (targetUserId: string, targetUsername: string) => void;
  onOpenPrivateChatHistoryModal?: () => void;
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
  onRenameStoreCategory: (oldName: string, newName: string) => void;
  onAddUtilityType: (newTypeName: string) => void;
  onSaveUtilitySubmission: (item: UtilitySubmissionItem) => void;
  onDeleteUtilitySubmission: (id: string) => void;
  onAddUtilityPost: (post: CommunityPostItem) => void;
  onEditUtilityPost: (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => void;
  onUpdateUtilityPostStatus: (postId: string, status: CommunityPostStatus) => void;
  onDeleteUtilityPost: (postId: string) => void;
  onTogglePinUtilityPost?: (postId: string) => void;
  onToggleUtilityPostSold?: (postId: string) => void;
  onToggleUtilityPostCommentsDisabled?: (postId: string) => void;
  onToggleUtilityPostLike: (postId: string) => void;
  onToggleUtilityPostDislike: (postId: string) => void;
  onReportUtilityPost: (postId: string, reason: CommunityReportReason) => void;
  onRestoreReportedUtilityPost: (postId: string) => void;
  onAddCommentToUtilityPost: (postId: string, comment: CommunityCommentItem) => void;
  onToggleUtilityCommentLike: (postId: string, commentId: string) => void;
  onToggleUtilityCommentEmoji: (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => void;
  onAddReplyToUtilityComment: (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => void;
  onReportUtilityComment: (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => void;
  onDeleteUtilityComment: (postId: string, commentId: string) => void;
  onRestoreReportedUtilityComment: (postId: string, commentId: string) => void;
  onTogglePinUtilityComment: (postId: string, commentId: string) => void;
  onToggleHideUtilityComment?: (postId: string, commentId: string) => void;
  onAddBuySellPost: (post: CommunityPostItem) => void;
  onEditBuySellPost: (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => void;
  onUpdateBuySellPostStatus: (postId: string, status: CommunityPostStatus) => void;
  onDeleteBuySellPost: (postId: string) => void;
  onTogglePinBuySellPost?: (postId: string) => void;
  onToggleBuySellPostSold?: (postId: string) => void;
  onToggleBuySellPostCommentsDisabled?: (postId: string) => void;
  onToggleBuySellPostLike: (postId: string) => void;
  onToggleBuySellPostDislike: (postId: string) => void;
  onReportBuySellPost: (postId: string, reason: CommunityReportReason) => void;
  onRestoreReportedBuySellPost: (postId: string) => void;
  onAddCommentToBuySellPost: (postId: string, comment: CommunityCommentItem) => void;
  onToggleBuySellCommentLike: (postId: string, commentId: string) => void;
  onToggleBuySellCommentEmoji: (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => void;
  onAddReplyToBuySellComment: (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => void;
  onReportBuySellComment: (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => void;
  onDeleteBuySellComment: (postId: string, commentId: string) => void;
  onRestoreReportedBuySellComment: (postId: string, commentId: string) => void;
  onTogglePinBuySellComment: (postId: string, commentId: string) => void;
  onToggleHideBuySellComment?: (postId: string, commentId: string) => void;
}

export const PortalSectionsWorkspace: React.FC<PortalSectionsWorkspaceProps> = ({
  activeSection,
  state,
  currentUser,
  onlineCount,
  onlineStats,
  connStatus,
  connMessage,
  onOpenAuthModal,
  onAddStore,
  onUpdateStore,
  onIncrementStoreViews,
  onImportStoresBatch,
  onDeleteStore,
  onToggleStoreLike,
  onToggleStoreDislike,
  onRateStore,
  onAddStoreComment,
  onDeleteStoreComment,
  onToggleCommentLike,
  onAddCommentReply,
  onAddServiceNumber,
  onUpdateServiceNumber,
  onDeleteServiceNumber,
  onAddTawsila,
  onUpdateTawsila,
  onDeleteTawsila,
  onAddCommunityPost,
  onEditCommunityPost,
  onUpdatePostStatus,
  onDeletePost,
  onTogglePinCommunityPost,
  onToggleCommunityPostSold,
  onToggleCommunityPostCommentsDisabled,
  onTogglePostLike,
  onTogglePostDislike,
  onReportPost,
  onRestoreReportedPost,
  onAddCommentToPost,
  onToggleCommunityCommentLike,
  onToggleCommunityCommentEmoji,
  onAddReplyToCommunityComment,
  onReportCommunityComment,
  onDeleteCommunityComment,
  onRestoreReportedCommunityComment,
  onTogglePinCommunityComment,
  onToggleHideCommunityComment,
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
  onDeletePrivateChatMessage,
  onDeletePrivateConversation,
  onTogglePinPrivateChatMessage,
  onUpdateSettings,
  onUpdateUserAccount,
  onDeleteUserAccount,
  onAddTopBanner,
  onUpdateTopBanner,
  onDeleteTopBanner,
  onAddSquareAd,
  onUpdateSquareAd,
  onTogglePinSquareAd,
  onDeleteSquareAd,
  onUpdatePopupAd,
  onMarkMessageRead,
  onDeleteMessage,
  onAdminReplyToMessage,
  onOpenPrivateChatWithUser,
  onOpenPrivateChatHistoryModal,
  externalOpenChatTarget,
  externalOpenHistoryModalTick,
  externalLoginNotification,
  onRenameStoreCategory,
  onAddUtilityType,
  onSaveUtilitySubmission,
  onDeleteUtilitySubmission,
  onAddUtilityPost,
  onEditUtilityPost,
  onUpdateUtilityPostStatus,
  onDeleteUtilityPost,
  onTogglePinUtilityPost,
  onToggleUtilityPostSold,
  onToggleUtilityPostCommentsDisabled,
  onToggleUtilityPostLike,
  onToggleUtilityPostDislike,
  onReportUtilityPost,
  onRestoreReportedUtilityPost,
  onAddCommentToUtilityPost,
  onToggleUtilityCommentLike,
  onToggleUtilityCommentEmoji,
  onAddReplyToUtilityComment,
  onReportUtilityComment,
  onDeleteUtilityComment,
  onRestoreReportedUtilityComment,
  onTogglePinUtilityComment,
  onToggleHideUtilityComment,
  onAddBuySellPost,
  onEditBuySellPost,
  onUpdateBuySellPostStatus,
  onDeleteBuySellPost,
  onTogglePinBuySellPost,
  onToggleBuySellPostSold,
  onToggleBuySellPostCommentsDisabled,
  onToggleBuySellPostLike,
  onToggleBuySellPostDislike,
  onReportBuySellPost,
  onRestoreReportedBuySellPost,
  onAddCommentToBuySellPost,
  onToggleBuySellCommentLike,
  onToggleBuySellCommentEmoji,
  onAddReplyToBuySellComment,
  onReportBuySellComment,
  onDeleteBuySellComment,
  onRestoreReportedBuySellComment,
  onTogglePinBuySellComment,
  onToggleHideBuySellComment,
}) => {
  // Settings is strictly for Admin only (Moderators can review posts & edit other sections EXCEPT Settings)
  const isStrictAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.username?.trim().toLowerCase() === 'admin' ||
    currentUser?.accountName?.trim().toLowerCase() === 'admin';

  // If the current section is disabled in Maintenance settings, show "جاري التحديث ...." + maintenance image to all users EXCEPT admin
  const isSectionDisabledInMaintenance =
    activeSection !== 'settings' &&
    Boolean(state.settings.disabledSections?.[activeSection]);

  const [maintenanceDotStep, setMaintenanceDotStep] = React.useState<number>(1);
  React.useEffect(() => {
    if (!isSectionDisabledInMaintenance || isStrictAdmin) return;
    const timer = setInterval(() => {
      setMaintenanceDotStep((prev) => (prev >= 4 ? 0 : prev + 1));
    }, 400);
    return () => clearInterval(timer);
  }, [isSectionDisabledInMaintenance, isStrictAdmin]);

  if (isSectionDisabledInMaintenance && !isStrictAdmin) {
    return (
      <FluentCard className="p-8 sm:p-12 text-center space-y-6 border-2 border-amber-500/40 bg-[#112240]/95 shadow-2xl max-w-2xl mx-auto my-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-lg">
          <Settings className="w-8 h-8 text-amber-400 animate-spin" />
        </div>

        <div className="mx-auto w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border border-amber-400/30 bg-[#0A192F] p-4 shadow-inner">
          <svg
            viewBox="0 0 400 260"
            className="w-full h-auto mx-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="maintBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <linearGradient id="amberGear" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="skyGear" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>
            <rect width="400" height="260" rx="18" fill="url(#maintBg)" />
            <circle cx="200" cy="115" r="76" fill="#F59E0B" fillOpacity="0.08" />
            {/* Main Gear (Animated Spinning Gear) */}
            <g transform="translate(175, 110)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="5s"
                  repeatCount="indefinite"
                />
                <circle cx="0" cy="0" r="38" fill="url(#amberGear)" />
                <circle cx="0" cy="0" r="16" fill="#0F172A" />
                <rect x="-6" y="-48" width="12" height="14" rx="3" fill="#F59E0B" />
                <rect x="-6" y="34" width="12" height="14" rx="3" fill="#F59E0B" />
                <rect x="-48" y="-6" width="14" height="12" rx="3" fill="#F59E0B" />
                <rect x="34" y="-6" width="14" height="12" rx="3" fill="#F59E0B" />
                <g transform="rotate(45)">
                  <rect x="-6" y="-48" width="12" height="14" rx="3" fill="#F59E0B" />
                  <rect x="-6" y="34" width="12" height="14" rx="3" fill="#F59E0B" />
                  <rect x="-48" y="-6" width="14" height="12" rx="3" fill="#F59E0B" />
                  <rect x="34" y="-6" width="14" height="12" rx="3" fill="#F59E0B" />
                </g>
              </g>
            </g>
            {/* Secondary Gear (Counter-Rotating Spinning Gear) */}
            <g transform="translate(242, 78)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="360 0 0"
                  to="0 0 0"
                  dur="3.5s"
                  repeatCount="indefinite"
                />
                <circle cx="0" cy="0" r="24" fill="url(#skyGear)" />
                <circle cx="0" cy="0" r="10" fill="#0F172A" />
                <rect x="-4" y="-31" width="8" height="10" rx="2" fill="#38BDF8" />
                <rect x="-4" y="21" width="8" height="10" rx="2" fill="#38BDF8" />
                <rect x="-31" y="-4" width="10" height="8" rx="2" fill="#38BDF8" />
                <rect x="21" y="-4" width="10" height="8" rx="2" fill="#38BDF8" />
                <g transform="rotate(45)">
                  <rect x="-4" y="-31" width="8" height="10" rx="2" fill="#38BDF8" />
                  <rect x="-4" y="21" width="8" height="10" rx="2" fill="#38BDF8" />
                  <rect x="-31" y="-4" width="10" height="8" rx="2" fill="#38BDF8" />
                  <rect x="21" y="-4" width="10" height="8" rx="2" fill="#38BDF8" />
                </g>
              </g>
            </g>
            {/* Wrench / Maintenance Barrier */}
            <rect x="70" y="192" width="260" height="22" rx="6" fill="#F59E0B" />
            <path d="M90 192 L110 192 L95 214 L75 214 Z" fill="#0F172A" />
            <path d="M140 192 L160 192 L145 214 L125 214 Z" fill="#0F172A" />
            <path d="M190 192 L210 192 L195 214 L175 214 Z" fill="#0F172A" />
            <path d="M240 192 L260 192 L245 214 L225 214 Z" fill="#0F172A" />
            <path d="M290 192 L310 192 L295 214 L275 214 Z" fill="#0F172A" />
            <text
              x="200"
              y="242"
              textAnchor="middle"
              fill="#F8FAFC"
              fontFamily="Cairo, sans-serif"
              fontWeight="800"
              fontSize="16"
            >
              صيانة وتحديث القسم
            </text>
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-wide inline-flex items-baseline justify-center">
            <span>جاري التحديث&nbsp;</span>
            <span className="inline-flex" aria-hidden="true">
              <span className={maintenanceDotStep >= 1 ? 'opacity-100' : 'opacity-0'}>
                .
              </span>
              <span className={maintenanceDotStep >= 2 ? 'opacity-100' : 'opacity-0'}>
                .
              </span>
              <span className={maintenanceDotStep >= 3 ? 'opacity-100' : 'opacity-0'}>
                .
              </span>
              <span className={maintenanceDotStep >= 4 ? 'opacity-100' : 'opacity-0'}>
                .
              </span>
            </span>
          </h2>
          <p className="text-xs sm:text-sm font-bold text-[#94A3B8]">
            هذا القسم يخضع حالياً للصيانة والتحديث، وسيعود للعمل قريباً.
          </p>
        </div>
      </FluentCard>
    );
  }

  // ================= 1. DIRECTORY (أضف محل / الدليل) =================
  if (activeSection === 'directory') {
    return (
      <DirectoryStoresView
        stores={state.stores}
        settings={state.settings}
        currentUser={currentUser}
        onOpenAuthModal={onOpenAuthModal}
        onAddStore={onAddStore}
        onUpdateStore={onUpdateStore}
        onIncrementStoreViews={onIncrementStoreViews}
        onImportStoresBatch={onImportStoresBatch}
        onDeleteStore={onDeleteStore}
        onToggleStoreLike={onToggleStoreLike}
        onToggleStoreDislike={onToggleStoreDislike}
        onRateStore={onRateStore}
        onAddStoreComment={onAddStoreComment}
        onDeleteStoreComment={onDeleteStoreComment}
        onToggleCommentLike={onToggleCommentLike}
        onAddCommentReply={onAddCommentReply}
      />
    );
  }

  // ================= 2. SERVICE NUMBERS (أرقام الخدمات) =================
  if (activeSection === 'services_numbers') {
    return (
      <ServiceNumbersView
        serviceNumbers={state.serviceNumbers}
        settings={state.settings}
        currentUser={currentUser}
        onAddServiceNumber={onAddServiceNumber}
        onUpdateServiceNumber={onUpdateServiceNumber}
        onDeleteServiceNumber={onDeleteServiceNumber}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }

  // ================= 3. TAWSILA (توصيلة) =================
  if (activeSection === 'tawsila') {
    return (
      <TawsilaLiveView
        rides={state.tawsilaRides}
        settings={state.settings}
        currentUser={currentUser}
        onAddTawsila={onAddTawsila}
        onUpdateTawsila={onUpdateTawsila}
        onDeleteTawsila={onDeleteTawsila}
        onUpdateSettings={onUpdateSettings}
      />
    );
  }

  // ================= 4. COMMUNITY (مجتمع + محادثة لايف) =================
  if (activeSection === 'community') {
    return (
      <CommunityHubView
        posts={state.communityPosts}
        liveChatMessages={state.liveChatMessages || []}
        onlineCount={onlineCount}
        onlineStats={onlineStats}
        currentUser={currentUser}
        users={state.users}
        cooldownConfigSeconds={state.settings.liveChatCooldownSeconds ?? 5}
        autoClearMinutes={state.settings.liveChatAutoClearMinutes ?? 60}
        lastClearedAt={state.settings.liveChatLastClearedAt}
        chatPenalties={state.chatPenalties || []}
        privateChatMessages={state.privateChatMessages || []}
        privateChatStatuses={state.privateChatStatuses || {}}
        chatTypingMap={state.chatTypingMap || {}}
        userBlockedMap={state.userBlockedMap || {}}
        privateChatReports={state.privateChatReports || []}
        allowedPostTypes={['استفسار', 'اقتراح']}
        onOpenAuthModal={onOpenAuthModal}
        onAddCommunityPost={onAddCommunityPost}
        onEditCommunityPost={onEditCommunityPost}
        onUpdatePostStatus={onUpdatePostStatus}
        onDeletePost={onDeletePost}
        onTogglePinPost={onTogglePinCommunityPost}
        onTogglePostSold={onToggleCommunityPostSold}
        onTogglePostCommentsDisabled={onToggleCommunityPostCommentsDisabled}
        onTogglePostLike={onTogglePostLike}
        onTogglePostDislike={onTogglePostDislike}
        onReportPost={onReportPost}
        onRestoreReportedPost={onRestoreReportedPost}
        onAddCommentToPost={onAddCommentToPost}
        onToggleCommentLike={onToggleCommunityCommentLike}
        onToggleCommentEmoji={onToggleCommunityCommentEmoji}
        onAddReplyToComment={onAddReplyToCommunityComment}
        onReportComment={onReportCommunityComment}
        onDeleteComment={onDeleteCommunityComment}
        onRestoreReportedComment={onRestoreReportedCommunityComment}
        onTogglePinComment={onTogglePinCommunityComment}
        onToggleHideComment={onToggleHideCommunityComment}
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
        onUnblockUserInChat={onUnblockUserInChat}
        onTogglePrivateMessageReaction={onTogglePrivateMessageReaction}
        onReportPrivateChatMessage={onReportPrivateChatMessage}
        onReportUserInPrivateChat={onReportUserInPrivateChat}
        onDismissPrivateChatReport={onDismissPrivateChatReport}
        onDeleteUserAccountFromChat={onDeleteUserAccountFromChat}
        onDeletePrivateChatMessage={onDeletePrivateChatMessage}
        onDeletePrivateConversation={onDeletePrivateConversation}
        onTogglePinPrivateChatMessage={onTogglePinPrivateChatMessage}
      />
    );
  }

  // ================= 5. UTILITIES SUBMISSIONS (تقديمات المرافق) =================
  if (activeSection === 'utilities') {
    return (
      <UtilitiesSubmissionsView
        utilityTypes={
          state.settings.utilityTypes || [
            'تقديم المياه',
            'تقديم الكهرباء',
            'تقديم الغاز',
          ]
        }
        utilitySubmissions={state.utilitySubmissions || []}
        utilityPosts={state.utilityPosts || []}
        liveChatMessages={state.liveChatMessages || []}
        onlineCount={onlineCount}
        onlineStats={onlineStats}
        currentUser={currentUser}
        users={state.users}
        cooldownConfigSeconds={state.settings.liveChatCooldownSeconds ?? 5}
        autoClearMinutes={state.settings.liveChatAutoClearMinutes ?? 60}
        lastClearedAt={state.settings.liveChatLastClearedAt}
        chatPenalties={state.chatPenalties || []}
        privateChatMessages={state.privateChatMessages || []}
        privateChatStatuses={state.privateChatStatuses || {}}
        chatTypingMap={state.chatTypingMap || {}}
        userBlockedMap={state.userBlockedMap || {}}
        privateChatReports={state.privateChatReports || []}
        onOpenAuthModal={onOpenAuthModal}
        onAddUtilityType={onAddUtilityType}
        onSaveUtilitySubmission={onSaveUtilitySubmission}
        onDeleteUtilitySubmission={onDeleteUtilitySubmission}
        onAddUtilityPost={onAddUtilityPost}
        onEditUtilityPost={onEditUtilityPost}
        onUpdateUtilityPostStatus={onUpdateUtilityPostStatus}
        onDeleteUtilityPost={onDeleteUtilityPost}
        onTogglePinUtilityPost={onTogglePinUtilityPost}
        onToggleUtilityPostSold={onToggleUtilityPostSold}
        onToggleUtilityPostCommentsDisabled={onToggleUtilityPostCommentsDisabled}
        onToggleUtilityPostLike={onToggleUtilityPostLike}
        onToggleUtilityPostDislike={onToggleUtilityPostDislike}
        onReportUtilityPost={onReportUtilityPost}
        onRestoreReportedUtilityPost={onRestoreReportedUtilityPost}
        onAddCommentToUtilityPost={onAddCommentToUtilityPost}
        onToggleUtilityCommentLike={onToggleUtilityCommentLike}
        onToggleUtilityCommentEmoji={onToggleUtilityCommentEmoji}
        onAddReplyToUtilityComment={onAddReplyToUtilityComment}
        onReportUtilityComment={onReportUtilityComment}
        onDeleteUtilityComment={onDeleteUtilityComment}
        onRestoreReportedUtilityComment={onRestoreReportedUtilityComment}
        onTogglePinUtilityComment={onTogglePinUtilityComment}
        onToggleHideUtilityComment={onToggleHideUtilityComment}
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
    );
  }

  // ================= 6. BUY & SELL (بيع واشتري) =================
  if (activeSection === 'buy_sell') {
    return (
      <CommunityHubView
        posts={state.buySellPosts || []}
        liveChatMessages={state.liveChatMessages || []}
        onlineCount={onlineCount}
        onlineStats={onlineStats}
        currentUser={currentUser}
        users={state.users}
        cooldownConfigSeconds={state.settings.liveChatCooldownSeconds ?? 5}
        autoClearMinutes={state.settings.liveChatAutoClearMinutes ?? 60}
        lastClearedAt={state.settings.liveChatLastClearedAt}
        chatPenalties={state.chatPenalties || []}
        privateChatMessages={state.privateChatMessages || []}
        privateChatStatuses={state.privateChatStatuses || {}}
        chatTypingMap={state.chatTypingMap || {}}
        userBlockedMap={state.userBlockedMap || {}}
        privateChatReports={state.privateChatReports || []}
        sectionTitle="بيع واشتري"
        sectionSubtitle="بيع وشراء مباشر بين الأهالي بدون أي عمولات"
        hideLiveChatButton={true}
        savedPostsNamespace="buy_sell"
        allowedPostTypes={['بائع', 'مشتري']}
        topWarningBannerText="الموقع غير مسؤل عن اي عمليات شراء  او بيع  وليس له اي عمولات علي البيع و جميع العمليات المسؤل عنها صاحبها فقط"
        enableBuySellPrivateChat={true}
        externalOpenChatTarget={externalOpenChatTarget}
        externalOpenHistoryModalTick={externalOpenHistoryModalTick}
        externalLoginNotification={externalLoginNotification}
        onOpenAuthModal={onOpenAuthModal}
        onAddCommunityPost={onAddBuySellPost}
        onEditCommunityPost={onEditBuySellPost}
        onUpdatePostStatus={onUpdateBuySellPostStatus}
        onDeletePost={onDeleteBuySellPost}
        onTogglePinPost={onTogglePinBuySellPost}
        onTogglePostSold={onToggleBuySellPostSold}
        onTogglePostCommentsDisabled={onToggleBuySellPostCommentsDisabled}
        onTogglePostLike={onToggleBuySellPostLike}
        onTogglePostDislike={onToggleBuySellPostDislike}
        onReportPost={onReportBuySellPost}
        onRestoreReportedPost={onRestoreReportedBuySellPost}
        onAddCommentToPost={onAddCommentToBuySellPost}
        onToggleCommentLike={onToggleBuySellCommentLike}
        onToggleCommentEmoji={onToggleBuySellCommentEmoji}
        onAddReplyToComment={onAddReplyToBuySellComment}
        onReportComment={onReportBuySellComment}
        onDeleteComment={onDeleteBuySellComment}
        onRestoreReportedComment={onRestoreReportedBuySellComment}
        onTogglePinComment={onTogglePinBuySellComment}
        onToggleHideComment={onToggleHideBuySellComment}
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
        onUnblockUserInChat={onUnblockUserInChat}
        onTogglePrivateMessageReaction={onTogglePrivateMessageReaction}
        onReportPrivateChatMessage={onReportPrivateChatMessage}
        onReportUserInPrivateChat={onReportUserInPrivateChat}
        onDismissPrivateChatReport={onDismissPrivateChatReport}
        onDeleteUserAccountFromChat={onDeleteUserAccountFromChat}
        onDeletePrivateChatMessage={onDeletePrivateChatMessage}
        onDeletePrivateConversation={onDeletePrivateConversation}
        onTogglePinPrivateChatMessage={onTogglePinPrivateChatMessage}
      />
    );
  }

  // ================= 7. ADMIN SETTINGS (الإعدادات - يظهر للـ Admin فقط وليس المشرف) =================
  if (!isStrictAdmin) {
    return (
      <FluentCard className="p-8 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h3 className="text-lg font-extrabold text-[#F8FAFC]">
          قسم الإعدادات مخصص لمدير النظام (Admin) فقط
        </h3>
        <p className="text-xs text-[#94A3B8]">
          يرجى تسجيل الدخول بحساب الإدارة الرئيسي للوصول إلى إعدادات المنصة.
        </p>
        <FluentButton variant="primary" onClick={onOpenAuthModal}>
          تسجيل الدخول
        </FluentButton>
      </FluentCard>
    );
  }

  return (
    <AdminSettingsHubView
      state={state}
      currentUser={currentUser}
      onlineStats={onlineStats}
      connStatus={connStatus}
      connMessage={connMessage}
      onUpdateSettings={onUpdateSettings}
      onUpdateTawsila={onUpdateTawsila}
      onDeleteTawsila={onDeleteTawsila}
      onUpdateUserAccount={onUpdateUserAccount}
      onDeleteUserAccount={onDeleteUserAccount}
      onUpdateStore={onUpdateStore}
      onDeleteStore={onDeleteStore}
      onAddTopBanner={onAddTopBanner}
      onUpdateTopBanner={onUpdateTopBanner}
      onDeleteTopBanner={onDeleteTopBanner}
      onAddSquareAd={onAddSquareAd}
      onUpdateSquareAd={onUpdateSquareAd}
      onTogglePinSquareAd={onTogglePinSquareAd}
      onDeleteSquareAd={onDeleteSquareAd}
      onUpdatePopupAd={onUpdatePopupAd}
      onMarkMessageRead={onMarkMessageRead}
      onDeleteMessage={onDeleteMessage}
      onAdminReplyToMessage={onAdminReplyToMessage}
      onRenameStoreCategory={onRenameStoreCategory}
      onOpenPrivateChatWithUser={onOpenPrivateChatWithUser}
      onOpenPrivateChatHistoryModal={onOpenPrivateChatHistoryModal}
    />
  );
};

import React from 'react';
import { ShieldAlert } from 'lucide-react';
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
  onAddBuySellPost: (post: CommunityPostItem) => void;
  onEditBuySellPost: (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => void;
  onUpdateBuySellPostStatus: (postId: string, status: CommunityPostStatus) => void;
  onDeleteBuySellPost: (postId: string) => void;
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
  onRenameStoreCategory,
  onAddUtilityType,
  onSaveUtilitySubmission,
  onDeleteUtilitySubmission,
  onAddUtilityPost,
  onEditUtilityPost,
  onUpdateUtilityPostStatus,
  onDeleteUtilityPost,
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
  onAddBuySellPost,
  onEditBuySellPost,
  onUpdateBuySellPostStatus,
  onDeleteBuySellPost,
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
}) => {
  // Settings is strictly for Admin only (Moderators can review posts & edit other sections EXCEPT Settings)
  const isStrictAdmin = currentUser?.role === 'admin';

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
        onOpenAuthModal={onOpenAuthModal}
        onAddCommunityPost={onAddCommunityPost}
        onEditCommunityPost={onEditCommunityPost}
        onUpdatePostStatus={onUpdatePostStatus}
        onDeletePost={onDeletePost}
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
        onOpenAuthModal={onOpenAuthModal}
        onAddCommunityPost={onAddBuySellPost}
        onEditCommunityPost={onEditBuySellPost}
        onUpdatePostStatus={onUpdateBuySellPostStatus}
        onDeletePost={onDeleteBuySellPost}
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
      onRenameStoreCategory={onRenameStoreCategory}
    />
  );
};

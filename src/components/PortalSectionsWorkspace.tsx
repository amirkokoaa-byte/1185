import React from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  CommentEmojiReactionType,
  CommunityCommentItem,
  CommunityCommentReply,
  CommunityPostItem,
  CommunityPostStatus,
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
} from '../types';
import { FluentButton, FluentCard } from './FluentUI';
import { DirectoryStoresView } from './DirectoryStoresView';
import { ServiceNumbersView } from './ServiceNumbersView';
import { TawsilaLiveView } from './TawsilaLiveView';
import { CommunityHubView } from './CommunityHubView';
import { AdminSettingsHubView } from './AdminSettingsHubView';

interface PortalSectionsWorkspaceProps {
  activeSection: MainSectionId;
  state: PlatformDatabaseState;
  currentUser: UserAccount | null;
  onlineCount: number;
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
    updatedPostType?: 'استفسار' | 'اقتراح' | 'بيع'
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
}

export const PortalSectionsWorkspace: React.FC<PortalSectionsWorkspaceProps> = ({
  activeSection,
  state,
  currentUser,
  onlineCount,
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
  onRespondPrivateChatRequest,
  onBlockUserInChat,
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
        currentUser={currentUser}
        users={state.users}
        cooldownConfigSeconds={state.settings.liveChatCooldownSeconds ?? 5}
        autoClearMinutes={state.settings.liveChatAutoClearMinutes ?? 60}
        chatPenalties={state.chatPenalties || []}
        privateChatMessages={state.privateChatMessages || []}
        privateChatStatuses={state.privateChatStatuses || {}}
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
        onRespondPrivateChatRequest={onRespondPrivateChatRequest}
        onBlockUserInChat={onBlockUserInChat}
        onDeleteUserAccountFromChat={onDeleteUserAccountFromChat}
      />
    );
  }

  // ================= 5. ADMIN SETTINGS (الإعدادات - يظهر للـ Admin فقط وليس المشرف) =================
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Store,
  PhoneCall,
  Car,
  Users,
  Settings,
  X,
  CheckCircle2,
  Radio,
  FileText,
  ShoppingBag,
} from 'lucide-react';
import {
  AdminMessage,
  ChatModerationPenalty,
  CommentEmojiReactionType,
  CommunityCommentItem,
  CommunityCommentReply,
  CommunityPostItem,
  CommunityPostStatus,
  CommunityPostType,
  CommunityReportReason,
  LiveChatMessageItem,
  MainSectionId,
  PlatformDatabaseState,
  PlatformSettings,
  PopupAdConfig,
  PrivateChatMessageItem,
  PrivateChatReportItem,
  PrivateChatStatus,
  ServicePhoneEntry,
  SquareMovingAd,
  StoreCommentItem,
  StoreListingItem,
  StoreReplyItem,
  TawsilaRideItem,
  TopBannerAd,
  UserAccount,
  UtilitySubmissionItem,
} from './types';
import {
  getOrCreateVisitorId,
  RealOnlinePresenceStats,
  removeCurrentTabPresence,
  storageEngine,
  subscribePresenceBroadcast,
  syncRealOnlinePresence,
} from './services/storageService';
import { FluentButton, FluentModal, useGlobalFluentReveal } from './components/FluentUI';
import { OfflineIndicator } from './components/PWAInstallPrompt';
import { HeaderAndAdPackages } from './components/HeaderAndAdPackages';
import { TopBannersAndSquareAds } from './components/TopBannersAndSquareAds';
import { AuthModal } from './components/AuthModal';
import { FooterAndContactModal } from './components/FooterAndContactModal';
import { PortalSectionsWorkspace } from './components/PortalSectionsWorkspace';

export default function App() {
  // Activate Windows 10 Fluent Reveal Highlight & Glowing Borders on Mouse Hover & Mobile Touch
  useGlobalFluentReveal();

  const [dbState, setDbState] = useState<PlatformDatabaseState>(() =>
    storageEngine.loadLocalState()
  );

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const initialDb = storageEngine.loadLocalState();
    return storageEngine.loadAuthenticatedUser(initialDb.users);
  });

  const [activeSection, setActiveSection] = useState<MainSectionId>(() => {
    try {
      const saved = sessionStorage.getItem('nakhil_1185_active_section_v1');
      if (
        saved === 'directory' ||
        saved === 'services_numbers' ||
        saved === 'tawsila' ||
        saved === 'community' ||
        saved === 'utilities' ||
        saved === 'buy_sell' ||
        saved === 'settings'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'directory';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('nakhil_1185_active_section_v1', activeSection);
    } catch {
      // ignore
    }
  }, [activeSection]);

  const [connStatus, setConnStatus] = useState<
    'local' | 'firebase_connected' | 'firebase_error'
  >('local');
  const [connMessage, setConnMessage] = useState<string>(
    'التخزين الفوري السريع في المتصفح نشط (Instant Browser Cache)'
  );

  // 100% Real Live Online Presence Counter (Registered Users + Guest Visitors)
  const [onlineStats, setOnlineStats] = useState<RealOnlinePresenceStats>(() =>
    syncRealOnlinePresence(currentUser)
  );

  useEffect(() => {
    document.title = dbState.settings.siteName || 'موقع خدمات التخيل 1185';
  }, [dbState.settings.siteName]);

  // If the Entry Popup Ad is NOT active on initial entry and user is not logged in, show Login/Register Modal
  useEffect(() => {
    const isPopupActive =
      dbState.popupAd &&
      dbState.popupAd.active &&
      (!dbState.popupAd.expiresAt ||
        new Date(dbState.popupAd.expiresAt).getTime() > Date.now());
    if (!isPopupActive && !currentUser) {
      setIsAuthModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const sendHeartbeat = () => {
      setOnlineStats(syncRealOnlinePresence(currentUser, false));
    };
    const refreshFromBroadcast = () => {
      setOnlineStats(syncRealOnlinePresence(currentUser, true));
    };
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 2000);
    const unsubBroadcast = subscribePresenceBroadcast(refreshFromBroadcast);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    const handleBeforeUnload = () => {
      removeCurrentTabPresence();
    };

    window.addEventListener('storage', refreshFromBroadcast);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      unsubBroadcast();
      window.removeEventListener('storage', refreshFromBroadcast);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [currentUser]);

  // Automatic Public Chat Clear Timer controlled by Admin Gear (liveChatAutoClearMinutes) - ticks every 1 second for instant clearing
  useEffect(() => {
    const autoClearMins = dbState.settings.liveChatAutoClearMinutes ?? 0;
    if (autoClearMins <= 0) return;

    const checkAndAutoClear = () => {
      setDbState((prev) => {
        const mins = prev.settings.liveChatAutoClearMinutes ?? 0;
        if (mins <= 0) return prev;
        const lastClearedMs = prev.settings.liveChatLastClearedAt
          ? new Date(prev.settings.liveChatLastClearedAt).getTime()
          : 0;
        const nowMs = Date.now();
        if (nowMs - lastClearedMs >= mins * 60 * 1000) {
          const nextState: PlatformDatabaseState = {
            ...prev,
            liveChatMessages: [],
            settings: {
              ...prev.settings,
              liveChatLastClearedAt: new Date(nowMs).toISOString(),
            },
          };
          storageEngine.persistState(nextState, currentUser?.id);
          return nextState;
        }
        return prev;
      });
    };

    checkAndAutoClear();
    const timer = setInterval(checkAndAutoClear, 1000);
    return () => clearInterval(timer);
  }, [
    dbState.settings.liveChatAutoClearMinutes,
    dbState.settings.liveChatLastClearedAt,
    currentUser?.id,
  ]);

  useEffect(() => {
    const unsubData = storageEngine.subscribe((nextState) => {
      setDbState(nextState);
    });
    const unsubStatus = storageEngine.subscribeStatus((status, msg) => {
      setConnStatus(status);
      if (msg) setConnMessage(msg);
    });

    storageEngine.initializeSync(dbState.settings.firebase, dbState);

    return () => {
      unsubData();
      unsubStatus();
    };
  }, []);

  const updateAndPersist = (
    updater: (prev: PlatformDatabaseState) => PlatformDatabaseState
  ) => {
    setDbState((prev) => {
      const next = updater(prev);
      storageEngine.persistState(next, currentUser?.id);
      return next;
    });
  };

  const updateAndPersistChatFast = (
    updater: (prev: PlatformDatabaseState) => PlatformDatabaseState
  ) => {
    setDbState((prev) => {
      const next = updater(prev);
      if (next !== prev) {
        storageEngine.persistChatFast(next, currentUser?.id);
      }
      return next;
    });
  };

  const visitorId = getOrCreateVisitorId(currentUser);

  // --- Authentication Handlers (with Instant Browser Cache & Instant Online Presence Broadcast on Login/Logout) ---
  const handleAuthenticate = (user: UserAccount, rememberMe: boolean) => {
    const onlineUser: UserAccount = { ...user, isOnline: true };
    setDbState((prev) => {
      const exists = prev.users.some((u) => u.id === onlineUser.id);
      const nextUsers = exists
        ? prev.users.map((u) =>
            u.id === onlineUser.id ? { ...u, isOnline: true } : u
          )
        : [...prev.users, onlineUser];
      const next: PlatformDatabaseState = {
        ...prev,
        users: nextUsers,
      };
      storageEngine.persistState(next, onlineUser.id);
      storageEngine.saveAuthenticatedUser(onlineUser, rememberMe, next);
      return next;
    });
    setCurrentUser(onlineUser);
    setOnlineStats(syncRealOnlinePresence(onlineUser, false));
  };

  const handleRegisterNewUser = (newUser: UserAccount, rememberMe: boolean) => {
    const onlineNewUser: UserAccount = { ...newUser, isOnline: true };
    setDbState((prev) => {
      const next: PlatformDatabaseState = {
        ...prev,
        users: [...prev.users, onlineNewUser],
      };
      storageEngine.persistState(next, onlineNewUser.id);
      storageEngine.saveAuthenticatedUser(onlineNewUser, rememberMe, next);
      return next;
    });
    setCurrentUser(onlineNewUser);
    setOnlineStats(syncRealOnlinePresence(onlineNewUser, false));
  };

  const handleResetUserPassword = (userId: string, newPassword: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, password: newPassword } : u
      ),
    }));
  };

  const handleLogout = () => {
    const loggingOutUserId = currentUser?.id;
    setCurrentUser(null);
    storageEngine.saveAuthenticatedUser(null, false);
    // Mark user offline and clear private chats when logging out
    updateAndPersist((prev) => ({
      ...prev,
      users: loggingOutUserId
        ? prev.users.map((u) =>
            u.id === loggingOutUserId ? { ...u, isOnline: false } : u
          )
        : prev.users,
      privateChatMessages: [],
      privateChatStatuses: {},
    }));
    setOnlineStats(syncRealOnlinePresence(null, false));
    if (activeSection === 'settings') {
      setActiveSection('directory');
    }
  };

  // --- Footer Contact Message to Admin Handler ---
  const handleSendMessageToAdmin = (
    content: string,
    senderUsername: string,
    senderId: string
  ) => {
    const newMsg: AdminMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      senderUsername,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    updateAndPersist((prev) => ({
      ...prev,
      messages: [newMsg, ...prev.messages],
    }));
  };

  // --- Stage 2: Directory Stores, Likes/Dislikes, Ratings, Comments, Replies, Import ---
  const handleAddStore = (store: StoreListingItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: [store, ...prev.stores],
    }));
  };

  const handleUpdateStore = (updatedStore: StoreListingItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === updatedStore.id ? updatedStore : s
      ),
    }));
  };

  const handleIncrementStoreViews = (storeId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === storeId ? { ...s, viewsCount: (s.viewsCount || 0) + 1 } : s
      ),
    }));
  };

  const handleImportStoresBatch = (importedStores: StoreListingItem[]) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: [...importedStores, ...prev.stores],
    }));
  };

  const handleDeleteStore = (id: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.filter((s) => s.id !== id),
    }));
  };

  const handleToggleStoreLike = (storeId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => {
        if (s.id !== storeId) return s;
        const alreadyLiked = s.likes.includes(visitorId);
        return {
          ...s,
          likes: alreadyLiked
            ? s.likes.filter((id) => id !== visitorId)
            : [...s.likes, visitorId],
          dislikes: s.dislikes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleToggleStoreDislike = (storeId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => {
        if (s.id !== storeId) return s;
        const alreadyDisliked = s.dislikes.includes(visitorId);
        return {
          ...s,
          dislikes: alreadyDisliked
            ? s.dislikes.filter((id) => id !== visitorId)
            : [...s.dislikes, visitorId],
          likes: s.likes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleRateStore = (storeId: string, stars: number) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === storeId
          ? { ...s, ratings: { ...s.ratings, [visitorId]: stars } }
          : s
      ),
    }));
  };

  const handleAddStoreComment = (storeId: string, comment: StoreCommentItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === storeId ? { ...s, comments: [comment, ...s.comments] } : s
      ),
    }));
  };

  const handleDeleteStoreComment = (storeId: string, commentId: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === storeId
          ? { ...s, comments: s.comments.filter((c) => c.id !== commentId) }
          : s
      ),
    }));
  };

  const handleToggleCommentLike = (storeId: string, commentId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => {
        if (s.id !== storeId) return s;
        return {
          ...s,
          comments: s.comments.map((c) => {
            if (c.id !== commentId) return c;
            const liked = c.likes.includes(visitorId);
            return {
              ...c,
              likes: liked
                ? c.likes.filter((id) => id !== visitorId)
                : [...c.likes, visitorId],
            };
          }),
        };
      }),
    }));
  };

  const handleAddCommentReply = (
    storeId: string,
    commentId: string,
    reply: StoreReplyItem
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      stores: prev.stores.map((s) => {
        if (s.id !== storeId) return s;
        return {
          ...s,
          comments: s.comments.map((c) =>
            c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
          ),
        };
      }),
    }));
  };

  // --- Stage 3: Service Numbers & Tawsila Handlers ---
  const handleAddServiceNumber = (entry: ServicePhoneEntry) => {
    updateAndPersist((prev) => ({
      ...prev,
      serviceNumbers: [entry, ...prev.serviceNumbers],
    }));
  };

  const handleUpdateServiceNumber = (updated: ServicePhoneEntry) => {
    updateAndPersist((prev) => ({
      ...prev,
      serviceNumbers: prev.serviceNumbers.map((n) =>
        n.id === updated.id ? updated : n
      ),
    }));
  };

  const handleDeleteServiceNumber = (id: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      serviceNumbers: prev.serviceNumbers.filter((n) => n.id !== id),
    }));
  };

  const handleAddTawsila = (ride: TawsilaRideItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      tawsilaRides: [ride, ...prev.tawsilaRides],
    }));
  };

  const handleUpdateTawsila = (updatedRide: TawsilaRideItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      tawsilaRides: prev.tawsilaRides.map((r) =>
        r.id === updatedRide.id ? updatedRide : r
      ),
    }));
  };

  const handleDeleteTawsila = (id: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      tawsilaRides: prev.tawsilaRides.filter((r) => r.id !== id),
    }));
  };

  // --- Stage 4: Community Posts, Moderation, Reports, Comments & Reactions ---
  const handleAddCommunityPost = (post: CommunityPostItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: [post, ...prev.communityPosts],
    }));
  };

  const handleUpdatePostStatus = (postId: string, status: CommunityPostStatus) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId ? { ...p, status } : p
      ),
    }));
  };

  const handleEditCommunityPost = (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId
          ? {
              ...p,
              content: updatedContent,
              postType: updatedPostType || p.postType,
            }
          : p
      ),
    }));
  };

  const handleDeletePost = (postId: string) => {
    updateAndPersist((prev) => {
      const target = prev.communityPosts.find((p) => p.id === postId);
      if (!target) return prev;
      const isOwner =
        target.authorId === visitorId ||
        Boolean(
          currentUser &&
            (target.authorId === currentUser.id ||
              target.authorUsername.trim().toLowerCase() ===
                currentUser.username.trim().toLowerCase())
        );
      if (currentUser?.role !== 'admin' && !isOwner) return prev;
      return {
        ...prev,
        communityPosts: prev.communityPosts.filter((p) => p.id !== postId),
      };
    });
  };

  const handleTogglePinCommunityPost = (postId: string) => {
    if (currentUser?.role !== 'admin') return;
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId ? { ...p, isPinned: !p.isPinned } : p
      ),
    }));
  };

  const handleToggleCommunityPostSold = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return { ...p, isSold: !p.isSold };
      }),
    }));
  };

  const handleToggleCommunityPostCommentsDisabled = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return { ...p, commentsDisabled: !p.commentsDisabled };
      }),
    }));
  };

  const handleTogglePostLike = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        const alreadyLiked = p.likes.includes(visitorId);
        return {
          ...p,
          likes: alreadyLiked
            ? p.likes.filter((id) => id !== visitorId)
            : [...p.likes, visitorId],
          dislikes: p.dislikes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleTogglePostDislike = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        const alreadyDisliked = p.dislikes.includes(visitorId);
        return {
          ...p,
          dislikes: alreadyDisliked
            ? p.dislikes.filter((id) => id !== visitorId)
            : [...p.dislikes, visitorId],
          likes: p.likes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleReportPost = (postId: string, reason: CommunityReportReason) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId
          ? {
              ...p,
              reports: [
                ...p.reports,
                {
                  id: `rep-p-${Date.now()}`,
                  reporterId: visitorId,
                  reporterUsername: reporterName,
                  reason,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : p
      ),
    }));
  };

  const handleRestoreReportedPost = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId ? { ...p, reports: [] } : p
      ),
    }));
  };

  const handleAddCommentToPost = (postId: string, comment: CommunityCommentItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      ),
    }));
  };

  const handleToggleCommunityCommentLike = (postId: string, commentId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const liked = c.likes.includes(visitorId);
            return {
              ...c,
              likes: liked
                ? c.likes.filter((id) => id !== visitorId)
                : [...c.likes, visitorId],
            };
          }),
        };
      }),
    }));
  };

  const handleToggleCommunityCommentEmoji = (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const currentArr = c.reactions[reaction] || [];
            const hasReacted = currentArr.includes(visitorId);
            return {
              ...c,
              reactions: {
                ...c.reactions,
                [reaction]: hasReacted
                  ? currentArr.filter((id) => id !== visitorId)
                  : [...currentArr, visitorId],
              },
            };
          }),
        };
      }),
    }));
  };

  const handleAddReplyToCommunityComment = (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
          ),
        };
      }),
    }));
  };

  const handleReportCommunityComment = (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  reports: [
                    ...c.reports,
                    {
                      id: `rep-c-${Date.now()}`,
                      reporterId: visitorId,
                      reporterUsername: reporterName,
                      reason,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : c
          ),
        };
      }),
    }));
  };

  const handleDeleteCommunityComment = (postId: string, commentId: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      ),
    }));
  };

  const handleRestoreReportedCommunityComment = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, reports: [] } : c
          ),
        };
      }),
    }));
  };

  const handleTogglePinCommunityComment = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
          ),
        };
      }),
    }));
  };

  const handleToggleHideCommunityComment = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isHidden: !c.isHidden } : c
          ),
        };
      }),
    }));
  };

  // --- Live Community Chat Handlers ("محادثة لايف") ---
  const handleSendChatMessage = (
    text: string,
    textColor: string,
    isSystemNotification?: boolean,
    targetUsername?: string
  ) => {
    const newMsg: LiveChatMessageItem = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorId: visitorId,
      authorUsername: currentUser?.username || 'زائر',
      text,
      textColor: textColor || '#F8FAFC',
      reports: [],
      createdAt: new Date().toISOString(),
      ...(isSystemNotification ? { isSystemNotification: true } : {}),
      ...(targetUsername ? { targetUsername } : {}),
    };
    updateAndPersistChatFast((prev) => {
      const nextTyping = { ...(prev.chatTypingMap || {}) };
      const myNorm = (currentUser?.username || 'زائر').trim().toLowerCase();
      delete nextTyping[visitorId];
      delete nextTyping[myNorm];
      return {
        ...prev,
        liveChatMessages: [...(prev.liveChatMessages || []).slice(-49), newMsg],
        chatTypingMap: nextTyping,
      };
    });
  };

  const handleReportChatMessage = (
    msgId: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => {
      const targetMsg = (prev.liveChatMessages || []).find((m) => m.id === msgId);
      const reportAlert: AdminMessage | null = targetMsg
        ? {
            id: `msg-chat-rep-${Date.now()}`,
            senderId: visitorId,
            senderUsername: `بلاغ محادثة لايف (${reporterName})`,
            content: `بلاغ (${reason}) ضد رسالة "${targetMsg.authorUsername}": "${targetMsg.text}"`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }
        : null;

      const privateRep: PrivateChatReportItem | null = targetMsg
        ? {
            id: `pcrep-pub-${Date.now()}`,
            reporterId: visitorId,
            reporterUsername: reporterName,
            reportedUserId: targetMsg.authorId,
            reportedUsername: targetMsg.authorUsername,
            reason,
            sampleMessage: targetMsg.text,
            createdAt: new Date().toISOString(),
          }
        : null;

      return {
        ...prev,
        liveChatMessages: (prev.liveChatMessages || []).map((m) =>
          m.id === msgId
            ? {
                ...m,
                reports: [
                  ...(m.reports || []),
                  {
                    id: `rep-chat-${Date.now()}`,
                    reporterId: visitorId,
                    reporterUsername: reporterName,
                    reason,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : m
        ),
        privateChatReports: privateRep
          ? [privateRep, ...(prev.privateChatReports || [])]
          : prev.privateChatReports || [],
        messages: reportAlert ? [reportAlert, ...prev.messages] : prev.messages,
      };
    });
  };

  const handleDeleteChatMessage = (msgId: string, notifyUsername?: string) => {
    updateAndPersistChatFast((prev) => {
      const filtered = (prev.liveChatMessages || []).filter(
        (m) => m.id !== msgId
      );
      if (notifyUsername) {
        const sysMsg: LiveChatMessageItem = {
          id: `chat-sys-${Date.now()}`,
          authorId: 'system-admin',
          authorUsername: 'النظام',
          text: `تم حذف رسالة المستخدم "${notifyUsername}" بواسطة الإدارة`,
          textColor: '#F87171',
          reports: [],
          createdAt: new Date().toISOString(),
          isSystemNotification: true,
          targetUsername: notifyUsername,
        };
        return {
          ...prev,
          liveChatMessages: [...filtered.slice(-49), sysMsg],
        };
      }
      return {
        ...prev,
        liveChatMessages: filtered.slice(-50),
      };
    });
  };

  const handleUpdateChatCooldown = (seconds: number) => {
    updateAndPersist((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        liveChatCooldownSeconds: Math.max(0, seconds),
      },
    }));
  };

  const handleUpdateAutoClearMinutes = (minutes: number) => {
    updateAndPersist((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        liveChatAutoClearMinutes: Math.max(0, minutes),
        liveChatLastClearedAt: new Date().toISOString(),
      },
    }));
  };

  const handleClearPublicChatNow = () => {
    updateAndPersist((prev) => ({
      ...prev,
      liveChatMessages: [],
      settings: {
        ...prev.settings,
        liveChatLastClearedAt: new Date().toISOString(),
      },
    }));
  };

  const handleClearPrivateChatSession = (keepOnlyPartnerUsername?: string) => {
    const myName = (currentUser?.username || 'زائر').trim().toLowerCase();
    updateAndPersist((prev) => {
      if (!keepOnlyPartnerUsername) {
        // Delete all private chat messages & statuses involving current user
        const remainingMsgs = (prev.privateChatMessages || []).filter((m) => {
          const sName = m.senderUsername.trim().toLowerCase();
          const rName = m.receiverUsername.trim().toLowerCase();
          const involvesMe =
            m.senderId === visitorId ||
            m.receiverId === visitorId ||
            sName === myName ||
            rName === myName;
          return !involvesMe;
        });
        return {
          ...prev,
          privateChatMessages: remainingMsgs,
        };
      } else {
        const keepPartnerNorm = keepOnlyPartnerUsername.trim().toLowerCase();
        // Keep only messages with `keepOnlyPartnerUsername`, delete any previously open private chat with other partners
        const remainingMsgs = (prev.privateChatMessages || []).filter((m) => {
          const sName = m.senderUsername.trim().toLowerCase();
          const rName = m.receiverUsername.trim().toLowerCase();
          const involvesMe =
            m.senderId === visitorId ||
            m.receiverId === visitorId ||
            sName === myName ||
            rName === myName;
          if (!involvesMe) return true;
          const involvesKeepPartner =
            sName === keepPartnerNorm || rName === keepPartnerNorm;
          return involvesKeepPartner;
        });
        return {
          ...prev,
          privateChatMessages: remainingMsgs,
        };
      }
    });
  };

  const handleApplyChatPenalty = (
    targetUserId: string,
    targetUsername: string,
    actionType: 'ban' | 'suspend',
    durationLabel: 'ساعة' | 'ساعتين' | 'يوم'
  ) => {
    const durationMs =
      durationLabel === 'ساعة'
        ? 3600 * 1000
        : durationLabel === 'ساعتين'
        ? 2 * 3600 * 1000
        : 24 * 3600 * 1000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();
    const penalty: ChatModerationPenalty = {
      id: `pen-${Date.now()}`,
      targetUserId,
      targetUsername,
      actionType,
      durationLabel,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    const actionArabic = actionType === 'ban' ? 'حظره' : 'تعليقه';
    const sysMsg: LiveChatMessageItem = {
      id: `chat-pen-${Date.now()}`,
      authorId: 'system-admin',
      authorUsername: 'النظام',
      text: `تنبيه إداري: المستخدم (${targetUsername}) تم ${actionArabic} لمدة ${durationLabel}`,
      textColor: '#F87171',
      reports: [],
      createdAt: new Date().toISOString(),
      isSystemNotification: true,
      targetUsername,
    };

    updateAndPersist((prev) => ({
      ...prev,
      chatPenalties: [
        ...(prev.chatPenalties || []).filter(
          (p) =>
            p.targetUserId !== targetUserId &&
            p.targetUsername.trim().toLowerCase() !==
              targetUsername.trim().toLowerCase()
        ),
        penalty,
      ],
      liveChatMessages: [...(prev.liveChatMessages || []).slice(-49), sysMsg],
    }));
  };

  const handleSendPrivateMessage = (
    receiverId: string,
    receiverUsername: string,
    text: string,
    textColor?: string
  ) => {
    const senderName = currentUser?.username || 'زائر';
    const senderKeyId = visitorId;
    const senderKeyName = senderName.trim().toLowerCase();
    const receiverKeyId = receiverId;
    const receiverKeyName = receiverUsername.trim().toLowerCase();

    const newPrivMsg: PrivateChatMessageItem = {
      id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: senderKeyId,
      senderUsername: senderName,
      receiverId: receiverKeyId,
      receiverUsername,
      text,
      textColor: textColor || '#F8FAFC',
      isRead: false,
      likes: [],
      dislikes: [],
      hearts: [],
      reports: [],
      createdAt: new Date().toISOString(),
    };

    updateAndPersistChatFast((prev) => {
      // Do not allow messaging if either user has blocked the other
      const blockedMap = prev.userBlockedMap || {};
      const myBlocked1 = blockedMap[senderKeyId] || [];
      const myBlocked2 = blockedMap[senderKeyName] || [];
      const recBlocked1 = blockedMap[receiverKeyId] || [];
      const recBlocked2 = blockedMap[receiverKeyName] || [];

      const iBlockedReceiver = [...myBlocked1, ...myBlocked2].some(
        (k) =>
          k === receiverKeyId ||
          k.trim().toLowerCase() === receiverKeyName
      );
      const receiverBlockedMe = [...recBlocked1, ...recBlocked2].some(
        (k) =>
          k === senderKeyId ||
          k.trim().toLowerCase() === senderKeyName
      );
      if (iBlockedReceiver || receiverBlockedMe) {
        return prev;
      }

      const nextStatuses: Record<string, PrivateChatStatus> = {
        ...(prev.privateChatStatuses || {}),
      };

      // If the current sender had previously rejected receiver ("لا"), and now sender initiates a message to receiver, re-open chat!
      const myRejectKey1 = `${senderKeyId}__${receiverKeyId}`;
      const myRejectKey2 = `${senderKeyName}__${receiverKeyName}`;
      if (
        nextStatuses[myRejectKey1] === 'rejected' ||
        nextStatuses[myRejectKey2] === 'rejected'
      ) {
        nextStatuses[myRejectKey1] = 'accepted';
        nextStatuses[myRejectKey2] = 'accepted';
      }

      // If receiver hasn't responded to sender yet, mark request as 'pending'
      const recKey1 = `${receiverKeyId}__${senderKeyId}`;
      const recKey2 = `${receiverKeyName}__${senderKeyName}`;
      if (!nextStatuses[recKey1] && !nextStatuses[recKey2]) {
        nextStatuses[recKey1] = 'pending';
        nextStatuses[recKey2] = 'pending';
      }

      const nextTyping = { ...(prev.chatTypingMap || {}) };
      delete nextTyping[senderKeyId];
      delete nextTyping[senderKeyName];

      return {
        ...prev,
        privateChatMessages: [
          ...(prev.privateChatMessages || []).slice(-299),
          newPrivMsg,
        ],
        privateChatStatuses: nextStatuses,
        chatTypingMap: nextTyping,
      };
    });
  };

  const handleTogglePrivateMessageReaction = (
    msgId: string,
    reaction: 'like' | 'dislike' | 'heart'
  ) => {
    updateAndPersistChatFast((prev) => ({
      ...prev,
      privateChatMessages: (prev.privateChatMessages || []).map((m) => {
        if (m.id !== msgId) return m;
        const currentLikes = m.likes || [];
        const currentDislikes = m.dislikes || [];
        const currentHearts = m.hearts || [];

        if (reaction === 'like') {
          const hasLiked = currentLikes.includes(visitorId);
          return {
            ...m,
            likes: hasLiked
              ? currentLikes.filter((id) => id !== visitorId)
              : [...currentLikes, visitorId],
            dislikes: currentDislikes.filter((id) => id !== visitorId),
          };
        }
        if (reaction === 'dislike') {
          const hasDisliked = currentDislikes.includes(visitorId);
          return {
            ...m,
            dislikes: hasDisliked
              ? currentDislikes.filter((id) => id !== visitorId)
              : [...currentDislikes, visitorId],
            likes: currentLikes.filter((id) => id !== visitorId),
          };
        }
        const hasHeart = currentHearts.includes(visitorId);
        return {
          ...m,
          hearts: hasHeart
            ? currentHearts.filter((id) => id !== visitorId)
            : [...currentHearts, visitorId],
        };
      }),
    }));
  };

  const handleReportPrivateChatMessage = (
    msgId: string,
    reportedUserId: string,
    reportedUsername: string,
    messageText: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    const nowIso = new Date().toISOString();
    const newChatReport: PrivateChatReportItem = {
      id: `pcrep-msg-${Date.now()}`,
      reporterId: visitorId,
      reporterUsername: reporterName,
      reportedUserId: reportedUserId || reportedUsername,
      reportedUsername,
      reason,
      sampleMessage: messageText,
      createdAt: nowIso,
    };
    const newAdminMsg: AdminMessage = {
      id: `msg-rep-${Date.now()}`,
      senderId: visitorId,
      senderUsername: reporterName,
      senderPhone: currentUser?.phone || 'بلاغ شات خاص',
      content: `بلاغ عن رسالة في محادثة خاصة ضد (${reportedUsername}) - السبب: ${reason} - نص الرسالة: "${messageText}"`,
      isRead: false,
      createdAt: nowIso,
    };

    updateAndPersistChatFast((prev) => ({
      ...prev,
      privateChatMessages: (prev.privateChatMessages || []).map((m) =>
        m.id === msgId
          ? {
              ...m,
              reports: [
                ...(m.reports || []),
                {
                  id: `rep-pm-${Date.now()}`,
                  reporterId: visitorId,
                  reporterUsername: reporterName,
                  reason,
                  createdAt: nowIso,
                },
              ],
            }
          : m
      ),
      privateChatReports: [newChatReport, ...(prev.privateChatReports || [])],
      messages: [newAdminMsg, ...(prev.messages || [])],
    }));
  };

  const handleReportUserInPrivateChat = (
    reportedUserId: string,
    reportedUsername: string,
    reason: string,
    sampleMessage?: string
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    const nowIso = new Date().toISOString();
    const newReport: PrivateChatReportItem = {
      id: `pcrep-usr-${Date.now()}`,
      reporterId: visitorId,
      reporterUsername: reporterName,
      reportedUserId: reportedUserId || reportedUsername,
      reportedUsername,
      reason: reason || 'إبلاغ عن إساءة في المحادثة الخاصة',
      sampleMessage: sampleMessage || 'بلاغ من داخل شات المحادثة الخاصة',
      createdAt: nowIso,
    };
    const newAdminMsg: AdminMessage = {
      id: `msg-chatrep-${Date.now()}`,
      senderId: visitorId,
      senderUsername: reporterName,
      senderPhone: currentUser?.phone || 'بلاغ محادثة',
      content: `بلاغ من شات المحادثة ضد (${reportedUsername}) - السبب: ${newReport.reason}${
        sampleMessage ? ` - آخر رسالة: "${sampleMessage}"` : ''
      }`,
      isRead: false,
      createdAt: nowIso,
    };

    updateAndPersistChatFast((prev) => ({
      ...prev,
      privateChatReports: [newReport, ...(prev.privateChatReports || [])],
      messages: [newAdminMsg, ...(prev.messages || [])],
    }));
  };

  const handleDismissPrivateChatReport = (reportId: string) => {
    updateAndPersistChatFast((prev) => ({
      ...prev,
      privateChatReports: (prev.privateChatReports || []).filter(
        (r) => r.id !== reportId
      ),
    }));
  };

  const handleMarkPrivateMessagesRead = (partnerUsername: string) => {
    if (!partnerUsername) return;
    const partnerNorm = partnerUsername.trim().toLowerCase();
    const myNorm = (currentUser?.username || 'زائر').trim().toLowerCase();
    const nowIso = new Date().toISOString();
    updateAndPersistChatFast((prev) => {
      const currentList = prev.privateChatMessages || [];
      const hasUnreadFromPartner = currentList.some((m) => {
        const sNorm = m.senderUsername.trim().toLowerCase();
        const rNorm = m.receiverUsername.trim().toLowerCase();
        return (
          sNorm === partnerNorm &&
          (rNorm === myNorm || m.receiverId === visitorId) &&
          !m.isRead
        );
      });
      if (!hasUnreadFromPartner) return prev;
      return {
        ...prev,
        privateChatMessages: currentList.map((m) => {
          const sNorm = m.senderUsername.trim().toLowerCase();
          const rNorm = m.receiverUsername.trim().toLowerCase();
          if (
            sNorm === partnerNorm &&
            (rNorm === myNorm || m.receiverId === visitorId) &&
            !m.isRead
          ) {
            return { ...m, isRead: true, readAt: nowIso };
          }
          return m;
        }),
      };
    });
  };

  const handleSetChatTypingStatus = (targetKey: string, isTyping: boolean) => {
    const senderName = currentUser?.username || 'زائر';
    const senderNorm = senderName.trim().toLowerCase();
    const nowMs = Date.now();
    const cleanTargetNorm = (targetKey || 'public')
      .replace(/^private:/i, '')
      .trim()
      .toLowerCase();
    updateAndPersistChatFast((prev) => {
      const nextMap = { ...(prev.chatTypingMap || {}) };
      Object.keys(nextMap).forEach((k) => {
        if (nowMs - nextMap[k].updatedAt > 6500) {
          delete nextMap[k];
        }
      });

      if (!isTyping) {
        if (!nextMap[senderNorm] && !nextMap[visitorId]) return prev;
        delete nextMap[senderNorm];
        delete nextMap[visitorId];
      } else {
        nextMap[senderNorm] = {
          userId: visitorId,
          username: senderName,
          targetKey: cleanTargetNorm,
          chatType: cleanTargetNorm === 'public' ? 'public' : 'private',
          targetUsername:
            cleanTargetNorm === 'public' ? undefined : cleanTargetNorm,
          updatedAt: nowMs,
        };
      }

      return {
        ...prev,
        chatTypingMap: nextMap,
      };
    });
  };

  const handleRespondPrivateChatRequest = (
    partnerKey: string,
    status: PrivateChatStatus
  ) => {
    const myNameKey = (currentUser?.username || 'زائر').trim().toLowerCase();
    updateAndPersistChatFast((prev) => ({
      ...prev,
      privateChatStatuses: {
        ...(prev.privateChatStatuses || {}),
        [`${visitorId}__${partnerKey}`]: status,
        [`${myNameKey}__${partnerKey.trim().toLowerCase()}`]: status,
      },
    }));
  };

  const handleBlockUserInChat = (
    blockedUserId: string,
    blockedUsername: string,
    reportReason?: string,
    sampleMessage?: string
  ) => {
    const myName = currentUser?.username || 'زائر';
    const myNameKey = myName.trim().toLowerCase();
    const cleanBlockedUsername = blockedUsername.trim();
    const targetNameKey = cleanBlockedUsername.toLowerCase();

    updateAndPersistChatFast((prev) => {
      const prevMap = prev.userBlockedMap || {};
      const myBlocked1 = new Set(prevMap[visitorId] || []);
      const myBlocked2 = new Set(prevMap[myNameKey] || []);
      if (blockedUserId) {
        myBlocked1.add(blockedUserId);
        myBlocked2.add(blockedUserId);
      }
      myBlocked1.add(cleanBlockedUsername);
      myBlocked1.add(targetNameKey);
      myBlocked2.add(cleanBlockedUsername);
      myBlocked2.add(targetNameKey);

      const nextReports = [...(prev.privateChatReports || [])];
      const nextMessages = [...(prev.messages || [])];
      if (reportReason) {
        const nowIso = new Date().toISOString();
        nextReports.unshift({
          id: `pcrep-${Date.now()}`,
          reporterId: visitorId,
          reporterUsername: myName,
          reportedUserId: blockedUserId || cleanBlockedUsername,
          reportedUsername: cleanBlockedUsername,
          reason: reportReason,
          sampleMessage: sampleMessage || 'تم حظر المستخدم والإبلاغ عنه من الشات الخاص',
          createdAt: nowIso,
        });
        nextMessages.unshift({
          id: `msg-blkrep-${Date.now()}`,
          senderId: visitorId,
          senderUsername: myName,
          senderPhone: currentUser?.phone || 'حظر وإبلاغ',
          content: `بلاغ وحظر من الشات الخاص ضد (${cleanBlockedUsername}) - السبب: ${reportReason}`,
          isRead: false,
          createdAt: nowIso,
        });
      }

      return {
        ...prev,
        userBlockedMap: {
          ...prevMap,
          [visitorId]: Array.from(myBlocked1),
          [myNameKey]: Array.from(myBlocked2),
        },
        privateChatReports: nextReports,
        messages: nextMessages,
      };
    });
  };

  const handleUnblockUserInChat = (targetUserIdOrName: string) => {
    const myName = currentUser?.username || 'زائر';
    const myNameKey = myName.trim().toLowerCase();
    const cleanTarget = targetUserIdOrName.trim();
    const targetLower = cleanTarget.toLowerCase();

    updateAndPersistChatFast((prev) => {
      const prevMap = prev.userBlockedMap || {};
      // Also find any matching user ID/username from users list so both ID and username are removed
      const matchedUser = prev.users.find(
        (u) =>
          u.id === cleanTarget ||
          u.username.trim().toLowerCase() === targetLower
      );
      const keysToRemove = new Set<string>([
        cleanTarget,
        targetLower,
        ...(matchedUser
          ? [
              matchedUser.id,
              matchedUser.username.trim(),
              matchedUser.username.trim().toLowerCase(),
            ]
          : []),
      ]);

      const filterFn = (entry: string) =>
        !keysToRemove.has(entry) &&
        !keysToRemove.has(entry.trim().toLowerCase());

      return {
        ...prev,
        userBlockedMap: {
          ...prevMap,
          [visitorId]: (prevMap[visitorId] || []).filter(filterFn),
          [myNameKey]: (prevMap[myNameKey] || []).filter(filterFn),
        },
      };
    });
  };

  const handleDeleteUserAccountFromChat = (
    targetUserId: string,
    targetUsername: string
  ) => {
    const sysMsg: LiveChatMessageItem = {
      id: `chat-del-usr-${Date.now()}`,
      authorId: 'system-admin',
      authorUsername: 'النظام',
      text: `تنبيه إداري: المستخدم (${targetUsername}) تم حظره وحذف حسابه من الموقع`,
      textColor: '#F87171',
      reports: [],
      createdAt: new Date().toISOString(),
      isSystemNotification: true,
      targetUsername,
    };

    const permPenalty: ChatModerationPenalty = {
      id: `pen-perm-${Date.now()}`,
      targetUserId,
      targetUsername,
      actionType: 'ban',
      durationLabel: 'يوم',
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    updateAndPersist((prev) => ({
      ...prev,
      users: prev.users.filter(
        (u) =>
          u.id !== targetUserId &&
          u.username.trim().toLowerCase() !==
            targetUsername.trim().toLowerCase()
      ),
      chatPenalties: [...(prev.chatPenalties || []), permPenalty],
      privateChatReports: (prev.privateChatReports || []).filter(
        (r) =>
          r.reportedUserId !== targetUserId &&
          r.reportedUsername.trim().toLowerCase() !==
            targetUsername.trim().toLowerCase()
      ),
      liveChatMessages: [...(prev.liveChatMessages || []).slice(-49), sysMsg],
    }));
  };

  // --- Utilities Submissions ("تقديمات المرافق") & Utility Posts Handlers ---
  const handleAddUtilityType = (newTypeName: string) => {
    const clean = newTypeName.trim();
    if (!clean) return;
    updateAndPersist((prev) => {
      const currentTypes = prev.settings.utilityTypes || [
        'تقديم المياه',
        'تقديم الكهرباء',
        'تقديم الغاز',
      ];
      if (currentTypes.includes(clean)) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          utilityTypes: [...currentTypes, clean],
        },
      };
    });
  };

  const handleSaveUtilitySubmission = (item: UtilitySubmissionItem) => {
    updateAndPersist((prev) => {
      const list = prev.utilitySubmissions || [];
      const exists = list.some(
        (u) => u.id === item.id || u.utilityName === item.utilityName
      );
      const nextList = exists
        ? list.map((u) =>
            u.id === item.id || u.utilityName === item.utilityName ? item : u
          )
        : [item, ...list];
      return {
        ...prev,
        utilitySubmissions: nextList,
      };
    });
  };

  const handleDeleteUtilitySubmission = (id: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      utilitySubmissions: (prev.utilitySubmissions || []).filter(
        (u) => u.id !== id
      ),
    }));
  };

  const handleAddUtilityPost = (post: CommunityPostItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: [post, ...(prev.utilityPosts || [])],
    }));
  };

  const handleEditUtilityPost = (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId
          ? {
              ...p,
              content: updatedContent,
              postType: updatedPostType || p.postType,
            }
          : p
      ),
    }));
  };

  const handleUpdateUtilityPostStatus = (
    postId: string,
    status: CommunityPostStatus
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId ? { ...p, status } : p
      ),
    }));
  };

  const handleDeleteUtilityPost = (postId: string) => {
    updateAndPersist((prev) => {
      const target = (prev.utilityPosts || []).find((p) => p.id === postId);
      if (!target) return prev;
      const isOwner =
        target.authorId === visitorId ||
        Boolean(
          currentUser &&
            (target.authorId === currentUser.id ||
              target.authorUsername.trim().toLowerCase() ===
                currentUser.username.trim().toLowerCase())
        );
      if (currentUser?.role !== 'admin' && !isOwner) return prev;
      return {
        ...prev,
        utilityPosts: (prev.utilityPosts || []).filter((p) => p.id !== postId),
      };
    });
  };

  const handleTogglePinUtilityPost = (postId: string) => {
    if (currentUser?.role !== 'admin') return;
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId ? { ...p, isPinned: !p.isPinned } : p
      ),
    }));
  };

  const handleToggleUtilityPostSold = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return { ...p, isSold: !p.isSold };
      }),
    }));
  };

  const handleToggleUtilityPostCommentsDisabled = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return { ...p, commentsDisabled: !p.commentsDisabled };
      }),
    }));
  };

  const handleToggleUtilityPostLike = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const alreadyLiked = p.likes.includes(visitorId);
        return {
          ...p,
          likes: alreadyLiked
            ? p.likes.filter((id) => id !== visitorId)
            : [...p.likes, visitorId],
          dislikes: p.dislikes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleToggleUtilityPostDislike = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const alreadyDisliked = p.dislikes.includes(visitorId);
        return {
          ...p,
          dislikes: alreadyDisliked
            ? p.dislikes.filter((id) => id !== visitorId)
            : [...p.dislikes, visitorId],
          likes: p.likes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleReportUtilityPost = (
    postId: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId
          ? {
              ...p,
              reports: [
                ...p.reports,
                {
                  id: `rep-up-${Date.now()}`,
                  reporterId: visitorId,
                  reporterUsername: reporterName,
                  reason,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : p
      ),
    }));
  };

  const handleRestoreReportedUtilityPost = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId ? { ...p, reports: [] } : p
      ),
    }));
  };

  const handleAddCommentToUtilityPost = (
    postId: string,
    comment: CommunityCommentItem
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      ),
    }));
  };

  const handleToggleUtilityCommentLike = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const liked = c.likes.includes(visitorId);
            return {
              ...c,
              likes: liked
                ? c.likes.filter((id) => id !== visitorId)
                : [...c.likes, visitorId],
            };
          }),
        };
      }),
    }));
  };

  const handleToggleUtilityCommentEmoji = (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const currentArr = c.reactions[reaction] || [];
            const hasReacted = currentArr.includes(visitorId);
            return {
              ...c,
              reactions: {
                ...c.reactions,
                [reaction]: hasReacted
                  ? currentArr.filter((id) => id !== visitorId)
                  : [...currentArr, visitorId],
              },
            };
          }),
        };
      }),
    }));
  };

  const handleAddReplyToUtilityComment = (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
          ),
        };
      }),
    }));
  };

  const handleReportUtilityComment = (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  reports: [
                    ...c.reports,
                    {
                      id: `rep-uc-${Date.now()}`,
                      reporterId: visitorId,
                      reporterUsername: reporterName,
                      reason,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : c
          ),
        };
      }),
    }));
  };

  const handleDeleteUtilityComment = (postId: string, commentId: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      ),
    }));
  };

  const handleRestoreReportedUtilityComment = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, reports: [] } : c
          ),
        };
      }),
    }));
  };

  const handleTogglePinUtilityComment = (postId: string, commentId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
          ),
        };
      }),
    }));
  };

  const handleToggleHideUtilityComment = (postId: string, commentId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      utilityPosts: (prev.utilityPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isHidden: !c.isHidden } : c
          ),
        };
      }),
    }));
  };

  // --- Buy & Sell (بيع واشتري) Posts Handlers ---
  const handleAddBuySellPost = (post: CommunityPostItem) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: [post, ...(prev.buySellPosts || [])],
    }));
  };

  const handleEditBuySellPost = (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId
          ? {
              ...p,
              content: updatedContent,
              postType: updatedPostType || p.postType,
            }
          : p
      ),
    }));
  };

  const handleUpdateBuySellPostStatus = (
    postId: string,
    status: CommunityPostStatus
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId ? { ...p, status } : p
      ),
    }));
  };

  const handleDeleteBuySellPost = (postId: string) => {
    updateAndPersist((prev) => {
      const target = (prev.buySellPosts || []).find((p) => p.id === postId);
      if (!target) return prev;
      const isOwner =
        target.authorId === visitorId ||
        Boolean(
          currentUser &&
            (target.authorId === currentUser.id ||
              target.authorUsername.trim().toLowerCase() ===
                currentUser.username.trim().toLowerCase())
        );
      if (currentUser?.role !== 'admin' && !isOwner) return prev;
      return {
        ...prev,
        buySellPosts: (prev.buySellPosts || []).filter((p) => p.id !== postId),
      };
    });
  };

  const handleTogglePinBuySellPost = (postId: string) => {
    if (currentUser?.role !== 'admin') return;
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId ? { ...p, isPinned: !p.isPinned } : p
      ),
    }));
  };

  const handleToggleBuySellPostSold = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return { ...p, isSold: !p.isSold };
      }),
    }));
  };

  const handleToggleBuySellPostCommentsDisabled = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return { ...p, commentsDisabled: !p.commentsDisabled };
      }),
    }));
  };

  const handleToggleBuySellPostLike = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const alreadyLiked = p.likes.includes(visitorId);
        return {
          ...p,
          likes: alreadyLiked
            ? p.likes.filter((id) => id !== visitorId)
            : [...p.likes, visitorId],
          dislikes: p.dislikes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleToggleBuySellPostDislike = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const alreadyDisliked = p.dislikes.includes(visitorId);
        return {
          ...p,
          dislikes: alreadyDisliked
            ? p.dislikes.filter((id) => id !== visitorId)
            : [...p.dislikes, visitorId],
          likes: p.likes.filter((id) => id !== visitorId),
        };
      }),
    }));
  };

  const handleReportBuySellPost = (
    postId: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId
          ? {
              ...p,
              reports: [
                ...p.reports,
                {
                  id: `rep-bsp-${Date.now()}`,
                  reporterId: visitorId,
                  reporterUsername: reporterName,
                  reason,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : p
      ),
    }));
  };

  const handleRestoreReportedBuySellPost = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId ? { ...p, reports: [] } : p
      ),
    }));
  };

  const handleAddCommentToBuySellPost = (
    postId: string,
    comment: CommunityCommentItem
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      ),
    }));
  };

  const handleToggleBuySellCommentLike = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const liked = c.likes.includes(visitorId);
            return {
              ...c,
              likes: liked
                ? c.likes.filter((id) => id !== visitorId)
                : [...c.likes, visitorId],
            };
          }),
        };
      }),
    }));
  };

  const handleToggleBuySellCommentEmoji = (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c.id !== commentId) return c;
            const currentArr = c.reactions[reaction] || [];
            const hasReacted = currentArr.includes(visitorId);
            return {
              ...c,
              reactions: {
                ...c.reactions,
                [reaction]: hasReacted
                  ? currentArr.filter((id) => id !== visitorId)
                  : [...currentArr, visitorId],
              },
            };
          }),
        };
      }),
    }));
  };

  const handleAddReplyToBuySellComment = (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
          ),
        };
      }),
    }));
  };

  const handleReportBuySellComment = (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => {
    const reporterName = currentUser?.username || 'زائر';
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  reports: [
                    ...c.reports,
                    {
                      id: `rep-bsc-${Date.now()}`,
                      reporterId: visitorId,
                      reporterUsername: reporterName,
                      reason,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : c
          ),
        };
      }),
    }));
  };

  const handleDeleteBuySellComment = (postId: string, commentId: string) => {
    if (currentUser?.role === 'moderator') return;
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      ),
    }));
  };

  const handleRestoreReportedBuySellComment = (
    postId: string,
    commentId: string
  ) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, reports: [] } : c
          ),
        };
      }),
    }));
  };

  const handleTogglePinBuySellComment = (postId: string, commentId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        const isOwner =
          p.authorId === visitorId ||
          Boolean(
            currentUser &&
              (p.authorId === currentUser.id ||
                p.authorUsername.trim().toLowerCase() ===
                  currentUser.username.trim().toLowerCase())
          );
        if (currentUser?.role !== 'admin' && !isOwner) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
          ),
        };
      }),
    }));
  };

  const handleToggleHideBuySellComment = (postId: string, commentId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      buySellPosts: (prev.buySellPosts || []).map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isHidden: !c.isHidden } : c
          ),
        };
      }),
    }));
  };

  // --- Stage 5: Admin Settings, Accounts, Stores, Categories & Ads Handlers ---
  const handleUpdateSettings = (nextSettings: PlatformSettings) => {
    updateAndPersist((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
  };

  const handleUpdateUserAccount = (updatedUser: UserAccount) => {
    updateAndPersist((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    }));
    if (currentUser?.id === updatedUser.id) {
      if (updatedUser.isBanned) {
        setCurrentUser(null);
        storageEngine.saveAuthenticatedUser(null, false);
      } else {
        setCurrentUser(updatedUser);
      }
    }
  };

  const handleDeleteUserAccount = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
    if (currentUser?.id === id) {
      setCurrentUser(null);
      storageEngine.saveAuthenticatedUser(null, false);
    }
  };

  const handleRenameStoreCategory = (oldName: string, newName: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        storeCategories: prev.settings.storeCategories.map((c) =>
          c === oldName ? newName : c
        ),
      },
      stores: prev.stores.map((s) =>
        s.category === oldName ? { ...s, category: newName } : s
      ),
    }));
  };

  const handleAddTopBanner = (banner: TopBannerAd) => {
    updateAndPersist((prev) => ({
      ...prev,
      topBanners: [banner, ...prev.topBanners],
    }));
  };

  const handleUpdateTopBanner = (banner: TopBannerAd) => {
    updateAndPersist((prev) => ({
      ...prev,
      topBanners: prev.topBanners.map((b) => (b.id === banner.id ? banner : b)),
    }));
  };

  const handleDeleteTopBanner = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      topBanners: prev.topBanners.filter((b) => b.id !== id),
    }));
  };

  const handleAddSquareAd = (ad: SquareMovingAd) => {
    updateAndPersist((prev) => ({
      ...prev,
      squareAds: [ad, ...prev.squareAds],
    }));
  };

  const handleUpdateSquareAd = (ad: SquareMovingAd) => {
    updateAndPersist((prev) => ({
      ...prev,
      squareAds: prev.squareAds.map((s) => (s.id === ad.id ? ad : s)),
    }));
  };

  const handleTogglePinSquareAd = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      squareAds: prev.squareAds.map((ad) =>
        ad.id === id ? { ...ad, isAdminPinned: !ad.isAdminPinned } : ad
      ),
    }));
  };

  const handleDeleteSquareAd = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      squareAds: prev.squareAds.filter((ad) => ad.id !== id),
    }));
  };

  const handleUpdatePopupAd = (popup: PopupAdConfig) => {
    updateAndPersist((prev) => ({
      ...prev,
      popupAd: popup,
    }));
  };

  const handleMarkMessageRead = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === id ? { ...m, isRead: true } : m
      ),
    }));
  };

  const handleDeleteMessage = (id: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== id),
    }));
  };

  // Check if the logged-in user is a driver whose request was just accepted ("تم القبول")
  const pendingDriverWelcome = currentUser
    ? dbState.tawsilaRides.find(
        (r) =>
          r.acceptanceNotificationPending &&
          (r.driverId === currentUser.id ||
            r.driverName.trim().toLowerCase() ===
              currentUser.username.trim().toLowerCase() ||
            (currentUser.phone && r.phone === currentUser.phone))
      )
    : undefined;

  const handleDismissDriverWelcome = () => {
    if (!pendingDriverWelcome) return;
    updateAndPersist((prev) => ({
      ...prev,
      tawsilaRides: prev.tawsilaRides.map((r) =>
        r.id === pendingDriverWelcome.id
          ? { ...r, acceptanceNotificationPending: false }
          : r
      ),
    }));
  };

  const isAdmin = currentUser?.role === 'admin';
  const unreadMessagesCount = dbState.messages.filter((m) => !m.isRead).length;

  const sidebarItems: Array<{
    id: MainSectionId;
    number: string;
    label: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
    adminOnly?: boolean;
    badge?: number;
  }> = [
    {
      id: 'directory',
      number: '1',
      label: 'أضف محل / الدليل',
      subtitle: 'دليل المحلات والأنشطة التجارية',
      icon: Store,
    },
    {
      id: 'services_numbers',
      number: '2',
      label: 'أرقام الخدمات',
      subtitle: 'الطوارئ والفنيين والمهنيين',
      icon: PhoneCall,
    },
    {
      id: 'tawsila',
      number: '3',
      label: 'توصيلة',
      subtitle: 'مشاوير، سيارات، ونقل بضائع',
      icon: Car,
    },
    {
      id: 'community',
      number: '4',
      label: 'مجتمع',
      subtitle: 'منشورات ونقاشات الأهالي',
      icon: Users,
    },
    {
      id: 'utilities',
      number: '5',
      label: 'تقديمات المرافق',
      subtitle: 'المياه والكهرباء والغاز والمنشورات',
      icon: FileText,
    },
    {
      id: 'buy_sell',
      number: '6',
      label: 'بيع واشتري',
      subtitle: 'بيع وشراء مباشر بين الأهالي',
      icon: ShoppingBag,
    },
    {
      id: 'settings',
      number: '7',
      label: 'الإعدادات',
      subtitle: 'لوحة الـ Admin والتخزين والمراسلات',
      icon: Settings,
      adminOnly: true,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
  ];

  const visibleSidebarItems = sidebarItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#0A192F] text-[#F8FAFC] flex flex-col">
      {/* Header + Marquee + Live Clock + Auth + Crown 👑 Ad Packages */}
      <HeaderAndAdPackages
        settings={dbState.settings}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      {/* Main Content Layout: Desktop Persistent Right Sidebar (RTL) + Main Viewport */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto overflow-x-hidden">
        {/* Desktop Sidebar: Always open on the Right (RTL), glowing Reveal Highlight borders */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-[#112240]/85 border-l border-[#334155] p-4 justify-between">
          <div className="space-y-2">
            <div className="px-3 py-2 text-xs font-extrabold text-sky-400 border-b border-[#334155]/80 mb-2">
              أقسام المنصة الرئيسية
            </div>

            {visibleSidebarItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`fluent-reveal w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC] shadow-[0_0_18px_-4px_rgba(56,189,248,0.4)]'
                      : 'bg-[#0A192F]/85 border-[#334155]/80 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 relative z-10">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-sky-500 text-[#0A192F] border-sky-300 font-bold'
                          : 'bg-[#1E293B] text-sky-400 border-[#334155]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold truncate">
                        {item.number}. {item.label}
                      </div>
                      <div className="text-[11px] text-[#94A3B8] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span className="relative z-10 px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-mono-tabular font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5 pt-4 border-t border-[#334155]">
            {/* عدد المتصلين الآن الحقيقي (المسجلين والزائرين) محدث لحظياً */}
            <div className="fluent-reveal p-3.5 rounded-xl bg-[#0A192F]/95 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-extrabold text-[#F8FAFC]">
                    عدد المتصلين الآن
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono-tabular font-extrabold">
                  {onlineStats.totalOnline}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#334155]/80 text-[11px] relative z-10">
                <div className="p-2 rounded-lg bg-[#112240]/90 border border-sky-400/30 flex items-center justify-between">
                  <span className="text-[#94A3B8] font-bold">المتصلين المسجلين:</span>
                  <strong className="text-sky-300 font-mono-tabular font-extrabold">
                    {onlineStats.registeredCount}
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-[#112240]/90 border border-amber-400/30 flex items-center justify-between">
                  <span className="text-[#94A3B8] font-bold">عدد الزائرين:</span>
                  <strong className="text-amber-300 font-mono-tabular font-extrabold">
                    {onlineStats.guestsCount}
                  </strong>
                </div>
              </div>

              {onlineStats.registeredUsernames.length > 0 && (
                <div className="text-[10px] text-emerald-300 font-bold truncate relative z-10">
                  مسجلون متصلون: {onlineStats.registeredUsernames.join(' ، ')}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Sliding Sidebar Drawer: Closes automatically when tapping any empty backdrop area */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden bg-[#0A192F]/80 backdrop-blur-sm flex"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMobileSidebarOpen(false);
              }
            }}
          >
            <div className="w-72 max-w-[84vw] h-full bg-[#112240] border-l border-sky-400/40 p-4 flex flex-col justify-between overflow-y-auto shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
                  <div>
                    <div className="text-sm font-extrabold text-[#F8FAFC]">
                      القائمة الجانبية
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      اضغط في أي مكان فارغ للإغلاق
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    aria-label="إغلاق القائمة"
                    className="fluent-reveal w-10 h-10 rounded-lg bg-[#1E293B] hover:bg-rose-600 text-white border border-[#334155] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-5 h-5 relative z-10" />
                  </button>
                </div>

                <div className="space-y-2">
                  {visibleSidebarItems.map((item) => {
                    const Icon = item.icon;
                    const isSelected = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`fluent-reveal w-full text-right p-3.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC]'
                            : 'bg-[#0A192F]/90 border-[#334155] text-[#94A3B8]'
                        }`}
                      >
                        <div className="flex items-center gap-3 relative z-10">
                          <Icon className="w-5 h-5 text-sky-400 shrink-0" />
                          <div>
                            <div className="text-sm font-extrabold text-[#F8FAFC]">
                              {item.number}. {item.label}
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        {item.badge !== undefined && (
                          <span className="relative z-10 px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#334155] space-y-2.5 text-xs text-[#94A3B8]">
                {/* عدد المتصلين الآن الحقيقي (المسجلين والزائرين) محدث لحظياً */}
                <div className="p-3 rounded-xl bg-[#0A192F] border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-extrabold text-[#F8FAFC]">
                        عدد المتصلين الآن
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono-tabular font-extrabold">
                      {onlineStats.totalOnline}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#334155]/80 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-[#112240] border border-sky-400/30 flex items-center justify-between">
                      <span className="text-[#94A3B8] font-bold">المسجلين:</span>
                      <strong className="text-sky-300 font-mono-tabular font-extrabold">
                        {onlineStats.registeredCount}
                      </strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#112240] border border-amber-400/30 flex items-center justify-between">
                      <span className="text-[#94A3B8] font-bold">الزائرين:</span>
                      <strong className="text-amber-300 font-mono-tabular font-extrabold">
                        {onlineStats.guestsCount}
                      </strong>
                    </div>
                  </div>
                  {onlineStats.registeredUsernames.length > 0 && (
                    <div className="text-[10px] text-emerald-300 font-bold truncate pt-1">
                      مسجلون متصلون: {onlineStats.registeredUsernames.join(' ، ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Center Main Content Area */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 space-y-6 overflow-x-hidden">
          <TopBannersAndSquareAds
            topBanners={dbState.topBanners}
            squareAds={dbState.squareAds}
            stores={dbState.stores}
            popupAd={dbState.popupAd}
            isAdmin={isAdmin}
            showBannersAndSquareAds={
              isAdmin
                ? activeSection === 'directory' || activeSection === 'settings'
                : true
            }
            onNavigateSection={setActiveSection}
            onBulkDeleteAds={(squareAdIds, topBannerIds, storeIds) => {
              const sqSet = new Set(squareAdIds);
              const tbSet = new Set(topBannerIds);
              const stSet = new Set(storeIds);
              updateAndPersist((prev) => ({
                ...prev,
                squareAds: prev.squareAds.filter((a) => !sqSet.has(a.id)),
                topBanners: prev.topBanners.filter((b) => !tbSet.has(b.id)),
                stores: prev.stores.filter((s) => !stSet.has(s.id)),
              }));
            }}
            onEntryPopupClosed={() => {
              if (!currentUser) {
                setIsAuthModalOpen(true);
              }
            }}
          />

          <PortalSectionsWorkspace
            activeSection={activeSection}
            state={dbState}
            currentUser={currentUser}
            onlineCount={onlineStats.totalOnline}
            onlineStats={onlineStats}
            connStatus={connStatus}
            connMessage={connMessage}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onAddStore={handleAddStore}
            onUpdateStore={handleUpdateStore}
            onIncrementStoreViews={handleIncrementStoreViews}
            onImportStoresBatch={handleImportStoresBatch}
            onDeleteStore={handleDeleteStore}
            onToggleStoreLike={handleToggleStoreLike}
            onToggleStoreDislike={handleToggleStoreDislike}
            onRateStore={handleRateStore}
            onAddStoreComment={handleAddStoreComment}
            onDeleteStoreComment={handleDeleteStoreComment}
            onToggleCommentLike={handleToggleCommentLike}
            onAddCommentReply={handleAddCommentReply}
            onAddServiceNumber={handleAddServiceNumber}
            onUpdateServiceNumber={handleUpdateServiceNumber}
            onDeleteServiceNumber={handleDeleteServiceNumber}
            onAddTawsila={handleAddTawsila}
            onUpdateTawsila={handleUpdateTawsila}
            onDeleteTawsila={handleDeleteTawsila}
            onAddCommunityPost={handleAddCommunityPost}
            onEditCommunityPost={handleEditCommunityPost}
            onUpdatePostStatus={handleUpdatePostStatus}
            onDeletePost={handleDeletePost}
            onTogglePinCommunityPost={handleTogglePinCommunityPost}
            onToggleCommunityPostSold={handleToggleCommunityPostSold}
            onToggleCommunityPostCommentsDisabled={
              handleToggleCommunityPostCommentsDisabled
            }
            onTogglePostLike={handleTogglePostLike}
            onTogglePostDislike={handleTogglePostDislike}
            onReportPost={handleReportPost}
            onRestoreReportedPost={handleRestoreReportedPost}
            onAddCommentToPost={handleAddCommentToPost}
            onToggleCommunityCommentLike={handleToggleCommunityCommentLike}
            onToggleCommunityCommentEmoji={handleToggleCommunityCommentEmoji}
            onAddReplyToCommunityComment={handleAddReplyToCommunityComment}
            onReportCommunityComment={handleReportCommunityComment}
            onDeleteCommunityComment={handleDeleteCommunityComment}
            onRestoreReportedCommunityComment={
              handleRestoreReportedCommunityComment
            }
            onTogglePinCommunityComment={handleTogglePinCommunityComment}
            onToggleHideCommunityComment={handleToggleHideCommunityComment}
            onSendChatMessage={handleSendChatMessage}
            onReportChatMessage={handleReportChatMessage}
            onDeleteChatMessage={handleDeleteChatMessage}
            onUpdateChatCooldown={handleUpdateChatCooldown}
            onUpdateAutoClearMinutes={handleUpdateAutoClearMinutes}
            onClearPublicChatNow={handleClearPublicChatNow}
            onClearPrivateChatSession={handleClearPrivateChatSession}
            onApplyChatPenalty={handleApplyChatPenalty}
            onSendPrivateMessage={handleSendPrivateMessage}
            onMarkPrivateMessagesRead={handleMarkPrivateMessagesRead}
            onSetChatTypingStatus={handleSetChatTypingStatus}
            onRespondPrivateChatRequest={handleRespondPrivateChatRequest}
            onBlockUserInChat={handleBlockUserInChat}
            onUnblockUserInChat={handleUnblockUserInChat}
            onTogglePrivateMessageReaction={handleTogglePrivateMessageReaction}
            onReportPrivateChatMessage={handleReportPrivateChatMessage}
            onReportUserInPrivateChat={handleReportUserInPrivateChat}
            onDismissPrivateChatReport={handleDismissPrivateChatReport}
            onDeleteUserAccountFromChat={handleDeleteUserAccountFromChat}
            onUpdateSettings={handleUpdateSettings}
            onUpdateUserAccount={handleUpdateUserAccount}
            onDeleteUserAccount={handleDeleteUserAccount}
            onAddTopBanner={handleAddTopBanner}
            onUpdateTopBanner={handleUpdateTopBanner}
            onDeleteTopBanner={handleDeleteTopBanner}
            onAddSquareAd={handleAddSquareAd}
            onUpdateSquareAd={handleUpdateSquareAd}
            onTogglePinSquareAd={handleTogglePinSquareAd}
            onDeleteSquareAd={handleDeleteSquareAd}
            onUpdatePopupAd={handleUpdatePopupAd}
            onMarkMessageRead={handleMarkMessageRead}
            onDeleteMessage={handleDeleteMessage}
            onRenameStoreCategory={handleRenameStoreCategory}
            onAddUtilityType={handleAddUtilityType}
            onSaveUtilitySubmission={handleSaveUtilitySubmission}
            onDeleteUtilitySubmission={handleDeleteUtilitySubmission}
            onAddUtilityPost={handleAddUtilityPost}
            onEditUtilityPost={handleEditUtilityPost}
            onUpdateUtilityPostStatus={handleUpdateUtilityPostStatus}
            onDeleteUtilityPost={handleDeleteUtilityPost}
            onTogglePinUtilityPost={handleTogglePinUtilityPost}
            onToggleUtilityPostSold={handleToggleUtilityPostSold}
            onToggleUtilityPostCommentsDisabled={
              handleToggleUtilityPostCommentsDisabled
            }
            onToggleUtilityPostLike={handleToggleUtilityPostLike}
            onToggleUtilityPostDislike={handleToggleUtilityPostDislike}
            onReportUtilityPost={handleReportUtilityPost}
            onRestoreReportedUtilityPost={handleRestoreReportedUtilityPost}
            onAddCommentToUtilityPost={handleAddCommentToUtilityPost}
            onToggleUtilityCommentLike={handleToggleUtilityCommentLike}
            onToggleUtilityCommentEmoji={handleToggleUtilityCommentEmoji}
            onAddReplyToUtilityComment={handleAddReplyToUtilityComment}
            onReportUtilityComment={handleReportUtilityComment}
            onDeleteUtilityComment={handleDeleteUtilityComment}
            onRestoreReportedUtilityComment={handleRestoreReportedUtilityComment}
            onTogglePinUtilityComment={handleTogglePinUtilityComment}
            onToggleHideUtilityComment={handleToggleHideUtilityComment}
            onAddBuySellPost={handleAddBuySellPost}
            onEditBuySellPost={handleEditBuySellPost}
            onUpdateBuySellPostStatus={handleUpdateBuySellPostStatus}
            onDeleteBuySellPost={handleDeleteBuySellPost}
            onTogglePinBuySellPost={handleTogglePinBuySellPost}
            onToggleBuySellPostSold={handleToggleBuySellPostSold}
            onToggleBuySellPostCommentsDisabled={
              handleToggleBuySellPostCommentsDisabled
            }
            onToggleBuySellPostLike={handleToggleBuySellPostLike}
            onToggleBuySellPostDislike={handleToggleBuySellPostDislike}
            onReportBuySellPost={handleReportBuySellPost}
            onRestoreReportedBuySellPost={handleRestoreReportedBuySellPost}
            onAddCommentToBuySellPost={handleAddCommentToBuySellPost}
            onToggleBuySellCommentLike={handleToggleBuySellCommentLike}
            onToggleBuySellCommentEmoji={handleToggleBuySellCommentEmoji}
            onAddReplyToBuySellComment={handleAddReplyToBuySellComment}
            onReportBuySellComment={handleReportBuySellComment}
            onDeleteBuySellComment={handleDeleteBuySellComment}
            onRestoreReportedBuySellComment={handleRestoreReportedBuySellComment}
            onTogglePinBuySellComment={handleTogglePinBuySellComment}
            onToggleHideBuySellComment={handleToggleHideBuySellComment}
          />
        </main>
      </div>

      {/* Driver Acceptance Welcome Modal ("تم قبول الإضافة") when accepted driver logs in */}
      {pendingDriverWelcome && (
        <FluentModal
          isOpen={!!pendingDriverWelcome}
          onClose={handleDismissDriverWelcome}
          title="تم قبول الإضافة"
          subtitle={`مرحباً بك يا ${pendingDriverWelcome.driverName} في خدمة توصيلة`}
          maxWidth="md"
        >
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-extrabold text-emerald-300">
              تم قبول الإضافة
            </h3>
            <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed">
              تمت مراجعة وقبول حسابك بنجاح من قِبل إدارة الموقع. يمكنك الآن التوجه إلى قسم &quot;توصيلة&quot; والضغط على زر &quot;شغل&quot; لتفعيل موقعك المباشر واستقبال الطلبات!
            </p>
            <div className="pt-2 flex justify-center">
              <FluentButton
                variant="emerald"
                size="lg"
                onClick={handleDismissDriverWelcome}
              >
                إغلاق
              </FluentButton>
            </div>
          </div>
        </FluentModal>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={dbState.users}
        onAuthenticate={handleAuthenticate}
        onRegisterNewUser={handleRegisterNewUser}
        onResetUserPassword={handleResetUserPassword}
      />

      <FooterAndContactModal
        settings={dbState.settings}
        currentUser={currentUser}
        onlineCount={onlineStats.totalOnline}
        onSendMessageToAdmin={handleSendMessageToAdmin}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <OfflineIndicator />
    </div>
  );
}

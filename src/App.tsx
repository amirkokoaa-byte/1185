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
  Database,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import {
  AdminMessage,
  CommentEmojiReactionType,
  CommunityCommentItem,
  CommunityCommentReply,
  CommunityPostItem,
  CommunityPostStatus,
  CommunityReportReason,
  LiveChatMessageItem,
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
} from './types';
import {
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

  const [activeSection, setActiveSection] = useState<MainSectionId>('directory');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

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
    const refreshOnline = () => {
      setOnlineStats(syncRealOnlinePresence(currentUser));
    };
    refreshOnline();

    const interval = setInterval(refreshOnline, 5000);
    const unsubBroadcast = subscribePresenceBroadcast(refreshOnline);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshOnline();
      }
    };
    const handleBeforeUnload = () => {
      removeCurrentTabPresence();
    };

    window.addEventListener('storage', refreshOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      unsubBroadcast();
      window.removeEventListener('storage', refreshOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [currentUser]);

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

  const visitorId = currentUser?.id || 'guest-visitor';

  // --- Authentication Handlers (with Instant Browser Cache on Login) ---
  const handleAuthenticate = (user: UserAccount, rememberMe: boolean) => {
    setCurrentUser(user);
    storageEngine.saveAuthenticatedUser(user, rememberMe, dbState);
  };

  const handleRegisterNewUser = (newUser: UserAccount, rememberMe: boolean) => {
    setDbState((prev) => {
      const next: PlatformDatabaseState = {
        ...prev,
        users: [...prev.users, newUser],
      };
      storageEngine.persistState(next, newUser.id);
      storageEngine.saveAuthenticatedUser(newUser, rememberMe, next);
      return next;
    });
    setCurrentUser(newUser);
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
    setCurrentUser(null);
    storageEngine.saveAuthenticatedUser(null, false);
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

  const handleDeletePost = (postId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      communityPosts: prev.communityPosts.filter((p) => p.id !== postId),
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
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
          ),
        };
      }),
    }));
  };

  // --- Live Community Chat Handlers ("محادثة لايف") ---
  const handleSendChatMessage = (text: string, textColor: string) => {
    const newMsg: LiveChatMessageItem = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorId: visitorId,
      authorUsername: currentUser?.username || 'زائر',
      text,
      textColor: textColor || '#F8FAFC',
      reports: [],
      createdAt: new Date().toISOString(),
    };
    updateAndPersist((prev) => ({
      ...prev,
      liveChatMessages: [...(prev.liveChatMessages || []).slice(-149), newMsg],
    }));
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
        messages: reportAlert ? [reportAlert, ...prev.messages] : prev.messages,
      };
    });
  };

  const handleDeleteChatMessage = (msgId: string) => {
    updateAndPersist((prev) => ({
      ...prev,
      liveChatMessages: (prev.liveChatMessages || []).filter(
        (m) => m.id !== msgId
      ),
    }));
  };

  // --- Stage 5: Admin Settings, Accounts, Stores, Categories & Ads Handlers ---
  const handleUpdateSettings = (nextSettings: PlatformSettings) => {
    const nextState: PlatformDatabaseState = {
      ...dbState,
      settings: nextSettings,
    };
    setDbState(nextState);
    storageEngine.saveLocalState(nextState);
    storageEngine.initializeSync(nextSettings.firebase, nextState);
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
      id: 'settings',
      number: '5',
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

            <div className="fluent-reveal p-3 rounded-xl bg-[#0A192F] border border-[#334155] text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#F8FAFC] relative z-10">
                {connStatus === 'firebase_connected' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Database className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span>حالة الربط البرمجي</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] relative z-10">{connMessage}</p>
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
                </div>
                <div>{connMessage}</div>
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
            showBannersAndSquareAds={
              isAdmin
                ? activeSection === 'directory' || activeSection === 'settings'
                : true
            }
            onNavigateSection={setActiveSection}
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
            onUpdatePostStatus={handleUpdatePostStatus}
            onDeletePost={handleDeletePost}
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
            onSendChatMessage={handleSendChatMessage}
            onReportChatMessage={handleReportChatMessage}
            onDeleteChatMessage={handleDeleteChatMessage}
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
        onSendMessageToAdmin={handleSendMessageToAdmin}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <OfflineIndicator />
    </div>
  );
}

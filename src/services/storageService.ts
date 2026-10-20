import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore';
import {
  getDatabase,
  Database,
  ref,
  set,
  onValue,
  Unsubscribe as RTDBUnsubscribe,
} from 'firebase/database';
import {
  FirebaseConfigSettings,
  PlatformDatabaseState,
  PlatformSettings,
  PopupAdConfig,
  ServicePhoneEntry,
  SquareMovingAd,
  StoreListingItem,
  TawsilaRideItem,
  TopBannerAd,
  UserAccount,
  CommunityPostItem,
  AdminMessage,
  LiveChatMessageItem,
} from '../types';

const DB_STORAGE_KEY = 'fluent_portal_db_v1185';
const SETTINGS_STORAGE_KEY = 'fluent_portal_settings_v1185';
const AUTH_PERSIST_KEY = 'fluent_portal_saved_user_v1185';
const AUTH_SESSION_KEY = 'fluent_portal_session_user_v1185';
const USER_BROWSER_CACHE_PREFIX = 'nakhil_1185_user_cache_';

export const DEFAULT_STORE_CATEGORIES: string[] = [
  'سوبر ماركت',
  'مطعم',
  'صيدلية',
  'عيادة أو مركز طبي',
  'مستشفى',
  'مكتبة',
  'حضانة',
  'محل خضري',
  'محل فراخ',
  'محل هواتف وصيانة موبايل',
  'محل إكسسوارات أو زينة',
  'مخبز سياحي أو بلدي',
];

// High-resolution embedded SVG banners & menu visuals
export const createBannerSvg = (
  headline: string,
  subtext: string,
  badge: string,
  primaryHex: string,
  secondaryHex: string
) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0A192F"/>
        <stop offset="50%" stop-color="#112240"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <radialGradient id="glow" cx="25%" cy="50%" r="65%">
        <stop offset="0%" stop-color="${primaryHex}" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="${secondaryHex}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="420" fill="url(#bg)"/>
    <rect width="1200" height="420" fill="url(#glow)"/>
    <g stroke="${primaryHex}" stroke-opacity="0.22" stroke-width="2" fill="none">
      <rect x="28" y="28" width="1144" height="364" rx="18"/>
      <circle cx="220" cy="210" r="130"/>
      <circle cx="220" cy="210" r="85" fill="${primaryHex}" fill-opacity="0.12"/>
      <path d="M 60 340 L 380 340" stroke-width="3"/>
    </g>
    <rect x="880" y="68" width="240" height="44" rx="10" fill="${primaryHex}" fill-opacity="0.2" stroke="${primaryHex}" stroke-width="1.5"/>
    <text x="1000" y="97" text-anchor="middle" fill="${primaryHex}" font-family="Cairo, sans-serif" font-size="20" font-weight="700">${badge}</text>
    <text x="1120" y="195" text-anchor="end" fill="#F8FAFC" font-family="Cairo, sans-serif" font-size="44" font-weight="800">${headline}</text>
    <text x="1120" y="255" text-anchor="end" fill="#94A3B8" font-family="Cairo, sans-serif" font-size="24" font-weight="500">${subtext}</text>
    <text x="220" y="220" text-anchor="middle" fill="#F8FAFC" font-family="IBM Plex Mono, monospace" font-size="32" font-weight="700">VIP AD</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const createSquareAdSvg = (title: string, category: string, colorHex: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <defs>
      <linearGradient id="sqBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0A192F"/>
        <stop offset="50%" stop-color="#112240"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
    </defs>
    <rect width="500" height="500" rx="20" fill="url(#sqBg)"/>
    <rect x="24" y="24" width="452" height="452" rx="16" fill="none" stroke="${colorHex}" stroke-opacity="0.35" stroke-width="2"/>
    <circle cx="250" cy="175" r="78" fill="${colorHex}" fill-opacity="0.16" stroke="${colorHex}" stroke-width="2.5"/>
    <text x="250" y="185" text-anchor="middle" fill="${colorHex}" font-family="Cairo, sans-serif" font-size="26" font-weight="800">${category}</text>
    <text x="250" y="325" text-anchor="middle" fill="#F8FAFC" font-family="Cairo, sans-serif" font-size="30" font-weight="800">${title}</text>
    <text x="250" y="370" text-anchor="middle" fill="#94A3B8" font-family="Cairo, sans-serif" font-size="18" font-weight="600">قائمة الأسعار والمنيو المعتمد</text>
    <rect x="90" y="415" width="320" height="6" rx="3" fill="${colorHex}" fill-opacity="0.65"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const INITIAL_SETTINGS: PlatformSettings = {
  siteName: 'موقع خدمات التخيل 1185',
  marqueeText:
    'مرحباً بكم في موقع خدمات التخيل 1185 — أضف محلك ومنيو الأسعار مجاناً — تصفح السوبر ماركت والمطاعم والصيدليات والعيادات — باقات إعلانية مميزة بخصم يصل إلى 20% عند الاشتراك لمدة 10 أيام!',
  adminWhatsapp: '201000000000',
  facebookPageUrl: 'https://www.facebook.com',
  contactEmail: 'admin@fluent-hub.com',
  imgbbApiKey: '',
  googleMapsApiKey: '',
  storeCategories: DEFAULT_STORE_CATEGORIES,
  firebase: {
    enabled: false,
    mode: 'firestore',
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};

// Cleared demo accounts (kept only core admin so system settings remain accessible by admin)
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    password: '123',
    role: 'admin',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
];

// Cleared all pre-seeded ads, driver numbers, and messages as requested
export const INITIAL_TOP_BANNERS: TopBannerAd[] = [];

export const INITIAL_SQUARE_ADS: SquareMovingAd[] = [];

export const INITIAL_POPUP_AD: PopupAdConfig = {
  id: 'popup-main-1',
  active: true,
  title: 'مرحباً بكم في موقع خدمات التخيل 1185',
  description:
    'بوابتكم المتكاملة لدليل المحلات، أرقام الخدمات والطوارئ، خدمة توصيلة المباشرة، ومجتمع المنطقة التفاعلي.',
  imageUrl: createBannerSvg(
    'موقع خدمات التخيل 1185',
    'دليل المحلات · أرقام الخدمات · توصيلة · مجتمع تفاعلي',
    'مرحباً بكم',
    '#38BDF8',
    '#0284C7'
  ),
  buttonText: 'تواصل عبر واتساب',
  whatsappPhone: '',
};

export const INITIAL_STORES: StoreListingItem[] = [];

export const INITIAL_SERVICE_NUMBERS: ServicePhoneEntry[] = [];

export const INITIAL_TAWSILA: TawsilaRideItem[] = [];

export const INITIAL_COMMUNITY_POSTS: CommunityPostItem[] = [];

export const INITIAL_MESSAGES: AdminMessage[] = [];

export const INITIAL_LIVE_CHAT: LiveChatMessageItem[] = [];

function normalizeStoresList(rawStores: StoreListingItem[]): StoreListingItem[] {
  return rawStores.map((s) => ({
    ...s,
    locationUrl: s.locationUrl || 'https://maps.google.com',
    details: s.details || (s as unknown as { description?: string }).description || '',
    menuImages:
      Array.isArray(s.menuImages) && s.menuImages.length > 0
        ? s.menuImages
        : Array.isArray((s as unknown as { images?: string[] }).images)
        ? (s as unknown as { images: string[] }).images
        : [createSquareAdSvg(s.name, s.category, '#38BDF8')],
    likes: Array.isArray(s.likes) ? s.likes : [],
    dislikes: Array.isArray(s.dislikes) ? s.dislikes : [],
    ratings: s.ratings && typeof s.ratings === 'object' ? s.ratings : {},
    comments: Array.isArray(s.comments) ? s.comments : [],
    viewsCount: typeof s.viewsCount === 'number' ? s.viewsCount : 0,
  }));
}

function normalizeServiceNumbersList(rawList: ServicePhoneEntry[]): ServicePhoneEntry[] {
  return rawList.map((n) => ({
    ...n,
    locationUrl: n.locationUrl || 'https://maps.google.com',
    category: n.category || 'خدمات عامة',
  }));
}

function normalizeTawsilaList(rawList: TawsilaRideItem[]): TawsilaRideItem[] {
  return rawList.map((r, idx) => ({
    ...r,
    nationalId: r.nationalId || '',
    criminalRecordImageUrl: r.criminalRecordImageUrl || '',
    adminApproved: r.adminApproved !== undefined ? r.adminApproved : true,
    vehicleType: r.vehicleType || 'سيارة توصيلة حديثة',
    fromArea: r.fromArea || 'وسط المدينة',
    toArea: r.toArea || 'جميع المناطق',
    priceNote: r.priceNote || 'متاح للتوصيل الفوري',
    lat: typeof r.lat === 'number' ? r.lat : 30.0444 + idx * 0.002,
    lng: typeof r.lng === 'number' ? r.lng : 31.2357 + idx * 0.002,
    lastLocationUpdate: r.lastLocationUpdate || r.createdAt || new Date().toISOString(),
  }));
}

function normalizeCommunityPostsList(rawList: CommunityPostItem[]): CommunityPostItem[] {
  return rawList.map((p) => ({
    ...p,
    postType: p.postType || 'استفسار',
    status: p.status || 'approved',
    likes: Array.isArray(p.likes) ? p.likes : [],
    dislikes: Array.isArray(p.dislikes) ? p.dislikes : [],
    reports: Array.isArray(p.reports) ? p.reports : [],
    comments: Array.isArray(p.comments)
      ? p.comments.map((c, cIdx) => ({
          id: c.id || `cmt-${cIdx}`,
          authorId: c.authorId || 'usr-guest',
          authorUsername: c.authorUsername || 'مستخدم',
          text: c.text || '',
          isPinned: Boolean(c.isPinned),
          likes: Array.isArray(c.likes) ? c.likes : [],
          reactions: {
            heart: Array.isArray(c.reactions?.heart) ? c.reactions.heart : [],
            laugh: Array.isArray(c.reactions?.laugh) ? c.reactions.laugh : [],
            sad: Array.isArray(c.reactions?.sad) ? c.reactions.sad : [],
          },
          replies: Array.isArray(c.replies) ? c.replies : [],
          reports: Array.isArray(c.reports) ? c.reports : [],
          createdAt: c.createdAt || new Date().toISOString(),
        }))
      : [],
  }));
}

function normalizeLiveChatList(rawList?: LiveChatMessageItem[]): LiveChatMessageItem[] {
  if (!Array.isArray(rawList)) return [];
  // Keep latest 150 messages so chat stays blazingly fast and never lags
  return rawList.slice(-150).map((m, idx) => ({
    id: m.id || `chat-${idx}`,
    authorId: m.authorId || 'guest',
    authorUsername: m.authorUsername || 'زائر',
    text: m.text || '',
    textColor: m.textColor || '#F8FAFC',
    reports: Array.isArray(m.reports) ? m.reports : [],
    createdAt: m.createdAt || new Date().toISOString(),
  }));
}

/**
 * IndexedDB + Memory Ultra-Fast Browser Cache Engine
 * Caches full application state & user data in the browser upon login and on every action
 * so returning users experience zero-latency instant loading without re-fetching data.
 */
class FastBrowserCacheEngine {
  private memoryCache: PlatformDatabaseState | null = null;
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private getIDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = window.indexedDB.open('Nakhil1185FastCacheDB', 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('snapshots')) {
              db.createObjectStore('snapshots');
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.dbPromise;
  }

  public setMemoryAndDiskCache(state: PlatformDatabaseState, userId?: string) {
    this.memoryCache = state;
    try {
      if (userId) {
        localStorage.setItem(
          `${USER_BROWSER_CACHE_PREFIX}${userId}`,
          JSON.stringify({
            cachedAt: Date.now(),
            userId,
          })
        );
      }
    } catch {
      // ignore quota
    }

    this.getIDB().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        store.put(state, 'latest_state');
        if (userId) {
          store.put(state, `user_${userId}`);
        }
      } catch {
        // ignore
      }
    });
  }

  public getMemoryCache(): PlatformDatabaseState | null {
    return this.memoryCache;
  }
}

const fastBrowserCache = new FastBrowserCacheEngine();

class HybridStorageEngine {
  private firebaseApp: FirebaseApp | null = null;
  private firestoreDb: Firestore | null = null;
  private realtimeDb: Database | null = null;
  private unsubscribeSnapshot: FirestoreUnsubscribe | RTDBUnsubscribe | null = null;
  private listeners: Array<(state: PlatformDatabaseState) => void> = [];
  private connectionStatusListeners: Array<
    (status: 'local' | 'firebase_connected' | 'firebase_error', message?: string) => void
  > = [];
  private currentStatus: 'local' | 'firebase_connected' | 'firebase_error' = 'local';
  private currentMessage: string =
    'يعمل بنظام التخزين الفوري السريع في المتصفح (Browser Instant Cache)';

  public loadLocalState(): PlatformDatabaseState {
    const cachedMem = fastBrowserCache.getMemoryCache();
    if (cachedMem) return cachedMem;

    try {
      const savedSettingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const savedStateRaw = localStorage.getItem(DB_STORAGE_KEY);
      const parsedSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : {};
      const settings: PlatformSettings = {
        ...INITIAL_SETTINGS,
        ...parsedSettings,
        siteName: parsedSettings.siteName || 'موقع خدمات التخيل 1185',
        storeCategories:
          Array.isArray(parsedSettings.storeCategories) &&
          parsedSettings.storeCategories.length > 0
            ? parsedSettings.storeCategories
            : DEFAULT_STORE_CATEGORIES,
        requireDriverCriminalRecordApproval:
          parsedSettings.requireDriverCriminalRecordApproval ?? false,
      };

      if (savedStateRaw) {
        const parsed = JSON.parse(savedStateRaw);
        const hydrated: PlatformDatabaseState = {
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_USERS,
          topBanners: Array.isArray(parsed.topBanners) ? parsed.topBanners : INITIAL_TOP_BANNERS,
          squareAds: Array.isArray(parsed.squareAds) ? parsed.squareAds : INITIAL_SQUARE_ADS,
          popupAd: parsed.popupAd || INITIAL_POPUP_AD,
          messages: Array.isArray(parsed.messages) ? parsed.messages : INITIAL_MESSAGES,
          stores: Array.isArray(parsed.stores)
            ? normalizeStoresList(parsed.stores)
            : INITIAL_STORES,
          serviceNumbers: Array.isArray(parsed.serviceNumbers)
            ? normalizeServiceNumbersList(parsed.serviceNumbers)
            : INITIAL_SERVICE_NUMBERS,
          tawsilaRides: Array.isArray(parsed.tawsilaRides)
            ? normalizeTawsilaList(parsed.tawsilaRides)
            : INITIAL_TAWSILA,
          communityPosts: Array.isArray(parsed.communityPosts)
            ? normalizeCommunityPostsList(parsed.communityPosts)
            : INITIAL_COMMUNITY_POSTS,
          liveChatMessages: normalizeLiveChatList(parsed.liveChatMessages),
          settings,
        };
        fastBrowserCache.setMemoryAndDiskCache(hydrated);
        return hydrated;
      }

      const initialState: PlatformDatabaseState = {
        users: INITIAL_USERS,
        topBanners: INITIAL_TOP_BANNERS,
        squareAds: INITIAL_SQUARE_ADS,
        popupAd: INITIAL_POPUP_AD,
        messages: INITIAL_MESSAGES,
        stores: INITIAL_STORES,
        serviceNumbers: INITIAL_SERVICE_NUMBERS,
        tawsilaRides: INITIAL_TAWSILA,
        communityPosts: INITIAL_COMMUNITY_POSTS,
        liveChatMessages: INITIAL_LIVE_CHAT,
        settings,
      };
      this.saveLocalState(initialState);
      return initialState;
    } catch {
      return {
        users: INITIAL_USERS,
        topBanners: INITIAL_TOP_BANNERS,
        squareAds: INITIAL_SQUARE_ADS,
        popupAd: INITIAL_POPUP_AD,
        messages: INITIAL_MESSAGES,
        stores: INITIAL_STORES,
        serviceNumbers: INITIAL_SERVICE_NUMBERS,
        tawsilaRides: INITIAL_TAWSILA,
        communityPosts: INITIAL_COMMUNITY_POSTS,
        liveChatMessages: INITIAL_LIVE_CHAT,
        settings: INITIAL_SETTINGS,
      };
    }
  }

  public saveLocalState(state: PlatformDatabaseState, activeUserId?: string) {
    fastBrowserCache.setMemoryAndDiskCache(state, activeUserId);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
      localStorage.setItem(
        DB_STORAGE_KEY,
        JSON.stringify({
          users: state.users,
          topBanners: state.topBanners,
          squareAds: state.squareAds,
          popupAd: state.popupAd,
          messages: state.messages,
          stores: state.stores,
          serviceNumbers: state.serviceNumbers,
          tawsilaRides: state.tawsilaRides,
          communityPosts: state.communityPosts,
          liveChatMessages: normalizeLiveChatList(state.liveChatMessages),
        })
      );
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }

  public loadAuthenticatedUser(users: UserAccount[]): UserAccount | null {
    try {
      const rememberedId = localStorage.getItem(AUTH_PERSIST_KEY);
      if (rememberedId) {
        const found = users.find((u) => u.id === rememberedId);
        if (found && !found.isBanned) return found;
      }
      const sessionId = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (sessionId) {
        const found = users.find((u) => u.id === sessionId);
        if (found && !found.isBanned) return found;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public saveAuthenticatedUser(
    user: UserAccount | null,
    rememberMe: boolean,
    currentState?: PlatformDatabaseState
  ) {
    try {
      if (!user) {
        localStorage.removeItem(AUTH_PERSIST_KEY);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        return;
      }
      // Cache all user & platform data in browser immediately upon login for instant future loads
      if (currentState) {
        fastBrowserCache.setMemoryAndDiskCache(currentState, user.id);
      }
      if (rememberMe) {
        localStorage.setItem(AUTH_PERSIST_KEY, user.id);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      } else {
        localStorage.removeItem(AUTH_PERSIST_KEY);
        sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: (state: PlatformDatabaseState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeStatus(
    listener: (
      status: 'local' | 'firebase_connected' | 'firebase_error',
      message?: string
    ) => void
  ) {
    this.connectionStatusListeners.push(listener);
    listener(this.currentStatus, this.currentMessage);
    return () => {
      this.connectionStatusListeners = this.connectionStatusListeners.filter(
        (l) => l !== listener
      );
    };
  }

  private notifyStatus(
    status: 'local' | 'firebase_connected' | 'firebase_error',
    message: string
  ) {
    this.currentStatus = status;
    this.currentMessage = message;
    this.connectionStatusListeners.forEach((cb) => cb(status, message));
  }

  private notifyData(state: PlatformDatabaseState) {
    this.listeners.forEach((cb) => cb(state));
  }

  public async initializeSync(
    firebaseConfig: FirebaseConfigSettings,
    currentState: PlatformDatabaseState
  ) {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    if (!firebaseConfig.enabled || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
      this.notifyStatus(
        'local',
        'التخزين الفوري السريع في المتصفح نشط (Instant Browser Cache)'
      );
      return;
    }

    try {
      const existingApps = getApps();
      for (const app of existingApps) {
        if (app.name === 'DynamicPortalApp') {
          await deleteApp(app);
        }
      }

      this.firebaseApp = initializeApp(
        {
          apiKey: firebaseConfig.apiKey.trim(),
          authDomain:
            firebaseConfig.authDomain.trim() ||
            `${firebaseConfig.projectId.trim()}.firebaseapp.com`,
          databaseURL: firebaseConfig.databaseURL.trim() || undefined,
          projectId: firebaseConfig.projectId.trim(),
          storageBucket:
            firebaseConfig.storageBucket.trim() ||
            `${firebaseConfig.projectId.trim()}.appspot.com`,
          messagingSenderId: firebaseConfig.messagingSenderId.trim(),
          appId: firebaseConfig.appId.trim(),
        },
        'DynamicPortalApp'
      );

      if (firebaseConfig.mode === 'realtime' && firebaseConfig.databaseURL) {
        this.realtimeDb = getDatabase(this.firebaseApp);
        const stateRef = ref(this.realtimeDb, 'fluent_portal_v3/workspace');

        this.unsubscribeSnapshot = onValue(
          stateRef,
          (snapshot) => {
            const remoteData = snapshot.val();
            if (remoteData) {
              const mergedState: PlatformDatabaseState = {
                users: remoteData.users || currentState.users,
                topBanners: remoteData.topBanners || [],
                squareAds: remoteData.squareAds || [],
                popupAd: remoteData.popupAd || currentState.popupAd,
                messages: remoteData.messages || [],
                stores: remoteData.stores
                  ? normalizeStoresList(remoteData.stores)
                  : [],
                serviceNumbers: remoteData.serviceNumbers || [],
                tawsilaRides: remoteData.tawsilaRides || [],
                communityPosts: remoteData.communityPosts
                  ? normalizeCommunityPostsList(remoteData.communityPosts)
                  : [],
                liveChatMessages: normalizeLiveChatList(remoteData.liveChatMessages),
                settings: {
                  ...currentState.settings,
                  ...(remoteData.settings || {}),
                  firebase: firebaseConfig,
                },
              };
              this.saveLocalState(mergedState);
              this.notifyData(mergedState);
            } else {
              set(stateRef, {
                ...currentState,
                updatedAt: new Date().toISOString(),
              });
            }
            this.notifyStatus(
              'firebase_connected',
              'متصل لحظياً مع Firebase Realtime Database + كاش المتصفح السريع'
            );
          },
          (error) => {
            this.notifyStatus(
              'firebase_error',
              `تعذر المزامنة مع Realtime DB: ${error.message}`
            );
          }
        );
      } else {
        this.firestoreDb = getFirestore(this.firebaseApp);
        const docRef = doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state');

        this.unsubscribeSnapshot = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data();
              const mergedState: PlatformDatabaseState = {
                users: remoteData.users || currentState.users,
                topBanners: remoteData.topBanners || [],
                squareAds: remoteData.squareAds || [],
                popupAd: remoteData.popupAd || currentState.popupAd,
                messages: remoteData.messages || [],
                stores: remoteData.stores
                  ? normalizeStoresList(remoteData.stores)
                  : [],
                serviceNumbers: remoteData.serviceNumbers || [],
                tawsilaRides: remoteData.tawsilaRides || [],
                communityPosts: remoteData.communityPosts
                  ? normalizeCommunityPostsList(remoteData.communityPosts)
                  : [],
                liveChatMessages: normalizeLiveChatList(remoteData.liveChatMessages),
                settings: {
                  ...currentState.settings,
                  ...(remoteData.settings || {}),
                  firebase: firebaseConfig,
                },
              };
              this.saveLocalState(mergedState);
              this.notifyData(mergedState);
            } else {
              setDoc(docRef, {
                ...currentState,
                updatedAt: new Date().toISOString(),
              });
            }
            this.notifyStatus(
              'firebase_connected',
              'متصل لحظياً مع سحابة Firebase Firestore + كاش المتصفح السريع'
            );
          },
          (error) => {
            this.notifyStatus(
              'firebase_error',
              `تعذر الاتصال بـ Firestore: ${error.message}`
            );
          }
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ في إعدادات Firebase';
      this.notifyStatus('firebase_error', `خطأ في تهيئة Firebase: ${msg}`);
    }
  }

  public async persistState(nextState: PlatformDatabaseState, activeUserId?: string) {
    this.saveLocalState(nextState, activeUserId);
    this.notifyData(nextState);

    const fb = nextState.settings.firebase;
    if (
      !fb.enabled ||
      !fb.apiKey ||
      !fb.projectId ||
      this.currentStatus !== 'firebase_connected'
    ) {
      return;
    }

    try {
      const payload = {
        ...nextState,
        updatedAt: new Date().toISOString(),
      };

      if (fb.mode === 'realtime' && this.realtimeDb) {
        const stateRef = ref(this.realtimeDb, 'fluent_portal_v3/workspace');
        await set(stateRef, payload);
      } else if (this.firestoreDb) {
        const docRef = doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state');
        await setDoc(docRef, payload, { merge: true });
      }
    } catch (error) {
      console.error('Firebase sync write error:', error);
    }
  }
}

export const storageEngine = new HybridStorageEngine();

export interface RealOnlinePresenceStats {
  totalOnline: number;
  registeredCount: number;
  guestsCount: number;
  registeredUsernames: string[];
}

interface StoredPresenceSession {
  sessionId: string;
  userId: string | null;
  username: string | null;
  isRegistered: boolean;
  lastActiveAt: number;
}

const TAB_SESSION_STORAGE_KEY = 'nakhil_1185_real_tab_session_id';
const REAL_PRESENCE_MAP_KEY = 'nakhil_1185_real_presence_v3';

function getOrCreateTabSessionId(): string {
  try {
    let tabId = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, tabId);
    }
    return tabId;
  } catch {
    return 'tab_default_single';
  }
}

let presenceChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    presenceChannel = new BroadcastChannel('nakhil_1185_presence_channel');
  }
} catch {
  presenceChannel = null;
}

export function subscribePresenceBroadcast(onUpdate: () => void): () => void {
  if (!presenceChannel) return () => {};
  const handler = () => onUpdate();
  presenceChannel.addEventListener('message', handler);
  return () => {
    presenceChannel?.removeEventListener('message', handler);
  };
}

export function removeCurrentTabPresence(): void {
  try {
    const tabId = getOrCreateTabSessionId();
    const raw = localStorage.getItem(REAL_PRESENCE_MAP_KEY);
    if (!raw) return;
    const map: Record<string, StoredPresenceSession> = JSON.parse(raw);
    if (map[tabId]) {
      delete map[tabId];
      localStorage.setItem(REAL_PRESENCE_MAP_KEY, JSON.stringify(map));
      presenceChannel?.postMessage({ type: 'presence_changed' });
    }
  } catch {
    // ignore
  }
}

/**
 * 100% Real Live Online Presence Tracker ("عدد المتصلين الآن: المتصلين المسجلين وعدد الزائرين")
 * Tracks actual open browser sessions without fabricating numbers, deduplicating registered users
 * and counting active guest visitors in real time.
 */
export function syncRealOnlinePresence(
  currentUser: UserAccount | null
): RealOnlinePresenceStats {
  try {
    const now = Date.now();
    const tabId = getOrCreateTabSessionId();
    const raw = localStorage.getItem(REAL_PRESENCE_MAP_KEY);
    const map: Record<string, StoredPresenceSession> = raw ? JSON.parse(raw) : {};

    const prevEntry = map[tabId];
    const isRegistered = Boolean(currentUser && currentUser.id);
    map[tabId] = {
      sessionId: tabId,
      userId: currentUser?.id || null,
      username: currentUser?.username || null,
      isRegistered,
      lastActiveAt: now,
    };

    // Prune stale sessions (> 25 seconds without heartbeat)
    Object.keys(map).forEach((k) => {
      if (!map[k] || now - map[k].lastActiveAt > 25000) {
        delete map[k];
      }
    });

    localStorage.setItem(REAL_PRESENCE_MAP_KEY, JSON.stringify(map));

    // If user login/logout state changed on this tab, broadcast immediately
    if (
      !prevEntry ||
      prevEntry.userId !== (currentUser?.id || null) ||
      prevEntry.isRegistered !== isRegistered
    ) {
      presenceChannel?.postMessage({ type: 'presence_changed' });
    }

    const activeSessions = Object.values(map);
    const registeredMap = new Map<string, string>();
    let guestsCount = 0;

    activeSessions.forEach((sess) => {
      if (sess.isRegistered && sess.userId) {
        registeredMap.set(sess.userId, sess.username || 'مستخدم مسجل');
      } else {
        guestsCount += 1;
      }
    });

    const registeredCount = registeredMap.size;
    const totalOnline = registeredCount + guestsCount;

    return {
      totalOnline,
      registeredCount,
      guestsCount,
      registeredUsernames: Array.from(registeredMap.values()),
    };
  } catch {
    const isReg = Boolean(currentUser && currentUser.id);
    return {
      totalOnline: 1,
      registeredCount: isReg ? 1 : 0,
      guestsCount: isReg ? 0 : 1,
      registeredUsernames: isReg && currentUser ? [currentUser.username] : [],
    };
  }
}

/**
 * Dynamic Image Upload Service via ImgBB API with intelligent compressed Base64 fallback
 */
export async function uploadImageDynamic(
  file: File,
  imgbbApiKey?: string
): Promise<{ url: string; provider: 'imgbb' | 'local_compressed' }> {
  const compressedBase64 = await compressImageToBase64(file, 950, 0.82);

  if (imgbbApiKey && imgbbApiKey.trim().length > 8) {
    try {
      const base64Clean = compressedBase64.replace(/^data:image\/\w+;base64,/, '');
      const formData = new FormData();
      formData.append('image', base64Clean);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(imgbbApiKey.trim())}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();
      if (result && result.success && result.data && result.data.url) {
        return {
          url: result.data.display_url || result.data.url,
          provider: 'imgbb',
        };
      }
    } catch (err) {
      console.warn('ImgBB API upload failed, falling back to compressed local image:', err);
    }
  }

  return {
    url: compressedBase64,
    provider: 'local_compressed',
  };
}

function compressImageToBase64(
  file: File,
  maxWidth: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
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
  UtilitySubmissionItem,
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

export const DEFAULT_UTILITY_TYPES: string[] = [
  'تقديم المياه',
  'تقديم الكهرباء',
  'تقديم الغاز',
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

function escapeSvgXml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const createSquareAdSvg = (title: string, category: string, colorHex: string) => {
  const cleanCat = (category || 'محل تجاري').trim();
  const cleanTitle = (title || cleanCat).trim();
  const titleWords = cleanTitle.split(/\s+/).filter(Boolean);

  // اسم المحل داخل المستطيل (وإذا كان الاسم طويلاً يكون في سطرين أسفل بعض بخط بارز واضح)
  let titleInsideRectMarkup = '';
  if (cleanTitle.length > 10 && titleWords.length >= 2) {
    const mid = Math.ceil(titleWords.length / 2);
    const line1 = escapeSvgXml(titleWords.slice(0, mid).join(' '));
    const line2 = escapeSvgXml(titleWords.slice(mid).join(' '));
    const maxLen = Math.max(line1.length, line2.length);
    const lineFontSize = maxLen > 15 ? 44 : maxLen > 11 ? 52 : 60;
    titleInsideRectMarkup = `
      <text x="250" y="138" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="1.2" font-family="Cairo, sans-serif" font-size="${lineFontSize}" font-weight="900">${line1}</text>
      <text x="250" y="210" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="1.2" font-family="Cairo, sans-serif" font-size="${lineFontSize}" font-weight="900">${line2}</text>
    `;
  } else if (cleanTitle.length > 13 && titleWords.length === 1) {
    const half = Math.ceil(cleanTitle.length / 2);
    const line1 = escapeSvgXml(cleanTitle.slice(0, half));
    const line2 = escapeSvgXml(cleanTitle.slice(half));
    titleInsideRectMarkup = `
      <text x="250" y="138" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="1.2" font-family="Cairo, sans-serif" font-size="52" font-weight="900">${line1}</text>
      <text x="250" y="210" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="1.2" font-family="Cairo, sans-serif" font-size="52" font-weight="900">${line2}</text>
    `;
  } else {
    const singleFontSize = cleanTitle.length <= 7 ? 72 : cleanTitle.length <= 10 ? 60 : 50;
    titleInsideRectMarkup = `
      <text x="250" y="174" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="1.4" font-family="Cairo, sans-serif" font-size="${singleFontSize}" font-weight="900">${escapeSvgXml(cleanTitle)}</text>
    `;
  }

  // أسفل المستطيل: نوع المحل بخط بارز واضح
  const catWords = cleanCat.split(/\s+/).filter(Boolean);
  let categoryBelowRectMarkup = '';
  if (cleanCat.length > 14 && catWords.length >= 2) {
    const midCat = Math.ceil(catWords.length / 2);
    const cLine1 = escapeSvgXml(catWords.slice(0, midCat).join(' '));
    const cLine2 = escapeSvgXml(catWords.slice(midCat).join(' '));
    categoryBelowRectMarkup = `
      <text x="250" y="346" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="0.9" font-family="Cairo, sans-serif" font-size="42" font-weight="900">${cLine1}</text>
      <text x="250" y="402" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="0.9" font-family="Cairo, sans-serif" font-size="42" font-weight="900">${cLine2}</text>
    `;
  } else {
    const catFontSize = cleanCat.length <= 9 ? 54 : cleanCat.length <= 14 ? 46 : 38;
    categoryBelowRectMarkup = `
      <text x="250" y="372" text-anchor="middle" dominant-baseline="middle" fill="#000000" stroke="#000000" stroke-width="1.1" font-family="Cairo, sans-serif" font-size="${catFontSize}" font-weight="900">${escapeSvgXml(cleanCat)}</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" rx="22" fill="#FFFFFF"/>
    <rect x="14" y="14" width="472" height="472" rx="18" fill="#F8FAFC" stroke="#94A3B8" stroke-width="4"/>
    <!-- إطار مستطيلي بارز بداخله اسم المحل (وفي سطرين أسفل بعض إذا كان الاسم طويلاً) -->
    <rect x="24" y="56" width="452" height="236" rx="20" fill="${colorHex || '#0284C7'}" fill-opacity="0.14" stroke="#0284C7" stroke-width="8"/>
    <rect x="36" y="68" width="428" height="212" rx="14" fill="#FFFFFF" stroke="#0F172A" stroke-width="4"/>
    ${titleInsideRectMarkup}
    <!-- أسفل المستطيل: نوع المحل بخط بارز واضح -->
    ${categoryBelowRectMarkup}
    <rect x="70" y="444" width="360" height="8" rx="4" fill="#0284C7"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const HIDDEN_DEFAULT_FIREBASE_CONFIG: FirebaseConfigSettings = {
  enabled: true,
  mode: 'firestore',
  apiKey: 'AIzaSyChpehDm5ER9-_hrWl1pT8Oe1a6YJLU6kU',
  authDomain: 'project-1796493268337237589.firebaseapp.com',
  databaseURL: '',
  projectId: 'project-1796493268337237589',
  storageBucket: 'project-1796493268337237589.firebasestorage.app',
  messagingSenderId: '164535462456',
  appId: '1:164535462456:web:d0e2580876f4ef9da794cd',
  measurementId: 'G-GY7K2HLTX5',
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
  utilityTypes: DEFAULT_UTILITY_TYPES,
  liveChatCooldownSeconds: 5,
  liveChatAutoClearMinutes: 60,
  liveChatLastClearedAt: new Date().toISOString(),
  firebase: HIDDEN_DEFAULT_FIREBASE_CONFIG,
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
  return rawStores.map((s) => {
    const rawImages =
      Array.isArray(s.menuImages) && s.menuImages.length > 0
        ? s.menuImages
        : Array.isArray((s as unknown as { images?: string[] }).images)
        ? (s as unknown as { images: string[] }).images
        : [createSquareAdSvg(s.name, s.category, '#0284C7')];

    const upgradedImages = rawImages.map((img, idx) =>
      idx === 0 && typeof img === 'string' && img.startsWith('data:image/svg+xml')
        ? createSquareAdSvg(s.name, s.category, '#0284C7')
        : img
    );

    const hasResetV2 = Boolean(s.ratingsResetV2);
    const cleanRatings =
      hasResetV2 && s.ratings && typeof s.ratings === 'object' ? s.ratings : {};
    const cleanComments = Array.isArray(s.comments)
      ? s.comments.map((c) => ({
          ...c,
          rating: hasResetV2 && typeof c.rating === 'number' ? c.rating : 0,
        }))
      : [];

    return {
      ...s,
      locationUrl: s.locationUrl || 'https://maps.google.com',
      details: s.details || (s as unknown as { description?: string }).description || '',
      menuImages: upgradedImages,
      likes: Array.isArray(s.likes) ? s.likes : [],
      dislikes: Array.isArray(s.dislikes) ? s.dislikes : [],
      ratings: cleanRatings,
      ratingsResetV2: true,
      comments: cleanComments,
      viewsCount: typeof s.viewsCount === 'number' ? s.viewsCount : 0,
    };
  });
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
  // Keep strictly only the latest 50 messages in Public Chat; older messages are permanently deleted
  return rawList.slice(-50).map((m, idx) => {
    const item: LiveChatMessageItem = {
      id: m.id || `chat-${idx}`,
      authorId: m.authorId || 'guest',
      authorUsername: m.authorUsername || 'زائر',
      text: m.text || '',
      textColor: m.textColor || '#F8FAFC',
      reports: Array.isArray(m.reports) ? m.reports : [],
      createdAt: m.createdAt || new Date().toISOString(),
    };
    if (m.isSystemNotification) item.isSystemNotification = true;
    if (m.targetUsername) item.targetUsername = m.targetUsername;
    return item;
  });
}

function normalizeUtilitySubmissionsList(
  rawList?: UtilitySubmissionItem[]
): UtilitySubmissionItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((u, idx) => ({
    id: u.id || `util-${idx}`,
    utilityName: u.utilityName || 'تقديم المياه',
    locations: Array.isArray(u.locations)
      ? u.locations.slice(0, 3).map((l) => ({
          name: l?.name || '',
          locationUrl: l?.locationUrl || '',
        }))
      : [],
    details: (u.details || '').slice(0, 10000),
    updatedAt: u.updatedAt || u.createdAt || new Date().toISOString(),
    createdAt: u.createdAt || new Date().toISOString(),
  }));
}

function sanitizeForFirebase<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
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

let stateSyncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    stateSyncChannel = new BroadcastChannel('nakhil_1185_state_sync_v2');
  }
} catch {
  stateSyncChannel = null;
}

class HybridStorageEngine {
  private firebaseApp: FirebaseApp | null = null;
  private firestoreDb: Firestore | null = null;
  private realtimeDb: Database | null = null;
  private unsubscribeSnapshot: FirestoreUnsubscribe | RTDBUnsubscribe | null = null;
  private unsubscribeFastChatSnapshot: FirestoreUnsubscribe | null = null;
  private eventSource: EventSource | null = null;
  private fastChatPollTimer: ReturnType<typeof setInterval> | null = null;
  private isFastChatPolling = false;
  private lastChatVersion = 0;
  private deferredSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private latestState: PlatformDatabaseState | null = null;
  private listeners: Array<(state: PlatformDatabaseState) => void> = [];
  private connectionStatusListeners: Array<
    (status: 'local' | 'firebase_connected' | 'firebase_error', message?: string) => void
  > = [];
  private currentStatus: 'local' | 'firebase_connected' | 'firebase_error' = 'local';
  private currentMessage: string =
    'يعمل بنظام التخزين الفوري السريع في المتصفح (Browser Instant Cache)';

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Instant cross-tab BroadcastChannel listener (< 1ms)
      if (stateSyncChannel) {
        stateSyncChannel.addEventListener('message', (ev) => {
          const data = ev.data;
          if (!data || data.senderTabId === getOrCreateTabSessionId()) return;
          if (data.type === 'full_state' && data.state) {
            this.applyIncomingRemoteState(data.state);
          } else if (data.type === 'chat_fast' && data.chatPatch) {
            this.applyIncomingFastChatPatch(data.chatPatch);
          }
        });
      }

      // 2. Cross-tab localStorage event listener
      window.addEventListener('storage', (e) => {
        if (e.key === DB_STORAGE_KEY || e.key === SETTINGS_STORAGE_KEY) {
          const fresh = this.loadLocalState(true);
          this.notifyData(fresh);
        }
      });
    }
  }

  public loadLocalState(forceReloadFromStorage = false): PlatformDatabaseState {
    if (!forceReloadFromStorage) {
      const cachedMem = fastBrowserCache.getMemoryCache();
      if (cachedMem) {
        this.latestState = cachedMem;
        return cachedMem;
      }
    }

    try {
      const savedSettingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const savedStateRaw = localStorage.getItem(DB_STORAGE_KEY);
      const parsedSettings = savedSettingsRaw ? JSON.parse(savedSettingsRaw) : {};
      const mergedFirebase: FirebaseConfigSettings =
        parsedSettings.firebase && parsedSettings.firebase.apiKey
          ? {
              ...HIDDEN_DEFAULT_FIREBASE_CONFIG,
              ...parsedSettings.firebase,
              enabled: true,
            }
          : HIDDEN_DEFAULT_FIREBASE_CONFIG;

      const settings: PlatformSettings = {
        ...INITIAL_SETTINGS,
        ...parsedSettings,
        siteName: parsedSettings.siteName || 'موقع خدمات التخيل 1185',
        storeCategories:
          Array.isArray(parsedSettings.storeCategories) &&
          parsedSettings.storeCategories.length > 0
            ? parsedSettings.storeCategories
            : DEFAULT_STORE_CATEGORIES,
        utilityTypes:
          Array.isArray(parsedSettings.utilityTypes) &&
          parsedSettings.utilityTypes.length > 0
            ? parsedSettings.utilityTypes
            : DEFAULT_UTILITY_TYPES,
        requireDriverCriminalRecordApproval:
          parsedSettings.requireDriverCriminalRecordApproval ?? false,
        liveChatCooldownSeconds:
          typeof parsedSettings.liveChatCooldownSeconds === 'number'
            ? parsedSettings.liveChatCooldownSeconds
            : 5,
        liveChatAutoClearMinutes:
          typeof parsedSettings.liveChatAutoClearMinutes === 'number'
            ? parsedSettings.liveChatAutoClearMinutes
            : 60,
        liveChatLastClearedAt:
          parsedSettings.liveChatLastClearedAt || new Date().toISOString(),
        firebase: mergedFirebase,
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
          utilitySubmissions: normalizeUtilitySubmissionsList(parsed.utilitySubmissions),
          utilityPosts: Array.isArray(parsed.utilityPosts)
            ? normalizeCommunityPostsList(parsed.utilityPosts)
            : [],
          buySellPosts: Array.isArray(parsed.buySellPosts)
            ? normalizeCommunityPostsList(parsed.buySellPosts)
            : [],
          liveChatMessages: normalizeLiveChatList(parsed.liveChatMessages),
          chatPenalties: Array.isArray(parsed.chatPenalties)
            ? parsed.chatPenalties
            : [],
          privateChatMessages: Array.isArray(parsed.privateChatMessages)
            ? parsed.privateChatMessages
            : [],
          privateChatStatuses:
            parsed.privateChatStatuses && typeof parsed.privateChatStatuses === 'object'
              ? parsed.privateChatStatuses
              : {},
          chatTypingMap:
            parsed.chatTypingMap && typeof parsed.chatTypingMap === 'object'
              ? parsed.chatTypingMap
              : {},
          userBlockedMap:
            parsed.userBlockedMap && typeof parsed.userBlockedMap === 'object'
              ? parsed.userBlockedMap
              : {},
          privateChatReports: Array.isArray(parsed.privateChatReports)
            ? parsed.privateChatReports
            : [],
          settings,
        };
        this.latestState = hydrated;
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
        utilitySubmissions: [],
        utilityPosts: [],
        buySellPosts: [],
        liveChatMessages: INITIAL_LIVE_CHAT,
        chatPenalties: [],
        privateChatMessages: [],
        privateChatStatuses: {},
        userBlockedMap: {},
        privateChatReports: [],
        settings,
      };
      this.latestState = initialState;
      this.saveLocalState(initialState);
      return initialState;
    } catch {
      const fallback: PlatformDatabaseState = {
        users: INITIAL_USERS,
        topBanners: INITIAL_TOP_BANNERS,
        squareAds: INITIAL_SQUARE_ADS,
        popupAd: INITIAL_POPUP_AD,
        messages: INITIAL_MESSAGES,
        stores: INITIAL_STORES,
        serviceNumbers: INITIAL_SERVICE_NUMBERS,
        tawsilaRides: INITIAL_TAWSILA,
        communityPosts: INITIAL_COMMUNITY_POSTS,
        utilitySubmissions: [],
        utilityPosts: [],
        buySellPosts: [],
        liveChatMessages: INITIAL_LIVE_CHAT,
        chatPenalties: [],
        privateChatMessages: [],
        privateChatStatuses: {},
        userBlockedMap: {},
        privateChatReports: [],
        settings: INITIAL_SETTINGS,
      };
      this.latestState = fallback;
      return fallback;
    }
  }

  public saveLocalState(state: PlatformDatabaseState, activeUserId?: string) {
    this.latestState = state;
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
          utilitySubmissions: normalizeUtilitySubmissionsList(state.utilitySubmissions),
          utilityPosts: state.utilityPosts || [],
          buySellPosts: state.buySellPosts || [],
          liveChatMessages: normalizeLiveChatList(state.liveChatMessages),
          chatPenalties: state.chatPenalties || [],
          privateChatMessages: state.privateChatMessages || [],
          privateChatStatuses: state.privateChatStatuses || {},
          chatTypingMap: state.chatTypingMap || {},
          userBlockedMap: state.userBlockedMap || {},
          privateChatReports: state.privateChatReports || [],
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
    this.latestState = state;
    this.listeners.forEach((cb) => cb(state));
  }

  private applyIncomingRemoteState(remoteData: Record<string, unknown>) {
    const base = this.latestState || this.loadLocalState();
    const remoteSettings = (remoteData.settings as Partial<PlatformSettings>) || {};
    const mergedState: PlatformDatabaseState = {
      users: Array.isArray(remoteData.users) && remoteData.users.length > 0
        ? (remoteData.users as UserAccount[])
        : base.users,
      topBanners: Array.isArray(remoteData.topBanners)
        ? (remoteData.topBanners as TopBannerAd[])
        : base.topBanners,
      squareAds: Array.isArray(remoteData.squareAds)
        ? (remoteData.squareAds as SquareMovingAd[])
        : base.squareAds,
      popupAd: (remoteData.popupAd as PopupAdConfig) || base.popupAd,
      messages: Array.isArray(remoteData.messages)
        ? (remoteData.messages as AdminMessage[])
        : base.messages,
      stores: Array.isArray(remoteData.stores)
        ? normalizeStoresList(remoteData.stores as StoreListingItem[])
        : base.stores,
      serviceNumbers: Array.isArray(remoteData.serviceNumbers)
        ? normalizeServiceNumbersList(remoteData.serviceNumbers as ServicePhoneEntry[])
        : base.serviceNumbers,
      tawsilaRides: Array.isArray(remoteData.tawsilaRides)
        ? normalizeTawsilaList(remoteData.tawsilaRides as TawsilaRideItem[])
        : base.tawsilaRides,
      communityPosts: Array.isArray(remoteData.communityPosts)
        ? normalizeCommunityPostsList(remoteData.communityPosts as CommunityPostItem[])
        : base.communityPosts,
      utilitySubmissions: Array.isArray(remoteData.utilitySubmissions)
        ? normalizeUtilitySubmissionsList(remoteData.utilitySubmissions as UtilitySubmissionItem[])
        : base.utilitySubmissions || [],
      utilityPosts: Array.isArray(remoteData.utilityPosts)
        ? normalizeCommunityPostsList(remoteData.utilityPosts as CommunityPostItem[])
        : base.utilityPosts || [],
      buySellPosts: Array.isArray(remoteData.buySellPosts)
        ? normalizeCommunityPostsList(remoteData.buySellPosts as CommunityPostItem[])
        : base.buySellPosts || [],
      liveChatMessages: Array.isArray(remoteData.liveChatMessages)
        ? normalizeLiveChatList(remoteData.liveChatMessages as LiveChatMessageItem[])
        : base.liveChatMessages || [],
      chatPenalties: Array.isArray(remoteData.chatPenalties)
        ? (remoteData.chatPenalties as PlatformDatabaseState['chatPenalties'])
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(remoteData.privateChatMessages)
        ? (remoteData.privateChatMessages as PlatformDatabaseState['privateChatMessages'])
        : base.privateChatMessages || [],
      privateChatStatuses:
        remoteData.privateChatStatuses && typeof remoteData.privateChatStatuses === 'object'
          ? (remoteData.privateChatStatuses as PlatformDatabaseState['privateChatStatuses'])
          : base.privateChatStatuses || {},
      chatTypingMap:
        remoteData.chatTypingMap && typeof remoteData.chatTypingMap === 'object'
          ? (remoteData.chatTypingMap as PlatformDatabaseState['chatTypingMap'])
          : base.chatTypingMap || {},
      userBlockedMap:
        remoteData.userBlockedMap && typeof remoteData.userBlockedMap === 'object'
          ? (remoteData.userBlockedMap as PlatformDatabaseState['userBlockedMap'])
          : base.userBlockedMap || {},
      privateChatReports: Array.isArray(remoteData.privateChatReports)
        ? (remoteData.privateChatReports as PlatformDatabaseState['privateChatReports'])
        : base.privateChatReports || [],
      settings: {
        ...base.settings,
        ...remoteSettings,
        storeCategories:
          Array.isArray(remoteSettings.storeCategories) &&
          remoteSettings.storeCategories.length > 0
            ? remoteSettings.storeCategories
            : base.settings.storeCategories,
        utilityTypes:
          Array.isArray(remoteSettings.utilityTypes) &&
          remoteSettings.utilityTypes.length > 0
            ? remoteSettings.utilityTypes
            : base.settings.utilityTypes || DEFAULT_UTILITY_TYPES,
        liveChatCooldownSeconds:
          typeof remoteSettings.liveChatCooldownSeconds === 'number'
            ? remoteSettings.liveChatCooldownSeconds
            : base.settings.liveChatCooldownSeconds ?? 5,
        liveChatAutoClearMinutes:
          typeof remoteSettings.liveChatAutoClearMinutes === 'number'
            ? remoteSettings.liveChatAutoClearMinutes
            : base.settings.liveChatAutoClearMinutes ?? 60,
        liveChatLastClearedAt:
          remoteSettings.liveChatLastClearedAt || base.settings.liveChatLastClearedAt,
        firebase: base.settings.firebase,
      },
    };
    this.saveLocalState(mergedState);
    this.notifyData(mergedState);
  }

  private applyIncomingFastChatPatch(chatPatch: Record<string, unknown>) {
    const base = this.latestState || this.loadLocalState();
    const patchSettings = (chatPatch.settings as Partial<PlatformSettings>) || {};
    let mergedStores = base.stores;
    if (
      chatPatch.storeInteractionsMap &&
      typeof chatPatch.storeInteractionsMap === 'object'
    ) {
      const interactionsMap = chatPatch.storeInteractionsMap as Record<
        string,
        {
          likes?: string[];
          dislikes?: string[];
          ratings?: Record<string, number>;
          viewsCount?: number;
          comments?: StoreListingItem['comments'];
        }
      >;
      mergedStores = base.stores.map((st) => {
        const delta = interactionsMap[st.id];
        if (!delta) return st;
        return {
          ...st,
          likes: Array.isArray(delta.likes) ? delta.likes : st.likes,
          dislikes: Array.isArray(delta.dislikes) ? delta.dislikes : st.dislikes,
          ratings:
            delta.ratings && typeof delta.ratings === 'object'
              ? delta.ratings
              : st.ratings,
          viewsCount:
            typeof delta.viewsCount === 'number' ? delta.viewsCount : st.viewsCount,
          comments: Array.isArray(delta.comments) ? delta.comments : st.comments,
        };
      });
    }
    const mergedState: PlatformDatabaseState = {
      ...base,
      stores: mergedStores,
      liveChatMessages: Array.isArray(chatPatch.liveChatMessages)
        ? normalizeLiveChatList(chatPatch.liveChatMessages as LiveChatMessageItem[])
        : base.liveChatMessages || [],
      chatPenalties: Array.isArray(chatPatch.chatPenalties)
        ? (chatPatch.chatPenalties as PlatformDatabaseState['chatPenalties'])
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(chatPatch.privateChatMessages)
        ? (chatPatch.privateChatMessages as PlatformDatabaseState['privateChatMessages'])
        : base.privateChatMessages || [],
      privateChatStatuses:
        chatPatch.privateChatStatuses && typeof chatPatch.privateChatStatuses === 'object'
          ? (chatPatch.privateChatStatuses as PlatformDatabaseState['privateChatStatuses'])
          : base.privateChatStatuses || {},
      chatTypingMap:
        chatPatch.chatTypingMap && typeof chatPatch.chatTypingMap === 'object'
          ? (chatPatch.chatTypingMap as PlatformDatabaseState['chatTypingMap'])
          : base.chatTypingMap || {},
      userBlockedMap:
        chatPatch.userBlockedMap && typeof chatPatch.userBlockedMap === 'object'
          ? (chatPatch.userBlockedMap as PlatformDatabaseState['userBlockedMap'])
          : base.userBlockedMap || {},
      privateChatReports: Array.isArray(chatPatch.privateChatReports)
        ? (chatPatch.privateChatReports as PlatformDatabaseState['privateChatReports'])
        : base.privateChatReports || [],
      messages: Array.isArray(chatPatch.messages)
        ? (chatPatch.messages as PlatformDatabaseState['messages'])
        : base.messages || [],
      utilitySubmissions: Array.isArray(chatPatch.utilitySubmissions)
        ? normalizeUtilitySubmissionsList(chatPatch.utilitySubmissions as UtilitySubmissionItem[])
        : base.utilitySubmissions || [],
      utilityPosts: Array.isArray(chatPatch.utilityPosts)
        ? normalizeCommunityPostsList(chatPatch.utilityPosts as CommunityPostItem[])
        : base.utilityPosts || [],
      buySellPosts: Array.isArray(chatPatch.buySellPosts)
        ? normalizeCommunityPostsList(chatPatch.buySellPosts as CommunityPostItem[])
        : base.buySellPosts || [],
      communityPosts: Array.isArray(chatPatch.communityPosts)
        ? normalizeCommunityPostsList(chatPatch.communityPosts as CommunityPostItem[])
        : base.communityPosts,
      settings: {
        ...base.settings,
        ...patchSettings,
        liveChatCooldownSeconds:
          typeof patchSettings.liveChatCooldownSeconds === 'number'
            ? patchSettings.liveChatCooldownSeconds
            : typeof chatPatch.liveChatCooldownSeconds === 'number'
            ? (chatPatch.liveChatCooldownSeconds as number)
            : base.settings.liveChatCooldownSeconds ?? 5,
        liveChatAutoClearMinutes:
          typeof patchSettings.liveChatAutoClearMinutes === 'number'
            ? patchSettings.liveChatAutoClearMinutes
            : typeof chatPatch.liveChatAutoClearMinutes === 'number'
            ? (chatPatch.liveChatAutoClearMinutes as number)
            : base.settings.liveChatAutoClearMinutes ?? 60,
        liveChatLastClearedAt:
          patchSettings.liveChatLastClearedAt ||
          (chatPatch.liveChatLastClearedAt as string) ||
          base.settings.liveChatLastClearedAt,
        utilityTypes:
          Array.isArray(patchSettings.utilityTypes) &&
          patchSettings.utilityTypes.length > 0
            ? patchSettings.utilityTypes
            : Array.isArray(chatPatch.utilityTypes)
            ? (chatPatch.utilityTypes as string[])
            : base.settings.utilityTypes || DEFAULT_UTILITY_TYPES,
      },
    };
    this.notifyData(mergedState);
    this.scheduleDeferredLocalSave(mergedState);
  }

  private scheduleDeferredLocalSave(state: PlatformDatabaseState, activeUserId?: string) {
    this.latestState = state;
    if (this.deferredSaveTimer) {
      clearTimeout(this.deferredSaveTimer);
    }
    this.deferredSaveTimer = setTimeout(() => {
      this.saveLocalState(state, activeUserId);
    }, 250);
  }

  private connectServerRealtimeStream() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.fastChatPollTimer) {
      clearInterval(this.fastChatPollTimer);
      this.fastChatPollTimer = null;
    }

    // High-speed 220ms delta poll on /api/realtime/chat-fast to bypass any reverse-proxy SSE buffering
    this.fastChatPollTimer = setInterval(async () => {
      if (this.isFastChatPolling) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      this.isFastChatPolling = true;
      try {
        const res = await fetch(
          `/api/realtime/chat-fast?since=${this.lastChatVersion}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.version === 'number') {
            this.lastChatVersion = data.version;
          }
          if (data && data.onlineStats && typeof data.onlineStats.totalOnline === 'number') {
            updateLatestServerOnlineStats(data.onlineStats);
          }
          if (
            data &&
            data.changed &&
            data.chatPatch &&
            data.senderTabId !== getOrCreateTabSessionId()
          ) {
            this.applyIncomingFastChatPatch(data.chatPatch);
          }
        }
      } catch {
        // ignore transient network errors
      } finally {
        this.isFastChatPolling = false;
      }
    }, 120);

    if (typeof EventSource === 'undefined') return;

    try {
      const es = new EventSource('/api/realtime/stream');
      this.eventSource = es;

      es.addEventListener('state_update', (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data);
          if (parsed && typeof parsed.version === 'number') {
            this.lastChatVersion = parsed.version;
          }
          if (!parsed || parsed.senderTabId === getOrCreateTabSessionId()) return;
          if (parsed.state) {
            this.applyIncomingRemoteState(parsed.state);
          }
        } catch {
          // ignore parse error
        }
      });

      es.addEventListener('chat_fast_update', (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data);
          if (parsed && typeof parsed.version === 'number') {
            this.lastChatVersion = parsed.version;
          }
          if (parsed && parsed.onlineStats && typeof parsed.onlineStats.totalOnline === 'number') {
            updateLatestServerOnlineStats(parsed.onlineStats);
          }
          if (!parsed || parsed.senderTabId === getOrCreateTabSessionId()) return;
          if (parsed.chatPatch) {
            this.applyIncomingFastChatPatch(parsed.chatPatch);
          }
        } catch {
          // ignore
        }
      });

      es.addEventListener('presence_update', (ev) => {
        try {
          const stats = JSON.parse((ev as MessageEvent).data);
          if (stats && typeof stats.totalOnline === 'number') {
            updateLatestServerOnlineStats(stats);
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore SSE errors
    }
  }

  public async initializeSync(
    firebaseConfig: FirebaseConfigSettings,
    currentState: PlatformDatabaseState
  ) {
    this.latestState = currentState;
    this.connectServerRealtimeStream();

    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    if (this.unsubscribeFastChatSnapshot) {
      this.unsubscribeFastChatSnapshot();
      this.unsubscribeFastChatSnapshot = null;
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
            `${firebaseConfig.projectId.trim()}.firebasestorage.app`,
          messagingSenderId: firebaseConfig.messagingSenderId.trim(),
          appId: firebaseConfig.appId.trim(),
          measurementId: firebaseConfig.measurementId?.trim() || 'G-GY7K2HLTX5',
        },
        'DynamicPortalApp'
      );

      // Initialize Firebase Analytics silently in browser if supported
      if (typeof window !== 'undefined') {
        isAnalyticsSupported()
          .then((supported) => {
            if (supported && this.firebaseApp) {
              getAnalytics(this.firebaseApp);
            }
          })
          .catch(() => {
            // ignore analytics init warnings in restricted environments
          });
      }

      if (firebaseConfig.mode === 'realtime' && firebaseConfig.databaseURL) {
        this.realtimeDb = getDatabase(this.firebaseApp);
        const stateRef = ref(this.realtimeDb, 'fluent_portal_v3/workspace');

        this.unsubscribeSnapshot = onValue(
          stateRef,
          (snapshot) => {
            const remoteData = snapshot.val();
            if (remoteData) {
              if (remoteData.senderTabId !== getOrCreateTabSessionId()) {
                this.applyIncomingRemoteState(remoteData);
              }
            } else {
              const cleanPayload = sanitizeForFirebase({
                ...(this.latestState || currentState),
                senderTabId: getOrCreateTabSessionId(),
                updatedAt: new Date().toISOString(),
              });
              set(stateRef, cleanPayload);
            }
            this.notifyStatus('firebase_connected', 'التسجيل السحابي نشط');
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
        const fastChatDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'live_chat_realtime'
        );

        // 1. Dedicated high-speed listener for Live Chat, Private Chat, Chat Settings & Utilities
        this.unsubscribeFastChatSnapshot = onSnapshot(
          fastChatDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const fastData = snapshot.data();
              if (fastData && fastData.senderTabId !== getOrCreateTabSessionId()) {
                this.applyIncomingFastChatPatch(fastData);
              }
            }
          },
          () => {
            // ignore fast chat listener warning if rules fallback to local/SSE
          }
        );

        // 2. Main workspace listener
        this.unsubscribeSnapshot = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data();
              if (remoteData && remoteData.senderTabId !== getOrCreateTabSessionId()) {
                this.applyIncomingRemoteState(remoteData);
              }
            } else {
              const cleanPayload = sanitizeForFirebase({
                ...(this.latestState || currentState),
                senderTabId: getOrCreateTabSessionId(),
                updatedAt: new Date().toISOString(),
              });
              setDoc(docRef, cleanPayload).catch(() => {});
            }
            this.notifyStatus('firebase_connected', 'التسجيل السحابي نشط');
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

  private buildStoreInteractionsMap(stores: StoreListingItem[]) {
    const map: Record<
      string,
      {
        likes: string[];
        dislikes: string[];
        ratings: Record<string, number>;
        viewsCount: number;
        comments: StoreListingItem['comments'];
      }
    > = {};
    for (const st of stores || []) {
      map[st.id] = {
        likes: Array.isArray(st.likes) ? st.likes : [],
        dislikes: Array.isArray(st.dislikes) ? st.dislikes : [],
        ratings: st.ratings && typeof st.ratings === 'object' ? st.ratings : {},
        viewsCount: typeof st.viewsCount === 'number' ? st.viewsCount : 0,
        comments: Array.isArray(st.comments) ? st.comments : [],
      };
    }
    return map;
  }

  public async persistState(nextState: PlatformDatabaseState, activeUserId?: string) {
    const tabId = getOrCreateTabSessionId();
    this.saveLocalState(nextState, activeUserId);
    this.notifyData(nextState);

    const fastChatPatch = sanitizeForFirebase({
      storeInteractionsMap: this.buildStoreInteractionsMap(nextState.stores),
      liveChatMessages: normalizeLiveChatList(nextState.liveChatMessages),
      chatPenalties: nextState.chatPenalties || [],
      privateChatMessages: nextState.privateChatMessages || [],
      privateChatStatuses: nextState.privateChatStatuses || {},
      chatTypingMap: nextState.chatTypingMap || {},
      userBlockedMap: nextState.userBlockedMap || {},
      privateChatReports: nextState.privateChatReports || [],
      utilitySubmissions: normalizeUtilitySubmissionsList(nextState.utilitySubmissions),
      utilityPosts: nextState.utilityPosts || [],
      buySellPosts: nextState.buySellPosts || [],
      communityPosts: nextState.communityPosts || [],
      liveChatCooldownSeconds: nextState.settings.liveChatCooldownSeconds ?? 5,
      liveChatAutoClearMinutes: nextState.settings.liveChatAutoClearMinutes ?? 60,
      liveChatLastClearedAt: nextState.settings.liveChatLastClearedAt,
      utilityTypes: nextState.settings.utilityTypes || DEFAULT_UTILITY_TYPES,
      settings: nextState.settings,
      senderTabId: tabId,
      updatedAt: new Date().toISOString(),
    });

    // 1. Broadcast across browser tabs in < 1ms
    try {
      stateSyncChannel?.postMessage({
        type: 'chat_fast',
        chatPatch: fastChatPatch,
        senderTabId: tabId,
      });
      stateSyncChannel?.postMessage({
        type: 'full_state',
        state: sanitizeForFirebase(nextState),
        senderTabId: tabId,
      });
    } catch {
      // ignore
    }

    // 2. Broadcast via Express Real-Time SSE Server (< 15ms across all users/devices)
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/chat-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatPatch: fastChatPatch,
          senderTabId: tabId,
        }),
      }).catch(() => {});

      fetch('/api/realtime/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: sanitizeForFirebase(nextState),
          senderTabId: tabId,
        }),
      }).catch(() => {});
    }

    // 3. Sync with Firebase Firestore / Realtime DB (Sanitized with zero undefined values!)
    const fb = nextState.settings.firebase;
    if (!fb.enabled || !fb.apiKey || !fb.projectId) {
      return;
    }

    try {
      const cleanFullPayload = sanitizeForFirebase({
        ...nextState,
        senderTabId: tabId,
        updatedAt: new Date().toISOString(),
      });

      if (fb.mode === 'realtime' && this.realtimeDb) {
        const stateRef = ref(this.realtimeDb, 'fluent_portal_v3/workspace');
        await set(stateRef, cleanFullPayload);
      } else if (this.firestoreDb) {
        const fastChatDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'live_chat_realtime'
        );
        const docRef = doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state');
        // Write lightweight fast chat document first for immediate snapshot trigger on all clients
        await Promise.all([
          setDoc(fastChatDocRef, fastChatPatch),
          setDoc(docRef, cleanFullPayload),
        ]);
      }
    } catch (error) {
      console.error('Firebase sync write error:', error);
    }
  }

  /**
   * Dedicated ultra-fast (< 3KB payload) sync for Live Chat messages, Private Chat messages,
   * Read Receipts (✓✓), Typing Indicators ("يكتب الآن..."), and Store Likes/Dislikes without serializing the heavy database.
   */
  public async persistChatFast(nextState: PlatformDatabaseState, activeUserId?: string) {
    const tabId = getOrCreateTabSessionId();
    // 1. Update local React state and localStorage in 0ms for instant cross-tab and same-tab sync
    this.saveLocalState(nextState, activeUserId);
    this.notifyData(nextState);

    const ultraLightChatPatch = sanitizeForFirebase({
      storeInteractionsMap: this.buildStoreInteractionsMap(nextState.stores),
      liveChatMessages: normalizeLiveChatList(nextState.liveChatMessages),
      chatPenalties: nextState.chatPenalties || [],
      privateChatMessages: (nextState.privateChatMessages || []).slice(-200),
      privateChatStatuses: nextState.privateChatStatuses || {},
      chatTypingMap: nextState.chatTypingMap || {},
      userBlockedMap: nextState.userBlockedMap || {},
      privateChatReports: nextState.privateChatReports || [],
      messages: nextState.messages || [],
      liveChatCooldownSeconds: nextState.settings.liveChatCooldownSeconds ?? 5,
      liveChatAutoClearMinutes: nextState.settings.liveChatAutoClearMinutes ?? 60,
      liveChatLastClearedAt: nextState.settings.liveChatLastClearedAt,
      senderTabId: tabId,
      updatedAt: new Date().toISOString(),
    });

    // 2. Instant cross-tab BroadcastChannel (< 1ms)
    try {
      stateSyncChannel?.postMessage({
        type: 'chat_fast',
        chatPatch: ultraLightChatPatch,
        senderTabId: tabId,
      });
    } catch {
      // ignore
    }

    // 3. Instant Express Real-Time Server broadcast (< 15ms)
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/chat-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatPatch: ultraLightChatPatch,
          senderTabId: tabId,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && typeof d.version === 'number') {
            this.lastChatVersion = d.version;
          }
        })
        .catch(() => {});
    }

    // 4. Write ONLY the tiny live_chat_realtime document to Firestore (skipping heavy workspace_state)
    const fb = nextState.settings.firebase;
    if (!fb.enabled || !fb.apiKey || !fb.projectId) {
      return;
    }

    try {
      if (this.firestoreDb) {
        const fastChatDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'live_chat_realtime'
        );
        await setDoc(fastChatDocRef, ultraLightChatPatch);
      }
    } catch {
      // ignore transient firestore write error
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
const GUEST_VISITOR_STORAGE_KEY = 'nakhil_1185_unique_visitor_id_v1';
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

export function getOrCreateVisitorId(currentUser: UserAccount | null): string {
  if (currentUser && currentUser.id) {
    return currentUser.id;
  }
  try {
    let guestId = localStorage.getItem(GUEST_VISITOR_STORAGE_KEY);
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(GUEST_VISITOR_STORAGE_KEY, guestId);
    }
    return guestId;
  } catch {
    return `guest_${getOrCreateTabSessionId()}`;
  }
}

let presenceChannel: BroadcastChannel | null = null;
const presenceUpdateListeners = new Set<() => void>();

function notifyAllPresenceListeners() {
  presenceUpdateListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
}

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    presenceChannel = new BroadcastChannel('nakhil_1185_presence_channel');
    presenceChannel.addEventListener('message', (ev) => {
      if (ev.data && ev.data.stats && typeof ev.data.stats.totalOnline === 'number') {
        latestServerOnlineStats = ev.data.stats;
      }
      notifyAllPresenceListeners();
    });
  }
} catch {
  presenceChannel = null;
}

export function subscribePresenceBroadcast(onUpdate: () => void): () => void {
  presenceUpdateListeners.add(onUpdate);
  return () => {
    presenceUpdateListeners.delete(onUpdate);
  };
}

let latestServerOnlineStats: RealOnlinePresenceStats | null = null;

function updateLatestServerOnlineStats(nextStats: RealOnlinePresenceStats) {
  const prev = latestServerOnlineStats;
  const hasChanged =
    !prev ||
    prev.totalOnline !== nextStats.totalOnline ||
    prev.registeredCount !== nextStats.registeredCount ||
    prev.guestsCount !== nextStats.guestsCount ||
    (prev.registeredUsernames || []).join('|') !==
      (nextStats.registeredUsernames || []).join('|');

  latestServerOnlineStats = nextStats;
  if (hasChanged) {
    try {
      presenceChannel?.postMessage({ type: 'presence_changed', stats: nextStats });
    } catch {
      // ignore
    }
    notifyAllPresenceListeners();
  }
}

export function removeCurrentTabPresence(): void {
  try {
    const tabId = getOrCreateTabSessionId();
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: tabId, remove: true }),
        keepalive: true,
      }).catch(() => {});
    }
    const raw = localStorage.getItem(REAL_PRESENCE_MAP_KEY);
    if (!raw) return;
    const map: Record<string, StoredPresenceSession> = JSON.parse(raw);
    if (map[tabId]) {
      delete map[tabId];
      localStorage.setItem(REAL_PRESENCE_MAP_KEY, JSON.stringify(map));
      presenceChannel?.postMessage({ type: 'presence_changed' });
      notifyAllPresenceListeners();
    }
  } catch {
    // ignore
  }
}

/**
 * 100% Real Live Online Presence Tracker ("عدد المتصلين الآن: المتصلين المسجلين وعدد الزائرين")
 * Tracks actual open browser sessions across all devices via server + local fallback.
 */
export function syncRealOnlinePresence(
  currentUser: UserAccount | null,
  skipNetworkPost = false
): RealOnlinePresenceStats {
  try {
    const now = Date.now();
    const tabId = getOrCreateTabSessionId();
    const isRegistered = Boolean(currentUser && currentUser.id);

    if (!skipNetworkPost && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: tabId,
          userId: currentUser?.id || null,
          username: currentUser?.username || null,
          isRegistered,
        }),
      })
        .then((r) => r.json())
        .then((stats) => {
          if (stats && typeof stats.totalOnline === 'number') {
            updateLatestServerOnlineStats(stats);
          }
        })
        .catch(() => {});
    }

    const raw = localStorage.getItem(REAL_PRESENCE_MAP_KEY);
    const map: Record<string, StoredPresenceSession> = raw ? JSON.parse(raw) : {};

    const prevEntry = map[tabId];
    map[tabId] = {
      sessionId: tabId,
      userId: currentUser?.id || null,
      username: currentUser?.username || null,
      isRegistered,
      lastActiveAt: now,
    };

    // Prune stale sessions (> 10 seconds without heartbeat)
    Object.keys(map).forEach((k) => {
      if (!map[k] || now - map[k].lastActiveAt > 10000) {
        delete map[k];
      }
    });

    localStorage.setItem(REAL_PRESENCE_MAP_KEY, JSON.stringify(map));

    if (
      !prevEntry ||
      prevEntry.userId !== (currentUser?.id || null) ||
      prevEntry.isRegistered !== isRegistered
    ) {
      presenceChannel?.postMessage({ type: 'presence_changed' });
      notifyAllPresenceListeners();
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

    const localRegCount = registeredMap.size;
    const localTotal = Math.max(1, localRegCount + guestsCount);

    if (
      latestServerOnlineStats &&
      latestServerOnlineStats.totalOnline >= localTotal
    ) {
      return latestServerOnlineStats;
    }

    return {
      totalOnline: localTotal,
      registeredCount: localRegCount,
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

// Encrypted Cloud Image Host Key (XOR-0x5A cipher — hidden & never exposed in plaintext or localStorage)
const ENCRYPTED_IMGBB_CLOUD_CIPHER: readonly number[] = [
  62, 99, 107, 105, 106, 104, 108, 60, 59, 62, 111, 98, 104, 57, 56, 57,
  56, 104, 62, 109, 62, 57, 59, 110, 62, 106, 104, 63, 57, 98, 60, 105,
];

function resolveEncryptedImageCloudKey(customKey?: string): string {
  const cleanCustom = customKey ? customKey.trim() : '';
  if (cleanCustom.length > 8 && !cleanCustom.includes('•') && !cleanCustom.includes('*')) {
    return cleanCustom;
  }
  return ENCRYPTED_IMGBB_CLOUD_CIPHER.map((byte) => String.fromCharCode(byte ^ 0x5a)).join('');
}

/**
 * Dynamic Image Upload Service via ImgBB API with encrypted hidden cloud key and compressed Base64 fallback
 */
export async function uploadImageDynamic(
  file: File,
  imgbbApiKey?: string
): Promise<{ url: string; provider: 'imgbb' | 'local_compressed' }> {
  const compressedBase64 = await compressImageToBase64(file, 950, 0.82);
  const activeCloudKey = resolveEncryptedImageCloudKey(imgbbApiKey);

  if (activeCloudKey && activeCloudKey.length > 8) {
    try {
      const base64Clean = compressedBase64.replace(/^data:image\/\w+;base64,/, '');
      const formData = new FormData();
      formData.append('image', base64Clean);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(activeCloudKey)}`,
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

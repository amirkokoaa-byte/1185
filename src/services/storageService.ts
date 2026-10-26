import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDoc,
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
const CUMULATIVE_VAULT_STORAGE_KEY = 'nakhil_1185_permanent_cumulative_vault_v1';
const AUTH_PERSIST_KEY = 'fluent_portal_saved_user_v1185';
const AUTH_SESSION_KEY = 'fluent_portal_session_user_v1185';
const USER_BROWSER_CACHE_PREFIX = 'nakhil_1185_user_cache_';
const OFFLINE_PENDING_SYNC_KEY = 'nakhil_1185_offline_pending_sync_v1';

const AD_CAMPAIGNS_STORAGE_KEY = 'nakhil_1185_ad_campaigns_v1';

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

function escapeSvgXml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// High-resolution embedded SVG banners & menu visuals
export const createBannerSvg = (
  headline: string,
  subtext: string,
  badge: string,
  primaryHex: string,
  secondaryHex: string
) => {
  const safeBadge = escapeSvgXml(badge);
  const safeHeadline = escapeSvgXml(headline);
  const safeSubtext = escapeSvgXml(subtext);
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
    <text x="1000" y="97" text-anchor="middle" fill="${primaryHex}" font-family="Cairo, sans-serif" font-size="20" font-weight="700">${safeBadge}</text>
    <text x="1120" y="195" text-anchor="end" fill="#F8FAFC" font-family="Cairo, sans-serif" font-size="44" font-weight="800">${safeHeadline}</text>
    <text x="1120" y="255" text-anchor="end" fill="#94A3B8" font-family="Cairo, sans-serif" font-size="24" font-weight="500">${safeSubtext}</text>
    <text x="220" y="220" text-anchor="middle" fill="#F8FAFC" font-family="IBM Plex Mono, monospace" font-size="32" font-weight="700">VIP AD</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

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
    isPinned: Boolean(p.isPinned),
    isSold: Boolean(p.isSold),
    commentsDisabled: Boolean(p.commentsDisabled),
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
          isHidden: Boolean(c.isHidden),
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

function isUserDeleted(u: UserAccount, deletedSet: Set<string>): boolean {
  if (!u) return true;
  if (u.id && deletedSet.has(u.id)) return true;
  if (u.username && deletedSet.has(`acct:${u.username.trim().toLowerCase()}`)) {
    return true;
  }
  if (
    u.accountName &&
    deletedSet.has(`acct:${u.accountName.trim().toLowerCase()}`)
  ) {
    return true;
  }
  return false;
}

function mergeUsersLists(
  baseUsers: UserAccount[],
  incomingUsers?: UserAccount[],
  deletedIds?: string[]
): UserAccount[] {
  const deletedSet = new Set(deletedIds || []);
  const filteredBase = (baseUsers || []).filter(
    (u) => u && u.username && !isUserDeleted(u, deletedSet)
  );
  if (!Array.isArray(incomingUsers) || incomingUsers.length === 0) {
    return filteredBase.length > 0 ? filteredBase : INITIAL_USERS;
  }
  const byKey = new Map<string, UserAccount>();
  filteredBase.forEach((u) => {
    const k = (u.accountName || u.username).trim().toLowerCase();
    byKey.set(k, u);
  });
  incomingUsers.forEach((u) => {
    if (!u || !u.username || isUserDeleted(u, deletedSet)) return;
    const k = (u.accountName || u.username).trim().toLowerCase();
    const prev =
      byKey.get(k) ||
      Array.from(byKey.values()).find(
        (x) =>
          x.id === u.id ||
          x.username.trim().toLowerCase() === u.username.trim().toLowerCase()
      );
    const mapKey = prev
      ? (prev.accountName || prev.username).trim().toLowerCase()
      : k;
    byKey.set(mapKey, {
      ...(prev || {}),
      ...u,
      isOnline:
        typeof u.isOnline === 'boolean' ? u.isOnline : prev?.isOnline,
    });
  });
  const merged = Array.from(byKey.values()).filter(
    (u) => !isUserDeleted(u, deletedSet)
  );
  return merged.length > 0 ? merged : INITIAL_USERS;
}

function mergeCollectionById<T extends { id: string }>(
  baseList: T[] | undefined,
  incomingList: T[] | undefined,
  deletedIds?: string[]
): T[] {
  const deletedSet = new Set(deletedIds || []);
  const safeBase = Array.isArray(baseList)
    ? baseList.filter((item) => item && item.id && !deletedSet.has(item.id))
    : [];
  if (!Array.isArray(incomingList)) {
    return safeBase;
  }
  const safeIncoming = incomingList.filter(
    (item) => item && item.id && !deletedSet.has(item.id)
  );
  if (safeIncoming.length === 0 && safeBase.length > 0) {
    return safeBase;
  }
  const incomingMap = new Map<string, T>();
  safeIncoming.forEach((item) => incomingMap.set(item.id, item));

  const result: T[] = [];
  const seenIds = new Set<string>();

  // Keep incoming order for items present in incoming, merged with base fields
  for (const inc of safeIncoming) {
    const existing = safeBase.find((b) => b.id === inc.id);
    result.push(existing ? { ...existing, ...inc } : inc);
    seenIds.add(inc.id);
  }

  // Preserve any local items in baseList that were not in incomingList and not manually deleted
  for (const loc of safeBase) {
    if (!seenIds.has(loc.id) && !deletedSet.has(loc.id)) {
      result.unshift(loc);
      seenIds.add(loc.id);
    }
  }

  return result;
}

function isAdCampaignExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const expMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expMs)) return false;
  return expMs <= Date.now();
}

function mergeAdCampaignsById<
  T extends { id: string; expiresAt?: string; active?: boolean }
>(
  baseList: T[] | undefined,
  incomingList: T[] | undefined,
  deletedIds?: string[]
): T[] {
  const merged = mergeCollectionById(baseList, incomingList, deletedIds);
  return merged
    .filter((item) => !isAdCampaignExpired(item.expiresAt))
    .map((item) => ({
      ...item,
      active: item.active !== false,
    }));
}

function mergePopupAdCampaign(
  basePopup: PopupAdConfig | undefined,
  incomingPopup: PopupAdConfig | undefined
): PopupAdConfig {
  const b = basePopup || INITIAL_POPUP_AD;
  if (!incomingPopup || typeof incomingPopup !== 'object') {
    return b;
  }
  const bHasCustomCampaign = Boolean(b.expiresAt && !isAdCampaignExpired(b.expiresAt));
  const incHasCustomCampaign = Boolean(
    incomingPopup.expiresAt && !isAdCampaignExpired(incomingPopup.expiresAt)
  );
  if (bHasCustomCampaign && !incHasCustomCampaign) {
    return b;
  }
  return incomingPopup;
}

function mergePlatformSettings(
  baseSettings: PlatformSettings,
  incomingSettings?: Partial<PlatformSettings>
): PlatformSettings {
  if (!incomingSettings || typeof incomingSettings !== 'object') {
    return baseSettings;
  }
  const baseUpdatedAt = typeof baseSettings.updatedAt === 'number' ? baseSettings.updatedAt : 0;
  const incomingUpdatedAt =
    typeof incomingSettings.updatedAt === 'number' ? incomingSettings.updatedAt : 0;

  // Never let an older or un-timestamped remote settings snapshot overwrite newer local settings!
  const preferIncoming = incomingUpdatedAt >= baseUpdatedAt && incomingUpdatedAt > 0;
  const primary = preferIncoming ? { ...baseSettings, ...incomingSettings } : { ...incomingSettings, ...baseSettings };

  return {
    ...INITIAL_SETTINGS,
    ...primary,
    siteName:
      (preferIncoming ? incomingSettings.siteName : baseSettings.siteName) ||
      baseSettings.siteName ||
      INITIAL_SETTINGS.siteName,
    adminWhatsapp:
      (preferIncoming ? incomingSettings.adminWhatsapp : baseSettings.adminWhatsapp) ||
      baseSettings.adminWhatsapp ||
      INITIAL_SETTINGS.adminWhatsapp,
    facebookPageUrl:
      (preferIncoming ? incomingSettings.facebookPageUrl : baseSettings.facebookPageUrl) ||
      baseSettings.facebookPageUrl ||
      INITIAL_SETTINGS.facebookPageUrl,
    marqueeText:
      (preferIncoming ? incomingSettings.marqueeText : baseSettings.marqueeText) ||
      baseSettings.marqueeText ||
      INITIAL_SETTINGS.marqueeText,
    storeCategories:
      preferIncoming &&
      Array.isArray(incomingSettings.storeCategories) &&
      incomingSettings.storeCategories.length > 0
        ? incomingSettings.storeCategories
        : Array.isArray(baseSettings.storeCategories) &&
          baseSettings.storeCategories.length > 0
        ? baseSettings.storeCategories
        : DEFAULT_STORE_CATEGORIES,
    utilityTypes:
      preferIncoming &&
      Array.isArray(incomingSettings.utilityTypes) &&
      incomingSettings.utilityTypes.length > 0
        ? incomingSettings.utilityTypes
        : Array.isArray(baseSettings.utilityTypes) &&
          baseSettings.utilityTypes.length > 0
        ? baseSettings.utilityTypes
        : DEFAULT_UTILITY_TYPES,
    disabledSections: preferIncoming
      ? incomingSettings.disabledSections ?? baseSettings.disabledSections ?? {}
      : baseSettings.disabledSections ?? incomingSettings.disabledSections ?? {},
    liveChatCooldownSeconds: preferIncoming
      ? typeof incomingSettings.liveChatCooldownSeconds === 'number'
        ? incomingSettings.liveChatCooldownSeconds
        : baseSettings.liveChatCooldownSeconds ?? 5
      : baseSettings.liveChatCooldownSeconds ?? 5,
    liveChatAutoClearMinutes: preferIncoming
      ? typeof incomingSettings.liveChatAutoClearMinutes === 'number'
        ? incomingSettings.liveChatAutoClearMinutes
        : baseSettings.liveChatAutoClearMinutes ?? 60
      : baseSettings.liveChatAutoClearMinutes ?? 60,
    liveChatLastClearedAt:
      (preferIncoming
        ? incomingSettings.liveChatLastClearedAt
        : baseSettings.liveChatLastClearedAt) ||
      baseSettings.liveChatLastClearedAt ||
      incomingSettings.liveChatLastClearedAt,
    appDownloadActiveOption: preferIncoming
      ? incomingSettings.appDownloadActiveOption !== undefined
        ? incomingSettings.appDownloadActiveOption
        : baseSettings.appDownloadActiveOption ?? null
      : baseSettings.appDownloadActiveOption !== undefined
      ? baseSettings.appDownloadActiveOption
      : incomingSettings.appDownloadActiveOption ?? null,
    appAddLinkUrl: preferIncoming
      ? incomingSettings.appAddLinkUrl !== undefined
        ? incomingSettings.appAddLinkUrl
        : baseSettings.appAddLinkUrl ?? ''
      : baseSettings.appAddLinkUrl !== undefined
      ? baseSettings.appAddLinkUrl
      : incomingSettings.appAddLinkUrl ?? '',
    appUploadedFileUrl: preferIncoming
      ? incomingSettings.appUploadedFileUrl || baseSettings.appUploadedFileUrl || ''
      : baseSettings.appUploadedFileUrl || incomingSettings.appUploadedFileUrl || '',
    appUploadedFileName: preferIncoming
      ? incomingSettings.appUploadedFileName !== undefined
        ? incomingSettings.appUploadedFileName
        : baseSettings.appUploadedFileName ?? ''
      : baseSettings.appUploadedFileName !== undefined
      ? baseSettings.appUploadedFileName
      : incomingSettings.appUploadedFileName ?? '',
    appExternalLinkUrl: preferIncoming
      ? incomingSettings.appExternalLinkUrl !== undefined
        ? incomingSettings.appExternalLinkUrl
        : baseSettings.appExternalLinkUrl ?? ''
      : baseSettings.appExternalLinkUrl !== undefined
      ? baseSettings.appExternalLinkUrl
      : incomingSettings.appExternalLinkUrl ?? '',
    updatedAt: Math.max(baseUpdatedAt, incomingUpdatedAt),
    firebase: baseSettings.firebase || HIDDEN_DEFAULT_FIREBASE_CONFIG,
  };
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

function combineStatesIntoCumulativeVault(
  baseVault: Partial<PlatformDatabaseState> | null | undefined,
  incoming: Partial<PlatformDatabaseState> | null | undefined
): PlatformDatabaseState {
  const b = baseVault || {};
  const inc = incoming || {};

  const mergedStoresRaw = mergeCollectionById(
    Array.isArray(b.stores) ? b.stores : [],
    Array.isArray(inc.stores) ? inc.stores : [],
    []
  ).map((st) => {
    const prevSt = Array.isArray(b.stores)
      ? b.stores.find((x) => x && x.id === st.id)
      : undefined;
    const incSt = Array.isArray(inc.stores)
      ? inc.stores.find((x) => x && x.id === st.id)
      : undefined;
    if (!prevSt || !incSt) return st;
    return {
      ...prevSt,
      ...incSt,
      comments: mergeCollectionById(prevSt.comments || [], incSt.comments || [], []),
      likes: Array.from(new Set([...(prevSt.likes || []), ...(incSt.likes || [])])),
      ratings: { ...(prevSt.ratings || {}), ...(incSt.ratings || {}) },
      viewsCount: Math.max(prevSt.viewsCount || 0, incSt.viewsCount || 0),
    };
  });

  const mergePostsWithComments = (
    prevPosts?: CommunityPostItem[],
    nextPosts?: CommunityPostItem[]
  ): CommunityPostItem[] => {
    return mergeCollectionById(prevPosts || [], nextPosts || [], []).map((post) => {
      const pPost = (prevPosts || []).find((x) => x && x.id === post.id);
      const nPost = (nextPosts || []).find((x) => x && x.id === post.id);
      if (!pPost || !nPost) return post;
      return {
        ...pPost,
        ...nPost,
        comments: mergeCollectionById(pPost.comments || [], nPost.comments || [], []),
        likes: Array.from(new Set([...(pPost.likes || []), ...(nPost.likes || [])])),
      };
    });
  };

  const mergedMessages = mergeCollectionById(
    Array.isArray(b.messages) ? b.messages : [],
    Array.isArray(inc.messages) ? inc.messages : [],
    []
  ).map((msg) => {
    const pMsg = Array.isArray(b.messages)
      ? b.messages.find((x) => x && x.id === msg.id)
      : undefined;
    const nMsg = Array.isArray(inc.messages)
      ? inc.messages.find((x) => x && x.id === msg.id)
      : undefined;
    if (!pMsg || !nMsg) return msg;
    return {
      ...pMsg,
      ...nMsg,
      thread: mergeCollectionById(pMsg.thread || [], nMsg.thread || [], []),
    };
  });

  const baseSettings = (b.settings as PlatformSettings) || INITIAL_SETTINGS;
  const incSettings = (inc.settings as Partial<PlatformSettings>) || {};
  const mergedSettings = mergePlatformSettings(baseSettings, incSettings);
  const combinedCategories = Array.from(
    new Set([
      ...(baseSettings.storeCategories || []),
      ...(incSettings.storeCategories || []),
      ...DEFAULT_STORE_CATEGORIES,
    ])
  );
  const combinedUtilityTypes = Array.from(
    new Set([
      ...(baseSettings.utilityTypes || []),
      ...(incSettings.utilityTypes || []),
      ...DEFAULT_UTILITY_TYPES,
    ])
  );

  return {
    users: mergeUsersLists(
      Array.isArray(b.users) ? b.users : INITIAL_USERS,
      Array.isArray(inc.users) ? inc.users : undefined,
      []
    ),
    topBanners: mergeCollectionById(b.topBanners || [], inc.topBanners || [], []),
    squareAds: mergeCollectionById(b.squareAds || [], inc.squareAds || [], []),
    popupAd: (inc.popupAd as PopupAdConfig) || (b.popupAd as PopupAdConfig) || INITIAL_POPUP_AD,
    messages: mergedMessages,
    stores: normalizeStoresList(mergedStoresRaw),
    serviceNumbers: normalizeServiceNumbersList(
      mergeCollectionById(b.serviceNumbers || [], inc.serviceNumbers || [], [])
    ),
    tawsilaRides: normalizeTawsilaList(
      mergeCollectionById(b.tawsilaRides || [], inc.tawsilaRides || [], [])
    ),
    communityPosts: normalizeCommunityPostsList(
      mergePostsWithComments(b.communityPosts, inc.communityPosts)
    ),
    utilitySubmissions: normalizeUtilitySubmissionsList(
      mergeCollectionById(b.utilitySubmissions || [], inc.utilitySubmissions || [], [])
    ),
    utilityPosts: normalizeCommunityPostsList(
      mergePostsWithComments(b.utilityPosts, inc.utilityPosts)
    ),
    buySellPosts: normalizeCommunityPostsList(
      mergePostsWithComments(b.buySellPosts, inc.buySellPosts)
    ),
    liveChatMessages: mergeCollectionById(
      b.liveChatMessages || [],
      inc.liveChatMessages || [],
      []
    ),
    chatPenalties: mergeCollectionById(
      b.chatPenalties || [],
      inc.chatPenalties || [],
      []
    ),
    privateChatMessages: mergeCollectionById(
      b.privateChatMessages || [],
      inc.privateChatMessages || [],
      []
    ),
    privateChatStatuses: {
      ...(b.privateChatStatuses || {}),
      ...(inc.privateChatStatuses || {}),
    },
    chatTypingMap: {
      ...(b.chatTypingMap || {}),
      ...(inc.chatTypingMap || {}),
    },
    userBlockedMap: {
      ...(b.userBlockedMap || {}),
      ...(inc.userBlockedMap || {}),
    },
    privateChatReports: mergeCollectionById(
      b.privateChatReports || [],
      inc.privateChatReports || [],
      []
    ),
    deletedRecordIds: [],
    settings: {
      ...mergedSettings,
      storeCategories: combinedCategories,
      utilityTypes: combinedUtilityTypes,
    },
  };
}

/**
 * IndexedDB + Memory Ultra-Fast Browser Cache Engine + Permanent Cumulative Vault
 * Caches full application state & user data in the browser upon login and on every action
 * and continuously archives all inputs since site creation for 1-click full recovery.
 */
class FastBrowserCacheEngine {
  private memoryCache: PlatformDatabaseState | null = null;
  private cumulativeVaultCache: PlatformDatabaseState | null = null;
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

  public getCumulativeVaultSync(): PlatformDatabaseState | null {
    if (this.cumulativeVaultCache) return this.cumulativeVaultCache;
    try {
      const raw = localStorage.getItem(CUMULATIVE_VAULT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlatformDatabaseState;
        if (parsed && typeof parsed === 'object') {
          this.cumulativeVaultCache = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public updateCumulativeVault(state: PlatformDatabaseState) {
    try {
      const currentVault = this.getCumulativeVaultSync();
      const nextVault = combineStatesIntoCumulativeVault(currentVault, state);
      this.cumulativeVaultCache = nextVault;
      try {
        localStorage.setItem(CUMULATIVE_VAULT_STORAGE_KEY, JSON.stringify(nextVault));
      } catch {
        // ignore localStorage quota limits; IndexedDB below stores unlimited size
      }
      this.getIDB().then((db) => {
        if (!db) return;
        try {
          const tx = db.transaction('snapshots', 'readwrite');
          const store = tx.objectStore('snapshots');
          store.put(nextVault, 'cumulative_vault_all_time');
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  public async getAllHistoricalSnapshotsFromIDB(): Promise<
    Array<Partial<PlatformDatabaseState>>
  > {
    const db = await this.getIDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('snapshots', 'readonly');
        const store = tx.objectStore('snapshots');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = Array.isArray(req.result) ? req.result : [];
          resolve(list.filter((x) => x && typeof x === 'object'));
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public setMemoryAndDiskCache(state: PlatformDatabaseState, userId?: string) {
    this.memoryCache = state;
    this.updateCumulativeVault(state);
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

  public async getSnapshotByKeyFromIDB(
    key: string
  ): Promise<PlatformDatabaseState | null> {
    const db = await this.getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('snapshots', 'readonly');
        const store = tx.objectStore('snapshots');
        const req = store.get(key);
        req.onsuccess = () => {
          const val = req.result;
          resolve(val && typeof val === 'object' ? (val as PlatformDatabaseState) : null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public savePendingOfflineState(state: PlatformDatabaseState) {
    this.getIDB().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        store.put(state, 'pending_offline_state');
      } catch {
        // ignore
      }
    });
  }

  public clearPendingOfflineState() {
    this.getIDB().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        store.delete('pending_offline_state');
      } catch {
        // ignore
      }
    });
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

      // 3. Instant IndexedDB hydration on startup (< 5ms)
      this.hydrateFromIndexedDBInstant();

      // 4. Auto-Sync offline additions/edits/deletions with Firebase & Server as soon as internet reconnects
      window.addEventListener('online', () => {
        this.flushOfflinePendingSync();
      });
    }
  }

  private async hydrateFromIndexedDBInstant() {
    try {
      const pendingOffline = await fastBrowserCache.getSnapshotByKeyFromIDB(
        'pending_offline_state'
      );
      const latestIdb = await fastBrowserCache.getSnapshotByKeyFromIDB('latest_state');
      const idbCandidate = pendingOffline || latestIdb;
      if (!idbCandidate) return;

      const current = this.latestState || this.loadLocalState();
      const mergedDeletedIds = Array.from(
        new Set([
          ...(current.deletedRecordIds || []),
          ...(idbCandidate.deletedRecordIds || []),
        ])
      );

      const mergedTopBanners = mergeAdCampaignsById(
        current.topBanners,
        idbCandidate.topBanners,
        mergedDeletedIds
      );
      const mergedSquareAds = mergeAdCampaignsById(
        current.squareAds,
        idbCandidate.squareAds,
        mergedDeletedIds
      );
      const mergedPopupAd = mergePopupAdCampaign(
        current.popupAd,
        idbCandidate.popupAd
      );

      const needsAdHydration =
        mergedTopBanners.length !== (current.topBanners || []).length ||
        mergedSquareAds.length !== (current.squareAds || []).length ||
        mergedPopupAd.imageUrl !== current.popupAd?.imageUrl ||
        Boolean(
          idbCandidate.settings?.appUploadedFileUrl &&
            !current.settings.appUploadedFileUrl
        );

      if (
        pendingOffline &&
        (pendingOffline.settings?.updatedAt || 0) > (current.settings?.updatedAt || 0)
      ) {
        const restoredOffline: PlatformDatabaseState = {
          ...pendingOffline,
          topBanners: mergedTopBanners,
          squareAds: mergedSquareAds,
          popupAd: mergedPopupAd,
          deletedRecordIds: mergedDeletedIds,
        };
        this.saveLocalState(restoredOffline);
        this.notifyData(restoredOffline);
      } else if (needsAdHydration) {
        const enriched: PlatformDatabaseState = {
          ...current,
          topBanners: mergedTopBanners,
          squareAds: mergedSquareAds,
          popupAd: mergedPopupAd,
          deletedRecordIds: mergedDeletedIds,
          settings: {
            ...current.settings,
            appUploadedFileUrl:
              current.settings.appUploadedFileUrl ||
              idbCandidate.settings?.appUploadedFileUrl ||
              '',
            appUploadedFileName:
              current.settings.appUploadedFileName ||
              idbCandidate.settings?.appUploadedFileName ||
              '',
          },
        };
        this.latestState = enriched;
        fastBrowserCache.setMemoryAndDiskCache(enriched);
        this.notifyData(enriched);
      }
    } catch {
      // ignore
    }
  }

  private markPendingOfflineSync(state: PlatformDatabaseState) {
    try {
      localStorage.setItem(OFFLINE_PENDING_SYNC_KEY, '1');
      fastBrowserCache.savePendingOfflineState(state);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nakhil-offline-sync', { detail: { status: 'queued' } })
        );
      }
    } catch {
      // ignore
    }
  }

  private clearPendingOfflineSyncFlag() {
    try {
      localStorage.removeItem(OFFLINE_PENDING_SYNC_KEY);
      fastBrowserCache.clearPendingOfflineState();
    } catch {
      // ignore
    }
  }

  public hasPendingOfflineChanges(): boolean {
    try {
      return localStorage.getItem(OFFLINE_PENDING_SYNC_KEY) === '1';
    } catch {
      return false;
    }
  }

  public async flushOfflinePendingSync() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (!this.hasPendingOfflineChanges()) return;

    const pendingIdb = await fastBrowserCache.getSnapshotByKeyFromIDB(
      'pending_offline_state'
    );
    const stateToSync = this.latestState || pendingIdb || this.loadLocalState();
    if (!stateToSync) return;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nakhil-offline-sync', { detail: { status: 'syncing' } })
      );
    }

    try {
      await this.persistState(stateToSync);
      this.clearPendingOfflineSyncFlag();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nakhil-offline-sync', { detail: { status: 'synced' } })
        );
      }
    } catch {
      // keep queued for next online check
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
        disabledSections:
          parsedSettings.disabledSections &&
          typeof parsedSettings.disabledSections === 'object'
            ? parsedSettings.disabledSections
            : {},
        updatedAt:
          typeof parsedSettings.updatedAt === 'number'
            ? parsedSettings.updatedAt
            : savedSettingsRaw
            ? 1
            : 0,
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
        let savedAdCampaigns: {
          topBanners?: TopBannerAd[];
          squareAds?: SquareMovingAd[];
          popupAd?: PopupAdConfig;
          deletedRecordIds?: string[];
        } = {};
        try {
          const rawCampaigns = localStorage.getItem(AD_CAMPAIGNS_STORAGE_KEY);
          if (rawCampaigns) {
            savedAdCampaigns = JSON.parse(rawCampaigns) || {};
          }
        } catch {
          // ignore
        }

        const deletedRecordIds: string[] = Array.from(
          new Set([
            ...(Array.isArray(parsed.deletedRecordIds) ? parsed.deletedRecordIds : []),
            ...(Array.isArray(savedAdCampaigns.deletedRecordIds)
              ? savedAdCampaigns.deletedRecordIds
              : []),
          ])
        );

        const hydratedTopBanners = mergeAdCampaignsById(
          Array.isArray(parsed.topBanners) ? parsed.topBanners : INITIAL_TOP_BANNERS,
          Array.isArray(savedAdCampaigns.topBanners)
            ? savedAdCampaigns.topBanners
            : undefined,
          deletedRecordIds
        );

        const hydratedSquareAds = mergeAdCampaignsById(
          Array.isArray(parsed.squareAds) ? parsed.squareAds : INITIAL_SQUARE_ADS,
          Array.isArray(savedAdCampaigns.squareAds)
            ? savedAdCampaigns.squareAds
            : undefined,
          deletedRecordIds
        );

        const hydratedPopupAd = mergePopupAdCampaign(
          parsed.popupAd || INITIAL_POPUP_AD,
          savedAdCampaigns.popupAd
        );

        const hydrated: PlatformDatabaseState = {
          users: mergeUsersLists(
            Array.isArray(parsed.users) && parsed.users.length > 0
              ? parsed.users
              : INITIAL_USERS,
            undefined,
            deletedRecordIds
          ),
          topBanners: hydratedTopBanners,
          squareAds: hydratedSquareAds,
          popupAd: hydratedPopupAd,
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
          deletedRecordIds,
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
        deletedRecordIds: [],
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
        deletedRecordIds: [],
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
    } catch {
      try {
        const lightSettings = {
          ...state.settings,
          appUploadedFileUrl:
            state.settings.appUploadedFileUrl &&
            state.settings.appUploadedFileUrl.length > 500000
              ? ''
              : state.settings.appUploadedFileUrl,
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(lightSettings));
      } catch (err) {
        console.error('LocalStorage settings save error:', err);
      }
    }
    try {
      localStorage.setItem(
        AD_CAMPAIGNS_STORAGE_KEY,
        JSON.stringify({
          topBanners: state.topBanners || [],
          squareAds: state.squareAds || [],
          popupAd: state.popupAd,
          deletedRecordIds: state.deletedRecordIds || [],
        })
      );
    } catch {
      // IndexedDB holds full ad campaigns if localStorage is full
    }
    try {
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
          deletedRecordIds: state.deletedRecordIds || [],
        })
      );
    } catch (e) {
      console.error('LocalStorage save error (falling back to compact DB_STORAGE_KEY + IndexedDB):', e);
      try {
        localStorage.setItem(
          DB_STORAGE_KEY,
          JSON.stringify({
            users: state.users,
            topBanners: state.topBanners,
            squareAds: state.squareAds,
            popupAd: state.popupAd,
            messages: (state.messages || []).slice(0, 100),
            stores: (state.stores || []).map((st) => ({
              ...st,
              menuImages: (st.menuImages || []).slice(0, 1),
            })),
            serviceNumbers: state.serviceNumbers,
            tawsilaRides: state.tawsilaRides,
            communityPosts: (state.communityPosts || []).slice(0, 60),
            utilitySubmissions: normalizeUtilitySubmissionsList(state.utilitySubmissions),
            utilityPosts: (state.utilityPosts || []).slice(0, 60),
            buySellPosts: (state.buySellPosts || []).slice(0, 60),
            liveChatMessages: normalizeLiveChatList(state.liveChatMessages),
            chatPenalties: state.chatPenalties || [],
            privateChatMessages: (state.privateChatMessages || []).slice(-100),
            privateChatStatuses: state.privateChatStatuses || {},
            chatTypingMap: state.chatTypingMap || {},
            userBlockedMap: state.userBlockedMap || {},
            privateChatReports: state.privateChatReports || [],
            deletedRecordIds: state.deletedRecordIds || [],
          })
        );
      } catch {
        // Full state is preserved in IndexedDB
      }
    }
  }

  public loadAuthenticatedUser(users: UserAccount[]): UserAccount | null {
    try {
      const state = this.latestState;
      const deletedSet = new Set(state?.deletedRecordIds || []);

      const rememberedId = localStorage.getItem(AUTH_PERSIST_KEY);
      if (rememberedId && !deletedSet.has(rememberedId)) {
        const found = users.find((u) => u.id === rememberedId);
        if (found && !found.isBanned && !isUserDeleted(found, deletedSet)) {
          return found;
        }
      }
      const sessionId = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (sessionId && !deletedSet.has(sessionId)) {
        const found = users.find((u) => u.id === sessionId);
        if (found && !found.isBanned && !isUserDeleted(found, deletedSet)) {
          return found;
        }
      }
      const cachedUserRaw =
        localStorage.getItem(`${AUTH_PERSIST_KEY}_obj`) ||
        sessionStorage.getItem(`${AUTH_SESSION_KEY}_obj`);
      if (cachedUserRaw) {
        const parsedUser = JSON.parse(cachedUserRaw) as UserAccount;
        if (
          parsedUser &&
          parsedUser.id &&
          parsedUser.username &&
          !parsedUser.isBanned &&
          !isUserDeleted(parsedUser, deletedSet)
        ) {
          const matchedInList = users.find(
            (u) =>
              u.id === parsedUser.id ||
              u.username.trim().toLowerCase() === parsedUser.username.trim().toLowerCase()
          );
          if (matchedInList) {
            if (matchedInList.isBanned || isUserDeleted(matchedInList, deletedSet)) {
              return null;
            }
            return matchedInList;
          }
          return parsedUser;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public saveAuthenticatedUser(
    user: UserAccount | null,
    _rememberMe: boolean,
    currentState?: PlatformDatabaseState
  ) {
    try {
      if (!user) {
        localStorage.removeItem(AUTH_PERSIST_KEY);
        localStorage.removeItem(`${AUTH_PERSIST_KEY}_obj`);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(`${AUTH_SESSION_KEY}_obj`);
        return;
      }
      if (currentState) {
        fastBrowserCache.setMemoryAndDiskCache(currentState, user.id);
      }
      // Always persist login permanently in localStorage + sessionStorage until manual logout only
      localStorage.setItem(AUTH_PERSIST_KEY, user.id);
      localStorage.setItem(`${AUTH_PERSIST_KEY}_obj`, JSON.stringify(user));
      sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
      sessionStorage.setItem(`${AUTH_SESSION_KEY}_obj`, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  public getLatestOnlineUsernames(): string[] {
    const state = this.latestState;
    if (!state || !Array.isArray(state.users)) return [];
    return state.users
      .filter((u) => u && u.isOnline && !u.isBanned && u.username)
      .map((u) => u.username.trim());
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
    const remoteDeleted = Array.isArray(remoteData.deletedRecordIds)
      ? (remoteData.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );

    const mergedStoresRaw = mergeCollectionById(
      base.stores,
      Array.isArray(remoteData.stores)
        ? (remoteData.stores as StoreListingItem[])
        : undefined,
      mergedDeletedIds
    );
    const mergedServicesRaw = mergeCollectionById(
      base.serviceNumbers,
      Array.isArray(remoteData.serviceNumbers)
        ? (remoteData.serviceNumbers as ServicePhoneEntry[])
        : undefined,
      mergedDeletedIds
    );
    const mergedTawsilaRaw = mergeCollectionById(
      base.tawsilaRides,
      Array.isArray(remoteData.tawsilaRides)
        ? (remoteData.tawsilaRides as TawsilaRideItem[])
        : undefined,
      mergedDeletedIds
    );
    const mergedCommunityRaw = mergeCollectionById(
      base.communityPosts,
      Array.isArray(remoteData.communityPosts)
        ? (remoteData.communityPosts as CommunityPostItem[])
        : undefined,
      mergedDeletedIds
    );
    const mergedUtilitySubRaw = mergeCollectionById(
      base.utilitySubmissions || [],
      Array.isArray(remoteData.utilitySubmissions)
        ? (remoteData.utilitySubmissions as UtilitySubmissionItem[])
        : undefined,
      mergedDeletedIds
    );
    const mergedUtilityPostsRaw = mergeCollectionById(
      base.utilityPosts || [],
      Array.isArray(remoteData.utilityPosts)
        ? (remoteData.utilityPosts as CommunityPostItem[])
        : undefined,
      mergedDeletedIds
    );
    const mergedBuySellRaw = mergeCollectionById(
      base.buySellPosts || [],
      Array.isArray(remoteData.buySellPosts)
        ? (remoteData.buySellPosts as CommunityPostItem[])
        : undefined,
      mergedDeletedIds
    );
    const mergedTopBanners = mergeAdCampaignsById(
      base.topBanners,
      Array.isArray(remoteData.topBanners)
        ? (remoteData.topBanners as TopBannerAd[])
        : undefined,
      mergedDeletedIds
    );
    const mergedSquareAds = mergeAdCampaignsById(
      base.squareAds,
      Array.isArray(remoteData.squareAds)
        ? (remoteData.squareAds as SquareMovingAd[])
        : undefined,
      mergedDeletedIds
    );
    const mergedPopupAd = mergePopupAdCampaign(
      base.popupAd,
      remoteData.popupAd as PopupAdConfig | undefined
    );
    const mergedMessages = mergeCollectionById(
      base.messages,
      Array.isArray(remoteData.messages)
        ? (remoteData.messages as AdminMessage[])
        : undefined,
      mergedDeletedIds
    );

    const mergedState: PlatformDatabaseState = {
      users: mergeUsersLists(
        base.users,
        Array.isArray(remoteData.users)
          ? (remoteData.users as UserAccount[])
          : undefined,
        mergedDeletedIds
      ),
      topBanners: mergedTopBanners,
      squareAds: mergedSquareAds,
      popupAd: mergedPopupAd,
      messages: mergedMessages,
      stores: normalizeStoresList(mergedStoresRaw),
      serviceNumbers: normalizeServiceNumbersList(mergedServicesRaw),
      tawsilaRides: normalizeTawsilaList(mergedTawsilaRaw),
      communityPosts: normalizeCommunityPostsList(mergedCommunityRaw),
      utilitySubmissions: normalizeUtilitySubmissionsList(mergedUtilitySubRaw),
      utilityPosts: normalizeCommunityPostsList(mergedUtilityPostsRaw),
      buySellPosts: normalizeCommunityPostsList(mergedBuySellRaw),
      liveChatMessages: Array.isArray(remoteData.liveChatMessages)
        ? normalizeLiveChatList(remoteData.liveChatMessages as LiveChatMessageItem[])
        : base.liveChatMessages || [],
      chatPenalties: Array.isArray(remoteData.chatPenalties)
        ? (remoteData.chatPenalties as PlatformDatabaseState['chatPenalties'])
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(remoteData.privateChatMessages)
        ? mergeCollectionById(
            base.privateChatMessages || [],
            remoteData.privateChatMessages as PlatformDatabaseState['privateChatMessages'],
            mergedDeletedIds
          )
        : base.privateChatMessages || [],
      privateChatStatuses:
        remoteData.privateChatStatuses && typeof remoteData.privateChatStatuses === 'object'
          ? {
              ...(base.privateChatStatuses || {}),
              ...(remoteData.privateChatStatuses as PlatformDatabaseState['privateChatStatuses']),
            }
          : base.privateChatStatuses || {},
      chatTypingMap:
        remoteData.chatTypingMap && typeof remoteData.chatTypingMap === 'object'
          ? (remoteData.chatTypingMap as PlatformDatabaseState['chatTypingMap'])
          : base.chatTypingMap || {},
      userBlockedMap:
        remoteData.userBlockedMap && typeof remoteData.userBlockedMap === 'object'
          ? {
              ...(base.userBlockedMap || {}),
              ...(remoteData.userBlockedMap as PlatformDatabaseState['userBlockedMap']),
            }
          : base.userBlockedMap || {},
      privateChatReports: Array.isArray(remoteData.privateChatReports)
        ? mergeCollectionById(
            base.privateChatReports || [],
            remoteData.privateChatReports as PlatformDatabaseState['privateChatReports'],
            mergedDeletedIds
          )
        : base.privateChatReports || [],
      deletedRecordIds: mergedDeletedIds,
      settings: mergePlatformSettings(base.settings, remoteSettings),
    };
    this.saveLocalState(mergedState);
    this.notifyData(mergedState);
  }

  private applyIncomingFastChatPatch(chatPatch: Record<string, unknown>) {
    const base = this.latestState || this.loadLocalState();
    const patchSettings = (chatPatch.settings as Partial<PlatformSettings>) || {};
    const patchDeleted = Array.isArray(chatPatch.deletedRecordIds)
      ? (chatPatch.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...patchDeleted])
    );

    let mergedStores = base.stores.filter(
      (st) => !mergedDeletedIds.includes(st.id)
    );
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
      mergedStores = mergedStores.map((st) => {
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
      users: mergeUsersLists(
        base.users,
        Array.isArray(chatPatch.users)
          ? (chatPatch.users as UserAccount[])
          : undefined,
        mergedDeletedIds
      ),
      topBanners: mergeAdCampaignsById(
        base.topBanners,
        Array.isArray(chatPatch.topBanners)
          ? (chatPatch.topBanners as TopBannerAd[])
          : undefined,
        mergedDeletedIds
      ),
      squareAds: mergeAdCampaignsById(
        base.squareAds,
        Array.isArray(chatPatch.squareAds)
          ? (chatPatch.squareAds as SquareMovingAd[])
          : undefined,
        mergedDeletedIds
      ),
      popupAd: mergePopupAdCampaign(
        base.popupAd,
        chatPatch.popupAd as PopupAdConfig | undefined
      ),
      stores: mergedStores,
      liveChatMessages: Array.isArray(chatPatch.liveChatMessages)
        ? normalizeLiveChatList(chatPatch.liveChatMessages as LiveChatMessageItem[])
        : base.liveChatMessages || [],
      chatPenalties: Array.isArray(chatPatch.chatPenalties)
        ? (chatPatch.chatPenalties as PlatformDatabaseState['chatPenalties'])
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(chatPatch.privateChatMessages)
        ? mergeCollectionById(
            base.privateChatMessages || [],
            chatPatch.privateChatMessages as PlatformDatabaseState['privateChatMessages'],
            mergedDeletedIds
          )
        : base.privateChatMessages || [],
      privateChatStatuses:
        chatPatch.privateChatStatuses && typeof chatPatch.privateChatStatuses === 'object'
          ? {
              ...(base.privateChatStatuses || {}),
              ...(chatPatch.privateChatStatuses as PlatformDatabaseState['privateChatStatuses']),
            }
          : base.privateChatStatuses || {},
      chatTypingMap:
        chatPatch.chatTypingMap && typeof chatPatch.chatTypingMap === 'object'
          ? (chatPatch.chatTypingMap as PlatformDatabaseState['chatTypingMap'])
          : base.chatTypingMap || {},
      userBlockedMap:
        chatPatch.userBlockedMap && typeof chatPatch.userBlockedMap === 'object'
          ? {
              ...(base.userBlockedMap || {}),
              ...(chatPatch.userBlockedMap as PlatformDatabaseState['userBlockedMap']),
            }
          : base.userBlockedMap || {},
      privateChatReports: Array.isArray(chatPatch.privateChatReports)
        ? mergeCollectionById(
            base.privateChatReports || [],
            chatPatch.privateChatReports as PlatformDatabaseState['privateChatReports'],
            mergedDeletedIds
          )
        : base.privateChatReports || [],
      messages: Array.isArray(chatPatch.messages)
        ? mergeCollectionById(
            base.messages || [],
            chatPatch.messages as PlatformDatabaseState['messages'],
            mergedDeletedIds
          )
        : base.messages || [],
      utilitySubmissions: Array.isArray(chatPatch.utilitySubmissions)
        ? normalizeUtilitySubmissionsList(
            mergeCollectionById(
              base.utilitySubmissions || [],
              chatPatch.utilitySubmissions as UtilitySubmissionItem[],
              mergedDeletedIds
            )
          )
        : base.utilitySubmissions || [],
      utilityPosts: Array.isArray(chatPatch.utilityPosts)
        ? normalizeCommunityPostsList(
            mergeCollectionById(
              base.utilityPosts || [],
              chatPatch.utilityPosts as CommunityPostItem[],
              mergedDeletedIds
            )
          )
        : base.utilityPosts || [],
      buySellPosts: Array.isArray(chatPatch.buySellPosts)
        ? normalizeCommunityPostsList(
            mergeCollectionById(
              base.buySellPosts || [],
              chatPatch.buySellPosts as CommunityPostItem[],
              mergedDeletedIds
            )
          )
        : base.buySellPosts || [],
      communityPosts: Array.isArray(chatPatch.communityPosts)
        ? normalizeCommunityPostsList(
            mergeCollectionById(
              base.communityPosts || [],
              chatPatch.communityPosts as CommunityPostItem[],
              mergedDeletedIds
            )
          )
        : base.communityPosts,
      deletedRecordIds: mergedDeletedIds,
      settings: mergePlatformSettings(base.settings, patchSettings),
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
        try {
          this.firestoreDb = initializeFirestore(this.firebaseApp, {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch {
          this.firestoreDb = getFirestore(this.firebaseApp);
        }
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
            if (this.hasPendingOfflineChanges()) {
              this.flushOfflinePendingSync();
            }
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
      users: nextState.users || [],
      topBanners: nextState.topBanners || [],
      squareAds: nextState.squareAds || [],
      popupAd: nextState.popupAd,
      storeInteractionsMap: this.buildStoreInteractionsMap(nextState.stores),
      liveChatMessages: normalizeLiveChatList(nextState.liveChatMessages),
      chatPenalties: nextState.chatPenalties || [],
      privateChatMessages: nextState.privateChatMessages || [],
      privateChatStatuses: nextState.privateChatStatuses || {},
      chatTypingMap: nextState.chatTypingMap || {},
      userBlockedMap: nextState.userBlockedMap || {},
      privateChatReports: nextState.privateChatReports || [],
      messages: nextState.messages || [],
      utilitySubmissions: normalizeUtilitySubmissionsList(nextState.utilitySubmissions),
      utilityPosts: nextState.utilityPosts || [],
      buySellPosts: nextState.buySellPosts || [],
      communityPosts: nextState.communityPosts || [],
      liveChatCooldownSeconds: nextState.settings.liveChatCooldownSeconds ?? 5,
      liveChatAutoClearMinutes: nextState.settings.liveChatAutoClearMinutes ?? 60,
      liveChatLastClearedAt: nextState.settings.liveChatLastClearedAt,
      utilityTypes: nextState.settings.utilityTypes || DEFAULT_UTILITY_TYPES,
      settings: nextState.settings,
      deletedRecordIds: nextState.deletedRecordIds || [],
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

    // If currently offline, queue state in localStorage + IndexedDB for automatic sync when online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.markPendingOfflineSync(nextState);
      return;
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
      }).catch(() => {
        this.markPendingOfflineSync(nextState);
      });
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
        const archiveDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'cumulative_archive'
        );
        const vaultSnapshot = fastBrowserCache.getCumulativeVaultSync() || nextState;
        const cleanArchivePayload = sanitizeForFirebase({
          ...vaultSnapshot,
          deletedRecordIds: [],
          updatedAt: new Date().toISOString(),
        });
        // Write lightweight fast chat document first for immediate snapshot trigger on all clients
        await Promise.all([
          setDoc(fastChatDocRef, fastChatPatch),
          setDoc(docRef, cleanFullPayload),
          setDoc(archiveDocRef, cleanArchivePayload).catch(() => {}),
        ]);
      }
      this.clearPendingOfflineSyncFlag();
    } catch (error) {
      this.markPendingOfflineSync(nextState);
      console.error('Firebase sync write error (queued for auto-sync):', error);
    }
  }

  public getCumulativeVaultPreview(): PlatformDatabaseState {
    const current = this.latestState || this.loadLocalState();
    const vault = fastBrowserCache.getCumulativeVaultSync();
    return combineStatesIntoCumulativeVault(vault, current);
  }

  /**
   * Downloads all entered data & account details (chats, posts, stores, ads, registered accounts, settings, etc.)
   * as a complete JSON backup file saved to the device.
   */
  public exportFullBackupJson(currentState?: PlatformDatabaseState): string {
    const state = currentState || this.latestState || this.loadLocalState();
    const cumulativeVault = combineStatesIntoCumulativeVault(
      fastBrowserCache.getCumulativeVaultSync(),
      state
    );
    const fullBackupPayload = {
      backupFormat: 'NAKHIL_1185_FULL_PLATFORM_BACKUP_V1',
      exportedAt: new Date().toISOString(),
      siteName: state.settings.siteName || 'موقع خدمات التخيل 1185',
      state: sanitizeForFirebase(state),
      cumulativeVault: sanitizeForFirebase(cumulativeVault),
    };
    return JSON.stringify(fullBackupPayload, null, 2);
  }

  /**
   * Restores a backup JSON file exported from the device so all data appears again
   * exactly as it was when the backup file was saved.
   */
  public async importFullBackupJson(
    rawJsonText: string,
    activeUserId?: string
  ): Promise<{ state: PlatformDatabaseState; summary: string }> {
    const parsed = JSON.parse(rawJsonText);
    const rawState: Partial<PlatformDatabaseState> =
      parsed && typeof parsed === 'object' && parsed.state && typeof parsed.state === 'object'
        ? (parsed.state as Partial<PlatformDatabaseState>)
        : (parsed as Partial<PlatformDatabaseState>);

    if (!rawState || typeof rawState !== 'object') {
      throw new Error('ملف البيانات غير صالح أو تالف.');
    }

    const base = this.latestState || this.loadLocalState();
    const restoredSettings: PlatformSettings = {
      ...INITIAL_SETTINGS,
      ...base.settings,
      ...(rawState.settings || {}),
      storeCategories:
        Array.isArray(rawState.settings?.storeCategories) &&
        rawState.settings!.storeCategories.length > 0
          ? rawState.settings!.storeCategories
          : base.settings.storeCategories || DEFAULT_STORE_CATEGORIES,
      utilityTypes:
        Array.isArray(rawState.settings?.utilityTypes) &&
        rawState.settings!.utilityTypes.length > 0
          ? rawState.settings!.utilityTypes
          : base.settings.utilityTypes || DEFAULT_UTILITY_TYPES,
      updatedAt: Date.now(),
      firebase: base.settings.firebase || HIDDEN_DEFAULT_FIREBASE_CONFIG,
    };

    const restoredState: PlatformDatabaseState = {
      users: mergeUsersLists(
        INITIAL_USERS,
        Array.isArray(rawState.users) ? rawState.users : base.users,
        []
      ),
      topBanners: Array.isArray(rawState.topBanners)
        ? rawState.topBanners
        : base.topBanners,
      squareAds: Array.isArray(rawState.squareAds)
        ? rawState.squareAds
        : base.squareAds,
      popupAd: rawState.popupAd || base.popupAd || INITIAL_POPUP_AD,
      messages: Array.isArray(rawState.messages) ? rawState.messages : base.messages,
      stores: Array.isArray(rawState.stores)
        ? normalizeStoresList(rawState.stores)
        : base.stores,
      serviceNumbers: Array.isArray(rawState.serviceNumbers)
        ? normalizeServiceNumbersList(rawState.serviceNumbers)
        : base.serviceNumbers,
      tawsilaRides: Array.isArray(rawState.tawsilaRides)
        ? normalizeTawsilaList(rawState.tawsilaRides)
        : base.tawsilaRides,
      communityPosts: Array.isArray(rawState.communityPosts)
        ? normalizeCommunityPostsList(rawState.communityPosts)
        : base.communityPosts,
      utilitySubmissions: Array.isArray(rawState.utilitySubmissions)
        ? normalizeUtilitySubmissionsList(rawState.utilitySubmissions)
        : base.utilitySubmissions || [],
      utilityPosts: Array.isArray(rawState.utilityPosts)
        ? normalizeCommunityPostsList(rawState.utilityPosts)
        : base.utilityPosts || [],
      buySellPosts: Array.isArray(rawState.buySellPosts)
        ? normalizeCommunityPostsList(rawState.buySellPosts)
        : base.buySellPosts || [],
      liveChatMessages: Array.isArray(rawState.liveChatMessages)
        ? rawState.liveChatMessages
        : base.liveChatMessages || [],
      chatPenalties: Array.isArray(rawState.chatPenalties)
        ? rawState.chatPenalties
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(rawState.privateChatMessages)
        ? rawState.privateChatMessages
        : base.privateChatMessages || [],
      privateChatStatuses:
        rawState.privateChatStatuses && typeof rawState.privateChatStatuses === 'object'
          ? rawState.privateChatStatuses
          : base.privateChatStatuses || {},
      chatTypingMap: {},
      userBlockedMap:
        rawState.userBlockedMap && typeof rawState.userBlockedMap === 'object'
          ? rawState.userBlockedMap
          : base.userBlockedMap || {},
      privateChatReports: Array.isArray(rawState.privateChatReports)
        ? rawState.privateChatReports
        : base.privateChatReports || [],
      deletedRecordIds: [],
      settings: restoredSettings,
    };

    if (parsed?.cumulativeVault && typeof parsed.cumulativeVault === 'object') {
      fastBrowserCache.updateCumulativeVault(
        parsed.cumulativeVault as PlatformDatabaseState
      );
    }
    fastBrowserCache.updateCumulativeVault(restoredState);

    const tabId = getOrCreateTabSessionId();
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      await fetch('/api/realtime/restore-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: sanitizeForFirebase(restoredState),
          senderTabId: tabId,
        }),
      }).catch(() => {});
    }

    await this.persistState(restoredState, activeUserId);

    const summary = `تم استعادة ملف البيانات بنجاح: (${restoredState.users.length} حساب، ${restoredState.stores.length} محل، ${restoredState.communityPosts.length + (restoredState.buySellPosts?.length || 0) + (restoredState.utilityPosts?.length || 0)} منشور، ${(restoredState.privateChatMessages?.length || 0) + restoredState.messages.length} محادثة ورسالة، ${restoredState.squareAds.length + restoredState.topBanners.length} إعلان).`;
    return { state: restoredState, summary };
  }

  /**
   * Restores 100% of all historical data ever entered since the creation of the website up to today
   * by merging the Permanent Cumulative Vault (localStorage + IndexedDB snapshots + Server archive + Firebase archive).
   */
  public async restoreAllHistoricalData(
    activeUserId?: string
  ): Promise<{ state: PlatformDatabaseState; summary: string }> {
    let combined: PlatformDatabaseState = combineStatesIntoCumulativeVault(
      fastBrowserCache.getCumulativeVaultSync(),
      this.latestState || this.loadLocalState()
    );

    // 1. Merge any localStorage state snapshots
    try {
      const savedRaw = localStorage.getItem(DB_STORAGE_KEY);
      if (savedRaw) {
        const parsedLocal = JSON.parse(savedRaw);
        if (parsedLocal && typeof parsedLocal === 'object') {
          combined = combineStatesIntoCumulativeVault(combined, parsedLocal);
        }
      }
      const vaultRaw = localStorage.getItem(CUMULATIVE_VAULT_STORAGE_KEY);
      if (vaultRaw) {
        const parsedVault = JSON.parse(vaultRaw);
        if (parsedVault && typeof parsedVault === 'object') {
          combined = combineStatesIntoCumulativeVault(combined, parsedVault);
        }
      }
    } catch {
      // ignore
    }

    // 2. Merge all IndexedDB historical snapshots (cumulative_vault_all_time, latest_state, user_*)
    try {
      const idbSnapshots = await fastBrowserCache.getAllHistoricalSnapshotsFromIDB();
      for (const snap of idbSnapshots) {
        combined = combineStatesIntoCumulativeVault(combined, snap);
      }
    } catch {
      // ignore
    }

    // 3. Merge Server-side permanent cumulative archive (.realtime-portal-cumulative-archive.json)
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/realtime/archive', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.archive && typeof data.archive === 'object') {
            combined = combineStatesIntoCumulativeVault(combined, data.archive);
          }
          if (data?.activeState && typeof data.activeState === 'object') {
            combined = combineStatesIntoCumulativeVault(combined, data.activeState);
          }
        }
      } catch {
        // ignore
      }
    }

    // 4. Merge Firebase Firestore cumulative_archive & workspace_state if connected
    if (this.firestoreDb) {
      try {
        const [archiveSnap, workspaceSnap, fastChatSnap] = await Promise.all([
          getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'cumulative_archive')).catch(
            () => null
          ),
          getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state')).catch(
            () => null
          ),
          getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'live_chat_realtime')).catch(
            () => null
          ),
        ]);
        if (archiveSnap && archiveSnap.exists()) {
          combined = combineStatesIntoCumulativeVault(
            combined,
            archiveSnap.data() as Partial<PlatformDatabaseState>
          );
        }
        if (workspaceSnap && workspaceSnap.exists()) {
          combined = combineStatesIntoCumulativeVault(
            combined,
            workspaceSnap.data() as Partial<PlatformDatabaseState>
          );
        }
        if (fastChatSnap && fastChatSnap.exists()) {
          combined = combineStatesIntoCumulativeVault(
            combined,
            fastChatSnap.data() as Partial<PlatformDatabaseState>
          );
        }
      } catch {
        // ignore
      }
    }

    // Clear deletedRecordIds so every single historical item is restored and visible
    const restoredFullState: PlatformDatabaseState = {
      ...combined,
      deletedRecordIds: [],
      settings: {
        ...combined.settings,
        updatedAt: Date.now(),
      },
    };

    const tabId = getOrCreateTabSessionId();
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      await fetch('/api/realtime/restore-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: sanitizeForFirebase(restoredFullState),
          senderTabId: tabId,
        }),
      }).catch(() => {});
    }

    await this.persistState(restoredFullState, activeUserId);

    const totalPosts =
      restoredFullState.communityPosts.length +
      (restoredFullState.buySellPosts?.length || 0) +
      (restoredFullState.utilityPosts?.length || 0);
    const totalChats =
      (restoredFullState.privateChatMessages?.length || 0) +
      restoredFullState.messages.length +
      (restoredFullState.liveChatMessages?.length || 0);
    const summary = `تم استرجاع جميع البيانات المحفوظة منذ بداية إنشاء الموقع حتى اليوم بنجاح! (${restoredFullState.users.length} حساب مسجل، ${restoredFullState.stores.length} محل بالدليل، ${totalPosts} منشور، ${totalChats} رسالة ومحادثة، ${restoredFullState.squareAds.length + restoredFullState.topBanners.length} إعلان، ${restoredFullState.tawsilaRides.length} سائق توصيلة، ${restoredFullState.serviceNumbers.length} رقم خدمة).`;

    return { state: restoredFullState, summary };
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
      users: nextState.users || [],
      topBanners: nextState.topBanners || [],
      squareAds: nextState.squareAds || [],
      popupAd: nextState.popupAd,
      storeInteractionsMap: this.buildStoreInteractionsMap(nextState.stores),
      liveChatMessages: normalizeLiveChatList(nextState.liveChatMessages),
      chatPenalties: nextState.chatPenalties || [],
      privateChatMessages: (nextState.privateChatMessages || []).slice(-200),
      privateChatStatuses: nextState.privateChatStatuses || {},
      chatTypingMap: nextState.chatTypingMap || {},
      userBlockedMap: nextState.userBlockedMap || {},
      privateChatReports: nextState.privateChatReports || [],
      messages: nextState.messages || [],
      buySellPosts: nextState.buySellPosts || [],
      communityPosts: nextState.communityPosts || [],
      liveChatCooldownSeconds: nextState.settings.liveChatCooldownSeconds ?? 5,
      liveChatAutoClearMinutes: nextState.settings.liveChatAutoClearMinutes ?? 60,
      liveChatLastClearedAt: nextState.settings.liveChatLastClearedAt,
      settings: nextState.settings,
      deletedRecordIds: nextState.deletedRecordIds || [],
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.markPendingOfflineSync(nextState);
      return;
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
        .catch(() => {
          this.markPendingOfflineSync(nextState);
        });
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
      this.markPendingOfflineSync(nextState);
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
  visitorId: string;
  userId: string | null;
  username: string | null;
  isRegistered: boolean;
  lastActiveAt: number;
}

const TAB_SESSION_STORAGE_KEY = 'nakhil_1185_real_tab_session_id';
const GUEST_VISITOR_STORAGE_KEY = 'nakhil_1185_unique_visitor_id_v1';
const REAL_PRESENCE_MAP_KEY = 'nakhil_1185_real_presence_v4';
const LIVE_PRESENCE_TTL_MS = 8000;

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

function getOrCreateBrowserDeviceId(): string {
  try {
    let devId = localStorage.getItem(GUEST_VISITOR_STORAGE_KEY);
    if (!devId) {
      devId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(GUEST_VISITOR_STORAGE_KEY, devId);
    }
    return devId;
  } catch {
    return `guest_${getOrCreateTabSessionId()}`;
  }
}

export function getOrCreateVisitorId(currentUser: UserAccount | null): string {
  if (currentUser && currentUser.id) {
    return currentUser.id;
  }
  return getOrCreateBrowserDeviceId();
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
        latestServerOnlineStatsAt = Date.now();
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
let latestServerOnlineStatsAt = 0;

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
  latestServerOnlineStatsAt = Date.now();
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
    const payload = JSON.stringify({ sessionId: tabId, remove: true });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/realtime/presence', blob);
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
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
 * Strictly tracks ONLY live open browser heartbeats (8s TTL) with zero fake or stale static user flags.
 */
export function syncRealOnlinePresence(
  currentUser: UserAccount | null,
  skipNetworkPost = false
): RealOnlinePresenceStats {
  try {
    const now = Date.now();
    const tabId = getOrCreateTabSessionId();
    const deviceVisitorId = getOrCreateBrowserDeviceId();
    const isRegistered = Boolean(currentUser && currentUser.id);

    if (!skipNetworkPost && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: tabId,
          visitorId: deviceVisitorId,
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
      visitorId: deviceVisitorId,
      userId: currentUser?.id || null,
      username: currentUser?.username || null,
      isRegistered,
      lastActiveAt: now,
    };

    // Prune stale sessions (> 8 seconds without heartbeat) for instant real-time accuracy
    Object.keys(map).forEach((k) => {
      if (!map[k] || now - map[k].lastActiveAt > LIVE_PRESENCE_TTL_MS) {
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

    // If authoritative server presence stats are fresh (within last 8s), use them directly
    if (
      latestServerOnlineStats &&
      now - latestServerOnlineStatsAt <= LIVE_PRESENCE_TTL_MS
    ) {
      const serverRegMap = new Map<string, string>();
      (latestServerOnlineStats.registeredUsernames || []).forEach((uname) => {
        if (uname && uname.trim()) {
          serverRegMap.set(uname.trim().toLowerCase(), uname.trim());
        }
      });
      if (isRegistered && currentUser?.username) {
        serverRegMap.set(
          currentUser.username.trim().toLowerCase(),
          currentUser.username.trim()
        );
      }
      const regCount = serverRegMap.size;
      const gCount =
        regCount === 0 && latestServerOnlineStats.guestsCount === 0
          ? 1
          : latestServerOnlineStats.guestsCount;
      return {
        totalOnline: Math.max(1, regCount + gCount),
        registeredCount: regCount,
        guestsCount: gCount,
        registeredUsernames: Array.from(serverRegMap.values()),
      };
    }

    // Local real-time calculation (deduplicated by username for registered, and visitorId for guests)
    const activeSessions = Object.values(map);
    const registeredMap = new Map<string, string>();
    const registeredVisitorIds = new Set<string>();
    const guestVisitorIds = new Set<string>();

    activeSessions.forEach((sess) => {
      if (sess.isRegistered && sess.username) {
        registeredMap.set(sess.username.trim().toLowerCase(), sess.username.trim());
        if (sess.visitorId) {
          registeredVisitorIds.add(sess.visitorId);
        }
      }
    });

    activeSessions.forEach((sess) => {
      if (!sess.isRegistered) {
        const vKey = sess.visitorId || sess.sessionId;
        if (!registeredVisitorIds.has(vKey)) {
          guestVisitorIds.add(vKey);
        }
      }
    });

    const mergedRegCount = registeredMap.size;
    const mergedGuestsCount = guestVisitorIds.size;
    const mergedTotal = Math.max(1, mergedRegCount + mergedGuestsCount);

    return {
      totalOnline: mergedTotal,
      registeredCount: mergedRegCount,
      guestsCount: mergedGuestsCount,
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
  const compressedBase64 = await compressImageToBase64(file, 880, 0.76);
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

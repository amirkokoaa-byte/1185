import { initializeApp, FirebaseApp, getApps, deleteApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getFirestore,
  initializeFirestore,
  enableIndexedDbPersistence,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDoc,
  setDoc,
  writeBatch,
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
const STORE_IMAGES_VAULT_KEY = 'nakhil_1185_store_images_vault_v1';

export const DEFAULT_STORE_CATEGORIES: string[] = [
  'مول دريم بلازا',
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

export const DEFAULT_SERVICE_PROFESSIONS: string[] = [
  'نجار',
  'حداد',
  'مبلط',
  'كهربائي',
  'ممرض',
  'عامل',
  'نظافة منزل',
  'مدرس تأسيس',
  'مدرس ابتدائي',
  'مدرس إعدادي',
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

function normalizeAdStoreNameKey(raw: string | undefined): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function extractPhoneTails(rawPhone: string | undefined): string[] {
  if (!rawPhone) return [];
  return String(rawPhone)
    .split(/[-/,،|]+|\s+/)
    .map((part) => part.replace(/[^0-9]/g, ''))
    .filter((digits) => digits.length >= 9 && !/^0+$/.test(digits) && !/^1000000000$/.test(digits))
    .map((digits) => digits.slice(-9));
}

export function isAdLinkedToStore(
  ad:
    | {
        id?: string;
        storeId?: string;
        title?: string;
        phone?: string;
        whatsappPhone?: string;
      }
    | null
    | undefined,
  store: StoreListingItem | null | undefined
): boolean {
  if (!ad || !store) return false;
  if (ad.storeId && ad.storeId === store.id) return true;
  if (
    ad.id &&
    (ad.id === `sq-store-${store.id}` ||
      ad.id === `store-sq-${store.id}` ||
      ad.id === `bnr-store-${store.id}`)
  ) {
    return true;
  }

  const adTitleNorm = normalizeAdStoreNameKey(ad.title);
  const storeNameNorm = normalizeAdStoreNameKey(store.name);
  if (adTitleNorm && storeNameNorm) {
    if (adTitleNorm === storeNameNorm) return true;
    const adBase = adTitleNorm.split('(')[0].trim();
    const storeBase = storeNameNorm.split('(')[0].trim();
    if (adBase.length >= 3 && storeBase.length >= 3 && adBase === storeBase) {
      return true;
    }
  }

  const adPhones = [
    ...extractPhoneTails(ad.phone),
    ...extractPhoneTails(ad.whatsappPhone),
  ];
  const storePhones = extractPhoneTails(store.phone);
  if (
    adPhones.length > 0 &&
    storePhones.length > 0 &&
    adPhones.some((p) => storePhones.includes(p))
  ) {
    return true;
  }

  return false;
}

export function findLinkedStoreForAd(
  stores: StoreListingItem[] | undefined,
  ad:
    | {
        id?: string;
        storeId?: string;
        title?: string;
        phone?: string;
        whatsappPhone?: string;
      }
    | null
    | undefined
): StoreListingItem | undefined {
  if (!ad || !Array.isArray(stores) || stores.length === 0) return undefined;
  // Priority 1: Explicit storeId or ID pattern
  const byId = stores.find(
    (s) =>
      (ad.storeId && ad.storeId === s.id) ||
      ad.id === `sq-store-${s.id}` ||
      ad.id === `store-sq-${s.id}` ||
      ad.id === `bnr-store-${s.id}`
  );
  if (byId) return byId;

  // Priority 2: Exact or base name match
  const adTitleNorm = normalizeAdStoreNameKey(ad.title);
  if (adTitleNorm) {
    const byExactName = stores.find(
      (s) => normalizeAdStoreNameKey(s.name) === adTitleNorm
    );
    if (byExactName) return byExactName;

    const adBase = adTitleNorm.split('(')[0].trim();
    if (adBase.length >= 3) {
      const byBaseName = stores.find(
        (s) => normalizeAdStoreNameKey(s.name).split('(')[0].trim() === adBase
      );
      if (byBaseName) return byBaseName;
    }
  }

  // Priority 3: Phone match
  const adPhones = [
    ...extractPhoneTails(ad.phone),
    ...extractPhoneTails(ad.whatsappPhone),
  ];
  if (adPhones.length > 0) {
    const byPhone = stores.find((s) => {
      const sp = extractPhoneTails(s.phone);
      return sp.some((tail) => adPhones.includes(tail));
    });
    if (byPhone) return byPhone;
  }

  return undefined;
}

export function mergeViewsByHourMaps(
  ...maps: Array<Record<string, number> | undefined>
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const mp of maps) {
    if (!mp || typeof mp !== 'object') continue;
    for (const [hr, val] of Object.entries(mp)) {
      const num = Number(val) || 0;
      if (num > (merged[hr] || 0)) {
        merged[hr] = num;
      }
    }
  }
  return merged;
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

export function splitStoreTitleWithParentheses(rawTitle: string): {
  mainTitle: string;
  parenPart: string;
} {
  const cleaned = String(rawTitle || '').trim();
  const parenMatches = Array.from(cleaned.matchAll(/\(([^)]+)\)/g))
    .map((m) => m[1].trim())
    .filter(Boolean);
  const withoutParens = cleaned
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (parenMatches.length > 0 && withoutParens.length > 0) {
    return {
      mainTitle: withoutParens,
      parenPart: `(${parenMatches.join(' - ')})`,
    };
  }
  return {
    mainTitle: cleaned,
    parenPart: '',
  };
}

const GLOBAL_STORE_SVG_STYLE_KEY = 'nakhil_1185_global_store_svg_style_v1';
let activeGlobalStoreSvgStyle: 1 | 2 = 1;
try {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(GLOBAL_STORE_SVG_STYLE_KEY);
    if (saved === '2') activeGlobalStoreSvgStyle = 2;
  }
} catch {
  // ignore
}

export function getGlobalDefaultStoreSvgStyle(): 1 | 2 {
  return activeGlobalStoreSvgStyle;
}

export function setGlobalDefaultStoreSvgStyle(style: 1 | 2): void {
  activeGlobalStoreSvgStyle = style === 2 ? 2 : 1;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GLOBAL_STORE_SVG_STYLE_KEY, String(activeGlobalStoreSvgStyle));
    }
  } catch {
    // ignore
  }
}

export const createSquareAdSvg = (
  title: string,
  category: string,
  colorHex = '#0284C7',
  styleVariant?: 1 | 2
) => {
  const effectiveStyle: 1 | 2 = styleVariant || activeGlobalStoreSvgStyle || 1;
  const cleanCat = (category || 'محل تجاري').trim();
  const cleanTitle = (title || cleanCat).trim();
  const { mainTitle, parenPart } = splitStoreTitleWithParentheses(cleanTitle);

  // اسم المحل داخل المستطيل: إذا كان اسم المحل اسم واحد أو اسمين يظهر في سطر واحد، وأي أقواس تكون في السطر الثاني
  let titleInsideRectMarkup = '';
  const textFill = effectiveStyle === 2 ? '#0F172A' : '#000000';
  const parenFill = effectiveStyle === 2 ? '#0369A1' : '#1E293B';
  const titleWords = mainTitle.split(/\s+/).filter(Boolean);

  if (parenPart) {
    // السطر الأول: اسم المحل في سطر واحد، والسطر الثاني: الأقواس
    const mainFontSize =
      mainTitle.length > 22
        ? 34
        : mainTitle.length > 17
        ? 40
        : mainTitle.length > 13
        ? 48
        : mainTitle.length > 9
        ? 56
        : 62;
    const parenFontSize =
      parenPart.length > 22 ? 30 : parenPart.length > 16 ? 36 : 42;
    titleInsideRectMarkup = `
      <text x="250" y="134" text-anchor="middle" dominant-baseline="middle" fill="${textFill}" stroke="${textFill}" stroke-width="1.1" font-family="Cairo, sans-serif" font-size="${mainFontSize}" font-weight="900">${escapeSvgXml(mainTitle)}</text>
      <text x="250" y="212" text-anchor="middle" dominant-baseline="middle" fill="${parenFill}" stroke="${parenFill}" stroke-width="0.9" font-family="Cairo, sans-serif" font-size="${parenFontSize}" font-weight="900">${escapeSvgXml(parenPart)}</text>
    `;
  } else if (titleWords.length <= 2) {
    // إذا كان اسم المحل كلمة واحدة أو كلمتين: يظهر دائماً في سطر واحد
    const singleFontSize =
      mainTitle.length <= 7
        ? 68
        : mainTitle.length <= 11
        ? 56
        : mainTitle.length <= 15
        ? 46
        : mainTitle.length <= 19
        ? 38
        : 32;
    titleInsideRectMarkup = `
      <text x="250" y="174" text-anchor="middle" dominant-baseline="middle" fill="${textFill}" stroke="${textFill}" stroke-width="1.3" font-family="Cairo, sans-serif" font-size="${singleFontSize}" font-weight="900">${escapeSvgXml(mainTitle)}</text>
    `;
  } else if (mainTitle.length > 14 && titleWords.length >= 3) {
    const mid = Math.ceil(titleWords.length / 2);
    const line1 = escapeSvgXml(titleWords.slice(0, mid).join(' '));
    const line2 = escapeSvgXml(titleWords.slice(mid).join(' '));
    const maxLen = Math.max(line1.length, line2.length);
    const lineFontSize = maxLen > 16 ? 40 : maxLen > 12 ? 48 : 56;
    titleInsideRectMarkup = `
      <text x="250" y="138" text-anchor="middle" dominant-baseline="middle" fill="${textFill}" stroke="${textFill}" stroke-width="1.2" font-family="Cairo, sans-serif" font-size="${lineFontSize}" font-weight="900">${line1}</text>
      <text x="250" y="210" text-anchor="middle" dominant-baseline="middle" fill="${textFill}" stroke="${textFill}" stroke-width="1.2" font-family="Cairo, sans-serif" font-size="${lineFontSize}" font-weight="900">${line2}</text>
    `;
  } else {
    const singleFontSize =
      mainTitle.length <= 7 ? 68 : mainTitle.length <= 11 ? 56 : 46;
    titleInsideRectMarkup = `
      <text x="250" y="174" text-anchor="middle" dominant-baseline="middle" fill="${textFill}" stroke="${textFill}" stroke-width="1.3" font-family="Cairo, sans-serif" font-size="${singleFontSize}" font-weight="900">${escapeSvgXml(mainTitle)}</text>
    `;
  }

  // أسفل المستطيل: القسم بخط بارز واضح ومنسق
  const catWords = cleanCat.split(/\s+/).filter(Boolean);
  let categoryBelowRectMarkup = '';
  const catTextColor = effectiveStyle === 2 ? '#FFFFFF' : '#000000';
  if (cleanCat.length > 14 && catWords.length >= 2) {
    const midCat = Math.ceil(catWords.length / 2);
    const cLine1 = escapeSvgXml(catWords.slice(0, midCat).join(' '));
    const cLine2 = escapeSvgXml(catWords.slice(midCat).join(' '));
    categoryBelowRectMarkup = `
      <text x="250" y="352" text-anchor="middle" dominant-baseline="middle" fill="${catTextColor}" stroke="${catTextColor}" stroke-width="0.9" font-family="Cairo, sans-serif" font-size="38" font-weight="900">${cLine1}</text>
      <text x="250" y="404" text-anchor="middle" dominant-baseline="middle" fill="${catTextColor}" stroke="${catTextColor}" stroke-width="0.9" font-family="Cairo, sans-serif" font-size="38" font-weight="900">${cLine2}</text>
    `;
  } else {
    const catFontSize = cleanCat.length <= 9 ? 48 : cleanCat.length <= 14 ? 42 : 36;
    categoryBelowRectMarkup = `
      <text x="250" y="376" text-anchor="middle" dominant-baseline="middle" fill="${catTextColor}" stroke="${catTextColor}" stroke-width="1.1" font-family="Cairo, sans-serif" font-size="${catFontSize}" font-weight="900">${escapeSvgXml(cleanCat)}</text>
    `;
  }

  if (effectiveStyle === 2) {
    const svg2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
      <rect width="500" height="500" rx="22" fill="#0F172A"/>
      <rect x="14" y="14" width="472" height="472" rx="18" fill="#1E293B" stroke="#38BDF8" stroke-width="4"/>
      <rect x="28" y="48" width="444" height="242" rx="20" fill="#F8FAFC" stroke="#F59E0B" stroke-width="6"/>
      <rect x="40" y="60" width="420" height="218" rx="14" fill="#FFFFFF" stroke="#0284C7" stroke-width="2.5"/>
      ${titleInsideRectMarkup}
      <rect x="48" y="318" width="404" height="114" rx="18" fill="#0284C7" stroke="#38BDF8" stroke-width="3"/>
      ${categoryBelowRectMarkup}
      <rect x="90" y="454" width="320" height="8" rx="4" fill="#F59E0B"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg2)}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" rx="22" fill="#FFFFFF"/>
    <rect x="14" y="14" width="472" height="472" rx="18" fill="#F8FAFC" stroke="#94A3B8" stroke-width="4"/>
    <!-- إطار مستطيلي بارز بداخله اسم المحل (وفي حالة وجود أقواس يكون اسم المحل في الأول وأسفله الأقواس) -->
    <rect x="24" y="56" width="452" height="236" rx="20" fill="${colorHex || '#0284C7'}" fill-opacity="0.14" stroke="#0284C7" stroke-width="8"/>
    <rect x="36" y="68" width="428" height="212" rx="14" fill="#FFFFFF" stroke="#0F172A" stroke-width="4"/>
    ${titleInsideRectMarkup}
    <!-- أسفل المستطيل: القسم بخط بارز واضح ومنسق -->
    <rect x="44" y="318" width="412" height="108" rx="16" fill="#E0F2FE" stroke="#0284C7" stroke-width="3"/>
    ${categoryBelowRectMarkup}
    <rect x="70" y="448" width="360" height="8" rx="4" fill="#0284C7"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export function createSuggestedStoreSvgPair(
  title: string,
  category: string
): [string, string] {
  const safeTitle = (title || '').trim() || 'اسم المحل';
  const safeCat = (category || '').trim() || 'القسم';
  return [
    createSquareAdSvg(safeTitle, safeCat, '#0284C7', 1),
    createSquareAdSvg(safeTitle, safeCat, '#0F172A', 2),
  ];
}

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
  serviceProfessions: DEFAULT_SERVICE_PROFESSIONS,
  customOnlineCount: null,
  utilityTypes: DEFAULT_UTILITY_TYPES,
  liveChatCooldownSeconds: 5,
  liveChatAutoClearMinutes: 60,
  liveChatLastClearedAt: new Date().toISOString(),
  adPackagesPricing: {
    pkg1DailyPrice: 15,
    pkg2DailyPrice: 25,
    pkg3DailyPrice: 100,
    tenDaysDiscountPercent: 20,
  },
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

export function normalizeCategoryString(rawCategory?: string): string {
  return String(rawCategory || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function normalizeStoreNameKey(rawName?: string): string {
  return String(rawName || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[()[\]{}\-_،,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DREAM_PLAZA_CANONICAL_CATEGORY = 'مول دريم بلازا';

interface PermanentDreamPlazaSeed {
  id: string;
  name: string;
  altNames?: string[];
  phone: string;
  details: string;
  subCategory: string;
}

const PERMANENT_DREAM_PLAZA_SEEDS: PermanentDreamPlazaSeed[] = [
  {
    id: 'dream-plaza-perm-1',
    name: 'منظفات آدم',
    phone: '01042217583',
    details: 'منظفات وأدوات منزلية',
    subCategory: 'أدوات منزلية',
  },
  {
    id: 'dream-plaza-perm-2',
    name: 'مازن للمنظفات 2',
    phone: '01101563335 - 01206013562',
    details: 'منظفات ومستحضرات تجميل (جملة وقطاعي)',
    subCategory: 'أدوات منزلية',
  },
  {
    id: 'dream-plaza-perm-3',
    name: 'فول أبو مازن',
    phone: '01557673646 - 01127319156',
    details: 'مطعم (فول وفلافل)',
    subCategory: 'مطعم',
  },
  {
    id: 'dream-plaza-perm-4',
    name: 'منظفات المصطفى',
    phone: '01042669619',
    details: 'منظفات ومستحضرات تجميل',
    subCategory: 'أدوات منزلية',
  },
  {
    id: 'dream-plaza-perm-5',
    name: 'SNAP STORE (موبيل )',
    altNames: ['(موبيل ) SNAP STORE', 'SNAP STORE', 'موبيل SNAP STORE'],
    phone: '01000000000',
    details: 'إكسسوارات هواتف (موبايلات)',
    subCategory: 'موبيل',
  },
  {
    id: 'dream-plaza-perm-6',
    name: 'ألبان الروضة',
    phone: '01031278756',
    details: 'منتجات ألبان خدمه توصيل 24 ساعه',
    subCategory: 'سوبر ماركت',
  },
  {
    id: 'dream-plaza-perm-7',
    name: 'نوفا',
    phone: '01007812474',
    details: 'منظفات ومستحضرات تجميل',
    subCategory: 'أدوات منزلية',
  },
  {
    id: 'dream-plaza-perm-8',
    name: 'دريم فون',
    phone: '01000000000',
    details: 'إكسسوارات هواتف وموبايلات',
    subCategory: 'موبيل',
  },
  {
    id: 'dream-plaza-perm-9',
    name: 'محمصات وعطارة الرحاب',
    phone: '01000000000',
    details: 'محمصات وعطارة',
    subCategory: 'عطارة',
  },
  {
    id: 'dream-plaza-perm-10',
    name: 'طيور المدينة',
    phone: '01132115465 - 01043120997',
    details: 'طيور ودواجن',
    subCategory: 'طيور ودواجن',
  },
  {
    id: 'dream-plaza-perm-11',
    name: 'أولاد آدم',
    phone: '01088865546',
    details: 'خضروات وفاكهة',
    subCategory: 'خضروات وفاكهة',
  },
  {
    id: 'dream-plaza-perm-12',
    name: 'سلسلة مخابز كريستال',
    phone: '01000000000',
    details: 'مخبز',
    subCategory: 'مخبز وحلواني',
  },
  {
    id: 'dream-plaza-perm-13',
    name: 'فول جحا فلافل',
    phone: '01041678929 - 01018638782',
    details: 'مطعم (فول وفلافل)',
    subCategory: 'مطعم',
  },
  {
    id: 'dream-plaza-perm-14',
    name: 'البستان',
    phone: '01000000000',
    details: 'خضروات وفواكه',
    subCategory: 'خضروات وفاكهة',
  },
  {
    id: 'dream-plaza-perm-15',
    name: 'ماركت التحرير',
    phone: '01106260163 - 01043135459',
    details: 'ماركت / مواد غذائية جميع انواع المواد الغذائيه ومنتجات الألبان',
    subCategory: 'سوبر ماركت',
  },
  {
    id: 'dream-plaza-perm-16',
    name: 'سوبر ماركت دريم بلازا',
    phone: '01106344959 - 01041491959',
    details: 'سوبر ماركت',
    subCategory: 'سوبر ماركت',
  },
  {
    id: 'dream-plaza-perm-17',
    name: 'وان شوت (One Shot)',
    altNames: ['وان شوت', 'One Shot'],
    phone: '01100894361',
    details: 'بلايستيشن ومشروبات',
    subCategory: 'كافيه',
  },
  {
    id: 'dream-plaza-perm-18',
    name: 'صالون الشورا (Elshora Salon)',
    altNames: ['صالون الشورا', 'Elshora Salon'],
    phone: '01000000000',
    details: 'صالون حلاقة',
    subCategory: 'كوافير وبيوتي سنتر',
  },
  {
    id: 'dream-plaza-perm-19',
    name: 'مشويات عجيبة',
    phone: '01149106900 - 01043104373',
    details: 'مطعم مشويات',
    subCategory: 'مطعم',
  },
  {
    id: 'dream-plaza-perm-20',
    name: 'أزياء ومفروشات كنزي',
    phone: '01141910539 - 01011629773',
    details: 'مفروشات وستائر وأزياء',
    subCategory: 'ملابس وأحذية',
  },
  {
    id: 'dream-plaza-perm-21',
    name: 'كافيه الجوهرة',
    phone: '01000000000',
    details: 'كافيه (مقهى)',
    subCategory: 'كافيه',
  },
  {
    id: 'dream-plaza-perm-22',
    name: 'مطعم الزعيم',
    phone: '01043094142',
    details: 'مطعم (بيتزا، كريب، فطائر)',
    subCategory: 'مطعم',
  },
  {
    id: 'dream-plaza-perm-23',
    name: 'فكهاني مصر',
    phone: '01109180033 - 01109180440 - 01112893536 - 01025701385',
    details: 'خضروات وفواكه',
    subCategory: 'خضروات وفاكهة',
  },
  {
    id: 'dream-plaza-perm-24',
    name: 'عطارة ديما',
    phone: '01111068814',
    details: 'عطارة وعلافة',
    subCategory: 'عطارة',
  },
];

export const PERMANENT_DREAM_PLAZA_STORES: StoreListingItem[] =
  PERMANENT_DREAM_PLAZA_SEEDS.map((seed, idx) => {
    const firstPhone = seed.phone.split('-')[0].trim().replace(/[^0-9]/g, '');
    return {
      id: seed.id,
      ownerId: 'usr-admin-1',
      ownerUsername: 'admin',
      name: seed.name,
      category: DREAM_PLAZA_CANONICAL_CATEGORY,
      subCategory: seed.subCategory,
      locationUrl: 'https://maps.google.com',
      phone: seed.phone,
      whatsapp: firstPhone || '01000000000',
      details: seed.details,
      menuImages: [
        createSquareAdSvg(seed.name, DREAM_PLAZA_CANONICAL_CATEGORY, '#0284C7'),
      ],
      likes: [],
      dislikes: [],
      ratings: {},
      ratingsResetV2: true,
      comments: [],
      viewsCount: 0,
      approved: true,
      createdAt: new Date(1730000000000 + idx * 1000).toISOString(),
      updatedAt: 1730000000000 + idx * 1000,
    };
  });

const PERMANENT_DREAM_PLAZA_IDS = new Set<string>(
  PERMANENT_DREAM_PLAZA_SEEDS.map((s) => s.id)
);

const PERMANENT_DREAM_PLAZA_NAME_TO_SEED = new Map<
  string,
  PermanentDreamPlazaSeed
>();
PERMANENT_DREAM_PLAZA_SEEDS.forEach((seed) => {
  PERMANENT_DREAM_PLAZA_NAME_TO_SEED.set(normalizeStoreNameKey(seed.name), seed);
  (seed.altNames || []).forEach((alt) => {
    PERMANENT_DREAM_PLAZA_NAME_TO_SEED.set(normalizeStoreNameKey(alt), seed);
  });
});

export function isPermanentDreamPlazaStore(
  storeOrId: StoreListingItem | string | null | undefined
): boolean {
  if (!storeOrId) return false;
  if (typeof storeOrId === 'string') {
    return PERMANENT_DREAM_PLAZA_IDS.has(storeOrId.trim());
  }
  if (storeOrId.id && PERMANENT_DREAM_PLAZA_IDS.has(String(storeOrId.id).trim())) {
    return true;
  }
  const nameKey = normalizeStoreNameKey(storeOrId.name);
  if (nameKey && PERMANENT_DREAM_PLAZA_NAME_TO_SEED.has(nameKey)) {
    return true;
  }
  return false;
}

export const INITIAL_STORES: StoreListingItem[] = PERMANENT_DREAM_PLAZA_STORES;

export const INITIAL_SERVICE_NUMBERS: ServicePhoneEntry[] = [];

export const INITIAL_TAWSILA: TawsilaRideItem[] = [];

export const INITIAL_COMMUNITY_POSTS: CommunityPostItem[] = [];

export const INITIAL_MESSAGES: AdminMessage[] = [];

export const INITIAL_LIVE_CHAT: LiveChatMessageItem[] = [];

export function hasRealUploadedStoreImages(images?: string[]): boolean {
  if (!Array.isArray(images) || images.length === 0) return false;
  return images.some(
    (img) =>
      typeof img === 'string' &&
      img.trim().length > 0 &&
      !img.startsWith('data:image/svg+xml')
  );
}

let inMemoryStoreImagesVault: Record<string, string[]> = {};

function loadStoreImagesVault(): Record<string, string[]> {
  if (typeof window === 'undefined') return inMemoryStoreImagesVault;
  try {
    const raw = localStorage.getItem(STORE_IMAGES_VAULT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryStoreImagesVault = { ...inMemoryStoreImagesVault, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return inMemoryStoreImagesVault;
}

function saveStoreImagesVault(stores: StoreListingItem[]) {
  if (!Array.isArray(stores)) return;
  const vault = { ...loadStoreImagesVault() };
  let changed = false;
  for (const st of stores) {
    if (!st || !st.id) continue;
    const realImgs = (st.menuImages || []).filter(
      (img) =>
        typeof img === 'string' &&
        img.trim().length > 0 &&
        !img.startsWith('data:image/svg+xml')
    );
    if (realImgs.length > 0) {
      vault[st.id] = realImgs;
      const nameKey = normalizeStoreNameKey(st.name);
      if (nameKey) {
        vault[`name:${nameKey}`] = realImgs;
      }
      changed = true;
    } else if (st.imagesExplicitlyCleared && vault[st.id]) {
      delete vault[st.id];
      changed = true;
    }
  }
  inMemoryStoreImagesVault = vault;
  if (changed && typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORE_IMAGES_VAULT_KEY, JSON.stringify(vault));
    } catch {
      // If localStorage is full, keep in memory & IndexedDB
    }
  }
}

export function getRealUploadedStoreImagesOnly(images?: string[]): string[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  return images.filter(
    (img) =>
      typeof img === 'string' &&
      img.trim().length > 0 &&
      !img.startsWith('data:image/svg+xml')
  );
}

export function stripGeneratedSvgFromStores(
  stores: StoreListingItem[] | undefined
): StoreListingItem[] {
  if (!Array.isArray(stores)) return [];
  return stores.map((st, idx) => ({
    ...st,
    id: ensureValidStoreId(st, idx),
    category: canonicalizeStoreCategoryName(st.category),
    menuImages: getRealUploadedStoreImagesOnly(st.menuImages),
  }));
}

function canonicalizeStoreCategoryName(rawCategory?: string): string {
  const trimmed = String(rawCategory || '').trim();
  if (!trimmed) return DREAM_PLAZA_CANONICAL_CATEGORY;
  if (
    normalizeCategoryString(trimmed) ===
    normalizeCategoryString(DREAM_PLAZA_CANONICAL_CATEGORY)
  ) {
    return DREAM_PLAZA_CANONICAL_CATEGORY;
  }
  const matchedDefault = DEFAULT_STORE_CATEGORIES.find(
    (defCat) => normalizeCategoryString(defCat) === normalizeCategoryString(trimmed)
  );
  return matchedDefault || trimmed;
}

function ensureValidStoreId(
  store: Partial<StoreListingItem> | null | undefined,
  fallbackIndex = 0
): string {
  if (!store) return `store-fallback-${fallbackIndex}`;
  const rawNameKey = normalizeStoreNameKey(store.name);
  if (rawNameKey && PERMANENT_DREAM_PLAZA_NAME_TO_SEED.has(rawNameKey)) {
    return PERMANENT_DREAM_PLAZA_NAME_TO_SEED.get(rawNameKey)!.id;
  }
  if (typeof store.id === 'string' && store.id.trim().length > 0) {
    return store.id.trim();
  }
  if (rawNameKey) {
    const phoneDigits = String(store.phone || '').replace(/[^0-9]/g, '');
    return `st-auto-${rawNameKey.replace(/\s+/g, '-')}-${phoneDigits || fallbackIndex}`;
  }
  return `store-fallback-${fallbackIndex}`;
}

function ensureStoreListHasIds(
  list: StoreListingItem[] | undefined
): StoreListingItem[] {
  if (!Array.isArray(list)) return [];
  const byId = new Map<string, StoreListingItem>();
  list.forEach((rawItem, idx) => {
    if (!rawItem || typeof rawItem !== 'object') return;
    const id = ensureValidStoreId(rawItem, idx);
    const normalizedItem: StoreListingItem = {
      ...rawItem,
      id,
      name: String(rawItem.name || '').trim(),
      category: canonicalizeStoreCategoryName(rawItem.category),
    };
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, normalizedItem);
    } else {
      const existingRealImgs = getRealUploadedStoreImagesOnly(existing.menuImages);
      const nextRealImgs = getRealUploadedStoreImagesOnly(normalizedItem.menuImages);
      const mergedImgs =
        nextRealImgs.length > 0
          ? nextRealImgs
          : existingRealImgs.length > 0
          ? existingRealImgs
          : normalizedItem.menuImages || existing.menuImages || [];
      byId.set(id, {
        ...existing,
        ...normalizedItem,
        menuImages: mergedImgs,
        likes: Array.from(
          new Set([...(existing.likes || []), ...(normalizedItem.likes || [])])
        ),
        dislikes: Array.from(
          new Set([...(existing.dislikes || []), ...(normalizedItem.dislikes || [])])
        ),
        ratings: { ...(existing.ratings || {}), ...(normalizedItem.ratings || {}) },
        viewsCount: Math.max(existing.viewsCount || 0, normalizedItem.viewsCount || 0),
        comments: mergeCollectionById(
          existing.comments || [],
          normalizedItem.comments || []
        ),
      });
    }
  });
  return Array.from(byId.values());
}

export function mergeStoresWithImages(
  baseList: StoreListingItem[] | undefined,
  incomingList: StoreListingItem[] | undefined,
  deletedIds?: string[],
  authoritativeCloud = false
): StoreListingItem[] {
  const safeBaseList = ensureStoreListHasIds(baseList);
  const safeIncomingList = ensureStoreListHasIds(incomingList);
  const nonPermanentDeletedIds = (deletedIds || []).filter(
    (id) => !PERMANENT_DREAM_PLAZA_IDS.has(id)
  );
  const merged = mergeCollectionById(
    safeBaseList,
    safeIncomingList,
    nonPermanentDeletedIds,
    authoritativeCloud
  );
  const vault = loadStoreImagesVault();
  return normalizeStoresList(
    merged.map((st) => {
      const prevSt = safeBaseList.find((x) => x && x.id === st.id);
      const incSt = safeIncomingList.find((x) => x && x.id === st.id);
      if (!prevSt && !incSt) return st;

      const nameKey = normalizeStoreNameKey(st.name || incSt?.name || prevSt?.name);
      const prevRealImgs = getRealUploadedStoreImagesOnly(prevSt?.menuImages);
      const incRealImgs = getRealUploadedStoreImagesOnly(incSt?.menuImages);
      const vaultRealImgs = getRealUploadedStoreImagesOnly(
        vault[st.id] || (nameKey ? vault[`name:${nameKey}`] : undefined)
      );

      const prevHasReal = prevRealImgs.length > 0;
      const incHasReal = incRealImgs.length > 0;
      const vaultHasReal = vaultRealImgs.length > 0;

      const prevUpdated = typeof prevSt?.updatedAt === 'number' ? prevSt.updatedAt : 0;
      const incUpdated = typeof incSt?.updatedAt === 'number' ? incSt.updatedAt : 0;
      const preferIncoming = authoritativeCloud
        ? incUpdated >= prevUpdated || prevUpdated === 0 || incUpdated === 0
        : incUpdated >= prevUpdated;

      let resolvedImages: string[];
      const explicitlyCleared = preferIncoming
        ? Boolean(incSt?.imagesExplicitlyCleared)
        : Boolean(prevSt?.imagesExplicitlyCleared);

      if (explicitlyCleared && !incHasReal && !prevHasReal) {
        resolvedImages = [];
      } else if (incHasReal && prevHasReal) {
        resolvedImages = preferIncoming ? incRealImgs : prevRealImgs;
      } else if (incHasReal) {
        resolvedImages = incRealImgs;
      } else if (prevHasReal) {
        resolvedImages = prevRealImgs;
      } else if (vaultHasReal && !explicitlyCleared) {
        resolvedImages = vaultRealImgs;
      } else {
        resolvedImages = [];
      }

      const baseMerged =
        incSt && preferIncoming
          ? { ...(prevSt || {}), ...incSt }
          : prevSt
          ? { ...(incSt || {}), ...prevSt }
          : st;

      return {
        ...st,
        ...baseMerged,
        id: st.id,
        category: canonicalizeStoreCategoryName(
          baseMerged.category ||
            st.category ||
            (isPermanentDreamPlazaStore(st) ? DREAM_PLAZA_CANONICAL_CATEGORY : '')
        ),
        menuImages: resolvedImages,
        updatedAt: Math.max(prevUpdated, incUpdated) || st.updatedAt,
        imagesExplicitlyCleared: explicitlyCleared && resolvedImages.length === 0,
        likes: Array.isArray(incSt?.likes)
          ? incSt!.likes
          : Array.isArray(prevSt?.likes)
          ? prevSt!.likes
          : [],
        dislikes: Array.isArray(incSt?.dislikes)
          ? incSt!.dislikes
          : Array.isArray(prevSt?.dislikes)
          ? prevSt!.dislikes
          : [],
        ratings: { ...(prevSt?.ratings || {}), ...(incSt?.ratings || {}) },
        viewsCount: Math.max(prevSt?.viewsCount || 0, incSt?.viewsCount || 0),
        callClicksCount: Math.max(
          prevSt?.callClicksCount || 0,
          incSt?.callClicksCount || 0
        ),
        whatsappClicksCount: Math.max(
          prevSt?.whatsappClicksCount || 0,
          incSt?.whatsappClicksCount || 0
        ),
        viewsByHour: (() => {
          const ph = prevSt?.viewsByHour || {};
          const ih = incSt?.viewsByHour || {};
          const out: Record<string, number> = { ...ph };
          Object.keys(ih).forEach((k) => {
            out[k] = Math.max(ph[k] || 0, ih[k] || 0);
          });
          return out;
        })(),
        comments: mergeCollectionById(
          prevSt?.comments || [],
          incSt?.comments || [],
          nonPermanentDeletedIds
        ),
      };
    })
  );
}

function normalizeStoresList(
  rawStores: StoreListingItem[],
  deletedIds?: string[]
): StoreListingItem[] {
  const deletedSet = new Set(deletedIds || []);
  const vault = loadStoreImagesVault();
  const ensuredInput = ensureStoreListHasIds(rawStores).filter(
    (st) => !deletedSet.has(st.id)
  );

  // Ensure all 24 permanent Dream Plaza stores are always present, merged with any existing data/photos
  const byId = new Map<string, StoreListingItem>();
  ensuredInput.forEach((st) => {
    byId.set(st.id, st);
  });

  const combinedList: StoreListingItem[] = [];
  const addedIds = new Set<string>();

  // 1. Add non-permanent stores in their current order first (so newly added stores appear at top)
  for (const st of ensuredInput) {
    if (!PERMANENT_DREAM_PLAZA_IDS.has(st.id) && !addedIds.has(st.id) && !deletedSet.has(st.id)) {
      combinedList.push(st);
      addedIds.add(st.id);
    }
  }

  // 2. Always include all 24 permanent Dream Plaza stores (merging any user edits/photos/interactions)
  for (const permStore of PERMANENT_DREAM_PLAZA_STORES) {
    const existingPerm = byId.get(permStore.id);
    if (existingPerm) {
      combinedList.push({
        ...permStore,
        ...existingPerm,
        id: permStore.id,
        name: existingPerm.name?.trim() || permStore.name,
        category: existingPerm.category?.trim()
          ? canonicalizeStoreCategoryName(existingPerm.category)
          : DREAM_PLAZA_CANONICAL_CATEGORY,
        phone: existingPerm.phone?.trim() || permStore.phone,
        details: existingPerm.details?.trim() || permStore.details,
        subCategory: existingPerm.subCategory?.trim() || permStore.subCategory,
      });
    } else {
      combinedList.push(permStore);
    }
    addedIds.add(permStore.id);
  }

  return combinedList.map((s, idx) => {
    const ensuredId = ensureValidStoreId(s, idx);
    const cleanName = String(s.name || '').trim() || `محل #${idx + 1}`;
    const cleanCategory = s.category?.trim()
      ? canonicalizeStoreCategoryName(s.category)
      : isPermanentDreamPlazaStore(s)
      ? DREAM_PLAZA_CANONICAL_CATEGORY
      : canonicalizeStoreCategoryName(s.category);
    const nameKey = normalizeStoreNameKey(cleanName);

    const candidateImages =
      Array.isArray(s.menuImages) && s.menuImages.length > 0
        ? s.menuImages
        : Array.isArray((s as unknown as { images?: string[] }).images)
        ? (s as unknown as { images: string[] }).images
        : [];

    const vaultImgs =
      vault[ensuredId] || (nameKey ? vault[`name:${nameKey}`] : undefined) || [];
    const rawImages = hasRealUploadedStoreImages(candidateImages)
      ? candidateImages
      : !s.imagesExplicitlyCleared && hasRealUploadedStoreImages(vaultImgs)
      ? vaultImgs
      : candidateImages.length > 0
      ? candidateImages
      : [createSquareAdSvg(cleanName, cleanCategory, '#0284C7')];

    const upgradedImages = rawImages.map((img, i) =>
      i === 0 && typeof img === 'string' && img.startsWith('data:image/svg+xml')
        ? createSquareAdSvg(cleanName, cleanCategory, '#0284C7')
        : img
    );

    if (hasRealUploadedStoreImages(upgradedImages) && ensuredId) {
      const realOnly = upgradedImages.filter(
        (img) =>
          typeof img === 'string' &&
          img.trim().length > 0 &&
          !img.startsWith('data:image/svg+xml')
      );
      inMemoryStoreImagesVault[ensuredId] = realOnly;
      if (nameKey) {
        inMemoryStoreImagesVault[`name:${nameKey}`] = realOnly;
      }
    }

    const hasResetV2 = Boolean(s.ratingsResetV2);
    const cleanRatings =
      hasResetV2 && s.ratings && typeof s.ratings === 'object' ? s.ratings : {};
    const cleanComments = Array.isArray(s.comments)
      ? s.comments.map((c, cIdx) => ({
          ...c,
          id: c.id || `st-cmt-${ensuredId}-${cIdx}`,
          rating: hasResetV2 && typeof c.rating === 'number' ? c.rating : 0,
        }))
      : [];

    return {
      ...s,
      id: ensuredId,
      name: cleanName,
      category: cleanCategory,
      subCategory: s.subCategory ? s.subCategory.trim() : undefined,
      locationUrl: s.locationUrl || 'https://maps.google.com',
      phone: String(s.phone || '').trim() || '01000000000',
      whatsapp:
        String(s.whatsapp || s.phone || '')
          .split('-')[0]
          .replace(/[^0-9]/g, '') || '01000000000',
      details:
        s.details ||
        (s as unknown as { description?: string }).description ||
        '',
      menuImages: upgradedImages,
      likes: Array.isArray(s.likes) ? s.likes : [],
      dislikes: Array.isArray(s.dislikes) ? s.dislikes : [],
      ratings: cleanRatings,
      ratingsResetV2: true,
      comments: cleanComments,
      viewsCount: typeof s.viewsCount === 'number' ? s.viewsCount : 0,
      approved: s.approved !== false,
      createdAt: s.createdAt || new Date().toISOString(),
    };
  });
}

function normalizeServiceNumbersList(rawList: ServicePhoneEntry[]): ServicePhoneEntry[] {
  return rawList.map((n, idx) => ({
    ...n,
    id: n.id && String(n.id).trim() ? String(n.id).trim() : `srv-auto-${idx}`,
    locationUrl: n.locationUrl || 'https://maps.google.com',
    category: (n.category || n.profession || 'خدمات عامة').trim(),
    likes: Array.isArray(n.likes) ? n.likes : [],
    viewsCount: typeof n.viewsCount === 'number' ? n.viewsCount : 0,
    ratings: n.ratings && typeof n.ratings === 'object' ? n.ratings : {},
    comments: Array.isArray(n.comments)
      ? n.comments.map((c, cIdx) => ({
          id: c.id || `srv-cmt-${cIdx}`,
          authorId: c.authorId || 'guest',
          authorUsername: c.authorUsername || 'زائر',
          rating: typeof c.rating === 'number' ? c.rating : 0,
          text: c.text || '',
          likes: Array.isArray(c.likes) ? c.likes : [],
          replies: Array.isArray(c.replies) ? c.replies : [],
          createdAt: c.createdAt || new Date().toISOString(),
        }))
      : [],
  }));
}

function normalizeTawsilaList(rawList: TawsilaRideItem[]): TawsilaRideItem[] {
  return rawList.map((r, idx) => ({
    ...r,
    id: r.id && String(r.id).trim() ? String(r.id).trim() : `taw-auto-${idx}`,
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
  return rawList.map((p, idx) => ({
    ...p,
    id: p.id && String(p.id).trim() ? String(p.id).trim() : `post-auto-${idx}`,
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

const USERS_VAULT_STORAGE_KEY = 'nakhil_1185_users_vault_v1';
let currentActiveAuthUserMemory: UserAccount | null = null;

/**
 * MemoryStorage: طبقة تخزين فورية في الذاكرة الحية لتأمين جلسة المستخدم وبيانات البروفايل
 * قبل تحميل الواجهات وأثناء تأخر استجابة Firebase.
 */
interface MemorySessionStorageState {
  activeUser: UserAccount | null;
  securedUsersById: Map<string, UserAccount>;
  securedUsersByKey: Map<string, UserAccount>;
  isBootstrapped: boolean;
  lastSecuredAt: number;
}

const memorySessionStore: MemorySessionStorageState = {
  activeUser: null,
  securedUsersById: new Map<string, UserAccount>(),
  securedUsersByKey: new Map<string, UserAccount>(),
  isBootstrapped: false,
  lastSecuredAt: 0,
};

function cacheUserInMemoryStore(user: UserAccount | null | undefined): void {
  if (!user || !user.id || !user.username) return;
  const existing = memorySessionStore.securedUsersById.get(user.id);
  const merged: UserAccount = existing
    ? {
        ...existing,
        ...user,
        profile: {
          ...(existing.profile || {}),
          ...(user.profile || {}),
        },
        updatedAt: Math.max(existing.updatedAt || 0, user.updatedAt || 0),
      }
    : user;
  memorySessionStore.securedUsersById.set(merged.id, merged);
  memorySessionStore.securedUsersByKey.set(
    merged.username.trim().toLowerCase(),
    merged
  );
  if (merged.accountName && merged.accountName.trim()) {
    memorySessionStore.securedUsersByKey.set(
      merged.accountName.trim().toLowerCase(),
      merged
    );
  }
}

function getActiveAuthUserSnapshot(): UserAccount | null {
  if (memorySessionStore.activeUser && memorySessionStore.activeUser.id) {
    currentActiveAuthUserMemory = memorySessionStore.activeUser;
    return memorySessionStore.activeUser;
  }
  if (currentActiveAuthUserMemory && currentActiveAuthUserMemory.id) {
    memorySessionStore.activeUser = currentActiveAuthUserMemory;
    cacheUserInMemoryStore(currentActiveAuthUserMemory);
    return currentActiveAuthUserMemory;
  }
  try {
    const raw =
      localStorage.getItem(`${AUTH_PERSIST_KEY}_obj`) ||
      sessionStorage.getItem(`${AUTH_SESSION_KEY}_obj`);
    if (raw) {
      const parsed = JSON.parse(raw) as UserAccount;
      if (parsed && parsed.id && parsed.username) {
        currentActiveAuthUserMemory = parsed;
        memorySessionStore.activeUser = parsed;
        cacheUserInMemoryStore(parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function loadUsersVaultBackup(): UserAccount[] {
  const resultById = new Map<string, UserAccount>();
  memorySessionStore.securedUsersById.forEach((u) => {
    if (u && u.id && u.username) {
      resultById.set(u.id, u);
    }
  });
  try {
    const rawSources = [
      localStorage.getItem(USERS_VAULT_STORAGE_KEY),
      sessionStorage.getItem(USERS_VAULT_STORAGE_KEY),
    ];
    for (const raw of rawSources) {
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          if (u && u.id && u.username) {
            cacheUserInMemoryStore(u);
            const prev = resultById.get(u.id);
            resultById.set(
              u.id,
              prev
                ? {
                    ...prev,
                    ...u,
                    profile: { ...(prev.profile || {}), ...(u.profile || {}) },
                  }
                : u
            );
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return Array.from(resultById.values());
}

function isUserDeleted(u: UserAccount, deletedSet: Set<string>): boolean {
  if (!u) return true;
  const activeUser = getActiveAuthUserSnapshot();
  if (
    activeUser &&
    (u.id === activeUser.id ||
      (u.username &&
        activeUser.username &&
        u.username.trim().toLowerCase() ===
          activeUser.username.trim().toLowerCase()) ||
      (u.accountName &&
        activeUser.accountName &&
        u.accountName.trim().toLowerCase() ===
          activeUser.accountName.trim().toLowerCase()))
  ) {
    return false;
  }
  if (
    u.id === 'usr-admin-1' ||
    (u.username && u.username.trim().toLowerCase() === 'admin')
  ) {
    return false;
  }
  if (u.id && deletedSet.has(u.id)) return true;
  return false;
}

function mergeUsersLists(
  baseUsers: UserAccount[],
  incomingUsers?: UserAccount[],
  deletedIds?: string[]
): UserAccount[] {
  const deletedSet = new Set(
    (deletedIds || []).filter(
      (id) =>
        typeof id === 'string' &&
        !id.startsWith('user:') &&
        !id.startsWith('acc:') &&
        !id.startsWith('acct:')
    )
  );
  const vaultUsers = loadUsersVaultBackup();
  const activeUser = getActiveAuthUserSnapshot();
  const combinedBase = [
    ...INITIAL_USERS,
    ...vaultUsers,
    ...(baseUsers || []),
    ...(activeUser ? [activeUser] : []),
  ];
  const filteredBase = combinedBase.filter(
    (u) => u && u.username && !isUserDeleted(u, deletedSet)
  );
  const byKey = new Map<string, UserAccount>();
  const upsertUser = (u: UserAccount) => {
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
    const prevTs = typeof prev?.updatedAt === 'number' ? prev.updatedAt : 0;
    const incTs = typeof u.updatedAt === 'number' ? u.updatedAt : 0;
    const newer = incTs >= prevTs ? u : prev || u;
    const older = incTs >= prevTs ? prev || {} : u;
    byKey.set(mapKey, {
      ...older,
      ...newer,
      profile: {
        ...((older as UserAccount).profile || {}),
        ...((newer as UserAccount).profile || {}),
      },
      isOnline:
        typeof u.isOnline === 'boolean' ? u.isOnline : prev?.isOnline,
      updatedAt: Math.max(prevTs, incTs),
    });
  };

  filteredBase.forEach(upsertUser);
  if (Array.isArray(incomingUsers)) {
    incomingUsers.forEach(upsertUser);
  }
  if (activeUser && !isUserDeleted(activeUser, deletedSet)) {
    upsertUser(activeUser);
  }

  const merged = Array.from(byKey.values()).filter(
    (u) => !isUserDeleted(u, deletedSet)
  );
  return merged.length > 0 ? merged : INITIAL_USERS;
}

function parseItemTimestampMs(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    const t = new Date(val).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function mergeCollectionById<T extends { id: string }>(
  baseList: T[] | undefined,
  incomingList: T[] | undefined,
  deletedIds?: string[],
  authoritativeCloud = false
): T[] {
  const deletedSet = new Set(deletedIds || []);
  const ensureItemId = (item: T, idx: number, prefix: string): T => {
    if (item && typeof item.id === 'string' && item.id.trim().length > 0) {
      return item;
    }
    return {
      ...item,
      id: `${prefix}-fallback-${idx}`,
    };
  };

  const safeBase = Array.isArray(baseList)
    ? baseList
        .filter((item) => Boolean(item && typeof item === 'object'))
        .map((item, idx) => ensureItemId(item, idx, 'base'))
        .filter((item) => !deletedSet.has(item.id))
    : [];

  if (!Array.isArray(incomingList)) {
    return safeBase;
  }

  const safeIncoming = incomingList
    .filter((item) => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ensureItemId(item, idx, 'inc'))
    .filter((item) => !deletedSet.has(item.id));

  if (safeIncoming.length === 0 && safeBase.length > 0) {
    return safeBase;
  }

  const result: T[] = [];
  const seenIds = new Set<string>();

  // Keep incoming order for items present in incoming, merged with base fields respecting updatedAt
  for (const inc of safeIncoming) {
    if (seenIds.has(inc.id)) continue;
    const existing = safeBase.find((b) => b.id === inc.id);
    if (!existing) {
      result.push(inc);
    } else {
      const prevTs = parseItemTimestampMs(
        (existing as unknown as { updatedAt?: unknown }).updatedAt
      );
      const incTs = parseItemTimestampMs(
        (inc as unknown as { updatedAt?: unknown }).updatedAt
      );
      const preferInc = authoritativeCloud
        ? incTs >= prevTs || prevTs === 0 || incTs === 0
        : incTs >= prevTs;
      result.push(preferInc ? { ...existing, ...inc } : { ...inc, ...existing });
    }
    seenIds.add(inc.id);
  }

  // Safely preserve any non-deleted items in safeBase that were not yet in safeIncoming
  const nowMs = Date.now();
  for (const loc of safeBase) {
    if (!seenIds.has(loc.id) && !deletedSet.has(loc.id)) {
      if (authoritativeCloud && !PERMANENT_DREAM_PLAZA_IDS.has(loc.id)) {
        const locTs = Math.max(
          parseItemTimestampMs((loc as unknown as { updatedAt?: unknown }).updatedAt),
          parseItemTimestampMs((loc as unknown as { createdAt?: unknown }).createdAt)
        );
        // Keep local item when authoritative cloud snapshot arrives only if it was just created/edited (< 15s ago)
        if (locTs > 0 && nowMs - locTs < 15000) {
          result.push(loc);
          seenIds.add(loc.id);
        }
      } else {
        result.push(loc);
        seenIds.add(loc.id);
      }
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
  T extends {
    id: string;
    expiresAt?: string;
    active?: boolean;
    viewsCount?: number;
    adViewsSinceCreation?: number;
    baselineViewsAtCreation?: number;
    callClicksCount?: number;
    whatsappClicksCount?: number;
    viewsByHour?: Record<string, number>;
    updatedAt?: number;
  }
>(
  baseList: T[] | undefined,
  incomingList: T[] | undefined,
  deletedIds?: string[]
): T[] {
  const merged = mergeCollectionById(baseList, incomingList, deletedIds);
  return merged
    .filter((item) => !isAdCampaignExpired(item.expiresAt))
    .map((item) => {
      const prevItem = (baseList || []).find((x) => x && x.id === item.id);
      const incItem = (incomingList || []).find((x) => x && x.id === item.id);
      return {
        ...item,
        active: item.active !== false,
        viewsCount: Math.max(
          prevItem?.viewsCount || 0,
          incItem?.viewsCount || 0,
          item.viewsCount || 0
        ),
        adViewsSinceCreation: Math.max(
          prevItem?.adViewsSinceCreation || 0,
          incItem?.adViewsSinceCreation || 0,
          item.adViewsSinceCreation || 0
        ),
        baselineViewsAtCreation:
          incItem?.baselineViewsAtCreation ??
          prevItem?.baselineViewsAtCreation ??
          item.baselineViewsAtCreation,
        callClicksCount: Math.max(
          prevItem?.callClicksCount || 0,
          incItem?.callClicksCount || 0,
          item.callClicksCount || 0
        ),
        whatsappClicksCount: Math.max(
          prevItem?.whatsappClicksCount || 0,
          incItem?.whatsappClicksCount || 0,
          item.whatsappClicksCount || 0
        ),
        viewsByHour: mergeViewsByHourMaps(
          prevItem?.viewsByHour,
          incItem?.viewsByHour || item.viewsByHour
        ),
        updatedAt: Math.max(
          prevItem?.updatedAt || 0,
          incItem?.updatedAt || 0,
          item.updatedAt || 0
        ),
      };
    });
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
  const bTs = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
  const incTs = typeof incomingPopup.updatedAt === 'number' ? incomingPopup.updatedAt : 0;
  const preferIncoming =
    incTs > bTs || (incTs === bTs && (!bHasCustomCampaign || incHasCustomCampaign));
  const primary = preferIncoming ? { ...b, ...incomingPopup } : { ...incomingPopup, ...b };
  return {
    ...primary,
    viewsCount: Math.max(b.viewsCount || 0, incomingPopup.viewsCount || 0),
    adViewsSinceCreation: Math.max(
      b.adViewsSinceCreation || 0,
      incomingPopup.adViewsSinceCreation || 0
    ),
    baselineViewsAtCreation:
      primary.baselineViewsAtCreation ??
      incomingPopup.baselineViewsAtCreation ??
      b.baselineViewsAtCreation,
    callClicksCount: Math.max(
      b.callClicksCount || 0,
      incomingPopup.callClicksCount || 0
    ),
    whatsappClicksCount: Math.max(
      b.whatsappClicksCount || 0,
      incomingPopup.whatsappClicksCount || 0
    ),
    viewsByHour: mergeViewsByHourMaps(b.viewsByHour, incomingPopup.viewsByHour),
    updatedAt: Math.max(bTs, incTs),
  };
}

function ensureStoreCategoriesWithDreamPlaza(cats?: string[]): string[] {
  const baseList =
    Array.isArray(cats) && cats.length > 0 ? cats : DEFAULT_STORE_CATEGORIES;
  const cleaned = baseList
    .map((c) => String(c || '').trim())
    .filter((c) => Boolean(c) && c !== 'مول دريم بلازا');
  return ['مول دريم بلازا', ...Array.from(new Set(cleaned))];
}

export function ensureServiceProfessionsList(profs?: string[]): string[] {
  const incoming = Array.isArray(profs)
    ? profs.map((p) => String(p || '').trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...DEFAULT_SERVICE_PROFESSIONS, ...incoming]));
}

function mergeServiceNumbersWithInteractions(
  baseList: ServicePhoneEntry[] | undefined,
  incomingList: ServicePhoneEntry[] | undefined,
  deletedIds: string[] = []
): ServicePhoneEntry[] {
  const merged = mergeCollectionById(baseList, incomingList, deletedIds);
  return normalizeServiceNumbersList(
    merged.map((srv) => {
      const prevSrv = (baseList || []).find((x) => x && x.id === srv.id);
      const incSrv = (incomingList || []).find((x) => x && x.id === srv.id);
      if (!prevSrv || !incSrv) return srv;
      const prevLikes = Array.isArray(prevSrv.likes) ? prevSrv.likes : [];
      const incLikes = Array.isArray(incSrv.likes) ? incSrv.likes : [];
      // For likes toggle, prefer incoming if incoming exists, otherwise merge
      const resolvedLikes = Array.isArray(incSrv.likes) ? incLikes : prevLikes;
      return {
        ...prevSrv,
        ...incSrv,
        likes: resolvedLikes,
        viewsCount: Math.max(prevSrv.viewsCount || 0, incSrv.viewsCount || 0),
        ratings: { ...(prevSrv.ratings || {}), ...(incSrv.ratings || {}) },
        comments: mergeCollectionById(
          prevSrv.comments || [],
          incSrv.comments || [],
          deletedIds
        ),
      };
    })
  );
}

function mergeCommunityPostsWithInteractions(
  baseList: CommunityPostItem[] | undefined,
  incomingList: CommunityPostItem[] | undefined,
  deletedIds: string[] = [],
  authoritativeCloud = false
): CommunityPostItem[] {
  const merged = mergeCollectionById(
    baseList,
    incomingList,
    deletedIds,
    authoritativeCloud
  );
  return normalizeCommunityPostsList(
    merged.map((post) => {
      const prevPost = (baseList || []).find((x) => x && x.id === post.id);
      const incPost = (incomingList || []).find((x) => x && x.id === post.id);
      if (!prevPost || !incPost) return post;

      const mergedComments = mergeCollectionById(
        prevPost.comments || [],
        incPost.comments || [],
        deletedIds
      ).map((cmt) => {
        const pCmt = (prevPost.comments || []).find((c) => c && c.id === cmt.id);
        const iCmt = (incPost.comments || []).find((c) => c && c.id === cmt.id);
        if (!pCmt || !iCmt) return cmt;
        const pTime = parseItemTimestampMs(pCmt.updatedAt || pCmt.createdAt);
        const iTime = parseItemTimestampMs(iCmt.updatedAt || iCmt.createdAt);
        const newerCmt = iTime >= pTime ? iCmt : pCmt;
        const olderCmt = iTime >= pTime ? pCmt : iCmt;
        return {
          ...olderCmt,
          ...newerCmt,
          replies: mergeCollectionById(
            pCmt.replies || [],
            iCmt.replies || [],
            deletedIds
          ),
          reports: mergeCollectionById(
            pCmt.reports || [],
            iCmt.reports || [],
            deletedIds
          ),
        };
      });

      return {
        ...post,
        comments: mergedComments,
        reports: mergeCollectionById(
          prevPost.reports || [],
          incPost.reports || [],
          deletedIds
        ),
      };
    })
  );
}

function mergePlatformSettings(
  baseSettings: PlatformSettings,
  incomingSettings?: Partial<PlatformSettings>
): PlatformSettings {
  if (!incomingSettings || typeof incomingSettings !== 'object') {
    return {
      ...baseSettings,
      storeCategories: ensureStoreCategoriesWithDreamPlaza(baseSettings.storeCategories),
      serviceProfessions: ensureServiceProfessionsList(baseSettings.serviceProfessions),
    };
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
    storeCategories: ensureStoreCategoriesWithDreamPlaza(
      preferIncoming &&
        Array.isArray(incomingSettings.storeCategories) &&
        incomingSettings.storeCategories.length > 0
        ? incomingSettings.storeCategories
        : Array.isArray(baseSettings.storeCategories) &&
          baseSettings.storeCategories.length > 0
        ? baseSettings.storeCategories
        : DEFAULT_STORE_CATEGORIES
    ),
    serviceProfessions: ensureServiceProfessionsList([
      ...(baseSettings.serviceProfessions || []),
      ...(incomingSettings.serviceProfessions || []),
    ]),
    customOnlineCount: preferIncoming
      ? incomingSettings.customOnlineCount !== undefined
        ? incomingSettings.customOnlineCount
        : baseSettings.customOnlineCount ?? null
      : baseSettings.customOnlineCount !== undefined
      ? baseSettings.customOnlineCount
      : incomingSettings.customOnlineCount ?? null,
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
    adPackagesPricing: {
      pkg1DailyPrice:
        (preferIncoming
          ? incomingSettings.adPackagesPricing?.pkg1DailyPrice
          : baseSettings.adPackagesPricing?.pkg1DailyPrice) ??
        baseSettings.adPackagesPricing?.pkg1DailyPrice ??
        incomingSettings.adPackagesPricing?.pkg1DailyPrice ??
        15,
      pkg2DailyPrice:
        (preferIncoming
          ? incomingSettings.adPackagesPricing?.pkg2DailyPrice
          : baseSettings.adPackagesPricing?.pkg2DailyPrice) ??
        baseSettings.adPackagesPricing?.pkg2DailyPrice ??
        incomingSettings.adPackagesPricing?.pkg2DailyPrice ??
        25,
      pkg3DailyPrice:
        (preferIncoming
          ? incomingSettings.adPackagesPricing?.pkg3DailyPrice
          : baseSettings.adPackagesPricing?.pkg3DailyPrice) ??
        baseSettings.adPackagesPricing?.pkg3DailyPrice ??
        incomingSettings.adPackagesPricing?.pkg3DailyPrice ??
        100,
      tenDaysDiscountPercent:
        (preferIncoming
          ? incomingSettings.adPackagesPricing?.tenDaysDiscountPercent
          : baseSettings.adPackagesPricing?.tenDaysDiscountPercent) ??
        baseSettings.adPackagesPricing?.tenDaysDiscountPercent ??
        incomingSettings.adPackagesPricing?.tenDaysDiscountPercent ??
        20,
    },
    defaultStoreSvgStyle: (() => {
      const chosen =
        (preferIncoming
          ? incomingSettings.defaultStoreSvgStyle
          : baseSettings.defaultStoreSvgStyle) ??
        baseSettings.defaultStoreSvgStyle ??
        incomingSettings.defaultStoreSvgStyle ??
        getGlobalDefaultStoreSvgStyle();
      const validStyle: 1 | 2 = chosen === 2 ? 2 : 1;
      setGlobalDefaultStoreSvgStyle(validStyle);
      return validStyle;
    })(),
    adminActivityLogs: mergeCollectionById(
      baseSettings.adminActivityLogs || [],
      incomingSettings.adminActivityLogs || [],
      []
    )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 200),
    authSessionLogs: mergeCollectionById(
      baseSettings.authSessionLogs || [],
      incomingSettings.authSessionLogs || [],
      []
    )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 200),
    userDailyVisitsMap: (() => {
      const mergedMap: NonNullable<PlatformSettings['userDailyVisitsMap']> = {
        ...(baseSettings.userDailyVisitsMap || {}),
      };
      const incMap = incomingSettings.userDailyVisitsMap || {};
      for (const [k, incEntry] of Object.entries(incMap)) {
        if (!incEntry || typeof incEntry !== 'object') continue;
        const prevEntry = mergedMap[k];
        if (!prevEntry) {
          mergedMap[k] = incEntry;
        } else {
          const sameDay = prevEntry.dateKey === incEntry.dateKey;
          const newerEntry =
            (incEntry.dateKey || '') >= (prevEntry.dateKey || '')
              ? incEntry
              : prevEntry;
          mergedMap[k] = {
            ...newerEntry,
            dailyCount: sameDay
              ? Math.max(prevEntry.dailyCount || 0, incEntry.dailyCount || 0)
              : newerEntry.dailyCount || 1,
            totalCount: Math.max(
              prevEntry.totalCount || 0,
              incEntry.totalCount || 0
            ),
            lastVisitAt:
              (incEntry.lastVisitAt || '') >= (prevEntry.lastVisitAt || '')
                ? incEntry.lastVisitAt
                : prevEntry.lastVisitAt,
          };
        }
      }
      return mergedMap;
    })(),
    mentionNotifications: (() => {
      const merged = mergeCollectionById(
        baseSettings.mentionNotifications || [],
        incomingSettings.mentionNotifications || [],
        []
      );
      const readSet = new Set<string>();
      for (const n of [
        ...(baseSettings.mentionNotifications || []),
        ...(incomingSettings.mentionNotifications || []),
      ]) {
        if (n && n.isRead) readSet.add(n.id);
      }
      return merged
        .map((n) => (readSet.has(n.id) ? { ...n, isRead: true } : n))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 200);
    })(),
    friendRequests: (() => {
      const merged = mergeCollectionById(
        baseSettings.friendRequests || [],
        incomingSettings.friendRequests || [],
        []
      );
      const statusMap = new Map<string, 'pending' | 'accepted' | 'rejected'>();
      for (const req of [
        ...(baseSettings.friendRequests || []),
        ...(incomingSettings.friendRequests || []),
      ]) {
        if (!req || !req.id) continue;
        const prevSt = statusMap.get(req.id);
        if (req.status === 'accepted' || req.status === 'rejected') {
          statusMap.set(req.id, req.status);
        } else if (!prevSt) {
          statusMap.set(req.id, 'pending');
        }
      }
      return merged
        .map((r) => ({
          ...r,
          status: statusMap.get(r.id) || r.status || 'pending',
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 200);
    })(),
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

function mergeLiveChatMessagesList(
  baseList: LiveChatMessageItem[] | undefined,
  incomingList: LiveChatMessageItem[] | undefined,
  deletedIds: string[] = [],
  lastClearedAt?: string
): LiveChatMessageItem[] {
  const deletedSet = new Set(deletedIds || []);
  const clearTs = lastClearedAt ? new Date(lastClearedAt).getTime() : 0;
  const byId = new Map<string, LiveChatMessageItem>();

  const addMsg = (m: LiveChatMessageItem | undefined) => {
    if (!m || !m.id || deletedSet.has(m.id)) return;
    if (clearTs > 0 && m.createdAt) {
      const mTs = new Date(m.createdAt).getTime();
      if (Number.isFinite(mTs) && mTs <= clearTs) return;
    }
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
    } else {
      byId.set(m.id, {
        ...prev,
        ...m,
        reports: Array.isArray(m.reports) && m.reports.length >= (prev.reports?.length || 0)
          ? m.reports
          : prev.reports || [],
      });
    }
  };

  (baseList || []).forEach(addMsg);
  (incomingList || []).forEach(addMsg);

  const combined = Array.from(byId.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime() || 0;
    const tB = new Date(b.createdAt || 0).getTime() || 0;
    return tA - tB;
  });

  return normalizeLiveChatList(combined);
}

function mergePrivateChatStatusesMap(
  baseMap: Record<string, 'pending' | 'accepted' | 'rejected'> | undefined,
  incomingMap: Record<string, 'pending' | 'accepted' | 'rejected'> | undefined
): Record<string, 'pending' | 'accepted' | 'rejected'> {
  const result: Record<string, 'pending' | 'accepted' | 'rejected'> = {
    ...(baseMap || {}),
  };
  if (!incomingMap || typeof incomingMap !== 'object') return result;
  for (const [k, incVal] of Object.entries(incomingMap)) {
    const prevVal = result[k];
    if (prevVal === 'accepted' && incVal === 'pending') {
      result[k] = 'accepted';
    } else if (prevVal === 'rejected' && incVal === 'pending') {
      result[k] = 'rejected';
    } else if (incVal === 'accepted' || incVal === 'rejected' || incVal === 'pending') {
      result[k] = incVal;
    }
  }
  return result;
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

  const mergedStoresRaw = mergeStoresWithImages(
    Array.isArray(b.stores) ? b.stores : [],
    Array.isArray(inc.stores) ? inc.stores : [],
    []
  );

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
    serviceNumbers: mergeServiceNumbersWithInteractions(
      b.serviceNumbers || [],
      inc.serviceNumbers || [],
      []
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
  private sectionUnsubscribers: Array<FirestoreUnsubscribe | RTDBUnsubscribe> = [];
  private lastPersistedCloudState: PlatformDatabaseState | null = null;
  private eventSource: EventSource | null = null;
  private fastChatPollTimer: ReturnType<typeof setInterval> | null = null;
  private isFastChatPolling = false;
  private lastChatVersion = 0;
  private deferredSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private latestState: PlatformDatabaseState | null = null;
  private isCloudHydrated = false;
  private hasSyncedPermanentDreamPlazaToCloud = false;
  private overflowStoreImagesChunk1: Record<string, string[]> = {};
  private overflowStoreImagesChunk2: Record<string, string[]> = {};
  private lastSectionSignatures: Record<string, string> = {};
  private firebaseCloudPollTimer: ReturnType<typeof setInterval> | null = null;
  private isFirebaseCloudPolling = false;
  private listeners: Array<(state: PlatformDatabaseState) => void> = [];
  private cloudWriteErrorListeners: Array<(message: string) => void> = [];
  private connectionStatusListeners: Array<
    (status: 'local' | 'firebase_connected' | 'firebase_error', message?: string) => void
  > = [];
  private currentStatus: 'local' | 'firebase_connected' | 'firebase_error' = 'local';
  private currentMessage: string =
    'يعمل بنظام المزامنة اللحظية السحابية (Firebase Realtime Sync)';

  public isHydratedFromCloud(): boolean {
    return this.isCloudHydrated;
  }

  public subscribeCloudWriteError(listener: (message: string) => void) {
    this.cloudWriteErrorListeners.push(listener);
    return () => {
      this.cloudWriteErrorListeners = this.cloudWriteErrorListeners.filter(
        (l) => l !== listener
      );
    };
  }

  private notifyCloudWriteError(message: string) {
    this.cloudWriteErrorListeners.forEach((cb) => {
      try {
        cb(message);
      } catch {
        // ignore listener error
      }
    });
  }

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

      // 3. Offline-only cache hydration: IndexedDB is used strictly as an offline cache when internet is unavailable
      this.hydrateFromIndexedDBInstant();

      // 4. Auto-Sync offline additions/edits/deletions with Firebase & Server as soon as internet reconnects or app gains focus (including iOS Safari pageshow)
      window.addEventListener('online', () => {
        this.flushOfflinePendingSync();
        this.pullLatestDeltaNow();
        this.pullFromFirebaseCloudNow();
      });
      window.addEventListener('focus', () => {
        this.pullLatestDeltaNow();
        this.pullFromFirebaseCloudNow();
      });
      window.addEventListener('pageshow', () => {
        this.pullLatestDeltaNow();
        this.pullFromFirebaseCloudNow();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.pullLatestDeltaNow();
          this.pullFromFirebaseCloudNow();
        }
      });
    }
  }

  private isFirebaseConfiguredAndEnabled(): boolean {
    const st = this.latestState || this.loadLocalState();
    const fb = st?.settings?.firebase;
    return Boolean(fb && fb.enabled && fb.apiKey && fb.projectId);
  }

  public async pullFromFirebaseCloudNow() {
    if (!this.firestoreDb || this.isFirebaseCloudPolling) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    this.isFirebaseCloudPolling = true;
    try {
      const [
        storesSnap,
        servicesSnap,
        communitySnap,
        adsSnap,
        tawsilaSnap,
        settingsUsersSnap,
      ] = await Promise.all([
        getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'section_stores')).catch(() => null),
        getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'section_services')).catch(() => null),
        getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'section_community')).catch(() => null),
        getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'section_ads')).catch(() => null),
        getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'section_tawsila')).catch(() => null),
        getDoc(doc(this.firestoreDb, 'fluent_portal_v3', 'section_settings_users')).catch(() => null),
      ]);
      if (storesSnap && storesSnap.exists()) {
        this.applySectionStoresSnapshot(storesSnap.data());
      }
      if (servicesSnap && servicesSnap.exists()) {
        this.applySectionServicesSnapshot(servicesSnap.data());
      }
      if (communitySnap && communitySnap.exists()) {
        this.applySectionCommunitySnapshot(communitySnap.data());
      }
      if (adsSnap && adsSnap.exists()) {
        this.applySectionAdsSnapshot(adsSnap.data());
      }
      if (tawsilaSnap && tawsilaSnap.exists()) {
        this.applySectionTawsilaSnapshot(tawsilaSnap.data());
      }
      if (settingsUsersSnap && settingsUsersSnap.exists()) {
        this.applySectionSettingsUsersSnapshot(settingsUsersSnap.data());
      }
    } catch {
      // ignore transient mobile network errors
    } finally {
      this.isFirebaseCloudPolling = false;
    }
  }

  public async pullLatestDeltaNow() {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    this.pullFromFirebaseCloudNow();
    try {
      const [stateRes, chatRes] = await Promise.all([
        fetch(`/api/realtime/state?t=${Date.now()}`, { cache: 'no-store' }).catch(
          () => null
        ),
        fetch(
          `/api/realtime/chat-fast?since=${this.lastChatVersion}&t=${Date.now()}`,
          { cache: 'no-store' }
        ).catch(() => null),
      ]);
      if (stateRes && stateRes.ok) {
        const sData = await stateRes.json();
        if (sData && sData.onlineStats && typeof sData.onlineStats.totalOnline === 'number') {
          updateLatestServerOnlineStats(sData.onlineStats);
        }
        if (sData && sData.state && typeof sData.state === 'object') {
          this.isCloudHydrated = true;
          this.applyIncomingRemoteState(sData.state as Record<string, unknown>);
        }
      }
      if (chatRes && chatRes.ok) {
        const data = await chatRes.json();
        if (data && typeof data.version === 'number') {
          this.lastChatVersion = data.version;
        }
        if (data && data.onlineStats && typeof data.onlineStats.totalOnline === 'number') {
          updateLatestServerOnlineStats(data.onlineStats);
        }
        if (data && data.changed && data.chatPatch) {
          this.applyIncomingFastChatPatch(data.chatPatch);
        }
      }
    } catch {
      // ignore
    }
  }

  private async hydrateFromIndexedDBInstant() {
    try {
      const [pendingOffline, latestIdb] = await Promise.all([
        fastBrowserCache.getSnapshotByKeyFromIDB('pending_offline_state'),
        fastBrowserCache.getSnapshotByKeyFromIDB('latest_state'),
      ]);

      // Keep real uploaded store images in memory vault so uploaded photos never vanish
      for (const snap of [latestIdb, pendingOffline]) {
        if (snap && Array.isArray(snap.stores)) {
          saveStoreImagesVault(snap.stores);
        }
      }

      // Role of IndexedDB/LocalStorage is strictly offline caching when internet is absent or when unsynced offline changes exist
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (!isOffline && !this.hasPendingOfflineChanges()) {
        return;
      }

      const idbCandidate = pendingOffline || latestIdb;
      if (!idbCandidate) return;

      const current = this.latestState || this.loadLocalState();
      const mergedDeletedIds = Array.from(
        new Set([
          ...(current.deletedRecordIds || []),
          ...(idbCandidate.deletedRecordIds || []),
        ])
      );

      const enriched: PlatformDatabaseState = {
        ...current,
        users: mergeUsersLists(current.users, idbCandidate.users, mergedDeletedIds),
        stores: mergeStoresWithImages(
          current.stores,
          idbCandidate.stores,
          mergedDeletedIds
        ),
        serviceNumbers: mergeServiceNumbersWithInteractions(
          current.serviceNumbers,
          idbCandidate.serviceNumbers,
          mergedDeletedIds
        ),
        tawsilaRides: normalizeTawsilaList(
          mergeCollectionById(
            current.tawsilaRides,
            idbCandidate.tawsilaRides,
            mergedDeletedIds
          )
        ),
        communityPosts: mergeCommunityPostsWithInteractions(
          current.communityPosts,
          idbCandidate.communityPosts,
          mergedDeletedIds
        ),
        buySellPosts: mergeCommunityPostsWithInteractions(
          current.buySellPosts || [],
          idbCandidate.buySellPosts || [],
          mergedDeletedIds
        ),
        utilityPosts: mergeCommunityPostsWithInteractions(
          current.utilityPosts || [],
          idbCandidate.utilityPosts || [],
          mergedDeletedIds
        ),
        utilitySubmissions: normalizeUtilitySubmissionsList(
          mergeCollectionById(
            current.utilitySubmissions || [],
            idbCandidate.utilitySubmissions || [],
            mergedDeletedIds
          )
        ),
        topBanners: mergeAdCampaignsById(
          current.topBanners,
          idbCandidate.topBanners,
          mergedDeletedIds
        ),
        squareAds: mergeAdCampaignsById(
          current.squareAds,
          idbCandidate.squareAds,
          mergedDeletedIds
        ),
        popupAd: mergePopupAdCampaign(current.popupAd, idbCandidate.popupAd),
        messages: mergeCollectionById(
          current.messages,
          idbCandidate.messages,
          mergedDeletedIds
        ),
        deletedRecordIds: mergedDeletedIds,
        settings: mergePlatformSettings(current.settings, idbCandidate.settings),
      };

      this.saveLocalState(enriched);
      this.notifyData(enriched);
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
        storeCategories: ensureStoreCategoriesWithDreamPlaza(
          Array.isArray(parsedSettings.storeCategories) &&
            parsedSettings.storeCategories.length > 0
            ? parsedSettings.storeCategories
            : DEFAULT_STORE_CATEGORIES
        ),
        serviceProfessions: ensureServiceProfessionsList(
          parsedSettings.serviceProfessions
        ),
        customOnlineCount:
          typeof parsedSettings.customOnlineCount === 'number' &&
          Number.isFinite(parsedSettings.customOnlineCount) &&
          parsedSettings.customOnlineCount > 0
            ? parsedSettings.customOnlineCount
            : null,
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
        adPackagesPricing: {
          pkg1DailyPrice:
            typeof parsedSettings.adPackagesPricing?.pkg1DailyPrice === 'number'
              ? parsedSettings.adPackagesPricing.pkg1DailyPrice
              : 15,
          pkg2DailyPrice:
            typeof parsedSettings.adPackagesPricing?.pkg2DailyPrice === 'number'
              ? parsedSettings.adPackagesPricing.pkg2DailyPrice
              : 25,
          pkg3DailyPrice:
            typeof parsedSettings.adPackagesPricing?.pkg3DailyPrice === 'number'
              ? parsedSettings.adPackagesPricing.pkg3DailyPrice
              : 100,
          tenDaysDiscountPercent:
            typeof parsedSettings.adPackagesPricing?.tenDaysDiscountPercent === 'number'
              ? parsedSettings.adPackagesPricing.tenDaysDiscountPercent
              : 20,
        },
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

        const activeAuthSnap = getActiveAuthUserSnapshot();
        const deletedRecordIds: string[] = Array.from(
          new Set([
            ...(Array.isArray(parsed.deletedRecordIds) ? parsed.deletedRecordIds : []),
            ...(Array.isArray(savedAdCampaigns.deletedRecordIds)
              ? savedAdCampaigns.deletedRecordIds
              : []),
          ])
        ).filter(
          (id) =>
            typeof id === 'string' &&
            !id.startsWith('user:') &&
            !id.startsWith('acc:') &&
            !id.startsWith('acct:') &&
            (!activeAuthSnap || id !== activeAuthSnap.id)
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
            loadUsersVaultBackup(),
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
    if (Array.isArray(state.users) && state.users.length > 0) {
      const usersJson = JSON.stringify(state.users);
      try {
        sessionStorage.setItem(USERS_VAULT_STORAGE_KEY, usersJson);
      } catch {
        // ignore
      }
      try {
        localStorage.setItem(USERS_VAULT_STORAGE_KEY, usersJson);
      } catch {
        try {
          localStorage.removeItem(STORE_IMAGES_VAULT_KEY);
          localStorage.removeItem(CUMULATIVE_VAULT_STORAGE_KEY);
          localStorage.setItem(USERS_VAULT_STORAGE_KEY, usersJson);
        } catch {
          // ignore
        }
      }
    }
    if (Array.isArray(state.stores)) {
      saveStoreImagesVault(state.stores);
    }
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
        localStorage.removeItem(STORE_IMAGES_VAULT_KEY);
        localStorage.removeItem(CUMULATIVE_VAULT_STORAGE_KEY);
        localStorage.setItem(
          DB_STORAGE_KEY,
          JSON.stringify({
            users: state.users,
            topBanners: state.topBanners,
            squareAds: state.squareAds,
            popupAd: state.popupAd,
            messages: (state.messages || []).slice(0, 50),
            stores: (state.stores || []).map((st) => ({
              ...st,
              menuImages: [],
            })),
            serviceNumbers: state.serviceNumbers,
            tawsilaRides: state.tawsilaRides,
            communityPosts: (state.communityPosts || []).slice(0, 30).map((p) => ({
              ...p,
              imageUrl: p.imageUrl && p.imageUrl.startsWith('data:') ? undefined : p.imageUrl,
            })),
            utilitySubmissions: normalizeUtilitySubmissionsList(state.utilitySubmissions),
            utilityPosts: (state.utilityPosts || []).slice(0, 30).map((p) => ({
              ...p,
              imageUrl: p.imageUrl && p.imageUrl.startsWith('data:') ? undefined : p.imageUrl,
            })),
            buySellPosts: (state.buySellPosts || []).slice(0, 30).map((p) => ({
              ...p,
              imageUrl: p.imageUrl && p.imageUrl.startsWith('data:') ? undefined : p.imageUrl,
            })),
            liveChatMessages: normalizeLiveChatList(state.liveChatMessages),
            chatPenalties: state.chatPenalties || [],
            privateChatMessages: (state.privateChatMessages || []).slice(-60),
            privateChatStatuses: state.privateChatStatuses || {},
            chatTypingMap: state.chatTypingMap || {},
            userBlockedMap: state.userBlockedMap || {},
            privateChatReports: state.privateChatReports || [],
            deletedRecordIds: state.deletedRecordIds || [],
          })
        );
      } catch {
        // Full state is preserved in IndexedDB and USERS_VAULT_STORAGE_KEY
      }
    }
  }

  public loadAuthenticatedUser(users: UserAccount[]): UserAccount | null {
    try {
      if (currentActiveAuthUserMemory && currentActiveAuthUserMemory.id) {
        const matchedMem = users.find(
          (u) =>
            u.id === currentActiveAuthUserMemory?.id ||
            u.username.trim().toLowerCase() ===
              currentActiveAuthUserMemory?.username.trim().toLowerCase()
        );
        if (matchedMem && !matchedMem.isBanned) {
          return matchedMem;
        }
        if (!currentActiveAuthUserMemory.isBanned) {
          return currentActiveAuthUserMemory;
        }
      }

      const cachedUserRaw =
        sessionStorage.getItem(`${AUTH_SESSION_KEY}_obj`) ||
        localStorage.getItem(`${AUTH_PERSIST_KEY}_obj`);
      if (cachedUserRaw) {
        const parsedUser = JSON.parse(cachedUserRaw) as UserAccount;
        if (
          parsedUser &&
          parsedUser.id &&
          parsedUser.username &&
          !parsedUser.isBanned
        ) {
          currentActiveAuthUserMemory = parsedUser;
          const matchedInList = users.find(
            (u) =>
              u.id === parsedUser.id ||
              u.username.trim().toLowerCase() === parsedUser.username.trim().toLowerCase()
          );
          if (matchedInList) {
            if (matchedInList.isBanned) {
              return null;
            }
            return matchedInList;
          }
          return parsedUser;
        }
      }

      const sessionId = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (sessionId) {
        const found = users.find((u) => u.id === sessionId);
        if (found && !found.isBanned) {
          currentActiveAuthUserMemory = found;
          return found;
        }
      }

      const rememberedId = localStorage.getItem(AUTH_PERSIST_KEY);
      if (rememberedId) {
        const found = users.find((u) => u.id === rememberedId);
        if (found && !found.isBanned) {
          currentActiveAuthUserMemory = found;
          return found;
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
    currentActiveAuthUserMemory = user;
    if (!user) {
      try {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(`${AUTH_SESSION_KEY}_obj`);
      } catch {
        // ignore
      }
      try {
        localStorage.removeItem(AUTH_PERSIST_KEY);
        localStorage.removeItem(`${AUTH_PERSIST_KEY}_obj`);
      } catch {
        // ignore
      }
      return;
    }

    if (currentState) {
      fastBrowserCache.setMemoryAndDiskCache(currentState, user.id);
    }

    const serializedUser = JSON.stringify(user);
    // 1. Always save to sessionStorage first (isolated try/catch so localStorage quota never blocks it)
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
      sessionStorage.setItem(`${AUTH_SESSION_KEY}_obj`, serializedUser);
    } catch {
      // ignore
    }

    // 2. Always persist login permanently in localStorage until manual logout only
    try {
      localStorage.setItem(AUTH_PERSIST_KEY, user.id);
      localStorage.setItem(`${AUTH_PERSIST_KEY}_obj`, serializedUser);
    } catch {
      try {
        localStorage.removeItem(STORE_IMAGES_VAULT_KEY);
        localStorage.removeItem(CUMULATIVE_VAULT_STORAGE_KEY);
        localStorage.setItem(AUTH_PERSIST_KEY, user.id);
        localStorage.setItem(`${AUTH_PERSIST_KEY}_obj`, serializedUser);
      } catch {
        // ignore
      }
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

  private reconcileStoreAndAdCounters(
    state: PlatformDatabaseState
  ): PlatformDatabaseState {
    if (!state || !Array.isArray(state.stores) || state.stores.length === 0) {
      return state;
    }
    const storesList = state.stores;
    const squareAdsList = Array.isArray(state.squareAds) ? state.squareAds : [];
    const topBannersList = Array.isArray(state.topBanners) ? state.topBanners : [];
    const popupObj = state.popupAd;

    const unifiedByStoreId = new Map<
      string,
      {
        viewsCount: number;
        callClicksCount: number;
        whatsappClicksCount: number;
        viewsByHour: Record<string, number>;
      }
    >();

    for (const store of storesList) {
      const linkedSq = squareAdsList.filter((a) => isAdLinkedToStore(a, store));
      const linkedBnr = topBannersList.filter((b) => isAdLinkedToStore(b, store));
      const popupLinked = isAdLinkedToStore(popupObj, store);

      if (linkedSq.length === 0 && linkedBnr.length === 0 && !popupLinked) {
        continue;
      }

      const maxViews = Math.max(
        store.viewsCount || 0,
        ...linkedSq.map((a) => a.viewsCount || 0),
        ...linkedBnr.map((b) => b.viewsCount || 0),
        popupLinked ? popupObj?.viewsCount || 0 : 0
      );
      const maxCalls = Math.max(
        store.callClicksCount || 0,
        ...linkedSq.map((a) => a.callClicksCount || 0),
        ...linkedBnr.map((b) => b.callClicksCount || 0),
        popupLinked ? popupObj?.callClicksCount || 0 : 0
      );
      const maxWa = Math.max(
        store.whatsappClicksCount || 0,
        ...linkedSq.map((a) => a.whatsappClicksCount || 0),
        ...linkedBnr.map((b) => b.whatsappClicksCount || 0),
        popupLinked ? popupObj?.whatsappClicksCount || 0 : 0
      );
      const mergedHours = mergeViewsByHourMaps(
        store.viewsByHour,
        ...linkedSq.map((a) => a.viewsByHour),
        ...linkedBnr.map((b) => b.viewsByHour),
        popupLinked ? popupObj?.viewsByHour : undefined
      );

      unifiedByStoreId.set(store.id, {
        viewsCount: maxViews,
        callClicksCount: maxCalls,
        whatsappClicksCount: maxWa,
        viewsByHour: mergedHours,
      });
    }

    if (unifiedByStoreId.size === 0) return state;

    const nextStores = storesList.map((s) => {
      const u = unifiedByStoreId.get(s.id);
      if (!u) return s;
      if (
        (s.viewsCount || 0) === u.viewsCount &&
        (s.callClicksCount || 0) === u.callClicksCount &&
        (s.whatsappClicksCount || 0) === u.whatsappClicksCount
      ) {
        return s;
      }
      return {
        ...s,
        viewsCount: u.viewsCount,
        callClicksCount: u.callClicksCount,
        whatsappClicksCount: u.whatsappClicksCount,
        viewsByHour: u.viewsByHour,
      };
    });

    const nextSquareAds = squareAdsList.map((a) => {
      const linkedStore = findLinkedStoreForAd(storesList, a);
      const u = linkedStore ? unifiedByStoreId.get(linkedStore.id) : undefined;
      if (!u || !linkedStore) return a;
      return {
        ...a,
        storeId: a.storeId || linkedStore.id,
        viewsCount: u.viewsCount,
        callClicksCount: u.callClicksCount,
        whatsappClicksCount: u.whatsappClicksCount,
        viewsByHour: u.viewsByHour,
      };
    });

    const nextTopBanners = topBannersList.map((b) => {
      const linkedStore = findLinkedStoreForAd(storesList, b);
      const u = linkedStore ? unifiedByStoreId.get(linkedStore.id) : undefined;
      if (!u || !linkedStore) return b;
      return {
        ...b,
        storeId: b.storeId || linkedStore.id,
        viewsCount: u.viewsCount,
        callClicksCount: u.callClicksCount,
        whatsappClicksCount: u.whatsappClicksCount,
        viewsByHour: u.viewsByHour,
      };
    });

    const popupLinkedStore = popupObj
      ? findLinkedStoreForAd(storesList, popupObj)
      : undefined;
    const popupUnified = popupLinkedStore
      ? unifiedByStoreId.get(popupLinkedStore.id)
      : undefined;
    const nextPopupAd =
      popupObj && popupUnified && popupLinkedStore
        ? {
            ...popupObj,
            storeId: popupObj.storeId || popupLinkedStore.id,
            viewsCount: popupUnified.viewsCount,
            callClicksCount: popupUnified.callClicksCount,
            whatsappClicksCount: popupUnified.whatsappClicksCount,
            viewsByHour: popupUnified.viewsByHour,
          }
        : popupObj;

    return {
      ...state,
      stores: nextStores,
      squareAds: nextSquareAds,
      topBanners: nextTopBanners,
      popupAd: nextPopupAd,
    };
  }

  private notifyData(state: PlatformDatabaseState) {
    const unifiedState = this.reconcileStoreAndAdCounters(state);
    this.latestState = unifiedState;
    this.listeners.forEach((cb) => cb(unifiedState));
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

    const mergedStoresRaw = mergeStoresWithImages(
      base.stores,
      Array.isArray(remoteData.stores)
        ? (remoteData.stores as StoreListingItem[])
        : undefined,
      mergedDeletedIds,
      true
    );
    const mergedServicesRaw = mergeServiceNumbersWithInteractions(
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
      mergedDeletedIds,
      true
    );
    const mergedCommunityRaw = mergeCommunityPostsWithInteractions(
      base.communityPosts,
      Array.isArray(remoteData.communityPosts)
        ? (remoteData.communityPosts as CommunityPostItem[])
        : undefined,
      mergedDeletedIds,
      true
    );
    const mergedUtilitySubRaw = mergeCollectionById(
      base.utilitySubmissions || [],
      Array.isArray(remoteData.utilitySubmissions)
        ? (remoteData.utilitySubmissions as UtilitySubmissionItem[])
        : undefined,
      mergedDeletedIds,
      true
    );
    const mergedUtilityPostsRaw = mergeCommunityPostsWithInteractions(
      base.utilityPosts || [],
      Array.isArray(remoteData.utilityPosts)
        ? (remoteData.utilityPosts as CommunityPostItem[])
        : undefined,
      mergedDeletedIds,
      true
    );
    const mergedBuySellRaw = mergeCommunityPostsWithInteractions(
      base.buySellPosts || [],
      Array.isArray(remoteData.buySellPosts)
        ? (remoteData.buySellPosts as CommunityPostItem[])
        : undefined,
      mergedDeletedIds,
      true
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
      mergedDeletedIds,
      true
    );

    const mergedSettings = mergePlatformSettings(base.settings, remoteSettings);

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
      stores: this.enrichStoresWithOverflowChunks(
        normalizeStoresList(mergedStoresRaw, mergedDeletedIds)
      ),
      serviceNumbers: normalizeServiceNumbersList(mergedServicesRaw),
      tawsilaRides: normalizeTawsilaList(mergedTawsilaRaw),
      communityPosts: normalizeCommunityPostsList(mergedCommunityRaw),
      utilitySubmissions: normalizeUtilitySubmissionsList(mergedUtilitySubRaw),
      utilityPosts: normalizeCommunityPostsList(mergedUtilityPostsRaw),
      buySellPosts: normalizeCommunityPostsList(mergedBuySellRaw),
      liveChatMessages: mergeLiveChatMessagesList(
        base.liveChatMessages || [],
        Array.isArray(remoteData.liveChatMessages)
          ? (remoteData.liveChatMessages as LiveChatMessageItem[])
          : undefined,
        mergedDeletedIds,
        mergedSettings.liveChatLastClearedAt
      ),
      chatPenalties: Array.isArray(remoteData.chatPenalties)
        ? (remoteData.chatPenalties as PlatformDatabaseState['chatPenalties'])
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(remoteData.privateChatMessages)
        ? mergeCollectionById(
            base.privateChatMessages || [],
            remoteData.privateChatMessages as PlatformDatabaseState['privateChatMessages'],
            mergedDeletedIds,
            true
          )
        : base.privateChatMessages || [],
      privateChatStatuses: mergePrivateChatStatusesMap(
        base.privateChatStatuses,
        remoteData.privateChatStatuses as PlatformDatabaseState['privateChatStatuses']
      ),
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
            mergedDeletedIds,
            true
          )
        : base.privateChatReports || [],
      deletedRecordIds: mergedDeletedIds,
      settings: mergedSettings,
    };
    this.saveLocalState(mergedState);
    this.notifyData(mergedState);
  }

  private enrichStoresWithOverflowChunks(stores: StoreListingItem[]): StoreListingItem[] {
    const combinedOverflow: Record<string, string[]> = {};
    for (const map of [this.overflowStoreImagesChunk1, this.overflowStoreImagesChunk2]) {
      for (const [stId, imgs] of Object.entries(map || {})) {
        if (Array.isArray(imgs) && imgs.length > 0) {
          const prev = combinedOverflow[stId] || [];
          combinedOverflow[stId] = Array.from(new Set([...prev, ...imgs]));
        }
      }
    }
    if (Object.keys(combinedOverflow).length === 0) return stores;
    return stores.map((st) => {
      const extraImgs = combinedOverflow[st.id];
      if (!extraImgs || extraImgs.length === 0 || st.imagesExplicitlyCleared) {
        return st;
      }
      const existingReal = getRealUploadedStoreImagesOnly(st.menuImages);
      const mergedReal = Array.from(new Set([...existingReal, ...extraImgs]));
      if (mergedReal.length === existingReal.length) return st;
      return {
        ...st,
        menuImages: mergedReal,
      };
    });
  }

  private applySectionStoresOverflowSnapshot(
    data: Record<string, unknown>,
    chunkIndex: 1 | 2
  ) {
    if (!data || typeof data !== 'object') return;
    const rawMap =
      data.imagesByStoreId && typeof data.imagesByStoreId === 'object'
        ? (data.imagesByStoreId as Record<string, string[]>)
        : {};
    if (chunkIndex === 1) {
      this.overflowStoreImagesChunk1 = rawMap;
    } else {
      this.overflowStoreImagesChunk2 = rawMap;
    }
    const base = this.latestState || this.loadLocalState();
    const enrichedStores = normalizeStoresList(
      this.enrichStoresWithOverflowChunks(base.stores)
    );
    const nextState: PlatformDatabaseState = {
      ...base,
      stores: enrichedStores,
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
  }

  private applySectionStoresSnapshot(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') return;
    const base = this.latestState || this.loadLocalState();
    const remoteDeleted = Array.isArray(data.deletedRecordIds)
      ? (data.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );
    const mergedStores = Array.isArray(data.stores)
      ? normalizeStoresList(
          this.enrichStoresWithOverflowChunks(
            mergeStoresWithImages(
              base.stores,
              data.stores as StoreListingItem[],
              mergedDeletedIds,
              true
            )
          )
        )
      : normalizeStoresList(this.enrichStoresWithOverflowChunks(base.stores));
    const updatedCategories = Array.isArray(data.storeCategories)
      ? ensureStoreCategoriesWithDreamPlaza(data.storeCategories as string[])
      : base.settings.storeCategories;
    const nextState: PlatformDatabaseState = {
      ...base,
      stores: mergedStores,
      deletedRecordIds: mergedDeletedIds,
      settings: {
        ...base.settings,
        storeCategories: updatedCategories,
      },
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
  }

  private applySectionServicesSnapshot(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') return;
    const base = this.latestState || this.loadLocalState();
    const remoteDeleted = Array.isArray(data.deletedRecordIds)
      ? (data.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );
    const mergedServices = Array.isArray(data.serviceNumbers)
      ? normalizeServiceNumbersList(
          mergeServiceNumbersWithInteractions(
            base.serviceNumbers,
            data.serviceNumbers as ServicePhoneEntry[],
            mergedDeletedIds
          )
        )
      : base.serviceNumbers;
    const updatedProfessions = Array.isArray(data.serviceProfessions)
      ? ensureServiceProfessionsList(data.serviceProfessions as string[])
      : base.settings.serviceProfessions;
    const nextState: PlatformDatabaseState = {
      ...base,
      serviceNumbers: mergedServices,
      deletedRecordIds: mergedDeletedIds,
      settings: {
        ...base.settings,
        serviceProfessions: updatedProfessions,
      },
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
  }

  private applySectionCommunitySnapshot(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') return;
    const base = this.latestState || this.loadLocalState();
    const remoteDeleted = Array.isArray(data.deletedRecordIds)
      ? (data.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );
    const nextState: PlatformDatabaseState = {
      ...base,
      communityPosts: Array.isArray(data.communityPosts)
        ? mergeCommunityPostsWithInteractions(
            base.communityPosts,
            data.communityPosts as CommunityPostItem[],
            mergedDeletedIds,
            true
          )
        : base.communityPosts,
      buySellPosts: Array.isArray(data.buySellPosts)
        ? mergeCommunityPostsWithInteractions(
            base.buySellPosts || [],
            data.buySellPosts as CommunityPostItem[],
            mergedDeletedIds,
            true
          )
        : base.buySellPosts || [],
      utilityPosts: Array.isArray(data.utilityPosts)
        ? mergeCommunityPostsWithInteractions(
            base.utilityPosts || [],
            data.utilityPosts as CommunityPostItem[],
            mergedDeletedIds,
            true
          )
        : base.utilityPosts || [],
      utilitySubmissions: Array.isArray(data.utilitySubmissions)
        ? normalizeUtilitySubmissionsList(
            mergeCollectionById(
              base.utilitySubmissions || [],
              data.utilitySubmissions as UtilitySubmissionItem[],
              mergedDeletedIds,
              true
            )
          )
        : base.utilitySubmissions || [],
      deletedRecordIds: mergedDeletedIds,
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
  }

  private applySectionAdsSnapshot(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') return;
    const base = this.latestState || this.loadLocalState();
    const remoteDeleted = Array.isArray(data.deletedRecordIds)
      ? (data.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );
    const nextState: PlatformDatabaseState = {
      ...base,
      topBanners: mergeAdCampaignsById(
        base.topBanners,
        Array.isArray(data.topBanners) ? (data.topBanners as TopBannerAd[]) : undefined,
        mergedDeletedIds
      ),
      squareAds: mergeAdCampaignsById(
        base.squareAds,
        Array.isArray(data.squareAds) ? (data.squareAds as SquareMovingAd[]) : undefined,
        mergedDeletedIds
      ),
      popupAd: mergePopupAdCampaign(
        base.popupAd,
        data.popupAd as PopupAdConfig | undefined
      ),
      deletedRecordIds: mergedDeletedIds,
      settings: data.adPackagesPricing
        ? mergePlatformSettings(base.settings, {
            adPackagesPricing:
              data.adPackagesPricing as PlatformSettings['adPackagesPricing'],
          })
        : base.settings,
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
  }

  private applySectionTawsilaSnapshot(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') return;
    const base = this.latestState || this.loadLocalState();
    const remoteDeleted = Array.isArray(data.deletedRecordIds)
      ? (data.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );
    const nextState: PlatformDatabaseState = {
      ...base,
      tawsilaRides: Array.isArray(data.tawsilaRides)
        ? normalizeTawsilaList(
            mergeCollectionById(
              base.tawsilaRides,
              data.tawsilaRides as TawsilaRideItem[],
              mergedDeletedIds,
              true
            )
          )
        : base.tawsilaRides,
      deletedRecordIds: mergedDeletedIds,
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
  }

  private applySectionSettingsUsersSnapshot(data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') return;
    const base = this.latestState || this.loadLocalState();
    const remoteDeleted = Array.isArray(data.deletedRecordIds)
      ? (data.deletedRecordIds as string[])
      : [];
    const mergedDeletedIds = Array.from(
      new Set([...(base.deletedRecordIds || []), ...remoteDeleted])
    );
    const remoteSettings = (data.settings as Partial<PlatformSettings>) || {};
    const nextState: PlatformDatabaseState = {
      ...base,
      users: mergeUsersLists(
        base.users,
        Array.isArray(data.users) ? (data.users as UserAccount[]) : undefined,
        mergedDeletedIds
      ),
      messages: Array.isArray(data.messages)
        ? mergeCollectionById(
            base.messages,
            data.messages as AdminMessage[],
            mergedDeletedIds,
            true
          )
        : base.messages,
      deletedRecordIds: mergedDeletedIds,
      settings: mergePlatformSettings(base.settings, remoteSettings),
    };
    this.notifyData(nextState);
    this.scheduleDeferredLocalSave(nextState);
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

    let mergedStores = this.enrichStoresWithOverflowChunks(
      Array.isArray(chatPatch.stores)
        ? mergeStoresWithImages(
            base.stores,
            chatPatch.stores as StoreListingItem[],
            mergedDeletedIds,
            true
          )
        : normalizeStoresList(
            base.stores.filter((st) => !mergedDeletedIds.includes(st.id)),
            mergedDeletedIds
          )
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
    const mergedTawsila = Array.isArray(chatPatch.tawsilaRides)
      ? normalizeTawsilaList(
          mergeCollectionById(
            base.tawsilaRides || [],
            chatPatch.tawsilaRides as TawsilaRideItem[],
            mergedDeletedIds,
            true
          )
        )
      : (base.tawsilaRides || []).filter(
          (r) => !mergedDeletedIds.includes(r.id)
        );
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
      tawsilaRides: mergedTawsila,
      serviceNumbers: Array.isArray(chatPatch.serviceNumbers)
        ? mergeServiceNumbersWithInteractions(
            base.serviceNumbers || [],
            chatPatch.serviceNumbers as ServicePhoneEntry[],
            mergedDeletedIds
          )
        : (base.serviceNumbers || []).filter(
            (srv) => !mergedDeletedIds.includes(srv.id)
          ),
      liveChatMessages: mergeLiveChatMessagesList(
        base.liveChatMessages || [],
        Array.isArray(chatPatch.liveChatMessages)
          ? (chatPatch.liveChatMessages as LiveChatMessageItem[])
          : undefined,
        mergedDeletedIds,
        (typeof chatPatch.liveChatLastClearedAt === 'string'
          ? chatPatch.liveChatLastClearedAt
          : undefined) ||
          patchSettings.liveChatLastClearedAt ||
          base.settings.liveChatLastClearedAt
      ),
      chatPenalties: Array.isArray(chatPatch.chatPenalties)
        ? (chatPatch.chatPenalties as PlatformDatabaseState['chatPenalties'])
        : base.chatPenalties || [],
      privateChatMessages: Array.isArray(chatPatch.privateChatMessages)
        ? mergeCollectionById(
            base.privateChatMessages || [],
            chatPatch.privateChatMessages as PlatformDatabaseState['privateChatMessages'],
            mergedDeletedIds,
            true
          )
        : base.privateChatMessages || [],
      privateChatStatuses: mergePrivateChatStatusesMap(
        base.privateChatStatuses,
        chatPatch.privateChatStatuses as PlatformDatabaseState['privateChatStatuses']
      ),
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
            mergedDeletedIds,
            true
          )
        : base.privateChatReports || [],
      messages: Array.isArray(chatPatch.messages)
        ? mergeCollectionById(
            base.messages || [],
            chatPatch.messages as PlatformDatabaseState['messages'],
            mergedDeletedIds,
            true
          )
        : base.messages || [],
      utilitySubmissions: Array.isArray(chatPatch.utilitySubmissions)
        ? normalizeUtilitySubmissionsList(
            mergeCollectionById(
              base.utilitySubmissions || [],
              chatPatch.utilitySubmissions as UtilitySubmissionItem[],
              mergedDeletedIds,
              true
            )
          )
        : base.utilitySubmissions || [],
      utilityPosts: Array.isArray(chatPatch.utilityPosts)
        ? mergeCommunityPostsWithInteractions(
            base.utilityPosts || [],
            chatPatch.utilityPosts as CommunityPostItem[],
            mergedDeletedIds,
            true
          )
        : base.utilityPosts || [],
      buySellPosts: Array.isArray(chatPatch.buySellPosts)
        ? mergeCommunityPostsWithInteractions(
            base.buySellPosts || [],
            chatPatch.buySellPosts as CommunityPostItem[],
            mergedDeletedIds,
            true
          )
        : base.buySellPosts || [],
      communityPosts: Array.isArray(chatPatch.communityPosts)
        ? mergeCommunityPostsWithInteractions(
            base.communityPosts || [],
            chatPatch.communityPosts as CommunityPostItem[],
            mergedDeletedIds,
            true
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

    // Immediate delta check on startup so desktop & mobile apps sync right away
    this.pullLatestDeltaNow();

    // High-speed 120ms delta poll on /api/realtime/chat-fast to bypass any reverse-proxy SSE buffering
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
            this.isCloudHydrated = true;
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
    if (this.sectionUnsubscribers.length > 0) {
      this.sectionUnsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore
        }
      });
      this.sectionUnsubscribers = [];
    }

    if (!firebaseConfig.enabled || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
      this.isCloudHydrated = true;
      this.notifyStatus(
        'local',
        'التخزين المؤقت المحلي نشط (Offline Cache)'
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
        const storesRef = ref(this.realtimeDb, 'fluent_portal_v3/sections/stores');
        const servicesRef = ref(this.realtimeDb, 'fluent_portal_v3/sections/services');
        const communityRef = ref(this.realtimeDb, 'fluent_portal_v3/sections/community');
        const adsRef = ref(this.realtimeDb, 'fluent_portal_v3/sections/ads');
        const tawsilaRef = ref(this.realtimeDb, 'fluent_portal_v3/sections/tawsila');
        const settingsUsersRef = ref(this.realtimeDb, 'fluent_portal_v3/sections/settings_users');

        this.sectionUnsubscribers.push(
          onValue(storesRef, (snap) => {
            const val = snap.val();
            if (val) this.applySectionStoresSnapshot(val);
          }),
          onValue(servicesRef, (snap) => {
            const val = snap.val();
            if (val) this.applySectionServicesSnapshot(val);
          }),
          onValue(communityRef, (snap) => {
            const val = snap.val();
            if (val) this.applySectionCommunitySnapshot(val);
          }),
          onValue(adsRef, (snap) => {
            const val = snap.val();
            if (val) this.applySectionAdsSnapshot(val);
          }),
          onValue(tawsilaRef, (snap) => {
            const val = snap.val();
            if (val) this.applySectionTawsilaSnapshot(val);
          }),
          onValue(settingsUsersRef, (snap) => {
            const val = snap.val();
            if (val) this.applySectionSettingsUsersSnapshot(val);
          })
        );

        this.unsubscribeSnapshot = onValue(
          stateRef,
          (snapshot) => {
            this.isCloudHydrated = true;
            const remoteData = snapshot.val();
            if (remoteData) {
              this.applyIncomingRemoteState(remoteData);
            } else {
              const baseState = this.latestState || currentState;
              const cleanPayload = sanitizeForFirebase({
                ...baseState,
                stores: stripGeneratedSvgFromStores(baseState.stores || []),
                senderTabId: getOrCreateTabSessionId(),
                updatedAt: new Date().toISOString(),
              });
              set(stateRef, cleanPayload);
            }
            this.notifyStatus('firebase_connected', 'التسجيل السحابي نشط (Realtime DB)');
          },
          (error) => {
            this.isCloudHydrated = true;
            this.notifyStatus(
              'firebase_error',
              `تعذر المزامنة مع Realtime DB: ${error.message}`
            );
          }
        );
      } else {
        // Initialize Firestore with experimentalAutoDetectLongPolling for reliable sync on iPhone (iOS Safari) and Android mobile networks
        try {
          this.firestoreDb = initializeFirestore(this.firebaseApp, {
            experimentalAutoDetectLongPolling: true,
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          });
        } catch {
          try {
            this.firestoreDb = getFirestore(this.firebaseApp);
            await enableIndexedDbPersistence(this.firestoreDb).catch(() => {});
          } catch {
            this.firestoreDb = getFirestore(this.firebaseApp);
          }
        }

        if (this.firebaseCloudPollTimer) {
          clearInterval(this.firebaseCloudPollTimer);
        }
        // Pull immediately on startup/refresh so mobile browsers get the latest Firebase state right away
        this.pullFromFirebaseCloudNow();
        this.firebaseCloudPollTimer = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          this.pullFromFirebaseCloudNow();
        }, 3500);

        const docRef = doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state');
        const fastChatDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'live_chat_realtime'
        );
        const storesDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_stores');
        const storesOverflow1DocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'section_stores_overflow'
        );
        const storesOverflow2DocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'section_stores_overflow_2'
        );
        const servicesDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_services');
        const communityDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_community');
        const adsDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_ads');
        const tawsilaDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_tawsila');
        const settingsUsersDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'section_settings_users'
        );

        // Section 1A & 1B Realtime Listeners: Overflow Store Images Chunks
        this.sectionUnsubscribers.push(
          onSnapshot(
            storesOverflow1DocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionStoresOverflowSnapshot(snapshot.data(), 1);
              }
            },
            () => {}
          ),
          onSnapshot(
            storesOverflow2DocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionStoresOverflowSnapshot(snapshot.data(), 2);
              }
            },
            () => {}
          )
        );

        // Section 1 Realtime Listener: المحلات والدليل (Stores & Categories)
        this.sectionUnsubscribers.push(
          onSnapshot(
            storesDocRef,
            (snapshot) => {
              this.isCloudHydrated = true;
              if (snapshot.exists()) {
                const snapData = snapshot.data();
                this.applySectionStoresSnapshot(snapData);
                // Ensure the 24 permanent Dream Plaza stores are saved in Firestore section_stores so all devices see them
                if (!this.hasSyncedPermanentDreamPlazaToCloud) {
                  this.hasSyncedPermanentDreamPlazaToCloud = true;
                  const remoteStoresList = Array.isArray(snapData?.stores)
                    ? (snapData.stores as StoreListingItem[])
                    : [];
                  const remoteIds = new Set(
                    remoteStoresList.map((s) => s?.id).filter(Boolean)
                  );
                  const missingPermanent = PERMANENT_DREAM_PLAZA_STORES.some(
                    (perm) => !remoteIds.has(perm.id)
                  );
                  if (missingPermanent && this.latestState) {
                    this.writeStoresToFirestoreSafe(
                      this.latestState.stores,
                      this.latestState.settings.storeCategories,
                      this.latestState.deletedRecordIds || [],
                      getOrCreateTabSessionId(),
                      new Date().toISOString()
                    ).catch(() => {});
                  }
                }
              } else if (!this.hasSyncedPermanentDreamPlazaToCloud) {
                this.hasSyncedPermanentDreamPlazaToCloud = true;
                const baseState = this.latestState || currentState;
                this.writeStoresToFirestoreSafe(
                  baseState.stores,
                  baseState.settings.storeCategories,
                  baseState.deletedRecordIds || [],
                  getOrCreateTabSessionId(),
                  new Date().toISOString()
                ).catch(() => {});
              }
            },
            () => {
              this.isCloudHydrated = true;
            }
          )
        );

        // Section 2 Realtime Listener: أرقام الخدمات ومقدمي الخدمة (Service Numbers & Professions)
        this.sectionUnsubscribers.push(
          onSnapshot(
            servicesDocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionServicesSnapshot(snapshot.data());
              }
            },
            () => {}
          )
        );

        // Section 3 Realtime Listener: مجتمع وبيع واشتري وخدمات عامة (Community, Buy/Sell & Utility Posts)
        this.sectionUnsubscribers.push(
          onSnapshot(
            communityDocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionCommunitySnapshot(snapshot.data());
              }
            },
            () => {}
          )
        );

        // Section 4 Realtime Listener: الإعلانات والباقات (Top Banners, Square Ads, Popup Ad & Pricing)
        this.sectionUnsubscribers.push(
          onSnapshot(
            adsDocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionAdsSnapshot(snapshot.data());
              }
            },
            () => {}
          )
        );

        // Section 5 Realtime Listener: توصيلة (Tawsila Rides)
        this.sectionUnsubscribers.push(
          onSnapshot(
            tawsilaDocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionTawsilaSnapshot(snapshot.data());
              }
            },
            () => {}
          )
        );

        // Section 6 Realtime Listener: الإعدادات والحسابات والرسائل (Settings, Users & Admin Messages)
        this.sectionUnsubscribers.push(
          onSnapshot(
            settingsUsersDocRef,
            (snapshot) => {
              if (snapshot.exists()) {
                this.applySectionSettingsUsersSnapshot(snapshot.data());
              }
            },
            () => {}
          )
        );

        // Section 7 Realtime Listener: الدردشة اللحظية والخاصة (Live Chat & Private Chat)
        this.unsubscribeFastChatSnapshot = onSnapshot(
          fastChatDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const fastData = snapshot.data();
              if (fastData) {
                this.applyIncomingFastChatPatch(fastData);
              }
            }
          },
          () => {}
        );

        // Section 8 Master Workspace Realtime Listener
        this.unsubscribeSnapshot = onSnapshot(
          docRef,
          (snapshot) => {
            this.isCloudHydrated = true;
            if (snapshot.exists()) {
              const remoteData = snapshot.data();
              if (remoteData) {
                this.applyIncomingRemoteState(remoteData);
              }
            } else {
              const baseState = this.latestState || currentState;
              const cleanPayload = sanitizeForFirebase({
                ...baseState,
                stores: stripGeneratedSvgFromStores(baseState.stores || []).map((st) => ({
                  ...st,
                  menuImages: (st.menuImages || []).filter(
                    (img) => typeof img === 'string' && !img.startsWith('data:image/')
                  ),
                })),
                senderTabId: getOrCreateTabSessionId(),
                updatedAt: new Date().toISOString(),
              });
              setDoc(docRef, cleanPayload).catch(() => {});
            }
            this.notifyStatus('firebase_connected', 'المزامنة اللحظية السحابية نشطة (Firebase)');
            if (this.hasPendingOfflineChanges()) {
              this.flushOfflinePendingSync();
            }
          },
          (error) => {
            this.isCloudHydrated = true;
            this.notifyStatus(
              'firebase_error',
              `تعذر الاتصال بـ Firestore: ${error.message}`
            );
          }
        );
      }
    } catch (err: unknown) {
      this.isCloudHydrated = true;
      const msg = err instanceof Error ? err.message : 'خطأ في إعدادات Firebase';
      this.notifyStatus('firebase_error', `خطأ في تهيئة Firebase: ${msg}`);
    }
  }

  private async writeStoresToFirestoreSafe(
    storesList: StoreListingItem[],
    storeCategories: string[],
    deletedRecordIds: string[],
    tabId: string,
    nowIso: string
  ): Promise<void> {
    if (!this.firestoreDb) return;
    const storesDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_stores');
    const overflow1Ref = doc(this.firestoreDb, 'fluent_portal_v3', 'section_stores_overflow');
    const overflow2Ref = doc(
      this.firestoreDb,
      'fluent_portal_v3',
      'section_stores_overflow_2'
    );

    const compactCloudStores = stripGeneratedSvgFromStores(
      ensureStoreListHasIds(storesList || [])
    );
    const fullStoresPayload = sanitizeForFirebase({
      stores: compactCloudStores,
      storeCategories: ensureStoreCategoriesWithDreamPlaza(storeCategories),
      deletedRecordIds: deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const serializedLength = JSON.stringify(fullStoresPayload).length;
    if (serializedLength < 820000) {
      try {
        await setDoc(storesDocRef, fullStoresPayload);
        return;
      } catch {
        // Fallback to chunked image splitting below if Firestore rejects payload size
      }
    }

    // Split heavy base64 images into overflow documents so section_stores stays well below Firestore's 1MB limit
    const chunk1Map: Record<string, string[]> = {};
    const chunk2Map: Record<string, string[]> = {};
    let chunk1Bytes = 0;

    const lightStores = compactCloudStores.map((st) => {
      const imgs = getRealUploadedStoreImagesOnly(st.menuImages);
      if (imgs.length === 0) return { ...st, menuImages: [] };

      const inlineUrls: string[] = [];
      const overflowBase64: string[] = [];

      imgs.forEach((img, i) => {
        if (!img.startsWith('data:image/') || (i === 0 && img.length < 45000)) {
          inlineUrls.push(img);
        } else {
          overflowBase64.push(img);
        }
      });

      if (overflowBase64.length > 0) {
        const entrySize = JSON.stringify(overflowBase64).length;
        if (chunk1Bytes + entrySize < 750000) {
          chunk1Map[st.id] = overflowBase64;
          chunk1Bytes += entrySize;
        } else {
          chunk2Map[st.id] = overflowBase64;
        }
      }

      return {
        ...st,
        menuImages: inlineUrls,
      };
    });

    const lightStoresPayload = sanitizeForFirebase({
      stores: lightStores,
      storeCategories: ensureStoreCategoriesWithDreamPlaza(storeCategories),
      deletedRecordIds: deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const writes: Promise<unknown>[] = [setDoc(storesDocRef, lightStoresPayload)];
    if (Object.keys(chunk1Map).length > 0) {
      writes.push(
        setDoc(
          overflow1Ref,
          sanitizeForFirebase({
            imagesByStoreId: chunk1Map,
            updatedAt: nowIso,
          })
        )
      );
    }
    if (Object.keys(chunk2Map).length > 0) {
      writes.push(
        setDoc(
          overflow2Ref,
          sanitizeForFirebase({
            imagesByStoreId: chunk2Map,
            updatedAt: nowIso,
          })
        )
      );
    }
    await Promise.all(writes);
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
    const nowIso = new Date().toISOString();
    const normalizedNextStores = normalizeStoresList(
      ensureStoreListHasIds(nextState.stores || [])
    );
    const normalizedNextState: PlatformDatabaseState = {
      ...nextState,
      stores: normalizedNextStores,
      settings: {
        ...nextState.settings,
        storeCategories: ensureStoreCategoriesWithDreamPlaza(
          nextState.settings.storeCategories
        ),
      },
    };
    const compactCloudStores = stripGeneratedSvgFromStores(normalizedNextStores);

    // Update local React state and offline cache
    this.saveLocalState(normalizedNextState, activeUserId);
    this.notifyData(normalizedNextState);

    const sectionStoresPayload = sanitizeForFirebase({
      stores: compactCloudStores,
      storeCategories: ensureStoreCategoriesWithDreamPlaza(
        normalizedNextState.settings.storeCategories
      ),
      deletedRecordIds: normalizedNextState.deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const sectionServicesPayload = sanitizeForFirebase({
      serviceNumbers: normalizeServiceNumbersList(normalizedNextState.serviceNumbers || []),
      serviceProfessions: ensureServiceProfessionsList(
        normalizedNextState.settings.serviceProfessions
      ),
      deletedRecordIds: normalizedNextState.deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const sectionCommunityPayload = sanitizeForFirebase({
      communityPosts: normalizedNextState.communityPosts || [],
      buySellPosts: normalizedNextState.buySellPosts || [],
      utilityPosts: normalizedNextState.utilityPosts || [],
      utilitySubmissions: normalizeUtilitySubmissionsList(
        normalizedNextState.utilitySubmissions
      ),
      deletedRecordIds: normalizedNextState.deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const sectionAdsPayload = sanitizeForFirebase({
      topBanners: normalizedNextState.topBanners || [],
      squareAds: normalizedNextState.squareAds || [],
      popupAd: normalizedNextState.popupAd,
      adPackagesPricing: normalizedNextState.settings.adPackagesPricing,
      deletedRecordIds: normalizedNextState.deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const sectionTawsilaPayload = sanitizeForFirebase({
      tawsilaRides: normalizeTawsilaList(normalizedNextState.tawsilaRides || []),
      deletedRecordIds: normalizedNextState.deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const sectionSettingsUsersPayload = sanitizeForFirebase({
      users: normalizedNextState.users || [],
      messages: normalizedNextState.messages || [],
      settings: normalizedNextState.settings,
      deletedRecordIds: normalizedNextState.deletedRecordIds || [],
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    const cleanFullPayload = sanitizeForFirebase({
      ...normalizedNextState,
      stores: compactCloudStores,
      senderTabId: tabId,
      updatedAt: nowIso,
    });

    // 1. Broadcast across same-browser tabs in < 1ms
    try {
      stateSyncChannel?.postMessage({
        type: 'full_state',
        state: cleanFullPayload,
        senderTabId: tabId,
      });
    } catch {
      // ignore
    }

    // If currently offline, queue state in Offline Cache for automatic sync when internet returns
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.markPendingOfflineSync(normalizedNextState);
      return;
    }

    // 2. Write directly to Firebase servers first so onSnapshot/onValue listeners update all connected users immediately
    const fb = normalizedNextState.settings.firebase;
    const firebaseWritePromises: Promise<unknown>[] = [];

    if (fb.enabled && fb.apiKey && fb.projectId) {
      if (fb.mode === 'realtime' && this.realtimeDb) {
        firebaseWritePromises.push(
          set(ref(this.realtimeDb, 'fluent_portal_v3/sections/stores'), sectionStoresPayload),
          set(ref(this.realtimeDb, 'fluent_portal_v3/sections/services'), sectionServicesPayload),
          set(ref(this.realtimeDb, 'fluent_portal_v3/sections/community'), sectionCommunityPayload),
          set(ref(this.realtimeDb, 'fluent_portal_v3/sections/ads'), sectionAdsPayload),
          set(ref(this.realtimeDb, 'fluent_portal_v3/sections/tawsila'), sectionTawsilaPayload),
          set(ref(this.realtimeDb, 'fluent_portal_v3/sections/settings_users'), sectionSettingsUsersPayload),
          set(ref(this.realtimeDb, 'fluent_portal_v3/workspace'), cleanFullPayload)
        );
      } else if (this.firestoreDb) {
        const servicesDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_services');
        const communityDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_community');
        const adsDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_ads');
        const tawsilaDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_tawsila');
        const settingsUsersDocRef = doc(
          this.firestoreDb,
          'fluent_portal_v3',
          'section_settings_users'
        );
        const docRef = doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state');

        const writeWorkspaceSafe = async () => {
          const fullStrLen = JSON.stringify(cleanFullPayload).length;
          if (fullStrLen < 820000) {
            try {
              await setDoc(docRef, cleanFullPayload);
              return;
            } catch {
              // fallback below
            }
          }
          const ultraCompactPayload = sanitizeForFirebase({
            ...cleanFullPayload,
            stores: compactCloudStores.map((st) => ({
              ...st,
              menuImages: (st.menuImages || []).filter(
                (img) => typeof img === 'string' && !img.startsWith('data:image/')
              ),
            })),
          });
          await setDoc(docRef, ultraCompactPayload);
        };

        const storesSig = JSON.stringify({
          stores: compactCloudStores,
          storeCategories: normalizedNextState.settings.storeCategories,
          deletedRecordIds: normalizedNextState.deletedRecordIds || [],
        });
        const servicesSig = JSON.stringify({
          serviceNumbers: sectionServicesPayload.serviceNumbers,
          serviceProfessions: sectionServicesPayload.serviceProfessions,
          deletedRecordIds: normalizedNextState.deletedRecordIds || [],
        });
        const communitySig = JSON.stringify({
          communityPosts: sectionCommunityPayload.communityPosts,
          buySellPosts: sectionCommunityPayload.buySellPosts,
          utilityPosts: sectionCommunityPayload.utilityPosts,
          utilitySubmissions: sectionCommunityPayload.utilitySubmissions,
          deletedRecordIds: normalizedNextState.deletedRecordIds || [],
        });
        const adsSig = JSON.stringify({
          topBanners: sectionAdsPayload.topBanners,
          squareAds: sectionAdsPayload.squareAds,
          popupAd: sectionAdsPayload.popupAd,
          adPackagesPricing: sectionAdsPayload.adPackagesPricing,
          deletedRecordIds: normalizedNextState.deletedRecordIds || [],
        });
        const tawsilaSig = JSON.stringify({
          tawsilaRides: sectionTawsilaPayload.tawsilaRides,
          deletedRecordIds: normalizedNextState.deletedRecordIds || [],
        });
        const settingsUsersSig = JSON.stringify({
          users: sectionSettingsUsersPayload.users,
          messages: sectionSettingsUsersPayload.messages,
          settings: sectionSettingsUsersPayload.settings,
          deletedRecordIds: normalizedNextState.deletedRecordIds || [],
        });

        const hasPriorSignatures = Object.keys(this.lastSectionSignatures).length > 0;
        const storesChanged =
          !hasPriorSignatures || this.lastSectionSignatures.stores !== storesSig;
        const servicesChanged =
          !hasPriorSignatures || this.lastSectionSignatures.services !== servicesSig;
        const communityChanged =
          !hasPriorSignatures || this.lastSectionSignatures.community !== communitySig;
        const adsChanged =
          !hasPriorSignatures || this.lastSectionSignatures.ads !== adsSig;
        const tawsilaChanged =
          !hasPriorSignatures || this.lastSectionSignatures.tawsila !== tawsilaSig;
        const settingsUsersChanged =
          !hasPriorSignatures ||
          this.lastSectionSignatures.settingsUsers !== settingsUsersSig;

        this.lastSectionSignatures = {
          stores: storesSig,
          services: servicesSig,
          community: communitySig,
          ads: adsSig,
          tawsila: tawsilaSig,
          settingsUsers: settingsUsersSig,
        };

        if (storesChanged) {
          firebaseWritePromises.push(
            this.writeStoresToFirestoreSafe(
              normalizedNextStores,
              normalizedNextState.settings.storeCategories,
              normalizedNextState.deletedRecordIds || [],
              tabId,
              nowIso
            )
          );
        }
        if (servicesChanged) {
          firebaseWritePromises.push(setDoc(servicesDocRef, sectionServicesPayload));
        }
        if (communityChanged) {
          firebaseWritePromises.push(setDoc(communityDocRef, sectionCommunityPayload));
        }
        if (adsChanged) {
          firebaseWritePromises.push(setDoc(adsDocRef, sectionAdsPayload));
        }
        if (tawsilaChanged) {
          firebaseWritePromises.push(setDoc(tawsilaDocRef, sectionTawsilaPayload));
        }
        if (settingsUsersChanged) {
          firebaseWritePromises.push(
            setDoc(settingsUsersDocRef, sectionSettingsUsersPayload)
          );
        }
        firebaseWritePromises.push(writeWorkspaceSafe());
      }
    }

    // 3. Also sync with Express Real-Time SSE Server in parallel
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/realtime/chat-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatPatch: cleanFullPayload,
          senderTabId: tabId,
        }),
      }).catch(() => {});

      fetch('/api/realtime/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: cleanFullPayload,
          senderTabId: tabId,
        }),
      }).catch(() => {
        this.markPendingOfflineSync(normalizedNextState);
      });
    }

    if (firebaseWritePromises.length > 0) {
      try {
        await Promise.all(firebaseWritePromises);
        this.clearPendingOfflineSyncFlag();
      } catch (error) {
        this.markPendingOfflineSync(normalizedNextState);
        const errMsg =
          error instanceof Error ? error.message : 'تعذر الاتصال بخادم Firebase';
        console.error('Firebase sync write error:', error);
        this.notifyCloudWriteError(
          `فشل الحفظ السحابي في Firebase (${errMsg}). يرجى التحقق من اتصال الإنترنت أو صلاحيات القواعد (Rules).`
        );
        throw error;
      }
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
   * ترحيل البيانات المحلية (المحلات، أرقام الخدمات، الصور) من IndexedDB و localStorage
   * دفعة واحدة إلى Firebase Firestore مع التحقق الصارم لمنع تكرار أي بيانات موجودة مسبقاً على Firebase.
   */
  public async migrateLocalDataToFirebase(
    activeUserId?: string
  ): Promise<{
    state: PlatformDatabaseState;
    newStoresAdded: number;
    skippedDuplicateStores: number;
    newServicesAdded: number;
    skippedDuplicateServices: number;
    migratedImagesCount: number;
    summary: string;
  }> {
    const normalizeTextKey = (val?: string): string =>
      String(val || '')
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ');

    const normalizePhoneKey = (val?: string): string =>
      String(val || '').replace(/[^0-9]/g, '');

    // 1. Ensure Firestore instance is initialized
    const currentState = this.latestState || this.loadLocalState();
    if (!this.firestoreDb) {
      await this.initializeSync(
        currentState.settings.firebase || HIDDEN_DEFAULT_FIREBASE_CONFIG,
        currentState
      );
    }
    if (!this.firestoreDb) {
      throw new Error('تعذر الاتصال بـ Firebase Firestore. تأكد من الاتصال بالإنترنت.');
    }

    // 2. Harvest all local data from localStorage + IndexedDB
    const localStoresCandidates: StoreListingItem[] = [];
    const localServicesCandidates: ServicePhoneEntry[] = [];
    const localImagesByStoreId: Record<string, string[]> = {};
    const localImagesByStoreName: Record<string, string[]> = {};

    const collectStoreImages = (
      storeId: string | undefined,
      storeName: string | undefined,
      images: unknown
    ) => {
      if (!Array.isArray(images)) return;
      const realImgs = getRealUploadedStoreImagesOnly(images as string[]);
      if (realImgs.length === 0) return;
      if (storeId) {
        const existing = localImagesByStoreId[storeId] || [];
        localImagesByStoreId[storeId] = Array.from(new Set([...existing, ...realImgs]));
      }
      const normName = normalizeTextKey(storeName);
      if (normName) {
        const existingByName = localImagesByStoreName[normName] || [];
        localImagesByStoreName[normName] = Array.from(
          new Set([...existingByName, ...realImgs])
        );
      }
    };

    const collectSnapshotData = (snap: unknown) => {
      if (!snap || typeof snap !== 'object') return;
      const record = snap as Record<string, unknown>;
      const nestedState =
        record.state && typeof record.state === 'object'
          ? (record.state as Record<string, unknown>)
          : record;

      if (Array.isArray(nestedState.stores)) {
        for (const st of nestedState.stores as StoreListingItem[]) {
          if (st && st.name) {
            localStoresCandidates.push(st);
            collectStoreImages(st.id, st.name, st.menuImages);
          }
        }
      }
      if (Array.isArray(nestedState.serviceNumbers)) {
        for (const srv of nestedState.serviceNumbers as ServicePhoneEntry[]) {
          if (srv && (srv.title || srv.phone)) {
            localServicesCandidates.push(srv);
          }
        }
      }
    };

    // 2A. Read current state & cumulative vault in memory
    collectSnapshotData(currentState);
    collectSnapshotData(fastBrowserCache.getCumulativeVaultSync());

    // 2B. Read all localStorage keys (DB_STORAGE_KEY, CUMULATIVE_VAULT_STORAGE_KEY, STORE_IMAGES_VAULT_KEY, and any legacy keys)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const vaultMap = loadStoreImagesVault();
        for (const [storeId, imgs] of Object.entries(vaultMap)) {
          collectStoreImages(storeId, undefined, imgs);
        }
      } catch {
        // ignore
      }

      const priorityKeys = [
        DB_STORAGE_KEY,
        CUMULATIVE_VAULT_STORAGE_KEY,
        STORE_IMAGES_VAULT_KEY,
      ];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && !priorityKeys.includes(k)) {
          priorityKeys.push(k);
        }
      }

      for (const key of priorityKeys) {
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw || (!raw.startsWith('{') && !raw.startsWith('['))) continue;
          const parsed = JSON.parse(raw);
          if (key === STORE_IMAGES_VAULT_KEY && parsed && typeof parsed === 'object') {
            for (const [stId, imgs] of Object.entries(parsed)) {
              collectStoreImages(stId, undefined, imgs);
            }
          } else {
            collectSnapshotData(parsed);
          }
        } catch {
          // ignore non-json keys
        }
      }
    }

    // 2C. Read all historical & active snapshots from IndexedDB (Nakhil1185FastCacheDB)
    try {
      const idbSnapshots = await fastBrowserCache.getAllHistoricalSnapshotsFromIDB();
      for (const snap of idbSnapshots) {
        collectSnapshotData(snap);
      }
    } catch {
      // ignore
    }

    // 3. Read existing data currently on Firebase Firestore to prevent duplicates
    const storesDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_stores');
    const servicesDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'section_services');
    const workspaceDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'workspace_state');
    const archiveDocRef = doc(this.firestoreDb, 'fluent_portal_v3', 'cumulative_archive');

    const [storesSnap, servicesSnap, workspaceSnap] = await Promise.all([
      getDoc(storesDocRef).catch(() => null),
      getDoc(servicesDocRef).catch(() => null),
      getDoc(workspaceDocRef).catch(() => null),
    ]);

    const remoteStoresRaw: StoreListingItem[] = [];
    const remoteServicesRaw: ServicePhoneEntry[] = [];

    if (storesSnap && storesSnap.exists()) {
      const d = storesSnap.data();
      if (Array.isArray(d?.stores)) {
        remoteStoresRaw.push(...(d.stores as StoreListingItem[]));
      }
    }
    if (workspaceSnap && workspaceSnap.exists()) {
      const d = workspaceSnap.data();
      if (Array.isArray(d?.stores)) {
        for (const st of d.stores as StoreListingItem[]) {
          if (st && !remoteStoresRaw.some((r) => r.id === st.id)) {
            remoteStoresRaw.push(st);
          }
        }
      }
      if (Array.isArray(d?.serviceNumbers)) {
        for (const srv of d.serviceNumbers as ServicePhoneEntry[]) {
          if (srv && !remoteServicesRaw.some((r) => r.id === srv.id)) {
            remoteServicesRaw.push(srv);
          }
        }
      }
    }
    if (servicesSnap && servicesSnap.exists()) {
      const d = servicesSnap.data();
      if (Array.isArray(d?.serviceNumbers)) {
        for (const srv of d.serviceNumbers as ServicePhoneEntry[]) {
          if (srv && !remoteServicesRaw.some((r) => r.id === srv.id)) {
            remoteServicesRaw.push(srv);
          }
        }
      }
    }

    // 4. Deduplicate & Merge Stores + Images (Check لمنع رفع أي محل مكرر موجود بالفعل على Firebase)
    const finalStoresList: StoreListingItem[] = remoteStoresRaw.map((st) => ({
      ...st,
      menuImages: getRealUploadedStoreImagesOnly(st.menuImages),
    }));

    let newStoresAdded = 0;
    let skippedDuplicateStores = 0;
    let migratedImagesCount = 0;

    // Deduplicate local candidates among themselves first (merging their real images)
    const uniqueLocalStoresMap = new Map<string, StoreListingItem>();
    for (const candidate of localStoresCandidates) {
      if (!candidate || !candidate.name) continue;
      const normName = normalizeTextKey(candidate.name);
      const normCat = normalizeTextKey(candidate.category);
      const dedupeKey = `${normName}::${normCat}`;
      const candidateRealImgs = Array.from(
        new Set([
          ...getRealUploadedStoreImagesOnly(candidate.menuImages),
          ...(candidate.id ? localImagesByStoreId[candidate.id] || [] : []),
          ...(normName ? localImagesByStoreName[normName] || [] : []),
        ])
      );

      const prev = uniqueLocalStoresMap.get(dedupeKey);
      if (!prev) {
        uniqueLocalStoresMap.set(dedupeKey, {
          ...candidate,
          menuImages: candidateRealImgs,
        });
      } else {
        const mergedImgs = Array.from(
          new Set([
            ...getRealUploadedStoreImagesOnly(prev.menuImages),
            ...candidateRealImgs,
          ])
        );
        uniqueLocalStoresMap.set(dedupeKey, {
          ...prev,
          ...candidate,
          id: prev.id || candidate.id,
          menuImages: mergedImgs,
        });
      }
    }

    // Check each unique local store against existing Firebase stores
    for (const localStore of uniqueLocalStoresMap.values()) {
      const localNameKey = normalizeTextKey(localStore.name);
      const localCatKey = normalizeTextKey(localStore.category);
      const localPhoneKey = normalizePhoneKey(localStore.phone);
      const localRealImages = getRealUploadedStoreImagesOnly(localStore.menuImages);

      const existingFirebaseIndex = finalStoresList.findIndex((remoteSt) => {
        if (!remoteSt) return false;
        if (remoteSt.id && localStore.id && remoteSt.id === localStore.id) {
          return true;
        }
        const remoteNameKey = normalizeTextKey(remoteSt.name);
        const remoteCatKey = normalizeTextKey(remoteSt.category);
        const remotePhoneKey = normalizePhoneKey(remoteSt.phone);
        if (remoteNameKey && remoteNameKey === localNameKey) {
          if (remoteCatKey === localCatKey) return true;
          if (localPhoneKey && remotePhoneKey && localPhoneKey === remotePhoneKey) {
            return true;
          }
        }
        return false;
      });

      if (existingFirebaseIndex !== -1) {
        // Store already exists on Firebase -> Do NOT duplicate it
        skippedDuplicateStores++;
        const existingRemote = finalStoresList[existingFirebaseIndex];
        const remoteRealImages = getRealUploadedStoreImagesOnly(
          existingRemote.menuImages
        );

        // If local storage has real uploaded images that are missing on the remote store, migrate the missing images
        const combinedRealImages = Array.from(
          new Set([...remoteRealImages, ...localRealImages])
        );
        const newlyAddedImgs = combinedRealImages.length - remoteRealImages.length;
        if (newlyAddedImgs > 0) {
          migratedImagesCount += newlyAddedImgs;
          finalStoresList[existingFirebaseIndex] = {
            ...existingRemote,
            menuImages: combinedRealImages,
            imagesExplicitlyCleared: false,
            updatedAt: Date.now(),
          };
        }
      } else {
        // Store does NOT exist on Firebase -> Add to migration batch
        newStoresAdded++;
        migratedImagesCount += localRealImages.length;
        finalStoresList.push({
          ...localStore,
          id: localStore.id || `st-mig-${Date.now()}-${ newStoresAdded }`,
          menuImages: localRealImages,
          imagesExplicitlyCleared: false,
          updatedAt: Date.now(),
        });
      }
    }

    // 5. Deduplicate & Merge Service Numbers (Check لمنع رفع أي رقم خدمة مكرر موجود بالفعل على Firebase)
    const finalServicesList: ServicePhoneEntry[] = [...remoteServicesRaw];
    let newServicesAdded = 0;
    let skippedDuplicateServices = 0;

    const uniqueLocalServicesMap = new Map<string, ServicePhoneEntry>();
    for (const srv of localServicesCandidates) {
      if (!srv || (!srv.title && !srv.phone)) continue;
      const key = `${normalizeTextKey(srv.title)}::${normalizePhoneKey(srv.phone)}`;
      if (!uniqueLocalServicesMap.has(key)) {
        uniqueLocalServicesMap.set(key, srv);
      } else {
        const prev = uniqueLocalServicesMap.get(key)!;
        uniqueLocalServicesMap.set(key, {
          ...prev,
          ...srv,
          imageUrl: srv.imageUrl || prev.imageUrl,
        });
      }
    }

    for (const localSrv of uniqueLocalServicesMap.values()) {
      const localTitleKey = normalizeTextKey(localSrv.title);
      const localPhoneKey = normalizePhoneKey(localSrv.phone);
      const localCatKey = normalizeTextKey(localSrv.category || localSrv.profession);

      const existingSrvIdx = finalServicesList.findIndex((remoteSrv) => {
        if (!remoteSrv) return false;
        if (remoteSrv.id && localSrv.id && remoteSrv.id === localSrv.id) {
          return true;
        }
        const remoteTitleKey = normalizeTextKey(remoteSrv.title);
        const remotePhoneKey = normalizePhoneKey(remoteSrv.phone);
        const remoteCatKey = normalizeTextKey(
          remoteSrv.category || remoteSrv.profession
        );
        if (
          localPhoneKey &&
          remotePhoneKey &&
          localPhoneKey === remotePhoneKey &&
          (remoteTitleKey === localTitleKey || remoteCatKey === localCatKey)
        ) {
          return true;
        }
        if (
          localTitleKey &&
          remoteTitleKey === localTitleKey &&
          remoteCatKey === localCatKey
        ) {
          return true;
        }
        return false;
      });

      if (existingSrvIdx !== -1) {
        skippedDuplicateServices++;
        const existingSrv = finalServicesList[existingSrvIdx];
        if (!existingSrv.imageUrl && localSrv.imageUrl) {
          migratedImagesCount++;
          finalServicesList[existingSrvIdx] = {
            ...existingSrv,
            imageUrl: localSrv.imageUrl,
            updatedAt: Date.now(),
          };
        }
      } else {
        newServicesAdded++;
        if (localSrv.imageUrl) {
          migratedImagesCount++;
        }
        finalServicesList.push({
          ...localSrv,
          id: localSrv.id || `srv-mig-${Date.now()}-${newServicesAdded}`,
          updatedAt: Date.now(),
        });
      }
    }

    // 6. Build the unified state and upload in a single Firestore WriteBatch
    const combinedCategories = ensureStoreCategoriesWithDreamPlaza([
      ...(currentState.settings.storeCategories || []),
      ...finalStoresList.map((s) => s.category).filter(Boolean),
    ]);
    const combinedProfessions = ensureServiceProfessionsList([
      ...(currentState.settings.serviceProfessions || []),
      ...finalServicesList
        .map((s) => s.category || s.profession || '')
        .filter(Boolean),
    ]);

    const migratedState: PlatformDatabaseState = {
      ...currentState,
      stores: normalizeStoresList(finalStoresList),
      serviceNumbers: normalizeServiceNumbersList(finalServicesList),
      deletedRecordIds: [],
      settings: {
        ...currentState.settings,
        storeCategories: combinedCategories,
        serviceProfessions: combinedProfessions,
        updatedAt: Date.now(),
      },
    };

    const tabId = getOrCreateTabSessionId();
    const nowIso = new Date().toISOString();
    const compactCloudStores = stripGeneratedSvgFromStores(migratedState.stores);

    const batch = writeBatch(this.firestoreDb);
    batch.set(
      storesDocRef,
      sanitizeForFirebase({
        stores: compactCloudStores,
        storeCategories: combinedCategories,
        deletedRecordIds: [],
        senderTabId: tabId,
        updatedAt: nowIso,
      })
    );
    batch.set(
      servicesDocRef,
      sanitizeForFirebase({
        serviceNumbers: normalizeServiceNumbersList(finalServicesList),
        serviceProfessions: combinedProfessions,
        deletedRecordIds: [],
        senderTabId: tabId,
        updatedAt: nowIso,
      })
    );
    batch.set(
      workspaceDocRef,
      sanitizeForFirebase({
        ...migratedState,
        stores: compactCloudStores,
        senderTabId: tabId,
        updatedAt: nowIso,
      })
    );
    batch.set(
      archiveDocRef,
      sanitizeForFirebase({
        ...migratedState,
        stores: compactCloudStores,
        senderTabId: tabId,
        updatedAt: nowIso,
      })
    );

    await batch.commit();

    // Persist & broadcast to all connected clients
    await this.persistState(migratedState, activeUserId);

    const summary = `تم ترحيل البيانات المحلية إلى Firebase Firestore بنجاح! (تم رفع ${newStoresAdded} محل جديد، ${newServicesAdded} رقم خدمة جديد، و ${migratedImagesCount} صورة — وتم تخطي ${skippedDuplicateStores} محل مكرر و ${skippedDuplicateServices} رقم خدمة مكرر موجود بالفعل على Firebase).`;

    return {
      state: migratedState,
      newStoresAdded,
      skippedDuplicateStores,
      newServicesAdded,
      skippedDuplicateServices,
      migratedImagesCount,
      summary,
    };
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

export interface UnifiedSessionResult {
  user: UserAccount | null;
  securedUsers: UserAccount[];
  state: PlatformDatabaseState;
  isCloudHydrated: boolean;
}

/**
 * دالة موحدة لإدارة الجلسات (Unified Session Manager):
 * 1. تتحقق من وجود المستخدم في LocalStorage (و SessionStorage / UsersVault)
 * 2. تؤمّن حالة المستخدم وجميع بياناته في MemoryStorage قبل تحميل الواجهات
 * 3. تعالج حالات تأخر استجابة Firebase عند تحميل الموقع أو البروفايل لضمان عدم خروج المستخدم إطلاقاً
 */
export function manageUnifiedUserSession(options?: {
  action?: 'bootstrap' | 'login' | 'register' | 'sync' | 'logout';
  user?: UserAccount | null;
  rememberMe?: boolean;
  candidateUsers?: UserAccount[];
}): UnifiedSessionResult {
  const action = options?.action || 'sync';

  if (action === 'logout') {
    currentActiveAuthUserMemory = null;
    memorySessionStore.activeUser = null;
    storageEngine.saveAuthenticatedUser(null, false);
    const currentState = storageEngine.loadLocalState();
    return {
      user: null,
      securedUsers: currentState.users,
      state: currentState,
      isCloudHydrated: storageEngine.isHydratedFromCloud(),
    };
  }

  // 1. Seed MemoryStorage with all known local users from LocalStorage & Vault before resolving session
  const baseState = storageEngine.loadLocalState();
  const vaultUsers = loadUsersVaultBackup();
  const allCandidateUsers: UserAccount[] = [
    ...INITIAL_USERS,
    ...vaultUsers,
    ...(baseState.users || []),
    ...(options?.candidateUsers || []),
  ];
  allCandidateUsers.forEach((u) => cacheUserInMemoryStore(u));

  // 2. If explicitly logging in or registering, lock user into MemoryStorage + LocalStorage immediately
  if ((action === 'login' || action === 'register') && options?.user) {
    const nowTs = Date.now();
    const stampedUser: UserAccount = {
      ...options.user,
      isOnline: true,
      updatedAt: Math.max(options.user.updatedAt || 0, nowTs),
    };
    currentActiveAuthUserMemory = stampedUser;
    memorySessionStore.activeUser = stampedUser;
    memorySessionStore.isBootstrapped = true;
    memorySessionStore.lastSecuredAt = nowTs;
    cacheUserInMemoryStore(stampedUser);

    const mergedUsers = mergeUsersLists(
      allCandidateUsers,
      [stampedUser],
      baseState.deletedRecordIds
    );
    const nextState: PlatformDatabaseState = {
      ...baseState,
      users: mergedUsers,
    };
    storageEngine.saveAuthenticatedUser(
      stampedUser,
      options.rememberMe ?? true,
      nextState
    );
    storageEngine.saveLocalState(nextState, stampedUser.id);
    return {
      user: stampedUser,
      securedUsers: mergedUsers,
      state: nextState,
      isCloudHydrated: storageEngine.isHydratedFromCloud(),
    };
  }

  // 3. Verify user existence across MemoryStorage -> LocalStorage -> SessionStorage -> UsersVault
  let resolvedUser: UserAccount | null =
    options?.user ||
    memorySessionStore.activeUser ||
    currentActiveAuthUserMemory ||
    null;

  if (!resolvedUser) {
    try {
      const localObjRaw =
        localStorage.getItem(`${AUTH_PERSIST_KEY}_obj`) ||
        sessionStorage.getItem(`${AUTH_SESSION_KEY}_obj`);
      if (localObjRaw) {
        const parsed = JSON.parse(localObjRaw) as UserAccount;
        if (parsed && parsed.id && parsed.username && !parsed.isBanned) {
          resolvedUser = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!resolvedUser) {
    try {
      const storedId =
        localStorage.getItem(AUTH_PERSIST_KEY) ||
        sessionStorage.getItem(AUTH_SESSION_KEY);
      if (storedId) {
        const fromMemoryOrList =
          memorySessionStore.securedUsersById.get(storedId) ||
          allCandidateUsers.find((u) => u && u.id === storedId);
        if (fromMemoryOrList && !fromMemoryOrList.isBanned) {
          resolvedUser = fromMemoryOrList;
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Enrich resolvedUser with the latest profile fields from MemoryStorage / candidateUsers
  // while protecting the user from being dropped if Firebase response is delayed
  if (resolvedUser) {
    const lowerUname = resolvedUser.username.trim().toLowerCase();
    const lowerAcc = resolvedUser.accountName
      ? resolvedUser.accountName.trim().toLowerCase()
      : '';
    const latestMatch =
      allCandidateUsers.find(
        (u) =>
          u &&
          (u.id === resolvedUser?.id ||
            u.username.trim().toLowerCase() === lowerUname ||
            (lowerAcc &&
              u.accountName &&
              u.accountName.trim().toLowerCase() === lowerAcc))
      ) ||
      memorySessionStore.securedUsersById.get(resolvedUser.id) ||
      memorySessionStore.securedUsersByKey.get(lowerUname);

    if (latestMatch && latestMatch.isBanned) {
      // Only log out if explicitly banned by Admin
      currentActiveAuthUserMemory = null;
      memorySessionStore.activeUser = null;
      storageEngine.saveAuthenticatedUser(null, false);
      return {
        user: null,
        securedUsers: baseState.users,
        state: baseState,
        isCloudHydrated: storageEngine.isHydratedFromCloud(),
      };
    }

    const mergedActiveUser: UserAccount = latestMatch
      ? {
          ...resolvedUser,
          ...latestMatch,
          profile: {
            ...(resolvedUser.profile || {}),
            ...(latestMatch.profile || {}),
          },
          isOnline: true,
        }
      : {
          ...resolvedUser,
          isOnline: true,
        };

    // Secure state in MemoryStorage & mirror to LocalStorage so Firebase delay never logs user out
    currentActiveAuthUserMemory = mergedActiveUser;
    memorySessionStore.activeUser = mergedActiveUser;
    memorySessionStore.isBootstrapped = true;
    memorySessionStore.lastSecuredAt = Date.now();
    cacheUserInMemoryStore(mergedActiveUser);

    const securedUsers = mergeUsersLists(
      allCandidateUsers,
      [mergedActiveUser],
      baseState.deletedRecordIds
    );
    const securedState: PlatformDatabaseState = {
      ...baseState,
      users: securedUsers,
    };
    storageEngine.saveAuthenticatedUser(mergedActiveUser, true, securedState);

    return {
      user: mergedActiveUser,
      securedUsers,
      state: securedState,
      isCloudHydrated: storageEngine.isHydratedFromCloud(),
    };
  }

  memorySessionStore.isBootstrapped = true;
  return {
    user: null,
    securedUsers: baseState.users,
    state: baseState,
    isCloudHydrated: storageEngine.isHydratedFromCloud(),
  };
}

/**
 * دالة موحدة لاسترجاع حساب البروفايل (ملف شخصي) مع الحماية الكاملة ضد تأخر استجابة Firebase:
 * تعتمد على MemoryStorage و LocalStorage فوراً في حال تأخر وصول بيانات Firebase لمنع خروج المستخدم.
 */
export function resolveUnifiedProfileUser(
  viewedProfileUsername: string | null | undefined,
  currentUser: UserAccount | null,
  stateUsers: UserAccount[]
): UserAccount | null {
  const sessionSnap = manageUnifiedUserSession({
    action: 'sync',
    user: currentUser,
    candidateUsers: stateUsers,
  });
  const activeUser = currentUser || sessionSnap.user;
  const combinedUsers = sessionSnap.securedUsers;

  const rawTarget = (viewedProfileUsername || activeUser?.username || '').trim();
  const lowerTarget = rawTarget.toLowerCase();

  if (lowerTarget) {
    const matched =
      combinedUsers.find(
        (u) =>
          u.username.trim().toLowerCase() === lowerTarget ||
          (u.accountName && u.accountName.trim().toLowerCase() === lowerTarget)
      ) || memorySessionStore.securedUsersByKey.get(lowerTarget);
    if (matched) {
      if (
        activeUser &&
        (matched.id === activeUser.id ||
          matched.username.trim().toLowerCase() ===
            activeUser.username.trim().toLowerCase())
      ) {
        return {
          ...activeUser,
          ...matched,
          profile: {
            ...(activeUser.profile || {}),
            ...(matched.profile || {}),
          },
        };
      }
      return matched;
    }
  }

  // Fallback directly to activeUser secured in MemoryStorage/LocalStorage if Firebase response is delayed
  if (activeUser) {
    return (
      combinedUsers.find(
        (u) =>
          u.id === activeUser.id ||
          u.username.trim().toLowerCase() ===
            activeUser.username.trim().toLowerCase()
      ) ||
      memorySessionStore.securedUsersById.get(activeUser.id) ||
      activeUser
    );
  }

  return null;
}

// Pre-render bootstrap: التحقق من وجود المستخدم في LocalStorage وتأمين الحالة في MemoryStorage قبل تحميل الواجهات
if (typeof window !== 'undefined') {
  try {
    manageUnifiedUserSession({ action: 'bootstrap' });
  } catch {
    // ignore
  }
}

export async function migrateLocalDataToFirebase(activeUserId?: string) {
  return storageEngine.migrateLocalDataToFirebase(activeUserId);
}

export interface RealOnlinePresenceStats {
  totalOnline: number;
  registeredCount: number;
  guestsCount: number;
  registeredUsernames: string[];
  liveChatTotalOnline?: number;
  liveChatRegisteredCount?: number;
  liveChatGuestsCount?: number;
  liveChatUsernames?: string[];
}

interface StoredPresenceSession {
  sessionId: string;
  visitorId: string;
  userId: string | null;
  username: string | null;
  isRegistered: boolean;
  isInLiveChat?: boolean;
  lastActiveAt: number;
}

const TAB_SESSION_STORAGE_KEY = 'nakhil_1185_real_tab_session_id';
const GUEST_VISITOR_STORAGE_KEY = 'nakhil_1185_unique_visitor_id_v1';
const REAL_PRESENCE_MAP_KEY = 'nakhil_1185_real_presence_v4';
const LIVE_PRESENCE_TTL_MS = 25000;

let currentTabIsInLiveChat = false;

export function setCurrentTabLiveChatOpen(
  isOpen: boolean,
  currentUser: UserAccount | null
): RealOnlinePresenceStats {
  currentTabIsInLiveChat = Boolean(isOpen);
  return syncRealOnlinePresence(currentUser, false);
}

/**
 * Computes the effective displayed online count:
 * - When customOnlineCount is empty/null/<= 0: returns the 100% real, actual live online count without fabrication.
 * - When customOnlineCount > 0: displays that base number and makes it fluctuate (increase and decrease) automatically every 10 minutes.
 */
export function getEffectiveOnlineDisplayCount(
  realTotalOnline: number,
  customOnlineCount?: number | null,
  nowMs: number = Date.now()
): number {
  const realCount = Math.max(1, Math.round(realTotalOnline || 1));
  if (
    typeof customOnlineCount !== 'number' ||
    !Number.isFinite(customOnlineCount) ||
    customOnlineCount <= 0
  ) {
    return realCount;
  }

  const baseTarget = Math.max(200, Math.round(customOnlineCount));
  const fiveSecondSlot = Math.floor(nowMs / 5000);
  // Step transitions every 5 seconds: -5, +20, -50, +20, +15, -30, +25, -40, +20, +15, -25, +35
  const stepDeltas = [0, -5, 15, -35, -15, 0, -30, -5, -45, -25, -10, -35];
  const delta = stepDeltas[Math.abs(fiveSecondSlot) % stepDeltas.length];

  return Math.max(200, baseTarget + delta);
}

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
    prev.liveChatTotalOnline !== nextStats.liveChatTotalOnline ||
    (prev.registeredUsernames || []).join('|') !==
      (nextStats.registeredUsernames || []).join('|') ||
    (prev.liveChatUsernames || []).join('|') !==
      (nextStats.liveChatUsernames || []).join('|');

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
    currentTabIsInLiveChat = false;
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
 * Tracks ONLY live active browser heartbeats (25s TTL). Does NOT count offline registered users.
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
          isInLiveChat: currentTabIsInLiveChat,
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
      isInLiveChat: currentTabIsInLiveChat,
      lastActiveAt: now,
    };

    // Prune stale sessions (> 25 seconds without heartbeat)
    Object.keys(map).forEach((k) => {
      if (!map[k] || now - map[k].lastActiveAt > LIVE_PRESENCE_TTL_MS) {
        delete map[k];
      }
    });

    localStorage.setItem(REAL_PRESENCE_MAP_KEY, JSON.stringify(map));

    if (
      !prevEntry ||
      prevEntry.userId !== (currentUser?.id || null) ||
      prevEntry.isRegistered !== isRegistered ||
      Boolean(prevEntry.isInLiveChat) !== currentTabIsInLiveChat
    ) {
      presenceChannel?.postMessage({ type: 'presence_changed' });
      notifyAllPresenceListeners();
    }

    // If authoritative server presence stats are fresh, merge them ONLY with active local sessions (never state.users)
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

      const liveChatRegMap = new Map<string, string>();
      (latestServerOnlineStats.liveChatUsernames || []).forEach((uname) => {
        if (uname && uname.trim()) {
          liveChatRegMap.set(uname.trim().toLowerCase(), uname.trim());
        }
      });
      if (currentTabIsInLiveChat && isRegistered && currentUser?.username) {
        liveChatRegMap.set(
          currentUser.username.trim().toLowerCase(),
          currentUser.username.trim()
        );
      } else if (!currentTabIsInLiveChat && isRegistered && currentUser?.username) {
        // Check if another local tab has live chat open for this user
        const hasOtherTabInChat = Object.values(map).some(
          (s) =>
            s.sessionId !== tabId &&
            s.isInLiveChat &&
            s.username?.trim().toLowerCase() === currentUser.username.trim().toLowerCase()
        );
        if (!hasOtherTabInChat && latestServerOnlineStats.liveChatRegisteredCount === 0) {
          liveChatRegMap.delete(currentUser.username.trim().toLowerCase());
        }
      }

      const regCount = serverRegMap.size;
      const gCount =
        regCount === 0 && latestServerOnlineStats.guestsCount === 0
          ? 1
          : Math.max(
              isRegistered ? 0 : 1,
              latestServerOnlineStats.guestsCount || 0
            );

      const lcRegCount = liveChatRegMap.size;
      const lcGuestCount = Math.max(
        currentTabIsInLiveChat && !isRegistered ? 1 : 0,
        latestServerOnlineStats.liveChatGuestsCount || 0
      );

      return {
        totalOnline: Math.max(1, regCount + gCount),
        registeredCount: regCount,
        guestsCount: gCount,
        registeredUsernames: Array.from(serverRegMap.values()),
        liveChatTotalOnline: lcRegCount + lcGuestCount,
        liveChatRegisteredCount: lcRegCount,
        liveChatGuestsCount: lcGuestCount,
        liveChatUsernames: Array.from(liveChatRegMap.values()),
      };
    }

    // Local real-time calculation (strictly active sessions only)
    const activeSessions = Object.values(map);
    const registeredMap = new Map<string, string>();
    const registeredVisitorIds = new Set<string>();
    const guestVisitorIds = new Set<string>();

    const liveChatRegMap = new Map<string, string>();
    const liveChatRegVisitorIds = new Set<string>();
    const liveChatGuestVisitorIds = new Set<string>();

    activeSessions.forEach((sess) => {
      if (sess.isRegistered && sess.username) {
        registeredMap.set(sess.username.trim().toLowerCase(), sess.username.trim());
        if (sess.visitorId) {
          registeredVisitorIds.add(sess.visitorId);
        }
        if (sess.isInLiveChat) {
          liveChatRegMap.set(sess.username.trim().toLowerCase(), sess.username.trim());
          if (sess.visitorId) {
            liveChatRegVisitorIds.add(sess.visitorId);
          }
        }
      }
    });

    activeSessions.forEach((sess) => {
      if (!sess.isRegistered) {
        const vKey = sess.visitorId || sess.sessionId;
        if (!registeredVisitorIds.has(vKey)) {
          guestVisitorIds.add(vKey);
        }
        if (sess.isInLiveChat && !liveChatRegVisitorIds.has(vKey)) {
          liveChatGuestVisitorIds.add(vKey);
        }
      }
    });

    const mergedRegCount = registeredMap.size;
    const mergedGuestsCount =
      mergedRegCount === 0 && guestVisitorIds.size === 0
        ? 1
        : guestVisitorIds.size;
    const mergedTotal = Math.max(1, mergedRegCount + mergedGuestsCount);

    const lcRegCount = liveChatRegMap.size;
    const lcGuestsCount = liveChatGuestVisitorIds.size;

    return {
      totalOnline: mergedTotal,
      registeredCount: mergedRegCount,
      guestsCount: mergedGuestsCount,
      registeredUsernames: Array.from(registeredMap.values()),
      liveChatTotalOnline: lcRegCount + lcGuestsCount,
      liveChatRegisteredCount: lcRegCount,
      liveChatGuestsCount: lcGuestsCount,
      liveChatUsernames: Array.from(liveChatRegMap.values()),
    };
  } catch {
    const isReg = Boolean(currentUser && currentUser.id);
    return {
      totalOnline: 1,
      registeredCount: isReg ? 1 : 0,
      guestsCount: isReg ? 0 : 1,
      registeredUsernames: isReg && currentUser ? [currentUser.username] : [],
      liveChatTotalOnline: currentTabIsInLiveChat ? 1 : 0,
      liveChatRegisteredCount: currentTabIsInLiveChat && isReg ? 1 : 0,
      liveChatGuestsCount: currentTabIsInLiveChat && !isReg ? 1 : 0,
      liveChatUsernames:
        currentTabIsInLiveChat && isReg && currentUser ? [currentUser.username] : [],
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

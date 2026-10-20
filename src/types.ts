export type MainSectionId =
  | 'directory'
  | 'services_numbers'
  | 'tawsila'
  | 'community'
  | 'settings';

export type UserRoleType = 'admin' | 'moderator' | 'user';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: UserRoleType;
  phone?: string;
  createdAt: string;
  isBanned?: boolean;
}

export interface TopBannerAd {
  id: string;
  title: string; // اسم المكان
  subtitle?: string;
  imageUrl: string; // الصورة الرئيسية للإعلان
  locationUrl?: string; // لوكيشن المكان
  phone?: string; // رقم الهاتف
  whatsappPhone?: string;
  linkUrl?: string; // أضف لينك
  targetSection?: string; // قسم داخلي من أقسام الموقع
  menuImages?: string[]; // صور إضافية أو منيو
  durationDays?: number;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface SquareMovingAd {
  id: string;
  title: string; // اسم المكان
  category: string;
  imageUrl: string; // الصورة الرئيسية
  locationUrl?: string; // لوكيشن المكان
  phone?: string; // رقم الهاتف
  linkUrl?: string; // أضف لينك
  targetSection?: string; // قسم داخلي من أقسام الموقع
  menuImages?: string[]; // صور إضافية أو منيو
  description?: string;
  isAdminPinned: boolean;
  durationDays?: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

export interface PopupAdConfig {
  id: string;
  active: boolean;
  title: string; // اسم المكان
  description: string;
  imageUrl: string; // الصورة الرئيسية
  locationUrl?: string; // لوكيشن المكان
  phone?: string; // رقم الهاتف
  buttonText: string;
  whatsappPhone?: string;
  linkUrl?: string; // أضف لينك
  targetSection?: string; // قسم داخلي من أقسام الموقع
  menuImages?: string[]; // صور إضافية أو منيو
  durationDays?: number;
  expiresAt?: string;
}

export interface AdminMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface StoreReplyItem {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  likes: string[]; // User IDs
  createdAt: string;
}

export interface StoreCommentItem {
  id: string;
  authorId: string;
  authorUsername: string;
  rating: number; // 1 to 5 stars
  text: string;
  likes: string[]; // User IDs who liked this comment
  replies: StoreReplyItem[]; // Nested replies
  createdAt: string;
}

export interface StoreListingItem {
  id: string;
  ownerId: string;
  ownerUsername: string;
  name: string;
  category: string;
  locationUrl: string; // Google Maps URL
  phone: string;
  whatsapp?: string;
  details: string; // تفاصيل المحل
  menuImages: string[]; // صور منيو المحل (الصفحة الأولى تظهر بأعلى الكارت)
  likes: string[]; // User IDs for Facebook-style 👍
  dislikes: string[]; // User IDs for Facebook-style 👎
  ratings: Record<string, number>; // Map of userId -> 1..5 stars
  comments: StoreCommentItem[];
  viewsCount?: number; // عدد المشاهدات لجميع المستخدمين
  address?: string;
  lat?: number;
  lng?: number;
  workingHours?: boolean | string;
  featuredInMarquee?: boolean;
  approved: boolean;
  createdAt: string;
}

export interface ServicePhoneEntry {
  id: string;
  title: string; // اسم مقدم الخدمة
  phone: string; // رقم الهاتف
  locationUrl: string; // خانة اللوكيشن (Google Maps)
  category?: string;
  secondaryPhone?: string;
  notes?: string;
  isEmergency?: boolean;
  createdAt: string;
}

export interface TawsilaRideItem {
  id: string;
  driverId: string;
  driverName: string; // اسم السواق
  phone: string; // رقم الهاتف
  nationalId: string; // رقم البطاقة
  criminalRecordImageUrl?: string; // صورة فيش وتشبيه
  adminApproved: boolean; // موافقة الإدارة
  acceptanceNotificationPending?: boolean; // عند الضغط على "تم القبول" تظهر للسائق شاشة منبثقة "تم قبول الإضافة" عند تسجيل الدخول
  vehicleType: string;
  fromArea: string;
  toArea: string;
  priceNote: string;
  availableNow: boolean; // حالة العمل: true = شغل (متاح)، false = نهاية عمل
  lat: number;
  lng: number;
  heading?: number;
  lastLocationUpdate?: string;
  createdAt: string; // تاريخ تسجيل الحساب لحساب مهلة الـ 3 أيام
}

export type CommunityPostType = 'استفسار' | 'اقتراح' | 'بيع';

export type CommunityPostStatus = 'pending' | 'approved' | 'rejected';

export type CommunityReportReason =
  | 'إبلاغ عن إساءة'
  | 'إبلاغ عن محتوى غير لائق'
  | 'إبلاغ عن محتوى كاذب'
  | 'الإبلاغ عن محتوى غير صادق';

export type CommentEmojiReactionType = 'heart' | 'laugh' | 'sad';

export interface CommunityReportEntry {
  id: string;
  reporterId: string;
  reporterUsername: string;
  reason: CommunityReportReason;
  createdAt: string;
}

export interface CommunityCommentReply {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  createdAt: string;
}

export interface CommunityCommentItem {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  isPinned?: boolean;
  likes: string[]; // User IDs who liked this comment
  reactions: {
    heart: string[]; // User IDs who reacted ❤️
    laugh: string[]; // User IDs who reacted 😂
    sad: string[]; // User IDs who reacted 😢
  };
  replies: CommunityCommentReply[]; // Nested replies to a comment
  reports: CommunityReportEntry[]; // Reports filed on this comment
  createdAt: string;
}

export interface CommunityPostItem {
  id: string;
  authorId: string;
  authorUsername: string;
  postType: CommunityPostType; // استفسار | اقتراح | بيع
  status: CommunityPostStatus; // pending | approved | rejected
  content: string;
  imageUrl?: string;
  likes: string[]; // User IDs for Like 👍
  dislikes: string[]; // User IDs for Dislike 👎
  comments: CommunityCommentItem[];
  reports: CommunityReportEntry[]; // Reports filed on this post
  createdAt: string;
}

export interface LiveChatMessageItem {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  textColor: string;
  reports: CommunityReportEntry[];
  createdAt: string;
}

export interface FirebaseConfigSettings {
  enabled: boolean;
  mode: 'firestore' | 'realtime';
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface PlatformSettings {
  siteName: string;
  marqueeText: string;
  adminWhatsapp: string;
  facebookPageUrl: string;
  contactEmail: string;
  imgbbApiKey: string;
  imageHostSiteName?: string; // اسم موقع رفع الصور المجاني
  googleMapsApiKey?: string;
  storeCategories: string[]; // Dynamic store categories updatable in real-time from Settings
  requireDriverCriminalRecordApproval?: boolean; // اشتراط موافقة الإدارة على صورة الفيش قبل التفعيل أم فتح الخدمة مع مهلة 3 أيام
  firebase: FirebaseConfigSettings;
}

export interface PlatformDatabaseState {
  users: UserAccount[];
  topBanners: TopBannerAd[];
  squareAds: SquareMovingAd[];
  popupAd: PopupAdConfig;
  messages: AdminMessage[];
  stores: StoreListingItem[];
  serviceNumbers: ServicePhoneEntry[];
  tawsilaRides: TawsilaRideItem[];
  communityPosts: CommunityPostItem[];
  liveChatMessages?: LiveChatMessageItem[];
  settings: PlatformSettings;
}

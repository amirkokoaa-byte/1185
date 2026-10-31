export type MainSectionId =
  | 'home_feed'
  | 'directory'
  | 'services_numbers'
  | 'tawsila'
  | 'community'
  | 'utilities'
  | 'buy_sell'
  | 'profile'
  | 'settings';

export type UserRoleType = 'admin' | 'moderator' | 'user';

export type ProfileFieldPrivacy = 'public' | 'friends' | 'private';

export type PostPrivacyLevel =
  | 'public'
  | 'private'
  | 'friends'
  | 'custom_list'
  | 'custom';

export interface UserJobEntry {
  id: string;
  title: string;
  durationMonths?: number;
}

export interface CustomFriendList {
  id: string;
  title: string;
  memberUsernames: string[];
  name?: string;
  usernames?: string[];
}

export interface UserPersonalProfile {
  gender?: 'male' | 'female';
  avatarId?: string;
  governorate?: string;
  governoratePrivacy?: ProfileFieldPrivacy;
  birthDate?: string;
  birthDatePrivacy?: ProfileFieldPrivacy;
  qualification?: string;
  qualificationPrivacy?: ProfileFieldPrivacy;
  maritalStatus?: 'أعزب' | 'متزوج' | '' | string;
  maritalStatusPrivacy?: ProfileFieldPrivacy;
  jobs?: UserJobEntry[];
  jobsPrivacy?: ProfileFieldPrivacy;
  phone?: string;
  phonePrivacy?: ProfileFieldPrivacy;
  noteText?: string; // خانة ملاحظة (حتى 100 حرف مع إيموشن)
  customAvatarText?: string; // كتابة نص داخل الصورة (حتى 4 كلمات)
  isProfileLocked?: boolean; // قفل الصفحة الشخصية
  disableFriendRequests?: boolean; // قفل عدم إرسال طلبات صداقة
  followingUsernames?: string[]; // أتابعه (الحسابات التي أضافها صاحب الحساب كأصدقاء له)
  friendUsernames?: string[]; // الأصدقاء المؤكدون
  followersUsernames?: string[]; // المتابعين
  customFriendLists?: CustomFriendList[];
}

export interface FriendRequestNotificationItem {
  id: string;
  fromUserId?: string;
  fromUsername: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface MentionNotificationItem {
  id: string;
  targetUsername: string;
  targetUserId?: string;
  actorUsername: string;
  actorUserId?: string;
  section: MainSectionId;
  postId: string;
  commentId?: string;
  snippet: string;
  isRead?: boolean;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  accountName?: string; // اسم الحساب (الخاص بتسجيل الدخول واستعادة الباسورد)
  username: string; // الاسم الذي يظهر للمستخدمين
  password: string;
  role: UserRoleType;
  phone?: string;
  gender?: 'male' | 'female';
  avatarId?: string;
  isVerified?: boolean; // العلامة الزرقاء (حساب موثق)
  profile?: UserPersonalProfile;
  createdAt: string;
  isBanned?: boolean;
  isOnline?: boolean;
  updatedAt?: number;
}

export interface TopBannerAd {
  id: string;
  storeId?: string; // معرف المحل المرتبط في الدليل لمزامنة عداد المشاهدات والتفاعل لحظياً
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
  viewsCount?: number; // عدد الذين ضغطوا على الإعلان وفتحوه لحظياً
  adViewsSinceCreation?: number; // العدد الذي تم مشاهدته من بداية وضع الإعلان
  baselineViewsAtCreation?: number; // عدد مشاهدات المحل وقت بداية وضع الإعلان
  callClicksCount?: number; // عدد الذين ضغطوا على زر اتصال لحظياً
  whatsappClicksCount?: number; // عدد الذين ضغطوا على زر المراسلة لحظياً
  viewsByHour?: Record<string, number>; // توزيع المشاهدات بالساعة لمعرفة أكثر وقت مشاهدة
  updatedAt?: number;
  createdAt: string;
}

export interface SquareMovingAd {
  id: string;
  storeId?: string; // معرف المحل المرتبط في حالة اختيار محل من الدليل لعمل إعلان بالباقة الأولى
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
  viewsCount?: number; // عدد الذين ضغطوا على الإعلان وفتحوه لحظياً
  adViewsSinceCreation?: number; // العدد الذي تم مشاهدته من بداية وضع الإعلان
  baselineViewsAtCreation?: number; // عدد مشاهدات المحل وقت بداية وضع الإعلان
  callClicksCount?: number; // عدد الذين ضغطوا على زر اتصال لحظياً
  whatsappClicksCount?: number; // عدد الذين ضغطوا على زر المراسلة لحظياً
  viewsByHour?: Record<string, number>; // توزيع المشاهدات بالساعة لمعرفة أكثر وقت مشاهدة
  updatedAt?: number;
  createdAt: string;
}

export interface PopupAdConfig {
  id: string;
  storeId?: string; // معرف المحل المرتبط في الدليل لمزامنة عداد المشاهدات والتفاعل لحظياً
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
  viewsCount?: number; // عدد الذين ضغطوا على الإعلان وفتحوه لحظياً
  adViewsSinceCreation?: number; // العدد الذي تم مشاهدته من بداية وضع الإعلان
  baselineViewsAtCreation?: number; // عدد مشاهدات المحل وقت بداية وضع الإعلان
  createdAt?: string;
  callClicksCount?: number; // عدد الذين ضغطوا على زر اتصال لحظياً
  whatsappClicksCount?: number; // عدد الذين ضغطوا على زر المراسلة لحظياً
  viewsByHour?: Record<string, number>; // توزيع المشاهدات بالساعة لمعرفة أكثر وقت مشاهدة
  updatedAt?: number;
}

export interface AdminMessageThreadEntry {
  id: string;
  sender: 'user' | 'admin';
  senderRole?: 'user' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  isPinned?: boolean;
  isReadByAdmin?: boolean;
  isReadByUser?: boolean;
}

export interface AdminMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderPhone?: string;
  content: string;
  isRead: boolean;
  isPinned?: boolean;
  unreadForUserCount?: number;
  thread?: AdminMessageThreadEntry[];
  updatedAt?: string;
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
  subCategory?: string; // نوع المحل (مثال: سوبر ماركت، موبيل، مطعم داخل مول دريم بلازا)
  locationUrl: string; // Google Maps URL
  phone: string;
  whatsapp?: string;
  details: string; // تفاصيل المحل
  menuImages: string[]; // صور منيو المحل (الصفحة الأولى تظهر بأعلى الكارت)
  likes: string[]; // User IDs for Facebook-style 👍
  dislikes: string[]; // User IDs for Facebook-style 👎
  ratings: Record<string, number>; // Map of userId -> 1..5 stars
  ratingsResetV2?: boolean;
  comments: StoreCommentItem[];
  viewsCount?: number; // عدد المشاهدات لجميع المستخدمين
  callClicksCount?: number; // عدد الذين ضغطوا على زر اتصال
  whatsappClicksCount?: number; // عدد الذين ضغطوا على زر المراسلة
  viewsByHour?: Record<string, number>;
  address?: string;
  lat?: number;
  lng?: number;
  workingHours?: boolean | string;
  featuredInMarquee?: boolean;
  hiddenFromMarquee?: boolean;
  approved: boolean;
  updatedAt?: number;
  imagesExplicitlyCleared?: boolean;
  createdAt: string;
}

export interface ServicePhoneEntry {
  id: string;
  title: string; // اسم مقدم الخدمة
  profession?: string; // المهنة
  phone: string; // رقم الهاتف
  locationUrl: string; // خانة اللوكيشن (Google Maps)
  imageUrl?: string; // صورة مقدم الخدمة (رابط أو رفع)
  category?: string;
  secondaryPhone?: string;
  notes?: string; // تفاصيل
  isEmergency?: boolean;
  likes?: string[]; // User IDs who liked this service provider
  viewsCount?: number; // عدد المشاهدات لجميع المستخدمين
  ratings?: Record<string, number>; // Map of userId -> 1..5 stars
  comments?: StoreCommentItem[]; // تعليقات وتقييمات العامل / مقدم الخدمة
  updatedAt?: number | string;
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
  updatedAt?: number | string;
  createdAt: string; // تاريخ تسجيل الحساب لحساب مهلة الـ 3 أيام
}

export type CommunityPostType = 'استفسار' | 'اقتراح' | 'بيع' | 'بائع' | 'مشتري';

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
  updatedAt?: number | string;
  createdAt: string;
}

export interface CommunityCommentItem {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  isPinned?: boolean;
  isHidden?: boolean; // إخفاء التعليق عن المستخدمين مع إمكانية إظهاره مرة أخرى
  likes: string[]; // User IDs who liked this comment
  reactions: {
    heart: string[]; // User IDs who reacted ❤️
    laugh: string[]; // User IDs who reacted 😂
    sad: string[]; // User IDs who reacted 😢
  };
  replies: CommunityCommentReply[]; // Nested replies to a comment
  reports: CommunityReportEntry[]; // Reports filed on this comment
  updatedAt?: number | string;
  createdAt: string;
}

export interface CommunityPostItem {
  id: string;
  authorId: string;
  authorUsername: string;
  postType: CommunityPostType; // استفسار | اقتراح | بيع
  status: CommunityPostStatus; // pending | approved | rejected
  content: string;
  textColor?: string; // تلوين خط المنشور
  privacy?: PostPrivacyLevel; // منشور عام | منشور خاص | منشور للأصدقاء | أصدقاء محددين
  allowedUsernames?: string[]; // أسماء الأصدقاء المحددين
  customListId?: string; // معرف القائمة المخصصة
  mentionedUsernames?: string[]; // الحسابات التي تم عمل منشن لها في المنشور
  isProfileOrHomePost?: boolean; // منشور من الصفحة الرئيسية أو الملف الشخصي بدون استفسار/اقتراح
  postSource?: 'profile' | 'home_feed' | 'community' | 'buy_sell' | 'utilities'; // مصدر المنشور لعزل منشورات الصفحة الشخصية
  imageUrl?: string;
  isPinned?: boolean; // تثبيت المنشور بالاعلى (لصلاحيات Admin فقط)
  isSold?: boolean; // تم البيع
  commentsDisabled?: boolean; // إيقاف التعليقات على المنشور
  likes: string[]; // User IDs for Like 👍
  dislikes: string[]; // User IDs for Dislike 👎
  comments: CommunityCommentItem[];
  reports: CommunityReportEntry[]; // Reports filed on this post
  updatedAt?: number | string;
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
  isSystemNotification?: boolean;
  targetUsername?: string;
}

export interface ChatModerationPenalty {
  id: string;
  targetUserId: string;
  targetUsername: string;
  actionType: 'ban' | 'suspend'; // حظر أو تعليق
  durationLabel: 'ساعة' | 'ساعتين' | 'يوم';
  expiresAt: string;
  createdAt: string;
}

export interface PrivateChatMessageItem {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  text: string;
  textColor?: string;
  isPinned?: boolean;
  isRead?: boolean;
  readAt?: string;
  likes?: string[];
  dislikes?: string[];
  hearts?: string[];
  reports?: CommunityReportEntry[];
  createdAt: string;
}

export interface ChatTypingEntry {
  userId: string;
  username: string;
  targetKey: string;
  chatType?: 'public' | 'private';
  targetUsername?: string;
  updatedAt: number;
}

export type PrivateChatStatus = 'pending' | 'accepted' | 'rejected';

export interface PrivateChatReportItem {
  id: string;
  reporterId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
  reason: string;
  sampleMessage?: string;
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
  measurementId?: string;
}

export interface UtilityLocationEntry {
  name: string; // الاسم
  locationUrl: string; // لوكيشن
}

export interface UtilitySubmissionItem {
  id: string;
  utilityName: string; // اسم المرفق (مثل: تقديم المياه، تقديم الكهرباء، تقديم الغاز)
  locations: UtilityLocationEntry[]; // حتى 3 مرات (الاسم + لوكيشن في سطر واحد)
  details: string; // مربع كبير بحجم الشاشة يمكن كتابة حتى 10 آلاف حرف
  updatedAt: string; // تاريخ آخر تحديث
  createdAt: string;
}

export interface AdminActivityLogItem {
  id: string;
  actorUsername: string;
  actorRole: 'admin' | 'moderator';
  actionType: string;
  targetName?: string;
  description: string;
  createdAt: string;
}

export interface AuthSessionLogItem {
  id: string;
  userId: string;
  username: string;
  role: UserRoleType;
  eventType: 'login' | 'logout';
  createdAt: string;
}

export interface UserDailyVisitEntry {
  userId: string;
  username: string;
  dateKey: string; // YYYY-MM-DD
  dailyCount: number;
  totalCount: number;
  lastVisitAt: string;
}

export interface SystemErrorLogItem {
  id: string;
  reason: string; // سبب الخطأ
  componentName: string; // المكون المتعطل
  createdAt: string; // توقيت الحدوث
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
  serviceProfessions?: string[]; // قائمة المهن في قسم أرقام الخدمات (نجار، حداد، مبلط، كهربائي، ممرض، عامل، نظافة منزل، مدرس تأسيس، مدرس ابتدائي، مدرس إعدادي...)
  customOnlineCount?: number | null; // عدد المتصلين المخصص في الإعدادات (يزيد ويقل كل 10 دقائق، وفي حالة عدم كتابة أي عدد يظهر المتصلون الفعليون الحقيقيون)
  utilityTypes?: string[]; // قائمة المرافق في قسم تقديمات المرافق (تقديم المياه، تقديم الكهرباء، تقديم الغاز...)
  disabledSections?: Partial<Record<MainSectionId, boolean>>; // حالة الصيانة (تعطيل / تفعيل أقسام القائمة الجانبية)
  updatedAt?: number; // طابع زمني لحفظ الإعدادات نهائياً وعدم رجوعها لما سبق عند الريفريش
  requireDriverCriminalRecordApproval?: boolean; // اشتراط موافقة الإدارة على صورة الفيش قبل التفعيل أم فتح الخدمة مع مهلة 3 أيام
  liveChatCooldownSeconds?: number; // المدة بين كل رسالة في الشات العام (ثواني)
  liveChatAutoClearMinutes?: number; // مدة المسح التلقائي للشات العام (بالدقائق)
  liveChatLastClearedAt?: string; // وقت آخر مسح للشات العام
  appDownloadActiveOption?: 'add_link' | 'upload_app' | 'app_link' | null; // الخيار المحدد في قسم التطبيق بالإعدادات
  appAddLinkUrl?: string; // رابط التحميل المباشر (زر أضف رابط)
  appUploadedFileUrl?: string; // ملف التطبيق المرفوع (زر ارفع التطبيق)
  appUploadedFileName?: string; // اسم ملف التطبيق المرفوع
  appExternalLinkUrl?: string; // لينك التطبيق في موقع خارجي (زر لينك التطبيق)
  adPackagesPricing?: AdPackagesPricingConfig; // أسعار باقات الإعلانات الـ 3 ونسبة خصم عرض الـ 10 أيام
  defaultStoreSvgStyle?: 1 | 2; // الشكل الموحد لصورة المحلات (1 = الأساسي الكلاسيكي، 2 = الثاني الملكي الداكن) لتعميم جميع المحلات بنفس الشكل
  adminActivityLogs?: AdminActivityLogItem[]; // سجل أحداث الـ Admin والمشرف
  authSessionLogs?: AuthSessionLogItem[]; // سجل تسجيلات الدخول والخروج
  systemErrorLogs?: SystemErrorLogItem[]; // سجل الأخطاء اللحظي لفحص الموقع
  userDailyVisitsMap?: Record<string, UserDailyVisitEntry>; // عدد الزيارات اليومية للحسابات
  mentionNotifications?: MentionNotificationItem[]; // إشعارات المنشن في زر الجرس بالأعلى
  friendRequests?: FriendRequestNotificationItem[]; // طلبات الصداقة في زر الجرس بالأعلى
  firebase: FirebaseConfigSettings;
}

export interface AdPackagesPricingConfig {
  pkg1DailyPrice: number; // سعر اليوم في الباقة الأولى (القائمة المتحركة)
  pkg2DailyPrice: number; // سعر اليوم في الباقة الثانية (البانر العلوي)
  pkg3DailyPrice: number; // سعر اليوم في الباقة الثالثة (الشاشة المنبثقة)
  tenDaysDiscountPercent: number; // نسبة خصم عرض الـ 10 أيام (%)
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
  utilitySubmissions?: UtilitySubmissionItem[];
  utilityPosts?: CommunityPostItem[];
  buySellPosts?: CommunityPostItem[];
  liveChatMessages?: LiveChatMessageItem[];
  chatPenalties?: ChatModerationPenalty[];
  privateChatMessages?: PrivateChatMessageItem[];
  privateChatStatuses?: Record<string, PrivateChatStatus>;
  chatTypingMap?: Record<string, ChatTypingEntry>;
  userBlockedMap?: Record<string, string[]>;
  privateChatReports?: PrivateChatReportItem[];
  deletedRecordIds?: string[];
  settings: PlatformSettings;
}


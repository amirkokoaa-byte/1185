import React, { useState } from 'react';
import {
  Car,
  Users,
  Store,
  Crown,
  Mail,
  FolderPlus,
  Database,
  Edit3,
  Trash2,
  CheckCircle2,
  Ban,
  ShieldCheck,
  Plus,
  Save,
  Image as ImageIcon,
  ExternalLink,
  Phone,
  MapPin,
  Clock,
  Pin,
  Sparkles,
  Upload,
  FileSpreadsheet,
  FileText,
  Eye,
  Globe,
  Link as LinkIcon,
  Compass,
  CreditCard,
} from 'lucide-react';
import {
  AdminMessage,
  MainSectionId,
  PlatformDatabaseState,
  PlatformSettings,
  PopupAdConfig,
  SquareMovingAd,
  StoreListingItem,
  TawsilaRideItem,
  TopBannerAd,
  UserAccount,
  UserRoleType,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import {
  createBannerSvg,
  createSquareAdSvg,
  uploadImageDynamic,
} from '../services/storageService';
import {
  exportPlatformSummaryToPDF,
  exportUsersAndMessagesToExcel,
} from '../services/exportService';

export type AdminSettingsSubSectionId =
  | 'driver_requests'
  | 'accounts'
  | 'registered_stores'
  | 'ad_packages'
  | 'messages'
  | 'new_category'
  | 'storage';

interface AdminSettingsHubViewProps {
  state: PlatformDatabaseState;
  connStatus: 'local' | 'firebase_connected' | 'firebase_error';
  connMessage: string;
  onUpdateSettings: (settings: PlatformSettings) => void;
  // 1. Driver Requests
  onUpdateTawsila: (ride: TawsilaRideItem) => void;
  onDeleteTawsila: (id: string) => void;
  // 2. Accounts
  onUpdateUserAccount: (user: UserAccount) => void;
  onDeleteUserAccount: (id: string) => void;
  // 3. Registered Stores
  onUpdateStore: (store: StoreListingItem) => void;
  onDeleteStore: (id: string) => void;
  // 4. Ad Packages
  onAddTopBanner: (banner: TopBannerAd) => void;
  onUpdateTopBanner: (banner: TopBannerAd) => void;
  onDeleteTopBanner: (id: string) => void;
  onAddSquareAd: (ad: SquareMovingAd) => void;
  onUpdateSquareAd: (ad: SquareMovingAd) => void;
  onTogglePinSquareAd: (id: string) => void;
  onDeleteSquareAd: (id: string) => void;
  onUpdatePopupAd: (popup: PopupAdConfig) => void;
  // 5. Messages
  onMarkMessageRead: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  // 6. Categories rename helper
  onRenameStoreCategory: (oldName: string, newName: string) => void;
}

export const AdminSettingsHubView: React.FC<AdminSettingsHubViewProps> = ({
  state,
  connStatus,
  connMessage,
  onUpdateSettings,
  onUpdateTawsila,
  onDeleteTawsila,
  onUpdateUserAccount,
  onDeleteUserAccount,
  onUpdateStore,
  onDeleteStore,
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
  const [activeSubTab, setActiveSubTab] =
    useState<AdminSettingsSubSectionId>('driver_requests');
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3800);
  };

  // --- General Header Fields: Site Name & Contact Number ---
  const [generalSiteName, setGeneralSiteName] = useState(state.settings.siteName);
  const [generalContactPhone, setGeneralContactPhone] = useState(
    state.settings.adminWhatsapp
  );
  const [generalMarquee, setGeneralMarquee] = useState(state.settings.marqueeText);

  const handleSaveGeneralTopFields = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...state.settings,
      siteName: generalSiteName.trim() || state.settings.siteName,
      adminWhatsapp: generalContactPhone.trim() || state.settings.adminWhatsapp,
      marqueeText: generalMarquee.trim() || state.settings.marqueeText,
    });
    showToast('تم حفظ اسم الموقع ورقم التواصل والشريط الإخباري لحظياً!');
  };

  // ============================================================================
  // 1. طلبات السواقين (Driver Requests State)
  // ============================================================================
  const [inspectedDriver, setInspectedDriver] = useState<TawsilaRideItem | null>(null);
  const [editingDriver, setEditingDriver] = useState<TawsilaRideItem | null>(null);
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvNationalId, setDrvNationalId] = useState('');
  const [drvRecordUrl, setDrvRecordUrl] = useState('');
  const [uploadingDrvRecord, setUploadingDrvRecord] = useState(false);

  const openEditDriverModal = (driver: TawsilaRideItem) => {
    setEditingDriver(driver);
    setDrvName(driver.driverName);
    setDrvPhone(driver.phone);
    setDrvNationalId(driver.nationalId || '');
    setDrvRecordUrl(driver.criminalRecordImageUrl || '');
  };

  const handleSaveEditedDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver || !drvName.trim() || !drvPhone.trim()) return;
    onUpdateTawsila({
      ...editingDriver,
      driverName: drvName.trim(),
      phone: drvPhone.trim(),
      nationalId: drvNationalId.trim(),
      criminalRecordImageUrl: drvRecordUrl.trim() || undefined,
    });
    setEditingDriver(null);
    showToast(`تم تحديث بيانات السائق "${drvName.trim()}" بنجاح.`);
  };

  const handleAcceptDriverRequest = (driver: TawsilaRideItem) => {
    onUpdateTawsila({
      ...driver,
      adminApproved: true,
      acceptanceNotificationPending: true,
    });
    if (inspectedDriver?.id === driver.id) {
      setInspectedDriver({
        ...driver,
        adminApproved: true,
        acceptanceNotificationPending: true,
      });
    }
    showToast(
      `تم قبول السائق "${driver.driverName}"! ستظهر له نافذة "تم قبول الإضافة" فور دخوله لحسابه.`
    );
  };

  // ============================================================================
  // 2. الحسابات (Accounts State)
  // ============================================================================
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [usrUsername, setUsrUsername] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrPhone, setUsrPhone] = useState('');
  const [usrRole, setUsrRole] = useState<UserRoleType>('user');

  const openEditUserModal = (u: UserAccount) => {
    setEditingUser(u);
    setUsrUsername(u.username);
    setUsrPassword(u.password);
    setUsrPhone(u.phone || '');
    setUsrRole(u.role);
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !usrUsername.trim() || !usrPassword.trim()) return;
    onUpdateUserAccount({
      ...editingUser,
      username: usrUsername.trim(),
      password: usrPassword,
      phone: usrPhone.trim() || undefined,
      role: usrRole,
    });
    setEditingUser(null);
    showToast(`تم تعديل حساب "${usrUsername.trim()}" بنجاح.`);
  };

  const handleToggleModeratorRole = (u: UserAccount) => {
    const nextRole: UserRoleType = u.role === 'moderator' ? 'user' : 'moderator';
    onUpdateUserAccount({
      ...u,
      role: nextRole,
    });
    showToast(
      nextRole === 'moderator'
        ? `تم منح حساب "${u.username}" صلاحية مشرف (مراجعة المنشورات والتعديل على الأقسام ما عدا الإعدادات).`
        : `تم إلغاء صلاحية المشرف عن حساب "${u.username}" وإعادته لمستخدم عادي.`
    );
  };

  const handleToggleSuspendUser = (u: UserAccount) => {
    const nextBanned = !u.isBanned;
    onUpdateUserAccount({
      ...u,
      isBanned: nextBanned,
    });
    showToast(
      nextBanned
        ? `تم تعليق حساب "${u.username}" ومنعه من تسجيل الدخول.`
        : `تم إلغاء تعليق حساب "${u.username}" وتفعيله مجدداً.`
    );
  };

  // ============================================================================
  // 3. المحلات المسجلة (Registered Stores State)
  // ============================================================================
  const [editingStore, setEditingStore] = useState<StoreListingItem | null>(null);
  const [stName, setStName] = useState('');
  const [stCategory, setStCategory] = useState('');
  const [stPhone, setStPhone] = useState('');
  const [stLocationUrl, setStLocationUrl] = useState('');
  const [stDetails, setStDetails] = useState('');
  const [stMenuImages, setStMenuImages] = useState<string[]>([]);
  const [uploadingStoreMenu, setUploadingStoreMenu] = useState(false);

  const openEditStoreModal = (store: StoreListingItem) => {
    setEditingStore(store);
    setStName(store.name);
    setStCategory(store.category);
    setStPhone(store.phone);
    setStLocationUrl(store.locationUrl);
    setStDetails(store.details);
    setStMenuImages(store.menuImages || []);
  };

  const handleSaveEditedStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore || !stName.trim() || !stPhone.trim()) return;
    onUpdateStore({
      ...editingStore,
      name: stName.trim(),
      category: stCategory,
      phone: stPhone.trim(),
      locationUrl: stLocationUrl.trim(),
      details: stDetails.trim(),
      menuImages:
        stMenuImages.length > 0
          ? stMenuImages
          : [createSquareAdSvg(stName.trim(), stCategory, '#38BDF8')],
    });
    setEditingStore(null);
    showToast(`تم حفظ تعديلات محل "${stName.trim()}" بنجاح.`);
  };

  // ============================================================================
  // 4. باقات الإعلانات (Ad Packages Unified Admin Form & List)
  // ============================================================================
  const [activeAdPackageTab, setActiveAdPackageTab] = useState<
    'moving_square' | 'top_banner' | 'popup_entry'
  >('moving_square');
  const [selectedSquareAdIds, setSelectedSquareAdIds] = useState<string[]>([]);
  const [confirmBulkDeleteSquare, setConfirmBulkDeleteSquare] = useState(false);
  const [selectedTopBannerIds, setSelectedTopBannerIds] = useState<string[]>([]);
  const [confirmBulkDeleteBanner, setConfirmBulkDeleteBanner] = useState(false);

  // Unified New / Edit Ad Form State
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adDurationDays, setAdDurationDays] = useState<number>(5);
  const [adPlaceName, setAdPlaceName] = useState<string>('');
  const [adCategoryOrSub, setAdCategoryOrSub] = useState<string>(
    state.settings.storeCategories[0] || 'مطعم'
  );
  const [adLocationUrl, setAdLocationUrl] = useState<string>('');
  const [adPhone, setAdPhone] = useState<string>('');
  const [adNavMode, setAdNavMode] = useState<'external_link' | 'internal_section'>(
    'internal_section'
  );
  const [adExternalLink, setAdExternalLink] = useState<string>('');
  const [adInternalSection, setAdInternalSection] =
    useState<MainSectionId>('directory');
  const [adMainImage, setAdMainImage] = useState<string>('');
  const [adMenuImages, setAdMenuImages] = useState<string[]>([]);
  const [adPinned, setAdPinned] = useState<boolean>(true);
  const [adPopupActive, setAdPopupActive] = useState<boolean>(state.popupAd.active);
  const [uploadingAdMain, setUploadingAdMain] = useState<boolean>(false);
  const [uploadingAdExtra, setUploadingAdExtra] = useState<boolean>(false);

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdDurationDays(5);
    setAdPlaceName('');
    setAdCategoryOrSub(state.settings.storeCategories[0] || 'مطعم');
    setAdLocationUrl('');
    setAdPhone('');
    setAdExternalLink('');
    setAdInternalSection('directory');
    setAdMainImage('');
    setAdMenuImages([]);
    setAdPinned(true);
  };

  const loadPopupIntoForm = () => {
    const p = state.popupAd;
    setEditingAdId(p.id);
    setAdPopupActive(p.active);
    setAdDurationDays(p.durationDays || 7);
    setAdPlaceName(p.title || '');
    setAdCategoryOrSub(p.description || '');
    setAdLocationUrl(p.locationUrl || '');
    setAdPhone(p.phone || p.whatsappPhone || '');
    if (p.linkUrl) {
      setAdNavMode('external_link');
      setAdExternalLink(p.linkUrl);
    } else {
      setAdNavMode('internal_section');
      setAdInternalSection((p.targetSection as MainSectionId) || 'directory');
    }
    setAdMainImage(p.imageUrl || '');
    setAdMenuImages(p.menuImages || []);
  };

  const combinedAdImages: string[] = [
    ...(adMainImage.trim() ? [adMainImage.trim()] : []),
    ...adMenuImages,
  ];

  const applyCombinedAdImages = (nextList: string[]) => {
    setAdMainImage(nextList[0] || '');
    setAdMenuImages(nextList.slice(1));
  };

  const handleUploadAdMainFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAdMain(true);
    try {
      const res = await uploadImageDynamic(file, state.settings.imgbbApiKey);
      if (adMainImage.trim()) {
        setAdMenuImages((prev) => [adMainImage.trim(), ...prev]);
      }
      setAdMainImage(res.url);
      showToast('تم رفع الصورة وتحديدها كصورة رئيسية (#1) للإعلان بنجاح!');
    } finally {
      setUploadingAdMain(false);
    }
  };

  const handleUploadAdExtraFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingAdExtra(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImageDynamic(files[i], state.settings.imgbbApiKey);
        uploaded.push(res.url);
      }
      if (!adMainImage.trim() && uploaded.length > 0) {
        setAdMainImage(uploaded[0]);
        setAdMenuImages((prev) => [...prev, ...uploaded.slice(1)]);
      } else {
        setAdMenuImages((prev) => [...prev, ...uploaded]);
      }
      showToast(`تم رفع ${uploaded.length} صورة للإعلان بنجاح!`);
    } finally {
      setUploadingAdExtra(false);
    }
  };

  const handleSaveAdPackageItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adPlaceName.trim()) return;

    const days = Math.max(1, Number(adDurationDays) || 1);
    const expiresAtIso = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const linkUrlVal =
      adNavMode === 'external_link' ? adExternalLink.trim() || undefined : undefined;
    const targetSectionVal =
      adNavMode === 'internal_section' ? adInternalSection : undefined;

    if (activeAdPackageTab === 'moving_square') {
      const finalImg =
        adMainImage.trim() ||
        createSquareAdSvg(adPlaceName.trim(), adCategoryOrSub || 'إعلان مميز', '#F59E0B');

      const sqPayload: SquareMovingAd = {
        id: editingAdId || `sq-${Date.now()}`,
        title: adPlaceName.trim(),
        category: adCategoryOrSub.trim() || 'عام',
        imageUrl: finalImg,
        locationUrl: adLocationUrl.trim() || undefined,
        phone: adPhone.trim() || undefined,
        linkUrl: linkUrlVal,
        targetSection: targetSectionVal,
        menuImages: adMenuImages,
        description: `إعلان نشط لمدة ${days} يوم`,
        isAdminPinned: adPinned,
        durationDays: days,
        expiresAt: expiresAtIso,
        active: true,
        createdAt: new Date().toISOString(),
      };

      if (editingAdId) {
        onUpdateSquareAd(sqPayload);
        showToast(`تم تعديل الإعلان المربع "${sqPayload.title}" بنجاح!`);
      } else {
        onAddSquareAd(sqPayload);
        showToast(
          `تم نشر الإعلان المربع "${sqPayload.title}" لمدة ${days} أيام (يختفي تلقائياً عند انتهاء المدة).`
        );
      }
      resetAdForm();
    } else if (activeAdPackageTab === 'top_banner') {
      const finalImg =
        adMainImage.trim() ||
        createBannerSvg(
          adPlaceName.trim(),
          adCategoryOrSub.trim() || 'بانر إعلاني مميز',
          `لمدة ${days} أيام`,
          '#38BDF8',
          '#0284C7'
        );

      const bnrPayload: TopBannerAd = {
        id: editingAdId || `bnr-${Date.now()}`,
        title: adPlaceName.trim(),
        subtitle: adCategoryOrSub.trim() || 'إعلان بانر علوي مميز',
        imageUrl: finalImg,
        locationUrl: adLocationUrl.trim() || undefined,
        phone: adPhone.trim() || undefined,
        whatsappPhone: adPhone.trim() || state.settings.adminWhatsapp,
        linkUrl: linkUrlVal,
        targetSection: targetSectionVal,
        menuImages: adMenuImages,
        durationDays: days,
        expiresAt: expiresAtIso,
        active: true,
        createdAt: new Date().toISOString(),
      };

      if (editingAdId) {
        onUpdateTopBanner(bnrPayload);
        showToast(`تم تحديث البانر العلوي "${bnrPayload.title}" بنجاح!`);
      } else {
        onAddTopBanner(bnrPayload);
        showToast(
          `تم إضافة البانر العلوي "${bnrPayload.title}" لمدة ${days} أيام بنجاح!`
        );
      }
      resetAdForm();
    } else if (activeAdPackageTab === 'popup_entry') {
      const finalImg =
        adMainImage.trim() ||
        state.popupAd.imageUrl ||
        createBannerSvg(
          adPlaceName.trim(),
          adCategoryOrSub.trim() || 'إعلان الشاشة المنبثقة عند الدخول',
          'إعلان VIP',
          '#38BDF8',
          '#0284C7'
        );

      const popupPayload: PopupAdConfig = {
        id: 'popup-main-1',
        active: adPopupActive,
        title: adPlaceName.trim(),
        description:
          adCategoryOrSub.trim() ||
          'عرض خاص لزوار المنصة — تصفح المنيو واللوكيشن وتواصل معنا مباشرة.',
        imageUrl: finalImg,
        locationUrl: adLocationUrl.trim() || undefined,
        phone: adPhone.trim() || undefined,
        whatsappPhone: adPhone.trim() || state.settings.adminWhatsapp,
        buttonText: 'تواصل عبر واتساب الآن',
        linkUrl: linkUrlVal,
        targetSection: targetSectionVal,
        menuImages: adMenuImages,
        durationDays: days,
        expiresAt: expiresAtIso,
      };

      onUpdatePopupAd(popupPayload);
      showToast(
        `تم تحديث إعلان الشاشة المنبثقة عند الدخول لمدة ${days} أيام بنجاح!`
      );
    }
  };

  // ============================================================================
  // 6. قسم جديد (Dynamic Store Categories State)
  // ============================================================================
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(
    null
  );
  const [editingCategoryNewName, setEditingCategoryNewName] = useState<string>('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    if (state.settings.storeCategories.includes(clean)) {
      showToast('هذا القسم موجود بالفعل في القائمة!');
      return;
    }
    onUpdateSettings({
      ...state.settings,
      storeCategories: [...state.settings.storeCategories, clean],
    });
    setNewCategoryName('');
    showToast(`تمت إضافة قسم "${clean}" لحظياً إلى صفحة أضف محل!`);
  };

  const handleConfirmRenameCategory = (oldCat: string) => {
    const cleanNew = editingCategoryNewName.trim();
    if (!cleanNew || cleanNew === oldCat) {
      setEditingCategoryOldName(null);
      return;
    }
    onRenameStoreCategory(oldCat, cleanNew);
    setEditingCategoryOldName(null);
    showToast(`تم تعديل اسم القسم من "${oldCat}" إلى "${cleanNew}" لحظياً!`);
  };

  const handleDeleteCategory = (cat: string) => {
    onUpdateSettings({
      ...state.settings,
      storeCategories: state.settings.storeCategories.filter((c) => c !== cat),
    });
    showToast(`تم حذف قسم "${cat}" من القائمة المنسدلة.`);
  };

  // ============================================================================
  // 7. التخزين (Storage: Image Host API + Firebase Keys State)
  // ============================================================================
  const [imgHostSiteName, setImgHostSiteName] = useState(
    state.settings.imageHostSiteName || 'ImgBB Cloud Image Hosting'
  );
  const [imgHostApiKey, setImgHostApiKey] = useState(state.settings.imgbbApiKey || '');

  const [fbEnabled, setFbEnabled] = useState(state.settings.firebase.enabled);
  const [fbMode, setFbMode] = useState<'firestore' | 'realtime'>(
    state.settings.firebase.mode
  );
  const [fbApiKey, setFbApiKey] = useState(state.settings.firebase.apiKey);
  const [fbAuthDomain, setFbAuthDomain] = useState(state.settings.firebase.authDomain);
  const [fbDatabaseURL, setFbDatabaseURL] = useState(
    state.settings.firebase.databaseURL
  );
  const [fbProjectId, setFbProjectId] = useState(state.settings.firebase.projectId);
  const [fbStorageBucket, setFbStorageBucket] = useState(
    state.settings.firebase.storageBucket
  );
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(
    state.settings.firebase.messagingSenderId
  );
  const [fbAppId, setFbAppId] = useState(state.settings.firebase.appId);
  const [fbPasteSnippet, setFbPasteSnippet] = useState('');

  const handleSaveImageHostConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...state.settings,
      imageHostSiteName: imgHostSiteName.trim() || 'ImgBB',
      imgbbApiKey: imgHostApiKey.trim(),
    });
    showToast(
      `تم حفظ ربط موقع رفع الصور (${imgHostSiteName.trim() || 'ImgBB'}) وتفعيل الـ API في جميع أنحاء الموقع!`
    );
  };

  const handleExtractFirebaseSnippet = () => {
    if (!fbPasteSnippet.trim()) return;
    const extract = (key: string) => {
      const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
      const m = fbPasteSnippet.match(regex);
      return m ? m[1] : '';
    };
    setFbApiKey(extract('apiKey') || fbApiKey);
    setFbAuthDomain(extract('authDomain') || fbAuthDomain);
    setFbDatabaseURL(extract('databaseURL') || fbDatabaseURL);
    setFbProjectId(extract('projectId') || fbProjectId);
    setFbStorageBucket(extract('storageBucket') || fbStorageBucket);
    setFbMessagingSenderId(extract('messagingSenderId') || fbMessagingSenderId);
    setFbAppId(extract('appId') || fbAppId);
    setFbEnabled(true);
    showToast('تم استخراج أكواد Firebase تلقائياً! اضغط "حفظ" لتفعيل المزامنة السحابية.');
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...state.settings,
      firebase: {
        enabled: fbEnabled,
        mode: fbMode,
        apiKey: fbApiKey.trim(),
        authDomain: fbAuthDomain.trim(),
        databaseURL: fbDatabaseURL.trim(),
        projectId: fbProjectId.trim(),
        storageBucket: fbStorageBucket.trim(),
        messagingSenderId: fbMessagingSenderId.trim(),
        appId: fbAppId.trim(),
      },
    });
    showToast('تم حفظ مفاتيح Firebase وتحديث المزامنة السحابية اللحظية!');
  };

  // Sub-sidebar navigation items (The 7 required sections)
  const subSidebarItems: Array<{
    id: AdminSettingsSubSectionId;
    number: number;
    label: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'driver_requests',
      number: 1,
      label: 'طلبات السواقين',
      subtitle: 'بيانات السائقين وصور الفيش والقبول',
      icon: Car,
      badge: state.tawsilaRides.filter((r) => !r.adminApproved).length || undefined,
    },
    {
      id: 'accounts',
      number: 2,
      label: 'الحسابات',
      subtitle: 'إدارة وتعديل وتعليق الحسابات',
      icon: Users,
      badge: state.users.length,
    },
    {
      id: 'registered_stores',
      number: 3,
      label: 'المحلات المسجلة',
      subtitle: 'تعديل وحذف كافة المحلات',
      icon: Store,
      badge: state.stores.length,
    },
    {
      id: 'ad_packages',
      number: 4,
      label: 'باقات الإعلانات',
      subtitle: 'المتحركة، البانر العلوي، والمنبثقة',
      icon: Crown,
    },
    {
      id: 'messages',
      number: 5,
      label: 'الرسائل',
      subtitle: 'صندوق رسائل الفوتر الواردة',
      icon: Mail,
      badge: state.messages.filter((m) => !m.isRead).length || undefined,
    },
    {
      id: 'new_category',
      number: 6,
      label: 'قسم جديد',
      subtitle: 'إضافة وتعديل وحذف أقسام المحلات',
      icon: FolderPlus,
      badge: state.settings.storeCategories.length,
    },
    {
      id: 'storage',
      number: 7,
      label: 'التخزين',
      subtitle: 'إعدادات API رفع الصور',
      icon: Database,
    },
  ];

  const getDaysRemainingBadge = (expiresAt?: string) => {
    if (!expiresAt) return 'مفتوح المدة';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'منتهي الصلاحية (مخفي للعامة)';
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return `متبقي ${days} يوم`;
  };

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400 text-emerald-200 text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg('')}
            className="text-xs underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Top General Bar: Change Site Name & Contact Number */}
      <FluentCard className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
          <div>
            <div className="text-xs font-extrabold text-amber-400">
              الخانة الخامسة · الإعدادات العامة ولوحة تحكم الـ Admin
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#F8FAFC]">
              إعدادات اسم الموقع ورقم التواصل والأقسام الإدارية الـ 7
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportUsersAndMessagesToExcel(state.users, state.messages)}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>تصدير إكسيل</span>
            </FluentButton>
            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportPlatformSummaryToPDF(state)}
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>تصدير PDF</span>
            </FluentButton>
          </div>
        </div>

        <form
          onSubmit={handleSaveGeneralTopFields}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اسم الموقع (يظهر في الهيدر والتقارير)
            </label>
            <input
              type="text"
              value={generalSiteName}
              onChange={(e) => setGeneralSiteName(e.target.value)}
              placeholder="اسم الموقع..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              رقم التواصل / واتساب الإدارة
            </label>
            <input
              type="tel"
              value={generalContactPhone}
              onChange={(e) => setGeneralContactPhone(e.target.value)}
              placeholder="2010XXXXXXXX"
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              نص الشريط الإخباري العلوي (Marquee)
            </label>
            <input
              type="text"
              value={generalMarquee}
              onChange={(e) => setGeneralMarquee(e.target.value)}
              placeholder="نص الشريط المتحرك..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <FluentButton type="submit" variant="primary" className="w-full py-2.5">
              <Save className="w-4 h-4" />
              <span>حفظ العام</span>
            </FluentButton>
          </div>
        </form>
      </FluentCard>

      {/* Main Layout inside Settings: Sub-Sidebar (7 Sections) + Active Section Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Internal Sub-Sidebar (قائمة جانبية فرعية داخل الإعدادات تضم الأقسام الـ 7) */}
        <div className="lg:col-span-3 bg-[#112240]/90 border border-[#334155] rounded-2xl p-3 space-y-2">
          <div className="px-2.5 py-1.5 text-xs font-extrabold text-sky-400 border-b border-[#334155]">
            القائمة الفرعية للإعدادات (7 أقسام)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {subSidebarItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSubTab(item.id);
                    if (item.id === 'ad_packages' && activeAdPackageTab === 'popup_entry') {
                      loadPopupIntoForm();
                    }
                  }}
                  className={`fluent-reveal w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC] shadow-[0_0_15px_-4px_rgba(56,189,248,0.45)]'
                      : 'bg-[#0A192F]/85 border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-sky-500 text-[#0A192F] border-sky-300 font-bold'
                          : 'bg-[#1E293B] text-sky-400 border-[#334155]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold truncate">
                        {item.number}. {item.label}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span className="relative z-10 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-mono-tabular font-bold shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Sub-Section Content Area */}
        <div className="lg:col-span-9 min-w-0 space-y-5">
          {/* ====================================================================
              1. طلبات السواقين (Driver Requests)
             ==================================================================== */}
          {activeSubTab === 'driver_requests' && (
            <FluentCard className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#334155]">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <Car className="w-5 h-5 text-sky-400" />
                    <span>1. طلبات السواقين المسجلين ({state.tawsilaRides.length})</span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    اضغط على اسم أي سائق لعرض جميع بياناته وصورة الفيش والتشبيه المرفوعة، أو استخدم أزرار (تعديل، حذف، تم القبول).
                  </p>
                </div>
              </div>

              {state.tawsilaRides.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-6 text-center">
                  لا توجد طلبات سائقين مسجلة حالياً.
                </p>
              ) : (
                <div className="space-y-3">
                  {state.tawsilaRides.map((drv) => (
                    <div
                      key={drv.id}
                      className="fluent-reveal p-4 rounded-xl bg-[#0A192F] border border-[#334155] hover:border-sky-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => setInspectedDriver(drv)}
                        className="space-y-1 cursor-pointer flex-1 min-w-0 relative z-10"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-sky-400 hover:underline flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            <span>{drv.driverName}</span>
                          </span>
                          {drv.adminApproved ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-bold">
                              تم القبول ومعتمد
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold">
                              بانتظار مراجعة وقبول الإدارة
                            </span>
                          )}
                          {drv.acceptanceNotificationPending && (
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                              إشعار الترحيب جاهز عند دخول السائق
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                          <span>
                            الهاتف:{' '}
                            <strong className="text-[#F8FAFC] font-mono-tabular">
                              {drv.phone}
                            </strong>
                          </span>
                          <span>
                            الرقم القومي:{' '}
                            <strong className="text-[#F8FAFC] font-mono-tabular">
                              {drv.nationalId || 'غير مرفق'}
                            </strong>
                          </span>
                          <span>
                            صورة الفيش:{' '}
                            <strong
                              className={
                                drv.criminalRecordImageUrl
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }
                            >
                              {drv.criminalRecordImageUrl ? 'مرفوعة (اضغط للمعاينة)' : 'غير مرفوعة بعد'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* 3 Buttons in front of each request: تعديل، حذف، تم القبول */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 relative z-10">
                        <FluentButton
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditDriverModal(drv)}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>تعديل</span>
                        </FluentButton>

                        <FluentButton
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            onDeleteTawsila(drv.id);
                            showToast(`تم حذف طلب السائق "${drv.driverName}".`);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </FluentButton>

                        <FluentButton
                          variant="emerald"
                          size="sm"
                          onClick={() => handleAcceptDriverRequest(drv)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم القبول</span>
                        </FluentButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FluentCard>
          )}

          {/* ====================================================================
              2. الحسابات (Registered Accounts)
             ==================================================================== */}
          {activeSubTab === 'accounts' && (
            <FluentCard className="space-y-4">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  <span>2. الحسابات المسجلة في الموقع ({state.users.length})</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  قائمة بجميع الحسابات المسجلة مع أزرار (إعطاء صلاحية مشرف، تعديل، حذف، تعليق الحساب). المشرف يراجع المنشورات ويعدل على جميع الأقسام ما عدا الإعدادات.
                </p>
              </div>

              <div className="space-y-3">
                {state.users.map((u) => (
                  <div
                    key={u.id}
                    className={`fluent-reveal p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      u.isBanned
                        ? 'bg-rose-950/25 border-rose-500/50'
                        : 'bg-[#0A192F] border-[#334155]'
                    }`}
                  >
                    <div className="space-y-1 relative z-10">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-[#F8FAFC]">
                          {u.username}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : u.role === 'moderator'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                          }`}
                        >
                          {u.role === 'admin'
                            ? 'مدير النظام (Admin)'
                            : u.role === 'moderator'
                            ? 'مشرف (مراجعة المنشورات وتعديل الأقسام ما عدا الإعدادات)'
                            : 'مستخدم'}
                        </span>
                        {u.isBanned && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold">
                            حساب معلق (موقوف)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                        <span>
                          الباسورد:{' '}
                          <code className="text-sky-400 font-mono-tabular">
                            {u.password}
                          </code>
                        </span>
                        {u.phone && (
                          <span>
                            الهاتف:{' '}
                            <strong className="text-[#F8FAFC] font-mono-tabular">
                              {u.phone}
                            </strong>
                          </span>
                        )}
                        <span>
                          تاريخ التسجيل:{' '}
                          <span className="font-mono-tabular">
                            {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Buttons: صلاحية مشرف، تعديل، حذف، تعليق الحساب */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 relative z-10">
                      {u.role !== 'admin' && (
                        <FluentButton
                          variant={u.role === 'moderator' ? 'emerald' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleModeratorRole(u)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {u.role === 'moderator'
                              ? 'إلغاء صلاحية مشرف'
                              : 'إعطاء صلاحية مشرف'}
                          </span>
                        </FluentButton>
                      )}

                      <FluentButton
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditUserModal(u)}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                        <span>تعديل</span>
                      </FluentButton>

                      <FluentButton
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          onDeleteUserAccount(u.id);
                          showToast(`تم حذف الحساب "${u.username}" نهائياً.`);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </FluentButton>

                      <FluentButton
                        variant={u.isBanned ? 'emerald' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleSuspendUser(u)}
                      >
                        <Ban className="w-3.5 h-3.5 text-amber-400" />
                        <span>{u.isBanned ? 'إلغاء تعليق الحساب' : 'تعليق الحساب'}</span>
                      </FluentButton>
                    </div>
                  </div>
                ))}
              </div>
            </FluentCard>
          )}

          {/* ====================================================================
              3. المحلات المسجلة (Registered Stores)
             ==================================================================== */}
          {activeSubTab === 'registered_stores' && (
            <FluentCard className="space-y-4">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <Store className="w-5 h-5 text-sky-400" />
                  <span>3. المحلات المسجلة في الموقع ({state.stores.length})</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  إدارة شاملة لجميع المحلات المسجلة مع أزرار (تعديل، حذف)، كما تتوفر نفس الأزرار للأدمن داخل صفحة &quot;أضف محل&quot;.
                </p>
              </div>

              {state.stores.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-6 text-center">
                  لا توجد محلات مسجلة حالياً.
                </p>
              ) : (
                <div className="space-y-3">
                  {state.stores.map((st) => (
                    <div
                      key={st.id}
                      className="fluent-reveal p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 relative z-10">
                        <img
                          src={st.menuImages?.[0] || ''}
                          alt={st.name}
                          className="w-14 h-14 rounded-xl object-cover border border-[#334155] shrink-0 bg-[#1E293B]"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm sm:text-base font-extrabold text-[#F8FAFC] truncate">
                              {st.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[11px] font-bold">
                              {st.category}
                            </span>
                          </div>
                          <div className="text-xs text-[#94A3B8] flex flex-wrap items-center gap-3">
                            <span className="font-mono-tabular">هاتف: {st.phone}</span>
                            <span>صور المنيو: {st.menuImages?.length || 0}</span>
                            <span>التعليقات: {st.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 relative z-10">
                        <FluentButton
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditStoreModal(st)}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                          <span>تعديل</span>
                        </FluentButton>

                        <FluentButton
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            onDeleteStore(st.id);
                            showToast(`تم حذف محل "${st.name}" بنجاح.`);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </FluentButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FluentCard>
          )}

          {/* ====================================================================
              4. باقات الإعلانات (Ad Packages - Full Control over 3 Packages)
             ==================================================================== */}
          {activeSubTab === 'ad_packages' && (
            <div className="space-y-5">
              {/* Package Type Switcher */}
              <FluentCard className="space-y-4">
                <div className="pb-3 border-b border-[#334155]">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>4. التحكم الكامل في باقات الإعلانات الـ 3</span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    بمجرد انتهاء مدة الإعلان المحددة بالأيام يختفي الإعلان تلقائياً ولا يظهر للعامة.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdPackageTab('moving_square');
                      resetAdForm();
                    }}
                    className={`fluent-reveal p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                      activeAdPackageTab === 'moving_square'
                        ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC]'
                        : 'bg-[#0A192F] border-[#334155] text-[#94A3B8]'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-amber-400">
                      الباقة الأولى (1)
                    </div>
                    <div className="text-sm font-extrabold text-[#F8FAFC] mt-0.5">
                      لوحة الإعلانات والخصومات ({state.squareAds.length})
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdPackageTab('top_banner');
                      resetAdForm();
                    }}
                    className={`fluent-reveal p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                      activeAdPackageTab === 'top_banner'
                        ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC]'
                        : 'bg-[#0A192F] border-[#334155] text-[#94A3B8]'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-sky-400">
                      الباقة الثانية (2)
                    </div>
                    <div className="text-sm font-extrabold text-[#F8FAFC] mt-0.5">
                      البانر العلوي ({state.topBanners.length})
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdPackageTab('popup_entry');
                      loadPopupIntoForm();
                    }}
                    className={`fluent-reveal p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                      activeAdPackageTab === 'popup_entry'
                        ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC]'
                        : 'bg-[#0A192F] border-[#334155] text-[#94A3B8]'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-emerald-400">
                      الباقة الثالثة (3)
                    </div>
                    <div className="text-sm font-extrabold text-[#F8FAFC] mt-0.5">
                      إعلان الشاشة المنبثقة عند الدخول
                    </div>
                  </button>
                </div>

                {/* Unified Admin Ad Template Form */}
                <form
                  onSubmit={handleSaveAdPackageItem}
                  className="p-4 rounded-2xl bg-[#0A192F] border border-sky-400/40 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#334155]">
                    <div className="text-sm font-extrabold text-sky-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>
                        {activeAdPackageTab === 'moving_square' &&
                          (editingAdId
                            ? 'تعديل إعلان في لوحة الإعلانات والخصومات'
                            : 'قالب إضافة إعلان جديد — لوحة الإعلانات والخصومات')}
                        {activeAdPackageTab === 'top_banner' &&
                          (editingAdId
                            ? 'تعديل إعلان البانر العلوي'
                            : 'قالب إضافة إعلان جديد — البانر العلوي')}
                        {activeAdPackageTab === 'popup_entry' &&
                          'قالب إعداد وتحديث إعلان الشاشة المنبثقة عند دخول الموقع'}
                      </span>
                    </div>

                    {activeAdPackageTab === 'popup_entry' && (
                      <label className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adPopupActive}
                          onChange={(e) => setAdPopupActive(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span>تفعيل ظهور الشاشة المنبثقة للزوار</span>
                      </label>
                    )}

                    {editingAdId && activeAdPackageTab !== 'popup_entry' && (
                      <button
                        type="button"
                        onClick={resetAdForm}
                        className="text-xs text-rose-400 underline cursor-pointer"
                      >
                        إلغاء التعديل وإضافة جديد
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* 1. تحديد مدة الإعلان بالأيام */}
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        مدة الإعلان بالأيام (يختفي تلقائياً بانتهائها) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={adDurationDays}
                          onChange={(e) =>
                            setAdDurationDays(Math.max(1, Number(e.target.value) || 1))
                          }
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
                        />
                        <span className="text-xs font-bold text-sky-400 shrink-0">
                          أيام
                        </span>
                      </div>
                    </div>

                    {/* 2. اسم المكان */}
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        اسم المكان / عنوان الإعلان *
                      </label>
                      <input
                        type="text"
                        required
                        value={adPlaceName}
                        onChange={(e) => setAdPlaceName(e.target.value)}
                        placeholder="مثال: مطعم ومشويات السلطان..."
                        className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                      />
                    </div>

                    {/* القسم أو الوصف الفرعي */}
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        {activeAdPackageTab === 'moving_square'
                          ? 'تصنيف المكان'
                          : 'النص الوصفي للإعلان'}
                      </label>
                      <input
                        type="text"
                        value={adCategoryOrSub}
                        onChange={(e) => setAdCategoryOrSub(e.target.value)}
                        placeholder={
                          activeAdPackageTab === 'moving_square'
                            ? 'مطعم، سوبر ماركت، صيدلية...'
                            : 'خصم 20% بمناسبة الافتتاح...'
                        }
                        className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                      />
                    </div>

                    {/* 3. لوكيشن المكان */}
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        لوكيشن المكان (رابط خرائط Google Maps)
                      </label>
                      <input
                        type="url"
                        value={adLocationUrl}
                        onChange={(e) => setAdLocationUrl(e.target.value)}
                        placeholder="https://maps.google.com/?q=..."
                        className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs text-[#F8FAFC] font-mono-tabular outline-none"
                      />
                    </div>

                    {/* 4. رقم الهاتف */}
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        رقم الهاتف (للاتصال والواتساب)
                      </label>
                      <input
                        type="tel"
                        value={adPhone}
                        onChange={(e) => setAdPhone(e.target.value)}
                        placeholder="010XXXXXXXX"
                        className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
                      />
                    </div>

                    {/* 5. خانة "أضف لينك" أو اختيار قسم داخلي من أقسام الموقع */}
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                        وجهة الإعلان (أضف لينك أو قسم داخلي)
                      </label>
                      <div className="flex gap-1.5 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setAdNavMode('internal_section')}
                          className={`flex-1 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            adNavMode === 'internal_section'
                              ? 'bg-sky-600 text-white'
                              : 'bg-[#112240] text-[#94A3B8]'
                          }`}
                        >
                          قسم داخلي بالموقع
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdNavMode('external_link')}
                          className={`flex-1 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            adNavMode === 'external_link'
                              ? 'bg-sky-600 text-white'
                              : 'bg-[#112240] text-[#94A3B8]'
                          }`}
                        >
                          أضف لينك خارجي
                        </button>
                      </div>

                      {adNavMode === 'internal_section' ? (
                        <select
                          value={adInternalSection}
                          onChange={(e) =>
                            setAdInternalSection(e.target.value as MainSectionId)
                          }
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] outline-none"
                        >
                          <option value="directory">1. أضف محل / الدليل التجاري</option>
                          <option value="services_numbers">2. أرقام الخدمات</option>
                          <option value="tawsila">3. توصيلة</option>
                          <option value="community">4. مجتمع</option>
                        </select>
                      ) : (
                        <input
                          type="url"
                          value={adExternalLink}
                          onChange={(e) => setAdExternalLink(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] font-mono-tabular outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* 6. رفع الصورة الرئيسية للإعلان + صور إضافية أو منيو + تحديد ترقيم الصور والرئيسية */}
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] space-y-2">
                        <label className="block text-xs font-bold text-sky-400">
                          رفع الصورة الرئيسية للإعلان
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="fluent-reveal px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {uploadingAdMain ? 'جاري الرفع...' : 'اختر صورة رئيسية'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadAdMainFile}
                              className="hidden"
                            />
                          </label>
                          <input
                            type="text"
                            value={adMainImage}
                            onChange={(e) => setAdMainImage(e.target.value)}
                            placeholder="أو ضع رابط الصورة مباشرة..."
                            className="flex-1 rounded-lg bg-[#0A192F] border border-[#334155] px-2.5 py-1.5 text-xs text-[#F8FAFC] outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] space-y-2">
                        <label className="block text-xs font-bold text-amber-400">
                          رفع صور إضافية أو منيو للمكان ({combinedAdImages.length} صور إجمالاً)
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="fluent-reveal px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A192F] text-xs font-extrabold cursor-pointer inline-flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>
                              {uploadingAdExtra
                                ? 'جاري رفع المنيو...'
                                : 'رفع صور إضافية / منيو'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleUploadAdExtraFiles}
                              className="hidden"
                            />
                          </label>
                          {combinedAdImages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => applyCombinedAdImages([])}
                              className="text-xs text-rose-400 underline cursor-pointer"
                            >
                              مسح كل الصور ({combinedAdImages.length})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* شبكة إدارة وترقيم صور الإعلان وتحديد الصورة الرئيسية */}
                    {combinedAdImages.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#112240] border border-sky-400/40 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-sky-300">
                          <span>
                            ترقيم الصور وتحديد الصورة الرئيسية للإعلان ({combinedAdImages.length} صور):
                          </span>
                          <span className="text-[11px] text-[#94A3B8]">
                            الصورة رقم (1) هي الصورة الرئيسية التي تظهر في واجهة الإعلان
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {combinedAdImages.map((imgUrl, idx) => {
                            const isPrimary = idx === 0;
                            return (
                              <div
                                key={`${idx}-${imgUrl.slice(0, 24)}`}
                                className={`rounded-xl overflow-hidden border-2 bg-[#0A192F] flex flex-col ${
                                  isPrimary
                                    ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                                    : 'border-[#334155]'
                                }`}
                              >
                                <div className="relative h-24 w-full bg-[#1E293B]">
                                  <img
                                    src={imgUrl}
                                    alt={`Ad ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <span
                                    className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow ${
                                      isPrimary
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-[#0A192F]/90 text-[#F8FAFC] border border-[#334155]'
                                    }`}
                                  >
                                    {isPrimary ? '1 ★ الرئيسية' : `صورة #${idx + 1}`}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      applyCombinedAdImages(
                                        combinedAdImages.filter((_, i) => i !== idx)
                                      )
                                    }
                                    title="حذف هذه الصورة"
                                    className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="p-1.5 bg-[#112240] border-t border-[#334155] flex items-center justify-between gap-1">
                                  {isPrimary ? (
                                    <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1 px-1">
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      <span>الرئيسية</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const target = combinedAdImages[idx];
                                        const rest = combinedAdImages.filter(
                                          (_, i) => i !== idx
                                        );
                                        applyCombinedAdImages([target, ...rest]);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold cursor-pointer"
                                    >
                                      تحديد كرئيسية
                                    </button>
                                  )}

                                  {combinedAdImages.length > 1 && (
                                    <select
                                      value={idx}
                                      onChange={(e) => {
                                        const newIdx = Number(e.target.value);
                                        if (newIdx === idx) return;
                                        const copy = [...combinedAdImages];
                                        const [moved] = copy.splice(idx, 1);
                                        copy.splice(newIdx, 0, moved);
                                        applyCombinedAdImages(copy);
                                      }}
                                      title="تحديد ترقيم الصورة"
                                      className="rounded-lg bg-[#0A192F] border border-[#334155] px-1.5 py-0.5 text-[10px] font-extrabold text-[#F8FAFC] outline-none cursor-pointer"
                                    >
                                      {combinedAdImages.map((_, orderIdx) => (
                                        <option key={orderIdx} value={orderIdx}>
                                          {orderIdx === 0
                                            ? 'ترقيم: 1 (الرئيسية)'
                                            : `ترقيم: ${orderIdx + 1}`}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {activeAdPackageTab === 'moving_square' ? (
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adPinned}
                          onChange={(e) => setAdPinned(e.target.checked)}
                          className="w-4 h-4 accent-amber-500"
                        />
                        <span>تثبيت الإعلان دائماً في القائمة المتحركة</span>
                      </label>
                    ) : (
                      <div />
                    )}

                    <FluentButton type="submit" variant="primary" size="lg">
                      <Save className="w-4 h-4" />
                      <span>
                        {editingAdId ? 'حفظ تعديلات الإعلان' : 'نشر وحفظ الإعلان الآن'}
                      </span>
                    </FluentButton>
                  </div>
                </form>

                {/* Existing Ads List for Current Package */}
                {activeAdPackageTab === 'moving_square' && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-[#94A3B8]">
                        الإعلانات المربعة الحالية ({state.squareAds.length}):
                      </div>

                      {state.squareAds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedSquareAdIds.length === state.squareAds.length) {
                                setSelectedSquareAdIds([]);
                              } else {
                                setSelectedSquareAdIds(state.squareAds.map((a) => a.id));
                              }
                              setConfirmBulkDeleteSquare(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0A192F] border border-sky-400/50 text-sky-300 text-xs font-bold cursor-pointer"
                          >
                            {selectedSquareAdIds.length === state.squareAds.length
                              ? 'إلغاء تحديد الكل'
                              : 'تحديد الكل'}
                          </button>

                          {selectedSquareAdIds.length > 0 && !confirmBulkDeleteSquare && (
                            <button
                              type="button"
                              onClick={() => setConfirmBulkDeleteSquare(true)}
                              className="px-3 py-1 rounded-lg bg-rose-600/85 hover:bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف المحدد ({selectedSquareAdIds.length})</span>
                            </button>
                          )}

                          {confirmBulkDeleteSquare && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  selectedSquareAdIds.forEach((id) => onDeleteSquareAd(id));
                                  showToast(
                                    `تم حذف ${selectedSquareAdIds.length} إعلان دفعة واحدة بنجاح.`
                                  );
                                  setSelectedSquareAdIds([]);
                                  setConfirmBulkDeleteSquare(false);
                                }}
                                className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-white/60 text-xs font-extrabold flex items-center gap-1 cursor-pointer animate-pulse shadow-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>تأكيد الحذف ({selectedSquareAdIds.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmBulkDeleteSquare(false)}
                                className="px-2.5 py-1 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white text-xs font-bold cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {state.squareAds.map((ad) => {
                        const isChecked = selectedSquareAdIds.includes(ad.id);
                        return (
                          <div
                            key={ad.id}
                            className={`p-3 rounded-xl bg-[#0A192F] border flex items-center justify-between gap-3 ${
                              isChecked
                                ? 'border-rose-500 ring-1 ring-rose-500/40'
                                : 'border-[#334155]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedSquareAdIds((prev) =>
                                    prev.includes(ad.id)
                                      ? prev.filter((x) => x !== ad.id)
                                      : [...prev, ad.id]
                                  );
                                  setConfirmBulkDeleteSquare(false);
                                }}
                                className="w-4 h-4 accent-rose-500 cursor-pointer shrink-0"
                              />
                              <img
                                src={ad.imageUrl}
                                alt={ad.title}
                                className="w-12 h-12 rounded-lg object-cover border border-[#334155] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                                  {ad.title}
                                </div>
                                <div className="text-[11px] text-sky-400">
                                  {ad.category} · {getDaysRemainingBadge(ad.expiresAt)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onTogglePinSquareAd(ad.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                                  ad.isAdminPinned
                                    ? 'bg-amber-500 text-[#0A192F]'
                                    : 'bg-[#1E293B] text-[#94A3B8]'
                                }`}
                              >
                                {ad.isAdminPinned ? 'مثبت' : 'عشوائي'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdId(ad.id);
                                  setAdPlaceName(ad.title);
                                  setAdCategoryOrSub(ad.category);
                                  setAdLocationUrl(ad.locationUrl || '');
                                  setAdPhone(ad.phone || '');
                                  setAdDurationDays(ad.durationDays || 5);
                                  setAdMainImage(ad.imageUrl);
                                  setAdMenuImages(ad.menuImages || []);
                                  setAdPinned(ad.isAdminPinned);
                                }}
                                className="p-1.5 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSquareAd(ad.id)}
                                className="p-1.5 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeAdPackageTab === 'top_banner' && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-[#94A3B8]">
                        البنرات العلوية الحالية ({state.topBanners.length}):
                      </div>

                      {state.topBanners.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedTopBannerIds.length === state.topBanners.length) {
                                setSelectedTopBannerIds([]);
                              } else {
                                setSelectedTopBannerIds(state.topBanners.map((b) => b.id));
                              }
                              setConfirmBulkDeleteBanner(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0A192F] border border-sky-400/50 text-sky-300 text-xs font-bold cursor-pointer"
                          >
                            {selectedTopBannerIds.length === state.topBanners.length
                              ? 'إلغاء تحديد الكل'
                              : 'تحديد الكل'}
                          </button>

                          {selectedTopBannerIds.length > 0 && !confirmBulkDeleteBanner && (
                            <button
                              type="button"
                              onClick={() => setConfirmBulkDeleteBanner(true)}
                              className="px-3 py-1 rounded-lg bg-rose-600/85 hover:bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف المحدد ({selectedTopBannerIds.length})</span>
                            </button>
                          )}

                          {confirmBulkDeleteBanner && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  selectedTopBannerIds.forEach((id) => onDeleteTopBanner(id));
                                  showToast(
                                    `تم حذف ${selectedTopBannerIds.length} بنر دفعة واحدة بنجاح.`
                                  );
                                  setSelectedTopBannerIds([]);
                                  setConfirmBulkDeleteBanner(false);
                                }}
                                className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-white/60 text-xs font-extrabold flex items-center gap-1 cursor-pointer animate-pulse shadow-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>تأكيد الحذف ({selectedTopBannerIds.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmBulkDeleteBanner(false)}
                                className="px-2.5 py-1 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white text-xs font-bold cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {state.topBanners.map((b) => {
                        const isChecked = selectedTopBannerIds.includes(b.id);
                        return (
                          <div
                            key={b.id}
                            className={`p-3 rounded-xl bg-[#0A192F] border flex items-center justify-between gap-3 ${
                              isChecked
                                ? 'border-rose-500 ring-1 ring-rose-500/40'
                                : 'border-[#334155]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedTopBannerIds((prev) =>
                                    prev.includes(b.id)
                                      ? prev.filter((x) => x !== b.id)
                                      : [...prev, b.id]
                                  );
                                  setConfirmBulkDeleteBanner(false);
                                }}
                                className="w-4 h-4 accent-rose-500 cursor-pointer shrink-0"
                              />
                              <img
                                src={b.imageUrl}
                                alt={b.title}
                                className="w-16 h-11 rounded-lg object-cover border border-[#334155] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                                  {b.title}
                                </div>
                                <div className="text-[11px] text-sky-400 truncate">
                                  {getDaysRemainingBadge(b.expiresAt)} · {b.subtitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdId(b.id);
                                  setAdPlaceName(b.title);
                                  setAdCategoryOrSub(b.subtitle || '');
                                  setAdLocationUrl(b.locationUrl || '');
                                  setAdPhone(b.phone || b.whatsappPhone || '');
                                  setAdDurationDays(b.durationDays || 5);
                                  setAdMainImage(b.imageUrl);
                                  setAdMenuImages(b.menuImages || []);
                                }}
                                className="p-1.5 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTopBanner(b.id)}
                                className="p-1.5 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </FluentCard>
            </div>
          )}

          {/* ====================================================================
              5. الرسائل (Messages Inbox from Footer "أرسل رسالة")
             ==================================================================== */}
          {activeSubTab === 'messages' && (
            <FluentCard className="space-y-4">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-400" />
                  <span>
                    5. صندوق الرسائل الواردة من زر &quot;أرسل رسالة&quot; ({state.messages.length})
                  </span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  جميع الرسائل المرسلة من المستخدمين عبر الفوتر مع اسم الحساب المرسل وتاريخ الإرسال.
                </p>
              </div>

              {state.messages.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-8 text-center">
                  صندوق الوارد فارغ حالياً.
                </p>
              ) : (
                <div className="space-y-3">
                  {state.messages.map((msg: AdminMessage) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl border space-y-2 ${
                        msg.isRead
                          ? 'bg-[#0A192F]/70 border-[#334155]'
                          : 'bg-[#1E293B] border-sky-400/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-sky-400">
                          المرسل: {msg.senderUsername}
                        </span>
                        <span className="text-[#94A3B8] font-mono-tabular">
                          {new Date(msg.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                        {msg.content}
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        {!msg.isRead && (
                          <FluentButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onMarkMessageRead(msg.id)}
                          >
                            تحديد كمقروءة
                          </FluentButton>
                        )}
                        <FluentButton
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteMessage(msg.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </FluentButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FluentCard>
          )}

          {/* ====================================================================
              6. قسم جديد (Dynamic Store Categories: Add, Edit, Delete)
             ==================================================================== */}
          {activeSubTab === 'new_category' && (
            <FluentCard className="space-y-4">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-sky-400" />
                  <span>
                    6. قسم جديد — إدارة أقسام المحلات ({state.settings.storeCategories.length})
                  </span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  أضف أو عدّل أو احذف أي قسم من أقسام المحلات وسينعكس التعديل لحظياً في القائمة المنسدلة بصفحة &quot;أضف محل&quot;.
                </p>
              </div>

              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="اكتب اسم القسم الجديد (مثال: محل ملابس، كافيه، جيم رياضي)..."
                  className="flex-1 rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                />
                <FluentButton type="submit" variant="primary">
                  <Plus className="w-4 h-4" />
                  <span>إضافة قسم</span>
                </FluentButton>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                {state.settings.storeCategories.map((cat) => (
                  <div
                    key={cat}
                    className="p-3 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2"
                  >
                    {editingCategoryOldName === cat ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editingCategoryNewName}
                          onChange={(e) => setEditingCategoryNewName(e.target.value)}
                          className="flex-1 rounded-lg bg-[#112240] border border-sky-400 px-2 py-1 text-xs text-[#F8FAFC] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmRenameCategory(cat)}
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                        >
                          حفظ
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-[#F8FAFC] truncate">
                          {cat}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryOldName(cat);
                              setEditingCategoryNewName(cat);
                            }}
                            title="تعديل اسم القسم"
                            className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            title="حذف القسم"
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </FluentCard>
          )}

          {/* ====================================================================
              7. التخزين (Storage: Encrypted & Hidden Cloud Image Key + Firebase Keys)
             ==================================================================== */}
          {activeSubTab === 'storage' && (
            <div className="space-y-5">
              <FluentCard className="space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400 font-extrabold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>التخزين السحابي ومفتاح موقع تحميل الصور مشفر ومخفي بالكامل</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  يعمل مفتاح تحميل الصور السحابي والتسجيل السحابي تلقائياً في الخلفية بنظام تشفير كامل ومخفي ولا يظهر لأي مستخدم.
                </p>
              </FluentCard>

              {/* Part A & Part B: مفاتيح رفع الصور والتسجيل السحابي مخفية ومشفرة بالكامل ولا تظهر لأي مستخدم */}
              <div className="hidden" aria-hidden="true">
                <form onSubmit={handleSaveImageHostConfig}>
                  <input
                    type="password"
                    value={imgHostSiteName}
                    onChange={(e) => setImgHostSiteName(e.target.value)}
                  />
                  <input
                    type="password"
                    value={imgHostApiKey}
                    onChange={(e) => setImgHostApiKey(e.target.value)}
                  />
                </form>
                <span>{connStatus}</span>
                <span>{connMessage}</span>
                <button type="button" onClick={handleExtractFirebaseSnippet} />
                <form onSubmit={handleSaveFirebaseConfig}>
                  <input value={fbPasteSnippet} onChange={(e) => setFbPasteSnippet(e.target.value)} />
                  <input type="checkbox" checked={fbEnabled} onChange={(e) => setFbEnabled(e.target.checked)} />
                  <select value={fbMode} onChange={(e) => setFbMode(e.target.value as 'firestore' | 'realtime')}>
                    <option value="firestore">firestore</option>
                    <option value="realtime">realtime</option>
                  </select>
                  <input value={fbApiKey} onChange={(e) => setFbApiKey(e.target.value)} />
                  <input value={fbProjectId} onChange={(e) => setFbProjectId(e.target.value)} />
                  <input value={fbDatabaseURL} onChange={(e) => setFbDatabaseURL(e.target.value)} />
                  <input value={fbAuthDomain} onChange={(e) => setFbAuthDomain(e.target.value)} />
                  <input value={fbStorageBucket} onChange={(e) => setFbStorageBucket(e.target.value)} />
                  <input value={fbMessagingSenderId} onChange={(e) => setFbMessagingSenderId(e.target.value)} />
                  <input value={fbAppId} onChange={(e) => setFbAppId(e.target.value)} />
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================
          MODALS FOR SUB-SECTIONS 1, 2, AND 3
         ======================================================================== */}

      {/* Modal 1A: Inspect Driver Full Details & Criminal Record Image */}
      {inspectedDriver && (
        <FluentModal
          isOpen={!!inspectedDriver}
          onClose={() => setInspectedDriver(null)}
          title={`بيانات السائق: ${inspectedDriver.driverName}`}
          subtitle="مراجعة البيانات الكاملة وصورة الفيش والتشبيه المرفوعة"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] text-xs">
              <div>
                <span className="text-[#94A3B8]">اسم السائق: </span>
                <strong className="text-[#F8FAFC]">{inspectedDriver.driverName}</strong>
              </div>
              <div>
                <span className="text-[#94A3B8]">رقم الهاتف: </span>
                <strong className="text-sky-400 font-mono-tabular">
                  {inspectedDriver.phone}
                </strong>
              </div>
              <div>
                <span className="text-[#94A3B8]">رقم البطاقة (الرقم القومي): </span>
                <strong className="text-[#F8FAFC] font-mono-tabular">
                  {inspectedDriver.nationalId || 'غير مسجل'}
                </strong>
              </div>
              <div>
                <span className="text-[#94A3B8]">تاريخ التسجيل: </span>
                <strong className="text-[#F8FAFC] font-mono-tabular">
                  {new Date(inspectedDriver.createdAt).toLocaleString('ar-EG')}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-extrabold text-sky-400">
                صورة الفيش والتشبيه المرفوعة:
              </div>
              {inspectedDriver.criminalRecordImageUrl ? (
                <div className="rounded-xl overflow-hidden border border-sky-400/50 bg-[#0A192F]">
                  <img
                    src={inspectedDriver.criminalRecordImageUrl}
                    alt="صورة الفيش والتشبيه"
                    className="w-full max-h-80 object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#0A192F] border border-amber-500/40 text-amber-300 text-xs text-center font-bold">
                  لم يقم السائق برفع صورة الفيش والتشبيه حتى الآن (يعمل ضمن مهلة الـ 3 أيام).
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#334155]">
              <FluentButton
                variant="secondary"
                onClick={() => {
                  const target = inspectedDriver;
                  setInspectedDriver(null);
                  openEditDriverModal(target);
                }}
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل</span>
              </FluentButton>
              <FluentButton
                variant="danger"
                onClick={() => {
                  onDeleteTawsila(inspectedDriver.id);
                  setInspectedDriver(null);
                  showToast('تم حذف طلب السائق.');
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </FluentButton>
              <FluentButton
                variant="emerald"
                onClick={() => handleAcceptDriverRequest(inspectedDriver)}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تم القبول</span>
              </FluentButton>
            </div>
          </div>
        </FluentModal>
      )}

      {/* Modal 1B: Edit Driver Request */}
      {editingDriver && (
        <FluentModal
          isOpen={!!editingDriver}
          onClose={() => setEditingDriver(null)}
          title={`تعديل بيانات السائق: ${editingDriver.driverName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditedDriver} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                اسم السائق
              </label>
              <input
                type="text"
                required
                value={drvName}
                onChange={(e) => setDrvName(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                required
                value={drvPhone}
                onChange={(e) => setDrvPhone(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                رقم البطاقة
              </label>
              <input
                type="text"
                value={drvNationalId}
                onChange={(e) => setDrvNationalId(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                تحديث صورة الفيش والتشبيه
              </label>
              <label className="fluent-reveal px-3 py-2 rounded-xl bg-[#0A192F] border border-sky-400/50 text-sky-300 text-xs font-bold cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>{uploadingDrvRecord ? 'جاري الرفع...' : 'رفع صورة فيش جديدة'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingDrvRecord(true);
                    try {
                      const res = await uploadImageDynamic(
                        file,
                        state.settings.imgbbApiKey
                      );
                      setDrvRecordUrl(res.url);
                    } finally {
                      setUploadingDrvRecord(false);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <FluentButton
                type="button"
                variant="ghost"
                onClick={() => setEditingDriver(null)}
              >
                إلغاء
              </FluentButton>
              <FluentButton type="submit" variant="primary">
                حفظ التعديلات
              </FluentButton>
            </div>
          </form>
        </FluentModal>
      )}

      {/* Modal 2: Edit User Account */}
      {editingUser && (
        <FluentModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`تعديل حساب: ${editingUser.username}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditedUser} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                اسم المستخدم
              </label>
              <input
                type="text"
                required
                value={usrUsername}
                onChange={(e) => setUsrUsername(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                الباسورد
              </label>
              <input
                type="text"
                required
                value={usrPassword}
                onChange={(e) => setUsrPassword(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={usrPhone}
                onChange={(e) => setUsrPhone(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                الصلاحية
              </label>
              <select
                value={usrRole}
                onChange={(e) => setUsrRole(e.target.value as UserRoleType)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-xs text-[#F8FAFC] outline-none"
              >
                <option value="user">مستخدم عادي (User)</option>
                <option value="moderator">
                  مشرف (له نفس وظائف Admin من إضافة وتحميل وتصدير ومراقبة الشات الحي بدون حذف نهائي)
                </option>
                <option value="admin">مدير النظام (Admin)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <FluentButton
                type="button"
                variant="ghost"
                onClick={() => setEditingUser(null)}
              >
                إلغاء
              </FluentButton>
              <FluentButton type="submit" variant="primary">
                حفظ التعديلات
              </FluentButton>
            </div>
          </form>
        </FluentModal>
      )}

      {/* Modal 3: Edit Store Listing */}
      {editingStore && (
        <FluentModal
          isOpen={!!editingStore}
          onClose={() => setEditingStore(null)}
          title={`تعديل محل: ${editingStore.name}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEditedStore} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                  القسم
                </label>
                <select
                  value={stCategory}
                  onChange={(e) => setStCategory(e.target.value)}
                  className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] outline-none"
                >
                  {state.settings.storeCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                  اسم المحل
                </label>
                <input
                  type="text"
                  required
                  value={stName}
                  onChange={(e) => setStName(e.target.value)}
                  className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  required
                  value={stPhone}
                  onChange={(e) => setStPhone(e.target.value)}
                  className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                  لوكيشن المحل (Google Maps)
                </label>
                <input
                  type="url"
                  value={stLocationUrl}
                  onChange={(e) => setStLocationUrl(e.target.value)}
                  className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3 py-2 text-xs text-[#F8FAFC] font-mono-tabular outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">
                تفاصيل المحل
              </label>
              <textarea
                rows={3}
                value={stDetails}
                onChange={(e) => setStDetails(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] p-3 text-xs sm:text-sm text-[#F8FAFC] outline-none"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-sky-400">
                صور منيو المحل ({stMenuImages.length}) — يمكنك حذف أي صورة قديمة أو حديثة وتحديد الصورة الرئيسية والترقيم:
              </label>
              <div className="flex items-center gap-2">
                <label className="fluent-reveal px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingStoreMenu ? 'جاري رفع الصور...' : 'إضافة صور للمنيو'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setUploadingStoreMenu(true);
                      try {
                        const urls: string[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const res = await uploadImageDynamic(
                            files[i],
                            state.settings.imgbbApiKey
                          );
                          urls.push(res.url);
                        }
                        setStMenuImages((prev) => [...prev, ...urls]);
                      } finally {
                        setUploadingStoreMenu(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {stMenuImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStMenuImages([])}
                    className="text-xs text-rose-400 underline cursor-pointer"
                  >
                    مسح جميع الصور
                  </button>
                )}
              </div>

              {stMenuImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {stMenuImages.map((imgUrl, idx) => {
                    const isPrimary = idx === 0;
                    return (
                      <div
                        key={`${idx}-${imgUrl.slice(0, 24)}`}
                        className={`rounded-xl overflow-hidden border-2 bg-[#0A192F] flex flex-col ${
                          isPrimary
                            ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                            : 'border-[#334155]'
                        }`}
                      >
                        <div className="relative h-24 w-full bg-[#1E293B]">
                          <img
                            src={imgUrl}
                            alt={`Store ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow ${
                              isPrimary
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#0A192F]/90 text-[#F8FAFC] border border-[#334155]'
                            }`}
                          >
                            {isPrimary ? '1 ★ الرئيسية' : `صورة #${idx + 1}`}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setStMenuImages((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            title="حذف هذه الصورة"
                            className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-1.5 bg-[#112240] border-t border-[#334155] flex items-center justify-between gap-1">
                          {isPrimary ? (
                            <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1 px-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>الرئيسية</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setStMenuImages((prev) => {
                                  const target = prev[idx];
                                  const rest = prev.filter((_, i) => i !== idx);
                                  return [target, ...rest];
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold cursor-pointer"
                            >
                              تحديد كرئيسية
                            </button>
                          )}

                          {stMenuImages.length > 1 && (
                            <select
                              value={idx}
                              onChange={(e) => {
                                const newIdx = Number(e.target.value);
                                if (newIdx === idx) return;
                                setStMenuImages((prev) => {
                                  const copy = [...prev];
                                  const [moved] = copy.splice(idx, 1);
                                  copy.splice(newIdx, 0, moved);
                                  return copy;
                                });
                              }}
                              title="ترقيم الصورة"
                              className="rounded-lg bg-[#0A192F] border border-[#334155] px-1.5 py-0.5 text-[10px] font-extrabold text-[#F8FAFC] outline-none cursor-pointer"
                            >
                              {stMenuImages.map((_, orderIdx) => (
                                <option key={orderIdx} value={orderIdx}>
                                  {orderIdx === 0
                                    ? 'ترقيم: 1 (الرئيسية)'
                                    : `ترقيم: ${orderIdx + 1}`}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <FluentButton
                type="button"
                variant="ghost"
                onClick={() => setEditingStore(null)}
              >
                إلغاء
              </FluentButton>
              <FluentButton type="submit" variant="primary">
                حفظ التعديلات
              </FluentButton>
            </div>
          </form>
        </FluentModal>
      )}
    </div>
  );
};

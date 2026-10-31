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
  Radio,
  MessageCircle,
  Send,
  History,
  ChevronDown,
  ChevronUp,
  X,
  Wrench,
  Settings,
  Download,
  RotateCcw,
  HardDrive,
  Smartphone,
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
  createSuggestedStoreSvgPair,
  findLinkedStoreForAd,
  getEffectiveOnlineDisplayCount,
  isPermanentDreamPlazaStore,
  mergeViewsByHourMaps,
  RealOnlinePresenceStats,
  setGlobalDefaultStoreSvgStyle,
  storageEngine,
  uploadImageDynamic,
} from '../services/storageService';
import {
  exportAdSummaryToLandscapePDF,
  exportPlatformSummaryToPDF,
  exportUsersAndMessagesToExcel,
  getPeakViewingHourLabel,
} from '../services/exportService';

export type AdminSettingsSubSectionId =
  | 'driver_requests'
  | 'accounts'
  | 'registered_stores'
  | 'ad_packages'
  | 'messages'
  | 'new_category'
  | 'storage'
  | 'online_users'
  | 'maintenance'
  | 'data_backup'
  | 'app_download'
  | 'activity_logs';

interface AdminSettingsHubViewProps {
  state: PlatformDatabaseState;
  currentUser?: UserAccount | null;
  onlineStats?: RealOnlinePresenceStats;
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
  onAdminReplyToMessage?: (messageId: string, replyText: string) => void;
  // 6. Categories rename helper
  onRenameStoreCategory: (oldName: string, newName: string) => void;
  // 8. Online Users Private Chat Trigger
  onOpenPrivateChatWithUser?: (targetUserId: string, targetUsername: string) => void;
  onOpenPrivateChatHistoryModal?: () => void;
}

export const AdminSettingsHubView: React.FC<AdminSettingsHubViewProps> = ({
  state,
  currentUser,
  onlineStats,
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
  onAdminReplyToMessage,
  onRenameStoreCategory,
  onOpenPrivateChatWithUser,
  onOpenPrivateChatHistoryModal,
}) => {
  const [activeSubTab, setActiveSubTab] =
    useState<AdminSettingsSubSectionId>('driver_requests');
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3800);
  };

  // --- General Header Fields: Site Name, Contact Number, Facebook Link & Marquee ---
  const [generalSiteName, setGeneralSiteName] = useState(state.settings.siteName);
  const [generalContactPhone, setGeneralContactPhone] = useState(
    state.settings.adminWhatsapp
  );
  const [generalFacebookUrl, setGeneralFacebookUrl] = useState(
    state.settings.facebookPageUrl || ''
  );
  const [generalMarquee, setGeneralMarquee] = useState(state.settings.marqueeText);

  React.useEffect(() => {
    setGeneralSiteName(state.settings.siteName);
    setGeneralContactPhone(state.settings.adminWhatsapp);
    setGeneralFacebookUrl(state.settings.facebookPageUrl || '');
    setGeneralMarquee(state.settings.marqueeText);
  }, [
    state.settings.siteName,
    state.settings.adminWhatsapp,
    state.settings.facebookPageUrl,
    state.settings.marqueeText,
  ]);

  // Messages Reply, Collapsible Dropdown & Correspondence History Modal State
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [collapsedMessagesMap, setCollapsedMessagesMap] = useState<
    Record<string, boolean>
  >({});
  const [collapsedModalMessagesMap, setCollapsedModalMessagesMap] = useState<
    Record<string, boolean>
  >({});
  const [isMessagesHistoryModalOpen, setIsMessagesHistoryModalOpen] = useState(false);
  const [storePendingDelete, setStorePendingDelete] = useState<StoreListingItem | null>(
    null
  );
  const [pinnedHistoryIds, setPinnedHistoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nakhil_admin_pinned_history_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [deletedHistoryEntryIds, setDeletedHistoryEntryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nakhil_admin_deleted_entries_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinHistoryItem = (itemId: string) => {
    setPinnedHistoryIds((prev) => {
      const next = prev.includes(itemId)
        ? prev.filter((x) => x !== itemId)
        : [itemId, ...prev];
      try {
        localStorage.setItem('nakhil_admin_pinned_history_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const deleteHistoryEntryItem = (entryId: string) => {
    setDeletedHistoryEntryIds((prev) => {
      const next = prev.includes(entryId) ? prev : [...prev, entryId];
      try {
        localStorage.setItem('nakhil_admin_deleted_entries_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    showToast('تم حذف الرسالة من السجل بنجاح.');
  };

  const handleSaveGeneralTopFields = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...state.settings,
      siteName: generalSiteName.trim() || state.settings.siteName,
      adminWhatsapp: generalContactPhone.trim() || state.settings.adminWhatsapp,
      facebookPageUrl: generalFacebookUrl.trim(),
      marqueeText: generalMarquee.trim() || state.settings.marqueeText,
      updatedAt: Date.now(),
    });
    showToast('تم حفظ اسم الموقع ورقم التواصل ولينك الفيس بوك والشريط الإخباري لحظياً وبشكل دائم!');
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
  // 2. الحسابات (Accounts State) + خانة اسم المدير
  // ============================================================================
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [usrAccountName, setUsrAccountName] = useState('');
  const [usrUsername, setUsrUsername] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrPhone, setUsrPhone] = useState('');
  const [usrRole, setUsrRole] = useState<UserRoleType>('user');
  const [newAdminDisplayNameInput, setNewAdminDisplayNameInput] = useState('');
  const [adminNameUpdatedModalText, setAdminNameUpdatedModalText] = useState<
    string | null
  >(null);

  const currentAdminAccount =
    state.users.find((u) => u.role === 'admin') ||
    state.users.find(
      (u) => (u.accountName || u.username).trim().toLowerCase() === 'admin'
    ) ||
    null;

  const handleSaveAdminDisplayName = () => {
    const cleanNewName = newAdminDisplayNameInput.trim();
    if (!cleanNewName || !currentAdminAccount) return;
    onUpdateUserAccount({
      ...currentAdminAccount,
      accountName: currentAdminAccount.accountName || 'admin',
      username: cleanNewName,
      role: 'admin',
      updatedAt: Date.now(),
    });
    setNewAdminDisplayNameInput('');
    setAdminNameUpdatedModalText(cleanNewName);
  };

  const openEditUserModal = (u: UserAccount) => {
    setEditingUser(u);
    setUsrAccountName(u.accountName || u.username);
    setUsrUsername(u.username);
    setUsrPassword(u.password);
    setUsrPhone(u.phone || '');
    setUsrRole(u.role);
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !usrPassword.trim()) return;
    const nextDisplayName = usrUsername.trim() || usrAccountName.trim();
    if (!nextDisplayName) return;
    onUpdateUserAccount({
      ...editingUser,
      accountName:
        editingUser.role === 'admin'
          ? editingUser.accountName || 'admin'
          : usrAccountName.trim() || nextDisplayName,
      username: nextDisplayName,
      password: usrPassword,
      phone: usrPhone.trim() || undefined,
      role: usrRole,
      updatedAt: Date.now(),
    });
    setEditingUser(null);
    showToast(`تم تعديل حساب "${nextDisplayName}" بنجاح.`);
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
    const realUploaded = stMenuImages.filter(
      (img) => typeof img === 'string' && !img.startsWith('data:image/svg+xml')
    );
    const finalImgs =
      realUploaded.length > 0
        ? realUploaded
        : [createSquareAdSvg(stName.trim(), stCategory, '#38BDF8')];
    onUpdateStore({
      ...editingStore,
      name: stName.trim(),
      category: stCategory,
      phone: stPhone.trim(),
      whatsapp: stPhone.trim().replace(/[^0-9]/g, ''),
      locationUrl: stLocationUrl.trim(),
      details: stDetails.trim(),
      menuImages: finalImgs,
      updatedAt: Date.now(),
      imagesExplicitlyCleared: realUploaded.length === 0,
    });
    setEditingStore(null);
    showToast(`تم حفظ تعديلات محل "${stName.trim()}" بنجاح.`);
  };

  // ============================================================================
  // 4. باقات الإعلانات (Ad Packages Unified Admin Form & List + Edit Prices Modal)
  // ============================================================================
  const [isEditAdPricesModalOpen, setIsEditAdPricesModalOpen] = useState(false);
  const [pricePkg1Draft, setPricePkg1Draft] = useState<string>(
    String(state.settings.adPackagesPricing?.pkg1DailyPrice ?? 15)
  );
  const [pricePkg2Draft, setPricePkg2Draft] = useState<string>(
    String(state.settings.adPackagesPricing?.pkg2DailyPrice ?? 25)
  );
  const [pricePkg3Draft, setPricePkg3Draft] = useState<string>(
    String(state.settings.adPackagesPricing?.pkg3DailyPrice ?? 100)
  );
  const [discount10DaysDraft, setDiscount10DaysDraft] = useState<string>(
    String(state.settings.adPackagesPricing?.tenDaysDiscountPercent ?? 20)
  );

  const openEditAdPricesModal = () => {
    setPricePkg1Draft(String(state.settings.adPackagesPricing?.pkg1DailyPrice ?? 15));
    setPricePkg2Draft(String(state.settings.adPackagesPricing?.pkg2DailyPrice ?? 25));
    setPricePkg3Draft(String(state.settings.adPackagesPricing?.pkg3DailyPrice ?? 100));
    setDiscount10DaysDraft(
      String(state.settings.adPackagesPricing?.tenDaysDiscountPercent ?? 20)
    );
    setIsEditAdPricesModalOpen(true);
  };

  const handleSaveAdPrices = (e: React.FormEvent) => {
    e.preventDefault();
    const p1 = Math.max(1, Number(pricePkg1Draft) || 15);
    const p2 = Math.max(1, Number(pricePkg2Draft) || 25);
    const p3 = Math.max(1, Number(pricePkg3Draft) || 100);
    const disc = Math.min(100, Math.max(0, Number(discount10DaysDraft) || 0));

    onUpdateSettings({
      ...state.settings,
      adPackagesPricing: {
        pkg1DailyPrice: p1,
        pkg2DailyPrice: p2,
        pkg3DailyPrice: p3,
        tenDaysDiscountPercent: disc,
      },
      updatedAt: Date.now(),
    });
    setIsEditAdPricesModalOpen(false);
    showToast('تم حفظ وتحديث أسعار باقات الإعلانات ونسبة الخصم لحظياً لجميع المستخدمين!');
  };

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
  const [adSelectedStoreId, setAdSelectedStoreId] = useState<string>('');
  const [inspectedAdModal, setInspectedAdModal] = useState<{
    pkgType: 'moving_square' | 'top_banner' | 'popup_entry';
    adId: string;
  } | null>(null);
  const [isEditingInsideAdModal, setIsEditingInsideAdModal] = useState<boolean>(false);
  const [renewDaysDraft, setRenewDaysDraft] = useState<number>(5);

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdSelectedStoreId('');
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

  const loadSquareAdIntoForm = (ad: SquareMovingAd) => {
    setActiveAdPackageTab('moving_square');
    setEditingAdId(ad.id);
    setAdSelectedStoreId(ad.storeId || '');
    setAdPlaceName(ad.title);
    setAdCategoryOrSub(ad.category);
    setAdLocationUrl(ad.locationUrl || '');
    setAdPhone(ad.phone || '');
    setAdDurationDays(ad.durationDays || 5);
    setRenewDaysDraft(ad.durationDays || 5);
    if (ad.linkUrl) {
      setAdNavMode('external_link');
      setAdExternalLink(ad.linkUrl);
    } else {
      setAdNavMode('internal_section');
      setAdInternalSection((ad.targetSection as MainSectionId) || 'directory');
    }
    setAdMainImage(ad.imageUrl);
    setAdMenuImages(ad.menuImages || []);
    setAdPinned(ad.isAdminPinned);
  };

  const loadTopBannerIntoForm = (b: TopBannerAd) => {
    setActiveAdPackageTab('top_banner');
    setEditingAdId(b.id);
    setAdSelectedStoreId(b.storeId || '');
    setAdPlaceName(b.title);
    setAdCategoryOrSub(b.subtitle || '');
    setAdLocationUrl(b.locationUrl || '');
    setAdPhone(b.phone || b.whatsappPhone || '');
    setAdDurationDays(b.durationDays || 5);
    setRenewDaysDraft(b.durationDays || 5);
    if (b.linkUrl) {
      setAdNavMode('external_link');
      setAdExternalLink(b.linkUrl);
    } else {
      setAdNavMode('internal_section');
      setAdInternalSection((b.targetSection as MainSectionId) || 'directory');
    }
    setAdMainImage(b.imageUrl);
    setAdMenuImages(b.menuImages || []);
  };

  const loadPopupIntoForm = () => {
    const p = state.popupAd;
    setActiveAdPackageTab('popup_entry');
    setEditingAdId(p.id);
    setAdSelectedStoreId(p.storeId || '');
    setAdPopupActive(p.active);
    setAdDurationDays(p.durationDays || 7);
    setRenewDaysDraft(p.durationDays || 7);
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

  const openInspectSquareAdModal = (ad: SquareMovingAd, startEdit = false) => {
    loadSquareAdIntoForm(ad);
    setIsEditingInsideAdModal(startEdit);
    setInspectedAdModal({ pkgType: 'moving_square', adId: ad.id });
  };

  const openInspectTopBannerModal = (b: TopBannerAd, startEdit = false) => {
    loadTopBannerIntoForm(b);
    setIsEditingInsideAdModal(startEdit);
    setInspectedAdModal({ pkgType: 'top_banner', adId: b.id });
  };

  const openInspectPopupAdModal = (startEdit = false) => {
    loadPopupIntoForm();
    setIsEditingInsideAdModal(startEdit);
    setInspectedAdModal({ pkgType: 'popup_entry', adId: state.popupAd.id });
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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingAdMain(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImageDynamic(files[i], state.settings.imgbbApiKey);
        uploaded.push(res.url);
      }
      if (uploaded.length === 0) return;
      const prevMain = adMainImage.trim();
      const prevMainIsReal = prevMain && !prevMain.startsWith('data:image/svg+xml');
      setAdMainImage(uploaded[0]);
      setAdMenuImages((prev) => {
        const cleanPrev = prev.filter(
          (img) => typeof img === 'string' && !img.startsWith('data:image/svg+xml')
        );
        return [
          ...uploaded.slice(1),
          ...(prevMainIsReal ? [prevMain] : []),
          ...cleanPrev,
        ];
      });
      showToast(
        uploaded.length > 1
          ? `تم رفع ${uploaded.length} صور للإعلان بنجاح!`
          : 'تم رفع الصورة وتحديدها كصورة رئيسية (#1) للإعلان بنجاح!'
      );
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
      const prevMain = adMainImage.trim();
      const prevMainIsReal = prevMain && !prevMain.startsWith('data:image/svg+xml');
      if (!prevMainIsReal && uploaded.length > 0) {
        setAdMainImage(uploaded[0]);
        setAdMenuImages((prev) => [
          ...prev.filter(
            (img) => typeof img === 'string' && !img.startsWith('data:image/svg+xml')
          ),
          ...uploaded.slice(1),
        ]);
      } else {
        setAdMenuImages((prev) => [
          ...prev.filter(
            (img) => typeof img === 'string' && !img.startsWith('data:image/svg+xml')
          ),
          ...uploaded,
        ]);
      }
      showToast(`تم رفع ${uploaded.length} صورة للإعلان بنجاح!`);
    } finally {
      setUploadingAdExtra(false);
    }
  };

  const handleSaveAdPackageItem = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTitle =
      adPlaceName.trim() ||
      adCategoryOrSub.trim() ||
      (adMainImage.trim() ? 'إعلان مميز' : '');
    if (!effectiveTitle) {
      showToast('يرجى إدخال اسم المكان / عنوان الإعلان أو رفع صورة الإعلان أولاً.');
      return;
    }

    const days = Math.max(1, Number(adDurationDays) || 1);
    const expiresAtIso = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    const linkUrlVal =
      adNavMode === 'external_link' ? adExternalLink.trim() || undefined : undefined;
    const targetSectionVal =
      adNavMode === 'internal_section' ? adInternalSection : undefined;

    if (activeAdPackageTab === 'moving_square') {
      const existingSq = editingAdId
        ? state.squareAds.find((item) => item.id === editingAdId)
        : undefined;
      const finalImg =
        adMainImage.trim() ||
        createSquareAdSvg(effectiveTitle, adCategoryOrSub || 'إعلان مميز', '#F59E0B');

      const matchedStore =
        state.stores.find((s) => s.id === (adSelectedStoreId || existingSq?.storeId)) ||
        findLinkedStoreForAd(state.stores, {
          storeId: adSelectedStoreId || existingSq?.storeId,
          title: effectiveTitle,
          phone: adPhone.trim(),
        });

      const sqPayload: SquareMovingAd = {
        id:
          editingAdId ||
          (adSelectedStoreId ? `sq-store-${adSelectedStoreId}` : `sq-${Date.now()}`),
        storeId: adSelectedStoreId || existingSq?.storeId || matchedStore?.id || undefined,
        title: effectiveTitle,
        category: adCategoryOrSub.trim() || 'عام',
        imageUrl: finalImg,
        locationUrl: adLocationUrl.trim() || undefined,
        phone: adPhone.trim() || undefined,
        linkUrl: linkUrlVal,
        targetSection: targetSectionVal,
        menuImages: adMenuImages,
        description: adCategoryOrSub.trim() || 'إعلان مميز',
        isAdminPinned: existingSq ? existingSq.isAdminPinned : true,
        durationDays: days,
        expiresAt: expiresAtIso,
        active: true,
        createdAt: existingSq?.createdAt || new Date().toISOString(),
        viewsCount: Math.max(
          existingSq?.viewsCount || 0,
          matchedStore?.viewsCount || 0
        ),
        baselineViewsAtCreation:
          existingSq?.baselineViewsAtCreation ?? (matchedStore?.viewsCount || 0),
        adViewsSinceCreation: existingSq?.adViewsSinceCreation ?? 0,
        callClicksCount: Math.max(
          existingSq?.callClicksCount || 0,
          matchedStore?.callClicksCount || 0
        ),
        whatsappClicksCount: Math.max(
          existingSq?.whatsappClicksCount || 0,
          matchedStore?.whatsappClicksCount || 0
        ),
        viewsByHour: mergeViewsByHourMaps(
          existingSq?.viewsByHour,
          matchedStore?.viewsByHour
        ),
        updatedAt: Date.now(),
      };

      if (editingAdId) {
        onUpdateSquareAd(sqPayload);
        showToast(`تم تعديل الإعلان المربع "${sqPayload.title}" بنجاح!`);
        setIsEditingInsideAdModal(false);
      } else {
        onAddSquareAd(sqPayload);
        showToast(
          `تم نشر الإعلان المربع "${sqPayload.title}" لمدة ${days} أيام (يظل متواجداً في قاعدة البيانات حتى انتهاء المدة).`
        );
        resetAdForm();
      }
    } else if (activeAdPackageTab === 'top_banner') {
      const existingBnr = editingAdId
        ? state.topBanners.find((item) => item.id === editingAdId)
        : undefined;
      const matchedStore =
        state.stores.find((s) => s.id === (adSelectedStoreId || existingBnr?.storeId)) ||
        findLinkedStoreForAd(state.stores, {
          storeId: adSelectedStoreId || existingBnr?.storeId,
          title: effectiveTitle,
          phone: adPhone.trim(),
        });
      const finalImg =
        adMainImage.trim() ||
        createBannerSvg(
          effectiveTitle,
          adCategoryOrSub.trim() || 'بانر إعلاني مميز',
          'عرض خاص ومميز',
          '#38BDF8',
          '#0284C7'
        );

      const bnrPayload: TopBannerAd = {
        id: editingAdId || `bnr-${Date.now()}`,
        storeId: adSelectedStoreId || existingBnr?.storeId || matchedStore?.id || undefined,
        title: effectiveTitle,
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
        createdAt: existingBnr?.createdAt || new Date().toISOString(),
        viewsCount: Math.max(
          existingBnr?.viewsCount || 0,
          matchedStore?.viewsCount || 0
        ),
        baselineViewsAtCreation:
          existingBnr?.baselineViewsAtCreation ?? (matchedStore?.viewsCount || 0),
        adViewsSinceCreation: existingBnr?.adViewsSinceCreation ?? 0,
        callClicksCount: Math.max(
          existingBnr?.callClicksCount || 0,
          matchedStore?.callClicksCount || 0
        ),
        whatsappClicksCount: Math.max(
          existingBnr?.whatsappClicksCount || 0,
          matchedStore?.whatsappClicksCount || 0
        ),
        viewsByHour: mergeViewsByHourMaps(
          existingBnr?.viewsByHour,
          matchedStore?.viewsByHour
        ),
        updatedAt: Date.now(),
      };

      if (editingAdId) {
        onUpdateTopBanner(bnrPayload);
        showToast(`تم تحديث البانر العلوي "${bnrPayload.title}" بنجاح!`);
        setIsEditingInsideAdModal(false);
      } else {
        onAddTopBanner(bnrPayload);
        showToast(
          `تم إضافة وتفعيل البانر العلوي "${bnrPayload.title}" لمدة ${days} أيام بنجاح!`
        );
        resetAdForm();
      }
    } else if (activeAdPackageTab === 'popup_entry') {
      const matchedStore =
        state.stores.find((s) => s.id === (adSelectedStoreId || state.popupAd.storeId)) ||
        findLinkedStoreForAd(state.stores, {
          storeId: adSelectedStoreId || state.popupAd.storeId,
          title: effectiveTitle,
          phone: adPhone.trim(),
        });
      const finalImg =
        adMainImage.trim() ||
        state.popupAd.imageUrl ||
        createBannerSvg(
          effectiveTitle,
          adCategoryOrSub.trim() || 'إعلان الشاشة المنبثقة عند الدخول',
          'إعلان VIP',
          '#38BDF8',
          '#0284C7'
        );

      const popupPayload: PopupAdConfig = {
        id: 'popup-main-1',
        storeId: adSelectedStoreId || matchedStore?.id || state.popupAd.storeId || undefined,
        active: adPopupActive,
        title: effectiveTitle,
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
        viewsCount: Math.max(
          state.popupAd.viewsCount || 0,
          matchedStore?.viewsCount || 0
        ),
        baselineViewsAtCreation:
          state.popupAd.baselineViewsAtCreation ?? (matchedStore?.viewsCount || 0),
        adViewsSinceCreation: state.popupAd.adViewsSinceCreation ?? 0,
        callClicksCount: Math.max(
          state.popupAd.callClicksCount || 0,
          matchedStore?.callClicksCount || 0
        ),
        whatsappClicksCount: Math.max(
          state.popupAd.whatsappClicksCount || 0,
          matchedStore?.whatsappClicksCount || 0
        ),
        viewsByHour: mergeViewsByHourMaps(
          state.popupAd.viewsByHour,
          matchedStore?.viewsByHour
        ),
        updatedAt: Date.now(),
      };

      onUpdatePopupAd(popupPayload);
      setIsEditingInsideAdModal(false);
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
    {
      id: 'online_users',
      number: 8,
      label: 'عدد المتصلين الآن',
      subtitle: 'أسماء المتصلين الآن ومحادثة خاصة معهم',
      icon: Radio,
      badge: getEffectiveOnlineDisplayCount(
        onlineStats?.totalOnline || 1,
        state.settings.customOnlineCount
      ),
    },
    {
      id: 'maintenance',
      number: 9,
      label: 'الصيانة',
      subtitle: 'تفعيل أو تعطيل أقسام القائمة الجانبية',
      icon: Wrench,
      badge:
        Object.values(state.settings.disabledSections || {}).filter(Boolean).length ||
        undefined,
    },
    {
      id: 'data_backup',
      number: 10,
      label: 'البيانات',
      subtitle: 'استيراد وتصدير واسترجاع كافة بيانات الموقع',
      icon: HardDrive,
    },
    {
      id: 'app_download',
      number: 11,
      label: 'التطبيق',
      subtitle: 'أضف رابط، ارفع التطبيق، أو لينك التطبيق',
      icon: Smartphone,
    },
    {
      id: 'activity_logs',
      number: 12,
      label: 'سجل الأحداث',
      subtitle: 'تعديلات وحذف المحلات والخدمات والمنشورات والحسابات',
      icon: History,
      badge: (state.settings.adminActivityLogs || []).length || undefined,
    },
  ];

  // State for Accounts search, Activity Logs & Top Daily Visitors Modal
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');
  const [showAllActivityLogs, setShowAllActivityLogs] = useState<boolean>(false);
  const [isAuthSessionLogsOpen, setIsAuthSessionLogsOpen] = useState<boolean>(false);
  const [showAllAuthSessionLogs, setShowAllAuthSessionLogs] = useState<boolean>(false);
  const [isTopVisitorsModalOpen, setIsTopVisitorsModalOpen] = useState<boolean>(false);

  const formatActivityDayTimeDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'long' });
      const timeStr = d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const dateStr = d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return `${dayName} · ${timeStr} · ${dateStr}`;
    } catch {
      return iso;
    }
  };

  // State for Section 11: التطبيق (App Download / Upload / External Link)
  const [selectedAppOption, setSelectedAppOption] = useState<
    'add_link' | 'upload_app' | 'app_link' | null
  >(state.settings.appDownloadActiveOption || null);
  const [appAddLinkInput, setAppAddLinkInput] = useState<string>(
    state.settings.appAddLinkUrl || ''
  );
  const [appUploadedUrl, setAppUploadedUrl] = useState<string>(
    state.settings.appUploadedFileUrl || ''
  );
  const [appUploadedName, setAppUploadedName] = useState<string>(
    state.settings.appUploadedFileName || ''
  );
  const [appExternalLinkInput, setAppExternalLinkInput] = useState<string>(
    state.settings.appExternalLinkUrl || ''
  );
  const [isUploadingAppFile, setIsUploadingAppFile] = useState(false);

  React.useEffect(() => {
    setSelectedAppOption(state.settings.appDownloadActiveOption || null);
    setAppAddLinkInput(state.settings.appAddLinkUrl || '');
    setAppUploadedUrl(state.settings.appUploadedFileUrl || '');
    setAppUploadedName(state.settings.appUploadedFileName || '');
    setAppExternalLinkInput(state.settings.appExternalLinkUrl || '');
  }, [
    state.settings.appDownloadActiveOption,
    state.settings.appAddLinkUrl,
    state.settings.appUploadedFileUrl,
    state.settings.appUploadedFileName,
    state.settings.appExternalLinkUrl,
  ]);

  const handleSelectAppOption = (option: 'add_link' | 'upload_app' | 'app_link') => {
    setSelectedAppOption(option);
    onUpdateSettings({
      ...state.settings,
      appDownloadActiveOption: option,
      appAddLinkUrl: appAddLinkInput.trim(),
      appUploadedFileUrl: appUploadedUrl,
      appUploadedFileName: appUploadedName,
      appExternalLinkUrl: appExternalLinkInput.trim(),
      updatedAt: Date.now(),
    });
  };

  const handleSaveAppDownloadSettings = (
    optionToActivate?: 'add_link' | 'upload_app' | 'app_link'
  ) => {
    const activeOpt = optionToActivate || selectedAppOption || 'add_link';
    setSelectedAppOption(activeOpt);
    onUpdateSettings({
      ...state.settings,
      appDownloadActiveOption: activeOpt,
      appAddLinkUrl: appAddLinkInput.trim(),
      appUploadedFileUrl: appUploadedUrl,
      appUploadedFileName: appUploadedName,
      appExternalLinkUrl: appExternalLinkInput.trim(),
      updatedAt: Date.now(),
    });
    showToast(
      'تم حفظ إعدادات التطبيق وتفعيل زر التحميل داخل نافذة "تثبيت التطبيق" بنجاح!'
    );
  };

  const handleAppFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAppFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setAppUploadedUrl(result);
      setAppUploadedName(file.name);
      setSelectedAppOption('upload_app');
      onUpdateSettings({
        ...state.settings,
        appDownloadActiveOption: 'upload_app',
        appAddLinkUrl: appAddLinkInput.trim(),
        appUploadedFileUrl: result,
        appUploadedFileName: file.name,
        appExternalLinkUrl: appExternalLinkInput.trim(),
        updatedAt: Date.now(),
      });
      setIsUploadingAppFile(false);
      showToast(`تم رفع ملف التطبيق "${file.name}" وتفعيله للتحميل المباشر بنجاح!`);
    };
    reader.onerror = () => {
      setIsUploadingAppFile(false);
      showToast('تعذر قراءة ملف التطبيق المرفوع، يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // State for Section 10: البيانات (Data Backup, Restore & All-Time Recovery)
  const [isDataActionBusy, setIsDataActionBusy] = useState(false);

  const handleDownloadAllPlatformDataToDevice = () => {
    try {
      const jsonContent = storageEngine.exportFullBackupJson(state);
      const blob = new Blob([jsonContent], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `nakhil-1185-full-data-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(
        'تم تنزيل وحفظ جميع البيانات المدخلة وتفاصيل الحسابات والمحادثات والمنشورات والمحلات والإعلانات على جهازك بنجاح!'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر تنزيل ملف البيانات';
      showToast(`خطأ: ${msg}`);
    }
  };

  const handleUploadAndRestorePlatformDataFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDataActionBusy(true);
    try {
      const text = await file.text();
      const { summary } = await storageEngine.importFullBackupJson(
        text,
        currentUser?.id
      );
      showToast(summary);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'تأكد من اختيار ملف البيانات الصحيح (.json)';
      showToast(`تعذر استعادة ملف البيانات: ${msg}`);
    } finally {
      setIsDataActionBusy(false);
      e.target.value = '';
    }
  };

  const handleRestoreAllHistoricalDataSinceCreation = async () => {
    setIsDataActionBusy(true);
    try {
      const { summary } = await storageEngine.restoreAllHistoricalData(
        currentUser?.id
      );
      showToast(summary);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'حدث خطأ أثناء استرجاع البيانات';
      showToast(`خطأ: ${msg}`);
    } finally {
      setIsDataActionBusy(false);
    }
  };

  // زر مؤقت لترحيل البيانات المحلية (المحلات، أرقام الخدمات، الصور) من IndexedDB و localStorage إلى Firebase Firestore بدون تكرار
  const [isMigratingLocalData, setIsMigratingLocalData] = useState(false);
  const [migrationResultMsg, setMigrationResultMsg] = useState<string>('');

  const handleMigrateLocalDataToFirebase = async () => {
    if (isMigratingLocalData) return;
    setIsMigratingLocalData(true);
    setMigrationResultMsg('');
    try {
      const result = await storageEngine.migrateLocalDataToFirebase(currentUser?.id);
      setMigrationResultMsg(result.summary);
      showToast(result.summary);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء ترحيل البيانات المحلية إلى Firebase Firestore';
      setMigrationResultMsg(`خطأ: ${msg}`);
      showToast(`خطأ: ${msg}`);
    } finally {
      setIsMigratingLocalData(false);
    }
  };

  // Unified messages grouped strictly by sender account so each account is completely separate from the other
  const unifiedMessages: AdminMessage[] = React.useMemo(() => {
    const map = new Map<string, AdminMessage>();
    // Sort oldest to newest first so thread builds chronologically
    const chronological = [...state.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const msg of chronological) {
      const senderKey = `acct:${msg.senderUsername.trim().toLowerCase()}`;
      const entries =
        msg.thread && msg.thread.length > 0
          ? msg.thread
          : [
              {
                id: msg.id,
                sender: 'user' as const,
                senderName: msg.senderUsername,
                text: msg.content,
                createdAt: msg.createdAt,
              },
            ];
      const existing = map.get(senderKey);
      if (!existing) {
        map.set(senderKey, {
          ...msg,
          thread: [...entries],
        });
      } else {
        const mergedThread = [...(existing.thread || [])];
        for (const e of entries) {
          if (!mergedThread.some((x) => x.id === e.id)) {
            mergedThread.push(e);
          }
        }
        map.set(senderKey, {
          ...existing,
          content: msg.content,
          isRead: existing.isRead && msg.isRead,
          updatedAt: msg.updatedAt || msg.createdAt,
          thread: mergedThread,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aPinned = pinnedHistoryIds.includes(a.id) || Boolean(a.isPinned);
      const bPinned = pinnedHistoryIds.includes(b.id) || Boolean(b.isPinned);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    });
  }, [state.messages, pinnedHistoryIds]);

  // Connected online usernames list for section 8 (عدد المتصلين الآن) - Strictly real live active sessions only
  const connectedOnlineUsers = React.useMemo(() => {
    const namesSet = new Set<string>();
    const result: Array<{ id: string; username: string; role?: UserRoleType }> = [];

    const addByName = (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (namesSet.has(lower)) return;
      namesSet.add(lower);
      const matchedUser = state.users.find(
        (u) =>
          u.username.trim().toLowerCase() === lower ||
          (u.accountName && u.accountName.trim().toLowerCase() === lower)
      );
      result.push({
        id: matchedUser?.id || clean,
        username: matchedUser?.username || clean,
        role: matchedUser?.role,
      });
    };

    if (onlineStats?.registeredUsernames) {
      onlineStats.registeredUsernames.forEach(addByName);
    }
    if (currentUser) {
      addByName(currentUser.username);
    }
    return result;
  }, [onlineStats?.registeredUsernames, state.users, currentUser]);

  const realOnlineTotalCount = Math.max(
    1,
    onlineStats?.totalOnline || 0,
    connectedOnlineUsers.length + (onlineStats?.guestsCount || 0)
  );
  const displayedOnlineTotalCount = getEffectiveOnlineDisplayCount(
    realOnlineTotalCount,
    state.settings.customOnlineCount
  );

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

          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-hidden">
            <FluentButton
              type="button"
              variant="emerald"
              size="sm"
              disabled={isMigratingLocalData}
              onClick={handleMigrateLocalDataToFirebase}
              className="w-full sm:w-auto justify-center px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-extrabold shadow-md whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">
                {isMigratingLocalData
                  ? 'جاري الترحيل...'
                  : 'ترحيل البيانات المحلية'}
              </span>
            </FluentButton>
            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportUsersAndMessagesToExcel(state.users, state.messages)}
              className="w-full sm:w-auto justify-center px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-extrabold whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="truncate">تصدير إكسيل</span>
            </FluentButton>
            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportPlatformSummaryToPDF(state)}
              className="w-full sm:w-auto justify-center px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-extrabold whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
              <span className="truncate">تصدير PDF</span>
            </FluentButton>
          </div>
        </div>

        {migrationResultMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/60 text-emerald-200 text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{migrationResultMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setMigrationResultMsg('')}
              className="text-xs underline cursor-pointer shrink-0"
            >
              إغلاق
            </button>
          </div>
        )}

        <form
          onSubmit={handleSaveGeneralTopFields}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-3">
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

          <div className="md:col-span-2">
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
            <label className="block text-xs font-bold text-blue-300 mb-1.5">
              لينك حساب الفيس بوك
            </label>
            <input
              type="url"
              value={generalFacebookUrl}
              onChange={(e) => setGeneralFacebookUrl(e.target.value)}
              placeholder="https://www.facebook.com/..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-blue-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          <div className="md:col-span-2">
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
              <div className="pb-3 border-b border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" />
                    <span>2. الحسابات المسجلة في الموقع ({state.users.length})</span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    يتم عرض حتى 50 حساباً هنا — اضغط على زر &quot;المزيد&quot; بالأسفل لعرض جميع الحسابات المسجلة بكامل تفاصيلها في شاشة كاملة.
                  </p>
                </div>

                {/* زر وخانة بحث بالاسم لفلترة الحسابات فور كتابة أي حرف */}
                <div className="flex items-center gap-1.5 bg-[#0A192F] border border-sky-400/50 rounded-xl px-2.5 py-1.5 w-full sm:w-72">
                  <span className="px-2 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-extrabold whitespace-nowrap shrink-0">
                    بحث بالاسم
                  </span>
                  <input
                    type="text"
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    placeholder="اكتب أي حرف للفلترة..."
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#F8FAFC] placeholder-[#94A3B8] outline-none"
                  />
                  {accountSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAccountSearchQuery('')}
                      className="text-rose-400 hover:text-rose-300 text-xs font-extrabold cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* خانة اسم المدير: يظهر بها الاسم الحالي وتحتها خانة فارغة لكتابة اسم جديد وزر تعديل */}
              <div className="p-3.5 rounded-2xl bg-[#0A192F] border border-amber-400/50 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>اسم المدير:</span>
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/50 text-xs sm:text-sm font-black text-white">
                    {currentAdminAccount?.username || 'admin'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAdminDisplayNameInput}
                    onChange={(e) => setNewAdminDisplayNameInput(e.target.value)}
                    placeholder="اكتب اسم المدير الجديد هنا..."
                    className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-amber-400 px-3 py-2 text-xs sm:text-sm font-bold text-[#F8FAFC] outline-none"
                  />
                  <FluentButton
                    variant="primary"
                    size="sm"
                    onClick={handleSaveAdminDisplayName}
                    disabled={!newAdminDisplayNameInput.trim()}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </FluentButton>
                </div>
              </div>

              {/* شاشة منبثقة تفيد أنه تم تعديل اسم المدير */}
              {adminNameUpdatedModalText && (
                <FluentModal
                  isOpen={Boolean(adminNameUpdatedModalText)}
                  onClose={() => setAdminNameUpdatedModalText(null)}
                  title="✅ تم تعديل اسم المدير بنجاح"
                  maxWidth="md"
                >
                  <div className="space-y-4 text-center py-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <p className="text-sm font-extrabold text-[#F8FAFC]">
                      تم تغيير اسم المدير بنجاح إلى:{' '}
                      <span className="text-amber-300">
                        {adminNameUpdatedModalText}
                      </span>
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      سيظهر الاسم الجديد الآن في جميع المنشورات وفي الموقع بالكامل لحظياً.
                    </p>
                    <div className="flex justify-center pt-1">
                      <FluentButton
                        variant="primary"
                        size="sm"
                        onClick={() => setAdminNameUpdatedModalText(null)}
                      >
                        <span>حسناً، إغلاق</span>
                      </FluentButton>
                    </div>
                  </div>
                </FluentModal>
              )}

              <div className="space-y-3 overflow-x-hidden">
                {state.users
                  .filter((u) => {
                    const q = accountSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      u.username.toLowerCase().includes(q) ||
                      (u.accountName || '').toLowerCase().includes(q) ||
                      (u.phone || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 50)
                  .map((u) => (
                  <div
                    key={u.id}
                    className={`fluent-reveal p-2.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 overflow-hidden ${
                      u.isBanned
                        ? 'bg-rose-950/25 border-rose-500/50'
                        : 'bg-[#0A192F] border-[#334155]'
                    }`}
                  >
                    <div className="space-y-1.5 relative z-10 min-w-0 w-full sm:w-auto">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-[#F8FAFC] truncate">
                          {u.username}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${
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
                            ? 'مشرف'
                            : 'مستخدم'}
                        </span>
                        {u.isBanned && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] sm:text-[11px] font-extrabold">
                            حساب معلق
                          </span>
                        )}
                      </div>

                      {/* نسخة الهاتف: أسفل الاسم في سطر واحد (تاريخ التسجيل + صلاحيات مشرف + تعديل + تعليق الحساب + حذف) بدون مسطرة تمرير */}
                      <div className="flex sm:hidden items-center justify-between gap-1 flex-nowrap w-full overflow-hidden pt-0.5">
                        <span className="text-[9px] font-bold text-[#94A3B8] font-mono-tabular whitespace-nowrap shrink-0 bg-[#112240] px-1.5 py-1 rounded border border-[#334155]">
                          {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                        </span>

                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleModeratorRole(u)}
                            className={`px-1.5 py-1 rounded text-[9px] font-extrabold whitespace-nowrap shrink-0 border cursor-pointer transition-all ${
                              u.role === 'moderator'
                                ? 'bg-emerald-600 text-white border-emerald-400'
                                : 'bg-[#1E293B] text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            صلاحيات مشرف
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          className="px-1.5 py-1 rounded bg-[#1E293B] hover:bg-sky-600/30 text-sky-300 border border-sky-400/40 text-[9px] font-extrabold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSuspendUser(u)}
                          className={`px-1.5 py-1 rounded text-[9px] font-extrabold whitespace-nowrap shrink-0 border cursor-pointer ${
                            u.isBanned
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-[#1E293B] text-amber-300 border-amber-400/40'
                          }`}
                        >
                          {u.isBanned ? 'فك التعليق' : 'تعليق الحساب'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onDeleteUserAccount(u.id);
                            showToast(`تم حذف الحساب "${u.username}" نهائياً.`);
                          }}
                          className="px-1.5 py-1 rounded bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/50 text-[9px] font-extrabold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>

                      {/* تفاصيل الحساب الإضافية (تظهر كاملة على الكمبيوتر ومختصرة بدون تمرير على الهاتف) */}
                      <div className="hidden sm:flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                        <span>
                          اسم الحساب:{' '}
                          <strong className="text-[#F8FAFC]">
                            {u.accountName || u.username}
                          </strong>
                        </span>
                        {u.role !== 'admin' &&
                          u.username.trim().toLowerCase() !== 'admin' && (
                            <span>
                              الاسم الذي يظهر للمستخدمين (عند إنشاء حساب جديد):{' '}
                              <strong className="text-emerald-300">
                                {u.username}
                              </strong>
                            </span>
                          )}
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

                    {/* Buttons on Desktop: صلاحيات مشرف، تعديل، تعليق الحساب، حذف */}
                    <div className="hidden sm:flex flex-wrap items-center gap-2 shrink-0 relative z-10">
                      {u.role !== 'admin' && (
                        <FluentButton
                          variant={u.role === 'moderator' ? 'emerald' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleModeratorRole(u)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {u.role === 'moderator'
                              ? 'إلغاء صلاحيات مشرف'
                              : 'صلاحيات مشرف'}
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
                        variant={u.isBanned ? 'emerald' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleSuspendUser(u)}
                      >
                        <Ban className="w-3.5 h-3.5 text-amber-400" />
                        <span>{u.isBanned ? 'إلغاء تعليق الحساب' : 'تعليق الحساب'}</span>
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
                    </div>
                  </div>
                ))}
              </div>

              {/* زر المزيد في الأسفل لفتح شاشة منبثقة بعرض الشاشة بها جميع الحسابات وتفاصيلها */}
              <div className="pt-3 border-t border-[#334155] flex justify-center">
                <FluentButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const modalEl = document.getElementById('all-accounts-fullscreen-modal');
                    if (modalEl) {
                      modalEl.classList.remove('hidden');
                      modalEl.classList.add('flex');
                    }
                  }}
                  className="px-8 py-2.5 text-sm font-extrabold"
                >
                  <Users className="w-4 h-4" />
                  <span>المزيد ({state.users.length} حساب)</span>
                </FluentButton>
              </div>

              {/* شاشة منبثقة بعرض الشاشة كاملة تعرض جميع الحسابات المسجلة بكامل تفاصيلها */}
              <div
                id="all-accounts-fullscreen-modal"
                className="fixed inset-0 z-50 hidden items-center justify-center p-2 sm:p-4 bg-[#020617]/85 backdrop-blur-md"
                onClick={() => {
                  const modalEl = document.getElementById('all-accounts-fullscreen-modal');
                  if (modalEl) {
                    modalEl.classList.add('hidden');
                    modalEl.classList.remove('flex');
                  }
                }}
              >
                <div
                  className="w-screen max-w-[98vw] max-h-[92vh] flex flex-col rounded-2xl border-2 border-slate-300 bg-white text-black shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-100 shrink-0">
                    <div>
                      <h3 className="text-base sm:text-xl font-extrabold text-black flex items-center gap-2">
                        <Users className="w-5 h-5 text-sky-700" />
                        <span>جميع الحسابات المسجلة بالكامل ({state.users.length} حساب)</span>
                      </h3>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        عرض كامل لجميع الحسابات وتفاصيلها وصلاحيات الإدارة بعرض الشاشة
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const modalEl = document.getElementById('all-accounts-fullscreen-modal');
                        if (modalEl) {
                          modalEl.classList.add('hidden');
                          modalEl.classList.remove('flex');
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold cursor-pointer shadow"
                    >
                      إغلاق
                    </button>
                  </div>

                  <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-3 flex-1">
                    {state.users.map((u, idx) => (
                      <div
                        key={u.id}
                        className={`p-3.5 sm:p-4 rounded-xl border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                          u.isBanned
                            ? 'bg-rose-50 border-rose-400'
                            : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-sky-700 text-white text-xs font-extrabold">
                              #{idx + 1}
                            </span>
                            <span className="text-sm sm:text-base font-extrabold text-black">
                              {u.username}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                                  : u.role === 'moderator'
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                                  : 'bg-sky-100 text-sky-950 border-sky-300'
                              }`}
                            >
                              {u.role === 'admin'
                                ? 'مدير النظام (Admin)'
                                : u.role === 'moderator'
                                ? 'مشرف'
                                : 'مستخدم'}
                            </span>
                            {u.isBanned && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold">
                                حساب معلق (موقوف)
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800">
                            <span>
                              اسم الحساب (لتسجيل الدخول):{' '}
                              <strong className="text-black font-extrabold">
                                {u.accountName || u.username}
                              </strong>
                            </span>
                            <span>
                              الاسم المعروض للمستخدمين:{' '}
                              <strong className="text-emerald-800 font-extrabold">
                                {u.username}
                              </strong>
                            </span>
                            <span>
                              الباسورد:{' '}
                              <code className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-sky-900 font-mono-tabular font-extrabold">
                                {u.password}
                              </code>
                            </span>
                            {u.phone && (
                              <span>
                                الهاتف:{' '}
                                <strong className="text-black font-mono-tabular font-extrabold">
                                  {u.phone}
                                </strong>
                              </span>
                            )}
                            <span>
                              تاريخ التسجيل:{' '}
                              <span className="font-mono-tabular font-extrabold">
                                {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                            <span>
                              {u.isBanned ? 'إلغاء تعليق الحساب' : 'تعليق الحساب'}
                            </span>
                          </FluentButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                  {state.stores.map((st, stIdx) => {
                    const isPermanent = isPermanentDreamPlazaStore(st);
                    return (
                      <div
                        key={st.id || `admin-store-${stIdx}`}
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
                              {isPermanent && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold">
                                  ثابت
                                </span>
                              )}
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

                          {!isPermanent && (
                            <FluentButton
                              variant="danger"
                              size="sm"
                              onClick={() => setStorePendingDelete(st)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </FluentButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                <div className="pb-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span>4. التحكم الكامل في باقات الإعلانات الـ 3</span>
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      بمجرد انتهاء مدة الإعلان المحددة بالأيام يختفي الإعلان تلقائياً ولا يظهر للعامة.
                    </p>
                  </div>

                  <FluentButton
                    type="button"
                    variant="emerald"
                    size="sm"
                    onClick={openEditAdPricesModal}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>تعديل الأسعار</span>
                  </FluentButton>
                </div>

                {/* شريط عرض الأسعار الحالية ونسبة خصم الـ 10 أيام */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#0A192F] border border-[#334155] text-xs">
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#112240]">
                    <span className="text-[#94A3B8]">الباقة 1:</span>
                    <span className="font-extrabold text-sky-400 font-mono-tabular">
                      {state.settings.adPackagesPricing?.pkg1DailyPrice ?? 15} ج/يوم
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#112240]">
                    <span className="text-[#94A3B8]">الباقة 2:</span>
                    <span className="font-extrabold text-amber-400 font-mono-tabular">
                      {state.settings.adPackagesPricing?.pkg2DailyPrice ?? 25} ج/يوم
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#112240]">
                    <span className="text-[#94A3B8]">الباقة 3:</span>
                    <span className="font-extrabold text-indigo-400 font-mono-tabular">
                      {state.settings.adPackagesPricing?.pkg3DailyPrice ?? 100} ج/يوم
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#112240]">
                    <span className="text-[#94A3B8]">خصم 10 أيام:</span>
                    <span className="font-extrabold text-emerald-400 font-mono-tabular">
                      {state.settings.adPackagesPricing?.tenDaysDiscountPercent ?? 20}%
                    </span>
                  </div>
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

                  {/* اختيار محل من المحلات المسجلة لربط الإعلان وسجل مشاهداته وتفاعلاته لحظياً مع قسم المحلات */}
                  <div className="p-3 rounded-xl bg-[#112240] border border-amber-400/40 space-y-1.5">
                    <label className="block text-xs font-extrabold text-amber-300">
                      اختيار محل من المحلات المسجلة لعمل إعلان له وربط عداد مشاهداته مع سجل المحل في الأقسام لحظياً:
                    </label>
                    <select
                      value={adSelectedStoreId}
                      onChange={(e) => {
                        const storeId = e.target.value;
                        setAdSelectedStoreId(storeId);
                        const found = state.stores.find((s) => s.id === storeId);
                        if (found) {
                          const days = Math.max(1, Number(adDurationDays) || 5);
                          const expiresAtIso = new Date(
                            Date.now() + days * 24 * 60 * 60 * 1000
                          ).toISOString();
                          const storeImgs = found.menuImages || [];
                          const primaryImg =
                            storeImgs[0] ||
                            createSquareAdSvg(found.name, found.category, '#F59E0B');

                          setAdPlaceName(found.name);
                          setAdCategoryOrSub(found.category);
                          setAdLocationUrl(found.locationUrl || '');
                          setAdPhone(found.phone || '');
                          applyCombinedAdImages(storeImgs);

                          if (activeAdPackageTab === 'moving_square') {
                            const existingAd = state.squareAds.find(
                              (a) =>
                                a.storeId === found.id ||
                                a.id === `sq-store-${found.id}`
                            );
                            const targetAdId = existingAd
                              ? existingAd.id
                              : `sq-store-${found.id}`;
                            setEditingAdId(targetAdId);
                            setAdPinned(true);

                            const autoSqPayload: SquareMovingAd = {
                              id: targetAdId,
                              storeId: found.id,
                              title: found.name,
                              category: found.category,
                              imageUrl: primaryImg,
                              locationUrl: found.locationUrl || undefined,
                              phone: found.phone || undefined,
                              targetSection: 'directory',
                              menuImages: storeImgs.slice(1),
                              description:
                                found.details || `إعلان نشط لمدة ${days} يوم`,
                              isAdminPinned: true,
                              durationDays: days,
                              expiresAt: expiresAtIso,
                              active: true,
                              viewsCount: Math.max(
                                existingAd?.viewsCount || 0,
                                found.viewsCount || 0
                              ),
                              baselineViewsAtCreation:
                                existingAd?.baselineViewsAtCreation ??
                                (found.viewsCount || 0),
                              adViewsSinceCreation:
                                existingAd?.adViewsSinceCreation ?? 0,
                              callClicksCount: Math.max(
                                existingAd?.callClicksCount || 0,
                                found.callClicksCount || 0
                              ),
                              whatsappClicksCount: Math.max(
                                existingAd?.whatsappClicksCount || 0,
                                found.whatsappClicksCount || 0
                              ),
                              viewsByHour: mergeViewsByHourMaps(
                                existingAd?.viewsByHour,
                                found.viewsByHour
                              ),
                              createdAt: existingAd?.createdAt || new Date().toISOString(),
                            };
                            onAddSquareAd(autoSqPayload);
                            showToast(
                              `تم اختيار المحل "${found.name}" وتفعيل ظهوره فوراً في لوحة الإعلانات والخصومات بنفس عداد مشاهدات المحل (${autoSqPayload.viewsCount || 0} مشاهدة).`
                            );
                          } else {
                            showToast(
                              `تم تعبئة بيانات المحل "${found.name}" وربط عداد مشاهداته (${found.viewsCount || 0} مشاهدة) — اضغط حفظ لنشر الإعلان.`
                            );
                          }
                        }
                      }}
                      className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-amber-400 px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] font-extrabold outline-none cursor-pointer"
                    >
                      <option value="">-- اختر محلاً مسجلاً أو أدخل بيانات الإعلان يدوياً بالأسفل --</option>
                      {state.stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category}) — المشاهدات المسجلة: {s.viewsCount || 0}
                        </option>
                      ))}
                    </select>
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
                        required={!adMainImage.trim()}
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
                              multiple
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

                    {/* اختيار الصورة الأساسية (1) أم الصورة الثانية (2) لتظهر في الرئيسية + تعميم الشكل على جميع المحلات */}
                    {(() => {
                      const previewTitle = adPlaceName.trim() || 'اسم المكان (الأقواس)';
                      const previewCat = adCategoryOrSub.trim() || 'مول دريم بلازا';
                      const [sug1, sug2] = createSuggestedStoreSvgPair(
                        previewTitle,
                        previewCat
                      );
                      const activeStyle = state.settings.defaultStoreSvgStyle || 1;
                      return (
                        <div className="p-3 rounded-xl bg-[#112240] border border-sky-400/40 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-sky-300">
                            <span>
                              اختيار شكل الصورة للإعلان (الصورة الأساسية 1 أم الثانية 2) وتعميم الشكل لجميع المحلات:
                            </span>
                            {combinedAdImages.length >= 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reordered = [
                                    combinedAdImages[1],
                                    combinedAdImages[0],
                                    ...combinedAdImages.slice(2),
                                  ];
                                  applyCombinedAdImages(reordered);
                                  showToast(
                                    'تم تبديل الصورة الأساسية (1) والصورة الثانية (2) لتظهر في الرئيسية!'
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold cursor-pointer shadow"
                              >
                                تبديل الصورة الأساسية (1) والثانية (2) في الرئيسية
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                              {
                                variant: 1 as const,
                                label: 'الصورة الأساسية (1) — تصميم كلاسيكي فاتح',
                                url: sug1,
                              },
                              {
                                variant: 2 as const,
                                label: 'الصورة الثانية (2) — تصميم ملكي داكن',
                                url: sug2,
                              },
                            ].map((item) => {
                              const isSelectedStyle = activeStyle === item.variant;
                              return (
                                <div
                                  key={item.variant}
                                  onClick={() => {
                                    setGlobalDefaultStoreSvgStyle(item.variant);
                                    const realOnly = combinedAdImages.filter(
                                      (x) => !x.startsWith('data:image/svg+xml')
                                    );
                                    applyCombinedAdImages(
                                      realOnly.length > 0
                                        ? [item.url, ...realOnly]
                                        : [item.url]
                                    );
                                    onUpdateSettings({
                                      ...state.settings,
                                      defaultStoreSvgStyle: item.variant,
                                      updatedAt: Date.now(),
                                    });
                                    showToast(
                                      `تم اختيار الشكل (${item.variant}) ليكون في الرئيسية وتعميم جميع المحلات بنفس الشكل!`
                                    );
                                  }}
                                  className={`p-2 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer transition-all ${
                                    isSelectedStyle
                                      ? 'border-emerald-400 bg-emerald-500/15'
                                      : 'border-[#334155] bg-[#0A192F] hover:border-sky-400'
                                  }`}
                                >
                                  <img
                                    src={item.url}
                                    alt={item.label}
                                    className="w-16 h-16 rounded-lg object-contain bg-white border border-slate-300 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                                      {item.label}
                                    </div>
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                        isSelectedStyle
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-sky-600/30 text-sky-300'
                                      }`}
                                    >
                                      {isSelectedStyle
                                        ? 'مُفعّل في الرئيسية ومُعمّم للكل ✓'
                                        : 'اختيار للرئيسية وتعميم للكل'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

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
                            onClick={() => openInspectSquareAdModal(ad, false)}
                            title="اضغط لعرض شاشة تفاصيل الإعلان وملخص المشاهدات والتعديل وتجديد المدة"
                            className={`p-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] border flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-rose-500 ring-1 ring-rose-500/40'
                                : 'border-[#334155] hover:border-sky-400/60'
                            }`}
                          >
                            {/* اليمين: صورة الإعلان وبجانبه اسم الإعلان وأسفلها المشاهدات واتصال والمراسلة في سطر واحد */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(e) => e.stopPropagation()}
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
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                                  {ad.title}
                                </div>
                                <div className="text-[11px] text-sky-400 truncate">
                                  {ad.category} · {getDaysRemainingBadge(ad.expiresAt)}
                                </div>
                                <div className="text-[10px] font-bold text-amber-300 mt-1 flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar">
                                  {(() => {
                                    const linkedSt = findLinkedStoreForAd(state.stores, ad);
                                    const unifiedViews = Math.max(
                                      ad.viewsCount || 0,
                                      linkedSt?.viewsCount || 0
                                    );
                                    const unifiedCalls = Math.max(
                                      ad.callClicksCount || 0,
                                      linkedSt?.callClicksCount || 0
                                    );
                                    const unifiedWa = Math.max(
                                      ad.whatsappClicksCount || 0,
                                      linkedSt?.whatsappClicksCount || 0
                                    );
                                    return (
                                      <>
                                        <span>مشاهدات: {unifiedViews}</span>
                                        <span>· اتصال: {unifiedCalls}</span>
                                        <span>· مراسلة: {unifiedWa}</span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* اليسار: زر التعديل وزر الحذف فوق بعض */}
                            <div
                              className="flex flex-col items-stretch justify-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openInspectSquareAdModal(ad, true)}
                                className="px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white border border-sky-400/40 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSquareAd(ad.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
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
                            onClick={() => openInspectTopBannerModal(b, false)}
                            title="اضغط لعرض شاشة تفاصيل الإعلان وملخص المشاهدات والتعديل وتجديد المدة"
                            className={`p-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] border flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-rose-500 ring-1 ring-rose-500/40'
                                : 'border-[#334155] hover:border-sky-400/60'
                            }`}
                          >
                            {/* اليمين: صورة الإعلان وبجانبه اسم الإعلان وأسفلها المشاهدات واتصال والمراسلة في سطر واحد */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(e) => e.stopPropagation()}
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
                                className="w-14 h-12 rounded-lg object-cover border border-[#334155] shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                                  {b.title}
                                </div>
                                <div className="text-[11px] text-sky-400 truncate">
                                  {getDaysRemainingBadge(b.expiresAt)} · {b.subtitle}
                                </div>
                                <div className="text-[10px] font-bold text-amber-300 mt-1 flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar">
                                  {(() => {
                                    const linkedSt = findLinkedStoreForAd(state.stores, b);
                                    const unifiedViews = Math.max(
                                      b.viewsCount || 0,
                                      linkedSt?.viewsCount || 0
                                    );
                                    const unifiedCalls = Math.max(
                                      b.callClicksCount || 0,
                                      linkedSt?.callClicksCount || 0
                                    );
                                    const unifiedWa = Math.max(
                                      b.whatsappClicksCount || 0,
                                      linkedSt?.whatsappClicksCount || 0
                                    );
                                    return (
                                      <>
                                        <span>مشاهدات: {unifiedViews}</span>
                                        <span>· اتصال: {unifiedCalls}</span>
                                        <span>· مراسلة: {unifiedWa}</span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* اليسار: زر التعديل وزر الحذف فوق بعض */}
                            <div
                              className="flex flex-col items-stretch justify-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openInspectTopBannerModal(b, true)}
                                className="px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white border border-sky-400/40 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTopBanner(b.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeAdPackageTab === 'popup_entry' && state.popupAd && (
                  <div className="space-y-2.5 pt-2">
                    <div className="text-xs font-extrabold text-[#94A3B8]">
                      إعلان الشاشة المنبثقة الحالي:
                    </div>
                    <div
                      onClick={() => openInspectPopupAdModal(false)}
                      title="اضغط لعرض شاشة تفاصيل الإعلان وملخص المشاهدات والتعديل وتجديد المدة"
                      className="p-3 rounded-xl bg-[#0A192F] hover:bg-[#112240] border border-[#334155] hover:border-sky-400/60 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                    >
                      {/* اليمين: صورة الإعلان وبجانبه اسم الإعلان وأسفلها المشاهدات واتصال والمراسلة في سطر واحد */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={state.popupAd.imageUrl}
                          alt={state.popupAd.title}
                          className="w-14 h-12 rounded-lg object-cover border border-[#334155] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-[#F8FAFC] truncate">
                            {state.popupAd.title}
                          </div>
                          <div className="text-[11px] text-sky-400 truncate">
                            {state.popupAd.active ? 'مفعّل للزوار' : 'متوقف'} ·{' '}
                            {getDaysRemainingBadge(state.popupAd.expiresAt)}
                          </div>
                          <div className="text-[10px] font-bold text-amber-300 mt-1 flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar">
                            {(() => {
                              const linkedSt = findLinkedStoreForAd(
                                state.stores,
                                state.popupAd
                              );
                              const unifiedViews = Math.max(
                                state.popupAd.viewsCount || 0,
                                linkedSt?.viewsCount || 0
                              );
                              const unifiedCalls = Math.max(
                                state.popupAd.callClicksCount || 0,
                                linkedSt?.callClicksCount || 0
                              );
                              const unifiedWa = Math.max(
                                state.popupAd.whatsappClicksCount || 0,
                                linkedSt?.whatsappClicksCount || 0
                              );
                              return (
                                <>
                                  <span>مشاهدات: {unifiedViews}</span>
                                  <span>· اتصال: {unifiedCalls}</span>
                                  <span>· مراسلة: {unifiedWa}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* اليسار: زر التعديل وزر الحذف فوق بعض */}
                      <div
                        className="flex flex-col items-stretch justify-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openInspectPopupAdModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white border border-sky-400/40 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdatePopupAd({
                              ...state.popupAd,
                              active: false,
                            });
                            setAdPopupActive(false);
                            showToast('تم إيقاف/حذف عرض إعلان الشاشة المنبثقة.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </FluentCard>
            </div>
          )}

          {/* ====================================================================
              5. الرسائل (Messages Inbox from Footer "أرسل رسالة" - Unified per Sender + سجل المراسلات + Reply to User Bell)
             ==================================================================== */}
          {activeSubTab === 'messages' && (
            <FluentCard className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <Mail className="w-5 h-5 text-sky-400" />
                    <span>
                      5. صندوق الرسائل الواردة من زر &quot;أرسل رسالة&quot; ({unifiedMessages.length})
                    </span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    إذا أرسل الحساب رسالة من قبل تظهر في نفس الرسالة مع إمكانية كتابة رد وإرساله ليظهر في زر الجرس لدى المستخدم.
                  </p>
                </div>

                <FluentButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsMessagesHistoryModalOpen(true)}
                >
                  <History className="w-4 h-4" />
                  <span>سجل المراسلات ({unifiedMessages.length})</span>
                </FluentButton>
              </div>

              {unifiedMessages.length === 0 ? (
                <p className="text-xs text-[#94A3B8] py-8 text-center">
                  صندوق الوارد فارغ حالياً.
                </p>
              ) : (
                <div className="space-y-4">
                  {unifiedMessages.map((msg: AdminMessage) => {
                    const threadItems =
                      msg.thread && msg.thread.length > 0
                        ? msg.thread
                        : [
                            {
                              id: msg.id,
                              sender: 'user' as const,
                              senderName: msg.senderUsername,
                              text: msg.content,
                              createdAt: msg.createdAt,
                            },
                          ];
                    const draftText = replyDrafts[msg.id] || '';
                    const isCollapsed = Boolean(collapsedMessagesMap[msg.id]);
                    const lastEntry = threadItems[threadItems.length - 1];
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border space-y-3 transition-all ${
                          msg.isRead
                            ? 'bg-[#0A192F]/70 border-[#334155]'
                            : 'bg-[#1E293B] border-sky-400/60'
                        }`}
                      >
                        {/* Clickable Message Header (عند الضغط على الرسالة تنزل قائمة منسدلة بالرسائل مرة أخرى) + زر إغلاق بجانب كل رسالة لإخفاء المحادثة */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-[#334155]">
                          <div
                            onClick={() =>
                              setCollapsedMessagesMap((prev) => ({
                                ...prev,
                                [msg.id]: false,
                              }))
                            }
                            title="اضغط لعرض القائمة المنسدلة للرسائل"
                            className="flex-1 flex flex-wrap items-center gap-2 cursor-pointer select-none py-0.5"
                          >
                            <span className="font-extrabold text-sky-400 text-sm flex items-center gap-1.5">
                              {isCollapsed ? (
                                <ChevronDown className="w-4 h-4 text-sky-400 shrink-0" />
                              ) : (
                                <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
                              )}
                              <span>حساب المرسل: {msg.senderUsername}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-bold">
                              عدد الرسائل: {threadItems.length}
                            </span>
                            {!msg.isRead && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                                جديد
                              </span>
                            )}
                            {isCollapsed && (
                              <span className="text-[11px] font-bold text-emerald-300 truncate max-w-[260px]">
                                — اضغط لفتح القائمة المنسدلة ({lastEntry.text})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[#94A3B8] font-mono-tabular">
                              {new Date(
                                msg.updatedAt || msg.createdAt
                              ).toLocaleString('ar-EG')}
                            </span>

                            {/* زر إغلاق بجانب كل رسالة: عند الضغط عليها يتم إخفاء المحادثة */}
                            {!isCollapsed ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsedMessagesMap((prev) => ({
                                    ...prev,
                                    [msg.id]: true,
                                  }));
                                }}
                                title="إخفاء المحادثة"
                                className="fluent-reveal px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>إغلاق</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsedMessagesMap((prev) => ({
                                    ...prev,
                                    [msg.id]: false,
                                  }));
                                }}
                                className="fluent-reveal px-2.5 py-1 rounded-lg bg-sky-600/25 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-400/50 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>عرض الرسائل</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dropdown Conversation Body (القائمة المنسدلة بالرسائل والرد — تختفي عند الضغط على إغلاق وتظهر عند الضغط على الرسالة) */}
                        {!isCollapsed && (
                          <>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {threadItems.map((entry) => {
                                const isAdminEntry = entry.sender === 'admin';
                                return (
                                  <div
                                    key={entry.id}
                                    className={`p-3 rounded-xl border text-xs sm:text-sm space-y-1 ${
                                      isAdminEntry
                                        ? 'bg-emerald-950/35 border-emerald-400/50 text-emerald-100 mr-4'
                                        : 'bg-[#112240] border-[#334155] text-[#F8FAFC] ml-4'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span
                                        className={`font-extrabold ${
                                          isAdminEntry
                                            ? 'text-emerald-400'
                                            : 'text-sky-400'
                                        }`}
                                      >
                                        {isAdminEntry
                                          ? 'رد الإدارة'
                                          : entry.senderName}
                                      </span>
                                      <span className="text-[#94A3B8] font-mono-tabular">
                                        {new Date(
                                          entry.createdAt
                                        ).toLocaleString('ar-EG')}
                                      </span>
                                    </div>
                                    <p className="leading-relaxed whitespace-pre-line">
                                      {entry.text}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reply Box + Send Message Button */}
                            <div className="pt-2 border-t border-[#334155] space-y-2">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={draftText}
                                  onChange={(e) =>
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [msg.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`اكتب رداً إلى ${msg.senderUsername} ليظهر لحظياً في الجرس لديه...`}
                                  className="flex-1 rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                                />
                                <FluentButton
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={!draftText.trim()}
                                  onClick={() => {
                                    if (!draftText.trim()) return;
                                    onAdminReplyToMessage?.(
                                      msg.id,
                                      draftText.trim()
                                    );
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [msg.id]: '',
                                    }));
                                    showToast(
                                      `تم إرسال الرسالة لحظياً إلى "${msg.senderUsername}" وظهرت في أيقونة الجرس لديه!`
                                    );
                                  }}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>إرسال رسالة</span>
                                </FluentButton>
                              </div>

                              <div className="flex justify-end gap-2">
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
                          </>
                        )}
                      </div>
                    );
                  })}
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
              <FluentCard className="space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-400 font-extrabold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>التخزين السحابي ومفتاح موقع تحميل الصور مشفر ومخفي بالكامل</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  يعمل مفتاح تحميل الصور السحابي والتسجيل السحابي تلقائياً في الخلفية بنظام تشفير كامل ومخفي ولا يظهر لأي مستخدم.
                </p>

                <div className="p-4 rounded-2xl bg-[#0A192F] border-2 border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-extrabold text-emerald-300 flex items-center gap-2">
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>ترحيل البيانات المحلية إلى Firebase Firestore</span>
                    </h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      قراءة جميع البيانات (المحلات، أرقام الخدمات، الصور) المحفوظة في التخزين المحلي القديم (IndexedDB و localStorage) ورفعها دفعة واحدة إلى Firebase Firestore مع منع رفع أي بيانات مكررة موجودة بالفعل.
                    </p>
                  </div>
                  <FluentButton
                    type="button"
                    variant="emerald"
                    disabled={isMigratingLocalData}
                    onClick={handleMigrateLocalDataToFirebase}
                    className="shrink-0 font-extrabold py-2.5 px-4"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isMigratingLocalData
                        ? 'جاري ترحيل البيانات المحلية...'
                        : 'ترحيل البيانات المحلية'}
                    </span>
                  </FluentButton>
                </div>
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

          {/* ====================================================================
              8. عدد المتصلين الآن (Online Users Now - Click any name to open Private Chat)
             ==================================================================== */}
          {activeSubTab === 'online_users' && (
            <FluentCard className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span>
                      8. عدد المتصلين الآن ({displayedOnlineTotalCount})
                    </span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    أسماء المتصلين الآن في الموقع — اضغط على أي اسم لفتح محادثة خاصة فورية معه مثل شات بيع واشتري وتُحفظ في سجل المحادثات.
                  </p>
                </div>

                {/* في سطر واحد بالكامل على الهاتف والكمبيوتر بدون اختفاء أي جزء: اكتب عدد المتصلين + سجل المحادثات + أكثر المتواجدين */}
                <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 flex-nowrap w-full lg:w-auto">
                  <div className="flex items-center gap-1 sm:gap-2 bg-[#0A192F] border border-emerald-400/50 rounded-xl px-1.5 sm:px-3 py-1 sm:py-1.5 shrink-0">
                    <label
                      htmlFor="custom-online-count-input"
                      className="text-[9.5px] sm:text-xs font-extrabold text-emerald-300 whitespace-nowrap"
                    >
                      اكتب عدد المتصلين
                    </label>
                    <input
                      id="custom-online-count-input"
                      type="number"
                      min={0}
                      value={
                        typeof state.settings.customOnlineCount === 'number' &&
                        state.settings.customOnlineCount > 0
                          ? state.settings.customOnlineCount
                          : ''
                      }
                      onChange={(e) => {
                        const rawVal = e.target.value.trim();
                        if (!rawVal) {
                          onUpdateSettings({
                            ...state.settings,
                            customOnlineCount: null,
                            updatedAt: Date.now(),
                          });
                          return;
                        }
                        const parsed = parseInt(rawVal, 10);
                        onUpdateSettings({
                          ...state.settings,
                          customOnlineCount:
                            !Number.isNaN(parsed) && parsed > 0 ? parsed : null,
                          updatedAt: Date.now(),
                        });
                      }}
                      placeholder="تلقائي"
                      className="w-9 sm:w-24 rounded-lg bg-[#112240] border border-[#334155] focus:border-emerald-400 px-1 sm:px-2.5 py-0.5 sm:py-1 text-[9.5px] sm:text-xs font-extrabold text-[#F8FAFC] font-mono-tabular outline-none text-center"
                    />
                  </div>

                  <FluentButton
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenPrivateChatHistoryModal?.()}
                    className="px-1.5 sm:px-3 py-1.5 text-[9.5px] sm:text-xs font-extrabold whitespace-nowrap shrink-0"
                  >
                    <History className="hidden sm:inline-block w-3.5 h-3.5 shrink-0" />
                    <span>سجل المحادثات</span>
                  </FluentButton>

                  <FluentButton
                    variant="emerald"
                    size="sm"
                    onClick={() => setIsTopVisitorsModalOpen(true)}
                    className="px-1.5 sm:px-3 py-1.5 text-[9.5px] sm:text-xs font-extrabold whitespace-nowrap shrink-0"
                  >
                    <Crown className="hidden sm:inline-block w-3.5 h-3.5 shrink-0" />
                    <span>أكثر المتواجدين</span>
                  </FluentButton>
                </div>
              </div>

              {typeof state.settings.customOnlineCount === 'number' &&
              state.settings.customOnlineCount > 0 ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/40 text-xs font-bold text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    وضع العدد المخصص نشط: الرقم الأساسي ({state.settings.customOnlineCount}) يظهر للجميع في &quot;المتصلين الآن&quot; ({displayedOnlineTotalCount}) ويزيد ويقل تلقائياً كل 10 دقائق. (امسح الرقم لظهور العدد الفعلي الحقيقي: {realOnlineTotalCount}).
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...state.settings,
                        customOnlineCount: null,
                        updatedAt: Date.now(),
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[11px] font-extrabold cursor-pointer shrink-0"
                  >
                    إلغاء وتفعيل العدد الفعلي
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/30 text-xs font-bold text-sky-300">
                  الوضع الفعلي نشط: يظهر الآن عدد المتصلين الفعلي والحقيقي على الموقع بدون فبركة ({realOnlineTotalCount}).
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-emerald-400/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#94A3B8]">
                    إجمالي المتصلين الآن:
                  </span>
                  <strong className="text-base font-extrabold text-emerald-400 font-mono-tabular">
                    {displayedOnlineTotalCount}
                  </strong>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-sky-400/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#94A3B8]">
                    المتصلين المسجلين فعلياً:
                  </span>
                  <strong className="text-base font-extrabold text-sky-400 font-mono-tabular">
                    {Math.max(
                      onlineStats?.registeredCount || 0,
                      connectedOnlineUsers.length
                    )}
                  </strong>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-amber-400/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#94A3B8]">
                    الزائرين الآن:
                  </span>
                  <strong className="text-base font-extrabold text-amber-400 font-mono-tabular">
                    {onlineStats?.guestsCount || 0}
                  </strong>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-extrabold text-emerald-300">
                  أسماء المتصلين الآن والزوار النشطين (اضغط على أي حساب لفتح محادثة خاصة معه):
                </div>

                {connectedOnlineUsers.length === 0 &&
                (onlineStats?.guestsCount || 0) === 0 ? (
                  <p className="text-xs text-[#94A3B8] py-6 text-center">
                    لا يوجد مستخدمون مسجلون متصلون حالياً.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {connectedOnlineUsers.map((onlineUsr) => (
                      <button
                        key={onlineUsr.username}
                        type="button"
                        onClick={() =>
                          onOpenPrivateChatWithUser?.(
                            onlineUsr.id,
                            onlineUsr.username
                          )
                        }
                        className="fluent-reveal p-3.5 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] border border-emerald-400/40 hover:border-sky-400 flex items-center justify-between gap-3 text-right cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                              {onlineUsr.username}
                            </div>
                            <div className="text-[10px] text-emerald-300">
                              متصل الآن · اضغط للمراسلة الخاصة
                            </div>
                          </div>
                        </div>

                        <span className="relative z-10 px-2.5 py-1 rounded-lg bg-sky-600/25 border border-sky-400/50 text-sky-300 text-[11px] font-extrabold flex items-center gap-1 shrink-0">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>محادثة خاصة</span>
                        </span>
                      </button>
                    ))}

                    {Array.from({
                      length: Math.min(20, onlineStats?.guestsCount || 0),
                    }).map((_, idx) => (
                      <div
                        key={`guest-live-${idx}`}
                        className="p-3.5 rounded-xl bg-[#0A192F]/80 border border-amber-400/30 flex items-center justify-between gap-3 text-right"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                              زائر متصل الآن #{idx + 1}
                            </div>
                            <div className="text-[10px] text-amber-300">
                              يتصفح الموقع الآن (بدون تسجيل دخول)
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold shrink-0">
                          نشط الآن
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FluentCard>
          )}

          {/* ====================================================================
              9. الصيانة (Maintenance - Enable / Disable Sidebar Sections)
             ==================================================================== */}
          {activeSubTab === 'maintenance' && (
            <FluentCard className="space-y-4">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  <span>9. الصيانة — التحكم في تفعيل وتعطيل أقسام القائمة الجانبية</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  عند الضغط على زر (تعطيل) لأي قسم، يظهر لجميع المستخدمين عند الدخول للقسم رسالة &quot;جاري التحديث ....&quot; وصورة صيانة، ما عدا حساب الـ admin فقط يظهر له القسم بشكل طبيعي حتى بعد تفعيل زر التعطيل.
                </p>
              </div>

              <div className="space-y-3">
                {(
                  [
                    { id: 'directory' as MainSectionId, label: 'أضف محل / الدليل' },
                    { id: 'services_numbers' as MainSectionId, label: 'أرقام الخدمات' },
                    { id: 'tawsila' as MainSectionId, label: 'توصيلة' },
                    { id: 'community' as MainSectionId, label: 'مجتمع' },
                    { id: 'utilities' as MainSectionId, label: 'تقديمات المرافق' },
                    { id: 'buy_sell' as MainSectionId, label: 'بيع واشتري' },
                  ] as const
                ).map((sec) => {
                  const isDisabled = Boolean(
                    state.settings.disabledSections?.[sec.id]
                  );
                  return (
                    <div
                      key={sec.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isDisabled
                          ? 'bg-amber-950/25 border-amber-500/50'
                          : 'bg-[#0A192F] border-[#334155]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            isDisabled
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          }`}
                        >
                          {isDisabled ? (
                            <Settings className="w-4 h-4 animate-spin text-amber-300" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-extrabold text-[#F8FAFC] flex flex-wrap items-center gap-2">
                            <span>{sec.label}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 ${
                                isDisabled
                                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                                  : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                              }`}
                            >
                              {isDisabled && (
                                <Settings className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                              )}
                              <span>
                                {isDisabled
                                  ? 'معطل (في وضع الصيانة للمستخدمين)'
                                  : 'مفعّل ويعمل للجميع'}
                              </span>
                            </span>
                          </div>
                          <div className="text-xs text-[#94A3B8] mt-0.5">
                            {isDisabled
                              ? 'يظهر حالياً للمستخدمين: "جاري التحديث ...." وصورة صيانة (يظهر للأدمن فقط)'
                              : 'القسم متاح ومفتوح لجميع زوار ومستخدمي الموقع'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <FluentButton
                          type="button"
                          variant={!isDisabled ? 'emerald' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            onUpdateSettings({
                              ...state.settings,
                              disabledSections: {
                                ...(state.settings.disabledSections || {}),
                                [sec.id]: false,
                              },
                              updatedAt: Date.now(),
                            });
                            showToast(`تم تفعيل قسم "${sec.label}" لجميع المستخدمين!`);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تفعيل</span>
                        </FluentButton>

                        <FluentButton
                          type="button"
                          variant={isDisabled ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            onUpdateSettings({
                              ...state.settings,
                              disabledSections: {
                                ...(state.settings.disabledSections || {}),
                                [sec.id]: true,
                              },
                              updatedAt: Date.now(),
                            });
                            showToast(
                              `تم تعطيل قسم "${sec.label}" وتفعيل شاشة الصيانة "جاري التحديث ...." للمستخدمين (يبقى متاحاً لحساب admin فقط).`
                            );
                          }}
                        >
                          <Ban className="w-4 h-4" />
                          <span>تعطيل</span>
                        </FluentButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FluentCard>
          )}

          {/* ====================================================================
              10. البيانات (Data - Full Backup Download, File Restore & All-Time Historical Recovery)
             ==================================================================== */}
          {activeSubTab === 'data_backup' && (
            <FluentCard className="space-y-5">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-sky-400" />
                  <span>
                    10. البيانات — حفظ وتنزيل واسترجاع جميع بيانات الموقع والحسابات
                  </span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-1">
                  يتم حفظ جميع المدخلات تلقائياً وبشكل دائم منذ بداية إنشاء الموقع (الحسابات المسجلة، المحادثات، المنشورات، المحلات، الإعلانات، أرقام الخدمات، طلبات توصيلة، وتقديمات المرافق) لسهولة تنزيلها أو استرجاعها في أي وقت.
                </p>
              </div>

              {/* Three Main Action Cards as Requested */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. زر استيراد (تنزيل وحفظ جميع البيانات على الجهاز) */}
                <div className="p-4 rounded-2xl bg-[#0A192F] border-2 border-sky-500/40 flex flex-col justify-between gap-4 shadow-lg">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-300 flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm sm:text-base font-extrabold text-[#F8FAFC]">
                      استيراد (تنزيل جميع البيانات على الجهاز)
                    </h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      تنزيل جميع البيانات المدخلة وجميع تفاصيل أي حساب سواء محادثات أو منشورات أو بيانات محلات أو إعلانات أو حسابات مسجلة (كل شيء) وحفظه في ملف على جهازك.
                    </p>
                  </div>

                  <FluentButton
                    type="button"
                    variant="primary"
                    className="w-full py-3 font-extrabold"
                    disabled={isDataActionBusy}
                    onClick={handleDownloadAllPlatformDataToDevice}
                  >
                    <Download className="w-4 h-4" />
                    <span>استيراد</span>
                  </FluentButton>
                </div>

                {/* 2. زر تصدير (رفع ملف البيانات المحفوظ لظهور البيانات كما كانت) */}
                <div className="p-4 rounded-2xl bg-[#0A192F] border-2 border-emerald-500/40 flex flex-col justify-between gap-4 shadow-lg">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm sm:text-base font-extrabold text-[#F8FAFC]">
                      تصدير (رفع ملف البيانات لإظهارها كما كانت)
                    </h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      اختيار ملف البيانات المحفوظ على جهازك لرفعه واستعادته للموقع وظهور جميع البيانات مرة أخرى كما كانت في آخر مرة تم حفظها.
                    </p>
                  </div>

                  <label className="fluent-reveal w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all text-center">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>{isDataActionBusy ? 'جاري المعالجة...' : 'تصدير'}</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      disabled={isDataActionBusy}
                      onChange={handleUploadAndRestorePlatformDataFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. زر استرجاع البيانات (استرجاع جميع المدخلات منذ بداية إنشاء الموقع حتى اليوم) */}
                <div className="p-4 rounded-2xl bg-[#0A192F] border-2 border-amber-500/50 flex flex-col justify-between gap-4 shadow-lg">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm sm:text-base font-extrabold text-amber-300">
                      استرجاع البيانات (منذ بداية إنشاء الموقع حتى اليوم)
                    </h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      استرجاع جميع البيانات التي كانت قبل التحديث والمتواجدة جميعاً منذ بداية إنشاء الموقع حتى اليوم الذي يتم الاسترجاع به من الخزنة التراكمية الدائمة لجميع المدخلات.
                    </p>
                  </div>

                  <FluentButton
                    type="button"
                    variant="secondary"
                    className="w-full py-3 !bg-amber-500 hover:!bg-amber-400 !text-[#0A192F] !border-amber-300 font-extrabold shadow-md"
                    disabled={isDataActionBusy}
                    onClick={handleRestoreAllHistoricalDataSinceCreation}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {isDataActionBusy ? 'جاري استرجاع البيانات...' : 'استرجاع البيانات'}
                    </span>
                  </FluentButton>
                </div>
              </div>

              {/* Temporary Button Card: ترحيل البيانات المحلية (IndexedDB + localStorage -> Firebase Firestore) */}
              <div className="p-4 rounded-2xl bg-[#0A192F] border-2 border-emerald-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm sm:text-base">
                    <Database className="w-5 h-5 shrink-0" />
                    <span>ترحيل البيانات المحلية (IndexedDB &amp; localStorage → Firebase Firestore)</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    يقوم هذا الزر المؤقت بقراءة كافة المحلات وأرقام الخدمات والصور المحفوظة في التخزين المحلي القديم على هذا الجهاز ورفعها دفعة واحدة إلى Firebase Firestore ليتم مزامنتها فوراً مع جميع المستخدمين، مع فحص تلقائي (Check) يمنع رفع أي سجل مكرر موجود بالفعل على Firebase.
                  </p>
                </div>

                <FluentButton
                  type="button"
                  variant="emerald"
                  disabled={isMigratingLocalData || isDataActionBusy}
                  onClick={handleMigrateLocalDataToFirebase}
                  className="shrink-0 py-3 px-5 font-extrabold shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isMigratingLocalData
                      ? 'جاري ترحيل البيانات المحلية...'
                      : 'ترحيل البيانات المحلية'}
                  </span>
                </FluentButton>
              </div>

              {/* Live Summary of Saved Platform Data */}
              <div className="p-4 rounded-2xl bg-[#0A192F]/90 border border-[#334155] space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#334155]">
                  <span className="text-xs sm:text-sm font-extrabold text-sky-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>إحصائيات البيانات المحفوظة حالياً في قاعدة البيانات والخزنة الدائمة:</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                    الحفظ التلقائي الدائم نشط
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">الحسابات المسجلة:</span>
                    <strong className="text-sky-300 font-mono-tabular font-extrabold">
                      {state.users.length}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">المحلات المسجلة:</span>
                    <strong className="text-emerald-300 font-mono-tabular font-extrabold">
                      {state.stores.length}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">المنشورات (كافة الأقسام):</span>
                    <strong className="text-amber-300 font-mono-tabular font-extrabold">
                      {state.communityPosts.length +
                        (state.buySellPosts?.length || 0) +
                        (state.utilityPosts?.length || 0)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">المحادثات والرسائل:</span>
                    <strong className="text-purple-300 font-mono-tabular font-extrabold">
                      {(state.privateChatMessages?.length || 0) +
                        state.messages.length +
                        (state.liveChatMessages?.length || 0)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">الإعلانات المضافة:</span>
                    <strong className="text-sky-300 font-mono-tabular font-extrabold">
                      {state.squareAds.length + state.topBanners.length + 1}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">سواقين توصيلة:</span>
                    <strong className="text-emerald-300 font-mono-tabular font-extrabold">
                      {state.tawsilaRides.length}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">أرقام الخدمات:</span>
                    <strong className="text-amber-300 font-mono-tabular font-extrabold">
                      {state.serviceNumbers.length}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#112240] border border-[#334155] flex items-center justify-between">
                    <span className="text-[#94A3B8] font-bold">تقديمات المرافق:</span>
                    <strong className="text-sky-300 font-mono-tabular font-extrabold">
                      {state.utilitySubmissions?.length || 0}
                    </strong>
                  </div>
                </div>
              </div>
            </FluentCard>
          )}

          {/* ====================================================================
              11. التطبيق (App Download / Upload / External Link)
             ==================================================================== */}
          {activeSubTab === 'app_download' && (
            <FluentCard className="space-y-5">
              <div className="pb-3 border-b border-[#334155]">
                <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                  <span>11. التطبيق — إعداد تحميل التطبيق المباشر أو الرابط الخارجي</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-1">
                  اختر أي جزء من الأزرار الثلاثة بالأسفل (أضف رابط، ارفع التطبيق، أو لينك التطبيق) ليظهر تلقائياً زر التحميل أسفل مربع خطوات التثبيت المباشر من المتصفح داخل زر &quot;تثبيت التطبيق&quot;.
                </p>
              </div>

              {/* Three Selection Buttons: زر أضف رابط | زر ارفع التطبيق | زر لينك التطبيق */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. زر أضف رابط */}
                <button
                  type="button"
                  onClick={() => handleSelectAppOption('add_link')}
                  className={`fluent-reveal p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
                    selectedAppOption === 'add_link'
                      ? 'bg-sky-600/25 border-sky-400 text-[#F8FAFC] shadow-[0_0_20px_-4px_rgba(56,189,248,0.5)]'
                      : 'bg-[#0A192F] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-sky-500/50'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                      selectedAppOption === 'add_link'
                        ? 'bg-sky-500 text-[#0A192F] border-sky-300'
                        : 'bg-[#112240] text-sky-400 border-[#334155]'
                    }`}
                  >
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div className="text-sm sm:text-base font-extrabold">أضف رابط</div>
                  <span className="text-[11px] text-[#94A3B8]">
                    إضافة رابط تحميل مباشر للتطبيق
                  </span>
                  {selectedAppOption === 'add_link' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold">
                      محدد ومفعل حالياً
                    </span>
                  )}
                </button>

                {/* 2. زر ارفع التطبيق */}
                <button
                  type="button"
                  onClick={() => handleSelectAppOption('upload_app')}
                  className={`fluent-reveal p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
                    selectedAppOption === 'upload_app'
                      ? 'bg-emerald-600/25 border-emerald-400 text-[#F8FAFC] shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)]'
                      : 'bg-[#0A192F] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-emerald-500/50'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                      selectedAppOption === 'upload_app'
                        ? 'bg-emerald-500 text-[#0A192F] border-emerald-300'
                        : 'bg-[#112240] text-emerald-400 border-[#334155]'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm sm:text-base font-extrabold">ارفع التطبيق</div>
                  <span className="text-[11px] text-[#94A3B8]">
                    رفع ملف التطبيق (.apk أو غيره) للتحميل المباشر
                  </span>
                  {selectedAppOption === 'upload_app' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold">
                      محدد ومفعل حالياً
                    </span>
                  )}
                </button>

                {/* 3. زر لينك التطبيق */}
                <button
                  type="button"
                  onClick={() => handleSelectAppOption('app_link')}
                  className={`fluent-reveal p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer ${
                    selectedAppOption === 'app_link'
                      ? 'bg-amber-500/25 border-amber-400 text-[#F8FAFC] shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)]'
                      : 'bg-[#0A192F] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-amber-500/50'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                      selectedAppOption === 'app_link'
                        ? 'bg-amber-500 text-[#0A192F] border-amber-300'
                        : 'bg-[#112240] text-amber-400 border-[#334155]'
                    }`}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div className="text-sm sm:text-base font-extrabold">لينك التطبيق</div>
                  <span className="text-[11px] text-[#94A3B8]">
                    التوجه إلى لينك التحميل في موقع خارجي
                  </span>
                  {selectedAppOption === 'app_link' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold">
                      محدد ومفعل حالياً
                    </span>
                  )}
                </button>
              </div>

              {/* Configuration Box for Option 1: أضف رابط */}
              {selectedAppOption === 'add_link' && (
                <div className="p-4 rounded-2xl bg-[#0A192F] border border-sky-500/40 space-y-3">
                  <label className="block text-xs sm:text-sm font-extrabold text-sky-300">
                    أضف رابط التحميل المباشر للتطبيق:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="url"
                      value={appAddLinkInput}
                      onChange={(e) => setAppAddLinkInput(e.target.value)}
                      placeholder="https://example.com/app-download.apk"
                      className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
                    />
                    <FluentButton
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveAppDownloadSettings('add_link')}
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ وتفعيل الرابط</span>
                    </FluentButton>
                  </div>
                </div>
              )}

              {/* Configuration Box for Option 2: ارفع التطبيق */}
              {selectedAppOption === 'upload_app' && (
                <div className="p-4 rounded-2xl bg-[#0A192F] border border-emerald-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-emerald-300">
                        ارفع ملف التطبيق من جهازك (.apk أو ملف التثبيت):
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        عند ضغط المستخدم على زر التحميل داخل &quot;تثبيت التطبيق&quot; سيتم تحميل الملف المرفوع مباشرة على جهازه.
                      </p>
                    </div>

                    <label className="fluent-reveal px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>
                        {isUploadingAppFile ? 'جاري رفع التطبيق...' : 'اختر ملف التطبيق لرفعه'}
                      </span>
                      <input
                        type="file"
                        accept=".apk,.ipa,.zip,.exe,.msi,application/vnd.android.package-archive,*/*"
                        disabled={isUploadingAppFile}
                        onChange={handleAppFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {appUploadedName && (
                    <div className="p-3 rounded-xl bg-[#112240] border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold truncate">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">الملف المرفوع حالياً: {appUploadedName}</span>
                      </div>
                      <FluentButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleSaveAppDownloadSettings('upload_app')}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>تأكيد التفعيل</span>
                      </FluentButton>
                    </div>
                  )}
                </div>
              )}

              {/* Configuration Box for Option 3: لينك التطبيق */}
              {selectedAppOption === 'app_link' && (
                <div className="p-4 rounded-2xl bg-[#0A192F] border border-amber-500/40 space-y-3">
                  <label className="block text-xs sm:text-sm font-extrabold text-amber-300">
                    لينك التطبيق (للتوجه إلى صفحة التحميل في موقع خارجي أو متجر التطبيقات):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="url"
                      value={appExternalLinkInput}
                      onChange={(e) => setAppExternalLinkInput(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-amber-400 px-3.5 py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-mono-tabular outline-none"
                    />
                    <FluentButton
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveAppDownloadSettings('app_link')}
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ وتفعيل لينك التطبيق</span>
                    </FluentButton>
                  </div>
                </div>
              )}

              {/* Status indicator of how it appears in زر تثبيت التطبيق */}
              {selectedAppOption && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      الخيار المحدد حالياً ({selectedAppOption === 'add_link' ? 'أضف رابط' : selectedAppOption === 'upload_app' ? 'ارفع التطبيق' : 'لينك التطبيق'}) يظهر الآن كزر أسفل مربع خطوات التثبيت المباشر من المتصفح داخل زر &quot;تثبيت التطبيق&quot;.
                    </span>
                  </div>
                </div>
              )}
            </FluentCard>
          )}

          {/* ====================================================================
              12. سجل الأحداث (Admin & Moderator Activity Logs + Auth Session Logs)
             ==================================================================== */}
          {activeSubTab === 'activity_logs' && (
            <FluentCard className="space-y-4 overflow-x-hidden">
              <div className="pb-3 border-b border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-400" />
                    <span>
                      12. سجل الأحداث ({(state.settings.adminActivityLogs || []).length})
                    </span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    سجل عمليات الـ Admin والمشرف (تعديل أو حذف محلات، خدمات، منشورات، تغيير مسمى، أو تعديل/تعليق/حذف حساب) باليوم والساعة والتاريخ.
                  </p>
                </div>

                {/* زر سجل تسجيلات الدخول والخروج في أعلى سجل الأحداث */}
                <FluentButton
                  variant={isAuthSessionLogsOpen ? 'emerald' : 'primary'}
                  size="sm"
                  onClick={() => setIsAuthSessionLogsOpen((prev) => !prev)}
                  className="font-extrabold whitespace-nowrap self-start sm:self-auto"
                >
                  <Clock className="w-4 h-4" />
                  <span>
                    سجل تسجيلات الدخول والخروج ({(state.settings.authSessionLogs || []).length})
                  </span>
                </FluentButton>
              </div>

              {/* قسم سجل تسجيلات الدخول والخروج (عند فتحه) */}
              {isAuthSessionLogsOpen && (
                <div className="p-3 rounded-xl bg-[#0A192F] border border-amber-400/50 space-y-2 overflow-x-hidden">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#334155]">
                    <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                      سجل تسجيلات الدخول والخروج (اليوم · الساعة · التاريخ)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAuthSessionLogsOpen(false)}
                      className="text-xs font-extrabold text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>

                  {(state.settings.authSessionLogs || []).length === 0 ? (
                    <p className="text-xs text-[#94A3B8] py-4 text-center">
                      لا توجد تسجيلات دخول أو خروج مسجلة حتى الآن.
                    </p>
                  ) : (
                    <div className="space-y-1.5 overflow-x-hidden">
                      {(showAllAuthSessionLogs
                        ? state.settings.authSessionLogs || []
                        : (state.settings.authSessionLogs || []).slice(0, 10)
                      ).map((log) => (
                        <div
                          key={log.id}
                          className="w-full px-2.5 py-2 rounded-lg bg-[#112240] border border-[#334155] flex items-center justify-between gap-1.5 flex-nowrap overflow-hidden text-[10px] sm:text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                            <span
                              className={`px-1.5 py-0.5 rounded font-extrabold shrink-0 whitespace-nowrap ${
                                log.eventType === 'login'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                              }`}
                            >
                              {log.eventType === 'login' ? 'دخول' : 'خروج'}
                            </span>
                            <span className="font-extrabold text-[#F8FAFC] truncate">
                              {log.username}
                            </span>
                            <span className="text-[9px] sm:text-[11px] text-sky-300 shrink-0 whitespace-nowrap">
                              ({log.role === 'admin' ? 'Admin' : log.role === 'moderator' ? 'مشرف' : 'عضو'})
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[11px] font-mono-tabular font-bold text-amber-300 whitespace-nowrap shrink-0">
                            {formatActivityDayTimeDate(log.createdAt)}
                          </span>
                        </div>
                      ))}

                      {(state.settings.authSessionLogs || []).length > 10 && (
                        <div className="pt-2 flex justify-center">
                          <FluentButton
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowAllAuthSessionLogs((prev) => !prev)}
                          >
                            <span>
                              {showAllAuthSessionLogs
                                ? 'عرض آخر 10 فقط'
                                : `إظهار المزيد (${(state.settings.authSessionLogs || []).length - 10})`}
                            </span>
                          </FluentButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* قائمة سجل أحداث الـ Admin والمشرف (آخر 10 أحداث في سطر واحد + زر إظهار المزيد) */}
              {(state.settings.adminActivityLogs || []).length === 0 ? (
                <div className="p-6 rounded-xl bg-[#0A192F] border border-[#334155] text-center text-xs sm:text-sm text-[#94A3B8]">
                  لا توجد أحداث مسجلة حتى الآن. سيظهر هنا تلقائياً أي تعديل أو حذف للمحلات أو الخدمات أو المنشورات أو تغيير مسمى أو تعديل/تعليق/حذف حساب.
                </div>
              ) : (
                <div className="space-y-1.5 overflow-x-hidden">
                  {(showAllActivityLogs
                    ? state.settings.adminActivityLogs || []
                    : (state.settings.adminActivityLogs || []).slice(0, 10)
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-1.5 flex-nowrap overflow-hidden text-[10px] sm:text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                        <span
                          className={`px-1.5 py-0.5 rounded font-extrabold shrink-0 whitespace-nowrap ${
                            item.actorRole === 'admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          }`}
                        >
                          {item.actorRole === 'admin' ? 'Admin' : 'مشرف'}: {item.actorUsername}
                        </span>
                        <span className="font-extrabold text-sky-300 shrink-0 whitespace-nowrap">
                          {item.actionType}
                        </span>
                        <span className="font-bold text-[#F8FAFC] truncate">
                          ({item.targetName || item.description})
                        </span>
                      </div>

                      <span className="text-[9px] sm:text-[11px] font-mono-tabular font-bold text-amber-300 whitespace-nowrap shrink-0">
                        {formatActivityDayTimeDate(item.createdAt)}
                      </span>
                    </div>
                  ))}

                  {(state.settings.adminActivityLogs || []).length > 10 && (
                    <div className="pt-2 flex justify-center">
                      <FluentButton
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAllActivityLogs((prev) => !prev)}
                      >
                        <span>
                          {showAllActivityLogs
                            ? 'إخفاء وعرض آخر 10 أحداث فقط'
                            : `إظهار المزيد (${(state.settings.adminActivityLogs || []).length - 10} حدث إضافي)`}
                        </span>
                      </FluentButton>
                    </div>
                  )}
                </div>
              )}
            </FluentCard>
          )}
        </div>
      </div>

      {/* Modal: أكثر المتواجدين (Top Daily Visitors Sorted by Daily Visit Count) */}
      {isTopVisitorsModalOpen && (
        <FluentModal
          isOpen={isTopVisitorsModalOpen}
          onClose={() => setIsTopVisitorsModalOpen(false)}
          title="أكثر المتواجدين على الموقع (مرتبة حسب عدد الزيارات يومياً)"
        >
          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1">
            {(() => {
              const todayKey = new Date().toISOString().slice(0, 10);
              const visitsMap = state.settings.userDailyVisitsMap || {};
              const onlineNamesSet = new Set(
                connectedOnlineUsers.map((u) => u.username.trim().toLowerCase())
              );

              const rankedUsers = state.users
                .map((u) => {
                  const keyById = visitsMap[u.id];
                  const keyByName = visitsMap[u.username.trim().toLowerCase()];
                  const entry = keyById || keyByName;
                  const isCurrentlyOnline = onlineNamesSet.has(
                    u.username.trim().toLowerCase()
                  );
                  let dailyVisits = 0;
                  if (entry && entry.dateKey === todayKey) {
                    dailyVisits = Math.max(1, entry.dailyCount || 0);
                  } else if (entry && entry.totalCount) {
                    dailyVisits = Math.max(1, entry.dailyCount || 1);
                  } else if (isCurrentlyOnline) {
                    dailyVisits = 1;
                  }
                  return {
                    user: u,
                    dailyVisits,
                    isCurrentlyOnline,
                  };
                })
                .sort((a, b) => {
                  if (b.dailyVisits !== a.dailyVisits) {
                    return b.dailyVisits - a.dailyVisits;
                  }
                  if (a.isCurrentlyOnline !== b.isCurrentlyOnline) {
                    return a.isCurrentlyOnline ? -1 : 1;
                  }
                  return a.user.username.localeCompare(b.user.username, 'ar');
                });

              return rankedUsers.map((item, idx) => (
                <div
                  key={item.user.id}
                  className="px-3 py-2.5 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2 overflow-hidden"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-[#112240] border border-sky-400/40 text-sky-300 text-xs font-extrabold flex items-center justify-center shrink-0 font-mono-tabular">
                      {idx + 1}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.isCurrentlyOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
                      {item.user.username}
                    </span>
                  </div>

                  {/* خانة بجانب الاسم بها رقم عدد الزيارات فقط بدون جملة عدد الزيارات اليومية */}
                  <div className="min-w-[2.25rem] px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-white text-xs sm:text-sm font-extrabold font-mono-tabular whitespace-nowrap shrink-0 flex items-center justify-center">
                    {item.dailyVisits}
                  </div>
                </div>
              ));
            })()}
          </div>
        </FluentModal>
      )}

      {/* Modal: سجل المراسلات (Correspondence History & Direct Reply to User Bell) */}
      {isMessagesHistoryModalOpen && (
        <FluentModal
          isOpen={isMessagesHistoryModalOpen}
          onClose={() => setIsMessagesHistoryModalOpen(false)}
          title="سجل المراسلات السابقة"
          subtitle="جميع المراسلات السابقة مع إمكانية تثبيت الرسائل بالأعلى أو حذف أي رسالة من السجل"
          maxWidth="2xl"
        >
          {unifiedMessages.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-8 text-center">
              لا توجد مراسلات سابقة مسجلة حتى الآن.
            </p>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {unifiedMessages.map((msg) => {
                const rawThreadItems =
                  msg.thread && msg.thread.length > 0
                    ? msg.thread
                    : [
                        {
                          id: msg.id,
                          sender: 'user' as const,
                          senderName: msg.senderUsername,
                          text: msg.content,
                          createdAt: msg.createdAt,
                        },
                      ];
                const filteredThreadItems = rawThreadItems
                  .filter((e) => !deletedHistoryEntryIds.includes(e.id))
                  .sort((a, b) => {
                    const aPin = pinnedHistoryIds.includes(a.id) || Boolean(a.isPinned);
                    const bPin = pinnedHistoryIds.includes(b.id) || Boolean(b.isPinned);
                    if (aPin !== bPin) return aPin ? -1 : 1;
                    return (
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                  });

                if (filteredThreadItems.length === 0) return null;

                const isThreadPinned =
                  pinnedHistoryIds.includes(msg.id) || Boolean(msg.isPinned);
                const draftText = replyDrafts[`modal_${msg.id}`] || '';
                const isModalCollapsed = Boolean(collapsedModalMessagesMap[msg.id]);
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl bg-[#0A192F] border space-y-3 ${
                      isThreadPinned
                        ? 'border-amber-400/80 ring-1 ring-amber-400/30'
                        : 'border-sky-400/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-2 border-b border-[#334155]">
                      <div
                        onClick={() =>
                          setCollapsedModalMessagesMap((prev) => ({
                            ...prev,
                            [msg.id]: false,
                          }))
                        }
                        className="flex-1 flex items-center gap-2 cursor-pointer select-none"
                      >
                        {isModalCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-sky-400 shrink-0" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <span className="font-extrabold text-sky-400 text-sm">
                          الحساب: {msg.senderUsername}
                        </span>
                        {isThreadPinned && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                            <Pin className="w-3 h-3" />
                            <span>مثبت بالأعلى</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-bold">
                          ({filteredThreadItems.length} رسائل)
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[#94A3B8] font-mono-tabular">
                          {new Date(
                            msg.updatedAt || msg.createdAt
                          ).toLocaleString('ar-EG')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinHistoryItem(msg.id);
                          }}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                            isThreadPinned
                              ? 'bg-amber-500 text-[#0A192F] border-amber-400'
                              : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-400/40'
                          }`}
                          title={isThreadPinned ? 'إلغاء تثبيت المحادثة' : 'تثبيت المحادثة بالأعلى'}
                        >
                          <Pin className="w-3 h-3" />
                          <span>{isThreadPinned ? 'مثبتة' : 'تثبيت'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMessage(msg.id);
                            showToast(`تم حذف سجل محادثة "${msg.senderUsername}" بالكامل.`);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                          title="حذف المحادثة بالكامل"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف السجل</span>
                        </button>
                        {!isModalCollapsed ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedModalMessagesMap((prev) => ({
                                ...prev,
                                [msg.id]: true,
                              }));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700 text-slate-200 border border-slate-500/40 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>طي</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedModalMessagesMap((prev) => ({
                                ...prev,
                                [msg.id]: false,
                              }));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-600/25 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-400/50 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>عرض الرسائل</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!isModalCollapsed && (
                      <>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {filteredThreadItems.map((entry) => {
                            const isAdminEntry = entry.sender === 'admin';
                            const isEntryPinned =
                              pinnedHistoryIds.includes(entry.id) ||
                              Boolean(entry.isPinned);
                            return (
                              <div
                                key={entry.id}
                                className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                  isEntryPinned
                                    ? 'bg-amber-950/30 border-amber-400/80 text-amber-100 ring-1 ring-amber-400/30'
                                    : isAdminEntry
                                    ? 'bg-emerald-950/35 border-emerald-400/50 text-emerald-100 mr-4'
                                    : 'bg-[#112240] border-[#334155] text-[#F8FAFC] ml-4'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`font-extrabold ${
                                        isAdminEntry
                                          ? 'text-emerald-400'
                                          : 'text-sky-400'
                                      }`}
                                    >
                                      {isAdminEntry ? 'رد الإدارة' : entry.senderName}
                                    </span>
                                    {isEntryPinned && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-amber-300 font-extrabold inline-flex items-center gap-0.5">
                                        <Pin className="w-2.5 h-2.5" />
                                        <span>مثبتة بالأعلى</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[#94A3B8] font-mono-tabular">
                                      {new Date(entry.createdAt).toLocaleString(
                                        'ar-EG'
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => togglePinHistoryItem(entry.id)}
                                      className={`px-1.5 py-0.5 rounded-md border font-extrabold inline-flex items-center gap-0.5 cursor-pointer transition-colors ${
                                        isEntryPinned
                                          ? 'bg-amber-500 text-[#0A192F] border-amber-400'
                                          : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-400/40'
                                      }`}
                                      title={isEntryPinned ? 'إلغاء تثبيت الرسالة' : 'تثبيت الرسالة بالأعلى'}
                                    >
                                      <Pin className="w-2.5 h-2.5" />
                                      <span>{isEntryPinned ? 'مثبتة' : 'تثبيت'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (rawThreadItems.length <= 1) {
                                          onDeleteMessage(msg.id);
                                        }
                                        deleteHistoryEntryItem(entry.id);
                                      }}
                                      className="px-1.5 py-0.5 rounded-md bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-extrabold inline-flex items-center gap-0.5 cursor-pointer transition-colors"
                                      title="حذف هذه الرسالة من السجل"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>حذف</span>
                                    </button>
                                  </div>
                                </div>
                                <p className="whitespace-pre-line leading-relaxed">
                                  {entry.text}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#334155]">
                          <input
                            type="text"
                            value={draftText}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [`modal_${msg.id}`]: e.target.value,
                              }))
                            }
                            placeholder={`اكتب رداً إلى ${msg.senderUsername}...`}
                            className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3.5 py-2 text-xs sm:text-sm text-[#F8FAFC] outline-none"
                          />
                          <FluentButton
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={!draftText.trim()}
                            onClick={() => {
                              if (!draftText.trim()) return;
                              onAdminReplyToMessage?.(msg.id, draftText.trim());
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [`modal_${msg.id}`]: '',
                              }));
                              showToast(
                                `تم إرسال الرسالة لحظياً إلى "${msg.senderUsername}" وظهرت في زر الجرس لديه!`
                              );
                            }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>إرسال رسالة</span>
                          </FluentButton>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </FluentModal>
      )}

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
                اسم الحساب (الخاص بتسجيل الدخول)
              </label>
              <input
                type="text"
                required
                value={usrAccountName}
                onChange={(e) => setUsrAccountName(e.target.value)}
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] outline-none"
              />
            </div>
            {editingUser.role !== 'admin' &&
              usrRole !== 'admin' &&
              usrAccountName.trim().toLowerCase() !== 'admin' && (
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">
                    الاسم الذي يظهر للمستخدمين (عند إنشاء حساب جديد)
                  </label>
                  <input
                    type="text"
                    required
                    value={usrUsername}
                    onChange={(e) => setUsrUsername(e.target.value)}
                    className="w-full rounded-xl bg-[#0A192F] border border-[#334155] px-3.5 py-2 text-sm text-[#F8FAFC] outline-none"
                  />
                </div>
              )}
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
                  {[
                    'مول دريم بلازا',
                    ...state.settings.storeCategories.filter(
                      (c) => c !== 'مول دريم بلازا'
                    ),
                  ].map((c) => (
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
                        setStMenuImages((prev) => {
                          const cleanPrev = prev.filter(
                            (img) =>
                              typeof img === 'string' &&
                              !img.startsWith('data:image/svg+xml')
                          );
                          const nextImgs = [...cleanPrev, ...urls];
                          if (editingStore) {
                            const updatedStore: StoreListingItem = {
                              ...editingStore,
                              name: stName.trim() || editingStore.name,
                              category: stCategory || editingStore.category,
                              phone: stPhone.trim() || editingStore.phone,
                              whatsapp: (stPhone.trim() || editingStore.phone).replace(
                                /[^0-9]/g,
                                ''
                              ),
                              locationUrl: stLocationUrl.trim(),
                              details: stDetails.trim() || editingStore.details,
                              menuImages: nextImgs,
                              updatedAt: Date.now(),
                              imagesExplicitlyCleared: false,
                            };
                            setEditingStore(updatedStore);
                            onUpdateStore(updatedStore);
                          }
                          return nextImgs;
                        });
                        showToast(`تم رفع وحفظ ${urls.length} صورة للمحل بنجاح!`);
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

      {/* Store Delete Confirmation Modal */}
      <FluentModal
        isOpen={Boolean(storePendingDelete)}
        onClose={() => setStorePendingDelete(null)}
        title="تأكيد حذف المحل"
        subtitle="هل أنت متأكد من رغبتك في حذف هذا المحل نهائياً من الدليل؟"
        maxWidth="md"
      >
        {storePendingDelete && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs sm:text-sm text-rose-200 space-y-1.5">
              <p className="font-extrabold text-white text-sm">
                المحل المراد حذفه: <span className="text-rose-300">{storePendingDelete.name}</span>
              </p>
              <p className="text-xs text-rose-300/90">
                القسم: {storePendingDelete.category} — رقم التواصل: {storePendingDelete.phone}
              </p>
              <p className="text-[11px] text-rose-300/80 pt-1">
                سيتم حذف هذا المحل وجميع بياناته وصوره نهائياً ولا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <FluentButton
                type="button"
                variant="secondary"
                onClick={() => setStorePendingDelete(null)}
              >
                إلغاء
              </FluentButton>
              <FluentButton
                type="button"
                variant="danger"
                onClick={() => {
                  const target = storePendingDelete;
                  setStorePendingDelete(null);
                  onDeleteStore(target.id);
                  showToast(`تم حذف محل "${target.name}" بنجاح.`);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف النهائي</span>
              </FluentButton>
            </div>
          </div>
        )}
      </FluentModal>

      {/* Edit Ad Packages Prices & 10-Day Discount Modal */}
      <FluentModal
        isOpen={isEditAdPricesModalOpen}
        onClose={() => setIsEditAdPricesModalOpen(false)}
        title="تعديل أسعار باقات الإعلانات ونسبة الخصم"
        subtitle="التعديلات تظهر لحظياً لجميع المستخدمين في نافذة باقات الإعلانات"
        maxWidth="md"
      >
        <form onSubmit={handleSaveAdPrices} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sky-400 mb-1">
              سعر اليوم في الباقة الأولى — القائمة المتحركة (جنيه / اليوم)
            </label>
            <input
              type="number"
              min={1}
              value={pricePkg1Draft}
              onChange={(e) => setPricePkg1Draft(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-400 mb-1">
              سعر اليوم في الباقة الثانية — البانر العلوي (جنيه / اليوم)
            </label>
            <input
              type="number"
              min={1}
              value={pricePkg2Draft}
              onChange={(e) => setPricePkg2Draft(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-amber-400 px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-indigo-400 mb-1">
              سعر اليوم في الباقة الثالثة — الشاشة المنبثقة VIP (جنيه / اليوم)
            </label>
            <input
              type="number"
              min={1}
              value={pricePkg3Draft}
              onChange={(e) => setPricePkg3Draft(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-indigo-400 px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-400 mb-1">
              نسبة الخصم في عرض الـ 10 أيام (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={discount10DaysDraft}
              onChange={(e) => setDiscount10DaysDraft(e.target.value)}
              required
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-emerald-400 px-3.5 py-2.5 text-sm text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#334155]">
            <FluentButton
              type="button"
              variant="secondary"
              onClick={() => setIsEditAdPricesModalOpen(false)}
            >
              إلغاء
            </FluentButton>
            <FluentButton type="submit" variant="emerald">
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتطبيق الأسعار لحظياً</span>
            </FluentButton>
          </div>
        </form>
      </FluentModal>

      {/* الشاشة المنبثقة لتفاصيل الإعلان، التعديل الكامل، تجديد فترة الإعلان، وملخص الإعلان + تحميل PDF A4 عرضية */}
      <FluentModal
        isOpen={Boolean(inspectedAdModal)}
        onClose={() => {
          setInspectedAdModal(null);
          setIsEditingInsideAdModal(false);
        }}
        title="إدارة الإعلان وملخص المشاهدات والتفاعل اللحظي"
        subtitle="يمكنك تعديل أي بيانات في الإعلان، تجديد فترته، أو تحميل ملخص الإعلان بصيغة PDF A4 عرضية"
        maxWidth="lg"
      >
        {inspectedAdModal &&
          (() => {
            const liveSquare =
              inspectedAdModal.pkgType === 'moving_square'
                ? state.squareAds.find((x) => x.id === inspectedAdModal.adId)
                : undefined;
            const liveBanner =
              inspectedAdModal.pkgType === 'top_banner'
                ? state.topBanners.find((x) => x.id === inspectedAdModal.adId)
                : undefined;
            const livePopup =
              inspectedAdModal.pkgType === 'popup_entry' ? state.popupAd : undefined;

            const adTitle =
              liveSquare?.title ||
              liveBanner?.title ||
              livePopup?.title ||
              adPlaceName ||
              'إعلان مميز';
            const adCategoryOrDesc =
              liveSquare?.category ||
              liveBanner?.subtitle ||
              livePopup?.description ||
              adCategoryOrSub ||
              'عام';
            const adTypeLabel =
              inspectedAdModal.pkgType === 'moving_square'
                ? 'لوحة الإعلانات والخصومات المتحركة'
                : inspectedAdModal.pkgType === 'top_banner'
                ? 'إعلان البانر العلوي'
                : 'إعلان الشاشة المنبثقة VIP';
            const adImg =
              liveSquare?.imageUrl ||
              liveBanner?.imageUrl ||
              livePopup?.imageUrl ||
              adMainImage;
            const adPhoneVal =
              liveSquare?.phone ||
              liveBanner?.phone ||
              liveBanner?.whatsappPhone ||
              livePopup?.phone ||
              livePopup?.whatsappPhone ||
              adPhone ||
              '';
            const adLocVal =
              liveSquare?.locationUrl ||
              liveBanner?.locationUrl ||
              livePopup?.locationUrl ||
              adLocationUrl ||
              '';
            const adDurationVal =
              liveSquare?.durationDays ||
              liveBanner?.durationDays ||
              livePopup?.durationDays ||
              adDurationDays ||
              5;
            const adExpiresVal =
              liveSquare?.expiresAt ||
              liveBanner?.expiresAt ||
              livePopup?.expiresAt;
            const adCreatedAtVal =
              liveSquare?.createdAt || liveBanner?.createdAt;

            const currentAdObj = liveSquare || liveBanner || livePopup;
            const linkedStore = findLinkedStoreForAd(state.stores, currentAdObj);

            const liveViewsCount = Math.max(
              (liveSquare?.viewsCount ??
                liveBanner?.viewsCount ??
                livePopup?.viewsCount) ||
                0,
              linkedStore?.viewsCount || 0
            );
            const viewsSinceAdPlaced = (() => {
              const explicitSinceCreation = currentAdObj?.adViewsSinceCreation;
              const baselineAtCreation = currentAdObj?.baselineViewsAtCreation;
              const deltaFromBaseline =
                typeof baselineAtCreation === 'number'
                  ? Math.max(0, liveViewsCount - baselineAtCreation)
                  : liveViewsCount;
              if (typeof explicitSinceCreation === 'number' && explicitSinceCreation > 0) {
                return Math.max(explicitSinceCreation, deltaFromBaseline);
              }
              return deltaFromBaseline;
            })();
            const liveCallClicks = Math.max(
              (liveSquare?.callClicksCount ??
                liveBanner?.callClicksCount ??
                livePopup?.callClicksCount) ||
                0,
              linkedStore?.callClicksCount || 0
            );
            const liveWhatsappClicks = Math.max(
              (liveSquare?.whatsappClicksCount ??
                liveBanner?.whatsappClicksCount ??
                livePopup?.whatsappClicksCount) ||
                0,
              linkedStore?.whatsappClicksCount || 0
            );
            const liveViewsByHour = mergeViewsByHourMaps(
              liveSquare?.viewsByHour,
              liveBanner?.viewsByHour,
              livePopup?.viewsByHour,
              linkedStore?.viewsByHour
            );
            const peakHourLabel = getPeakViewingHourLabel(liveViewsByHour);
            const remainingBadgeText = getDaysRemainingBadge(adExpiresVal);

            const handleRenewDurationNow = () => {
              const daysToRenew = Math.max(1, Number(renewDaysDraft) || 5);
              const newExpiresAt = new Date(
                Date.now() + daysToRenew * 24 * 60 * 60 * 1000
              ).toISOString();

              if (inspectedAdModal.pkgType === 'moving_square' && liveSquare) {
                onUpdateSquareAd({
                  ...liveSquare,
                  durationDays: daysToRenew,
                  expiresAt: newExpiresAt,
                  active: true,
                  description: `إعلان نشط لمدة ${daysToRenew} يوم`,
                  updatedAt: Date.now(),
                });
                setAdDurationDays(daysToRenew);
                showToast(
                  `تم تجديد فترة الإعلان "${liveSquare.title}" لمدة ${daysToRenew} أيام بنجاح!`
                );
              } else if (inspectedAdModal.pkgType === 'top_banner' && liveBanner) {
                onUpdateTopBanner({
                  ...liveBanner,
                  durationDays: daysToRenew,
                  expiresAt: newExpiresAt,
                  active: true,
                  updatedAt: Date.now(),
                });
                setAdDurationDays(daysToRenew);
                showToast(
                  `تم تجديد فترة البانر "${liveBanner.title}" لمدة ${daysToRenew} أيام بنجاح!`
                );
              } else if (inspectedAdModal.pkgType === 'popup_entry' && livePopup) {
                onUpdatePopupAd({
                  ...livePopup,
                  durationDays: daysToRenew,
                  expiresAt: newExpiresAt,
                  active: true,
                  updatedAt: Date.now(),
                });
                setAdDurationDays(daysToRenew);
                setAdPopupActive(true);
                showToast(
                  `تم تجديد فترة إعلان الشاشة المنبثقة "${livePopup.title}" لمدة ${daysToRenew} أيام بنجاح!`
                );
              }
            };

            return (
              <div className="space-y-4">
                {/* 1. بطاقة معلومات الإعلان الحالية + زر التعديل */}
                <div className="p-3.5 rounded-2xl bg-[#0A192F] border border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {adImg && (
                      <img
                        src={adImg}
                        alt={adTitle}
                        className="w-16 h-16 rounded-xl object-cover border border-sky-400/50 shrink-0"
                      />
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/40 text-sky-300 text-[11px] font-extrabold">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>{adTypeLabel}</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] truncate">
                        {adTitle}
                      </h4>
                      <p className="text-xs text-[#94A3B8] truncate">
                        {adCategoryOrDesc} · {remainingBadgeText}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditingInsideAdModal((prev) => !prev)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border cursor-pointer transition-all ${
                        isEditingInsideAdModal
                          ? 'bg-amber-500 text-[#0A192F] border-amber-300 shadow-lg'
                          : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-md'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>
                        {isEditingInsideAdModal
                          ? 'إخفاء نموذج التعديل'
                          : 'تعديل بيانات الإعلان'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. قسم تجديد فترة الإعلان بشكل فوري */}
                <div className="p-3.5 rounded-2xl bg-[#0A192F]/90 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-emerald-400" />
                      <span>تجديد فترة الإعلان وتنشيطه فوراً</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      الحالة الحالية: <strong className="text-white">{remainingBadgeText}</strong> — اختر عدد الأيام لتجديد صلاحية الإعلان من الآن:
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={renewDaysDraft}
                      onChange={(e) =>
                        setRenewDaysDraft(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-20 rounded-xl bg-[#112240] border border-emerald-400/60 px-2.5 py-1.5 text-xs font-extrabold text-white text-center font-mono-tabular outline-none"
                    />
                    <span className="text-xs font-bold text-[#94A3B8]">يوم</span>
                    <button
                      type="button"
                      onClick={handleRenewDurationNow}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 border border-emerald-400/60 shadow-md cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تجديد فترة الإعلان</span>
                    </button>
                  </div>
                </div>

                {/* 3. نموذج تعديل أي شيء في الإعلان (يظهر عند الضغط على زر التعديل) */}
                {isEditingInsideAdModal && (
                  <form
                    onSubmit={handleSaveAdPackageItem}
                    className="p-4 rounded-2xl bg-[#0A192F] border border-sky-400/60 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                      <span className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4" />
                        <span>تعديل كامل بيانات وصور الإعلان</span>
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        يتم التحديث لجميع المستخدمين لحظياً فور الحفظ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                          اسم المحل / عنوان الإعلان
                        </label>
                        <input
                          type="text"
                          value={adPlaceName}
                          onChange={(e) => setAdPlaceName(e.target.value)}
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-white outline-none"
                          placeholder="اسم المكان أو العرض..."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                          القسم / الوصف الفرعي للإعلان
                        </label>
                        <input
                          type="text"
                          value={adCategoryOrSub}
                          onChange={(e) => setAdCategoryOrSub(e.target.value)}
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-white outline-none"
                          placeholder="مطعم، كافيه، خصم 30%..."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                          رقم الهاتف والواتساب
                        </label>
                        <input
                          type="text"
                          value={adPhone}
                          onChange={(e) => setAdPhone(e.target.value)}
                          dir="ltr"
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-white outline-none"
                          placeholder="010xxxxxxxx"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                          مدة الإعلان (بالأيام)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={adDurationDays}
                          onChange={(e) =>
                            setAdDurationDays(Math.max(1, Number(e.target.value) || 1))
                          }
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-white font-mono-tabular outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                          رابط اللوكيشن (خرائط جوجل)
                        </label>
                        <input
                          type="text"
                          value={adLocationUrl}
                          onChange={(e) => setAdLocationUrl(e.target.value)}
                          dir="ltr"
                          className="w-full rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-white outline-none"
                          placeholder="https://maps.google.com/..."
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-[#94A3B8] mb-1">
                          تغيير أو إضافة صور الإعلان والمنيو
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 rounded-xl bg-sky-600/25 hover:bg-sky-600 text-sky-200 hover:text-white border border-sky-400/50 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {uploadingAdMain ? 'جاري الرفع...' : 'رفع صورة رئيسية / صور جديدة'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleUploadAdMainFile}
                              className="hidden"
                            />
                          </label>
                          {combinedAdImages.length > 0 && (
                            <span className="text-[11px] text-emerald-300 font-bold">
                              إجمالي الصور المرفقة: {combinedAdImages.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#334155]">
                      <FluentButton
                        type="button"
                        variant="secondary"
                        onClick={() => setIsEditingInsideAdModal(false)}
                      >
                        إلغاء
                      </FluentButton>
                      <FluentButton type="submit" variant="primary">
                        <Save className="w-4 h-4" />
                        <span>حفظ التعديلات لحظياً</span>
                      </FluentButton>
                    </div>
                  </form>
                )}

                {/* 4. قسم ملخص الإعلان بالأسفل (محدث لحظياً) + زر تحميل PDF A4 عرضية */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] border-2 border-amber-400/60 shadow-xl space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-2.5">
                    <div>
                      <h5 className="text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-amber-400" />
                        <span>قسم ملخص الإعلان (إحصائيات حقيقية لحظية)</span>
                      </h5>
                      <p className="text-[11px] text-[#94A3B8]">
                        يعرض فقط المستخدمين الذين ضغطوا فعلياً على الإعلان وفتحوا بياناته أو تفاعلوا مع أزراره لحظياً
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold">
                      مزامنة لحظية نشطة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* عدد المشاهدات الفعلية للإعلان */}
                    <div className="p-3 rounded-xl bg-[#0A192F] border border-amber-400/40 flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>عدد مشاهدات الإعلان</span>
                        </div>
                        <p className="text-[10px] text-[#94A3B8]">
                          الذين ضغطوا على الإعلان وشاهدوا بيانات المحل لحظياً
                        </p>
                        <div className="text-[11px] font-extrabold text-emerald-300 pt-0.5">
                          العدد الذي تم مشاهدته من بداية وضع الإعلان:{' '}
                          <span className="font-mono-tabular text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30">
                            {viewsSinceAdPlaced}
                          </span>
                        </div>
                      </div>
                      <span className="text-xl font-extrabold text-amber-300 font-mono-tabular px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 shrink-0">
                        {liveViewsCount}
                      </span>
                    </div>

                    {/* عدد الذين ضغطوا على زر اتصال */}
                    <div className="p-3 rounded-xl bg-[#0A192F] border border-sky-400/40 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>عدد الذين ضغطوا على زر اتصال</span>
                        </div>
                        <p className="text-[10px] text-[#94A3B8]">
                          إجمالي النقرات على زر الاتصال الهاتفي لحظياً
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-sky-300 font-mono-tabular px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/30">
                        {liveCallClicks}
                      </span>
                    </div>

                    {/* عدد الذين ضغطوا على زر المراسلة */}
                    <div className="p-3 rounded-xl bg-[#0A192F] border border-emerald-400/40 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>عدد الذين ضغطوا على زر المراسلة</span>
                        </div>
                        <p className="text-[10px] text-[#94A3B8]">
                          إجمالي النقرات على زر مراسلة واتساب لحظياً
                        </p>
                      </div>
                      <span className="text-xl font-extrabold text-emerald-300 font-mono-tabular px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30">
                        {liveWhatsappClicks}
                      </span>
                    </div>

                    {/* أكثر وقت كان فيه مشاهدة للإعلان */}
                    <div className="p-3 rounded-xl bg-[#0A192F] border border-indigo-400/40 flex items-center justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>أكثر وقت كان فيه مشاهدة للإعلان</span>
                        </div>
                        <p className="text-[11px] font-extrabold text-white truncate pt-0.5">
                          {peakHourLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* زر تحميل التفاصيل في ملف PDF A4 عرضية */}
                  <div className="pt-2 border-t border-[#334155] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#94A3B8]">
                      يشمل التقرير: تفاصيل الإعلان، فترة الإعلان، عدد المشاهدات، عدد الاتصال، عدد المراسلة، وأكثر وقت مشاهدة
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        showToast('جاري تجهيز وتحميل ملف ملخص الإعلان PDF (ورقة A4 عرضية)...');
                        exportAdSummaryToLandscapePDF({
                          title: adTitle,
                          packageLabel: adTypeLabel,
                          categoryOrSubtitle: adCategoryOrDesc,
                          phone: adPhoneVal,
                          locationUrl: adLocVal,
                          durationDays: adDurationVal,
                          expiresAt: adExpiresVal,
                          statusLabel: remainingBadgeText,
                          viewsCount: liveViewsCount,
                          callClicksCount: liveCallClicks,
                          whatsappClicksCount: liveWhatsappClicks,
                          peakHourLabel,
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A192F] text-xs font-extrabold inline-flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span>تحميل التفاصيل في ملف PDF (ورقة A4 عرضية)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
      </FluentModal>
    </div>
  );
};

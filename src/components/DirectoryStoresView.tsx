import React, { useEffect, useState } from 'react';
import {
  Store,
  Plus,
  Search,
  ThumbsUp,
  ThumbsDown,
  Star,
  Phone,
  MessageCircle,
  ExternalLink,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  Send,
  CornerDownLeft,
  Filter,
  Image as ImageIcon,
  CheckCircle2,
  Edit3,
  Eye,
  LayoutGrid,
  LayoutList,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Share2,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  EyeOff,
  Flag,
} from 'lucide-react';
import {
  PlatformSettings,
  StoreCommentItem,
  StoreListingItem,
  StoreReplyItem,
  UserAccount,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import {
  createSquareAdSvg,
  createSuggestedStoreSvgPair,
  getOrCreateVisitorId,
  isPermanentDreamPlazaStore,
  normalizeCategoryString,
  setGlobalDefaultStoreSvgStyle,
  splitStoreTitleWithParentheses,
  uploadImageDynamic,
} from '../services/storageService';
import {
  exportStoresToExcel,
  exportStoresToPDF,
  parseStoresFromExcelFile,
  parseStoresFromPDFFile,
} from '../services/exportService';
import {
  ABUSIVE_CONTENT_WARNING_MESSAGE,
  containsAbusiveWords,
} from '../services/profanityFilter';

interface DirectoryStoresViewProps {
  stores: StoreListingItem[];
  settings: PlatformSettings;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onAddStore: (store: StoreListingItem) => void;
  onUpdateStore?: (store: StoreListingItem) => void;
  onIncrementStoreViews?: (storeId: string) => void;
  onImportStoresBatch: (stores: StoreListingItem[]) => void;
  onDeleteStore: (id: string) => void;
  onToggleStoreLike: (storeId: string) => void;
  onToggleStoreDislike: (storeId: string) => void;
  onRateStore: (storeId: string, stars: number) => void;
  onAddStoreComment: (storeId: string, comment: StoreCommentItem) => void;
  onDeleteStoreComment: (storeId: string, commentId: string) => void;
  onToggleCommentLike: (storeId: string, commentId: string) => void;
  onAddCommentReply: (storeId: string, commentId: string, reply: StoreReplyItem) => void;
  onGeneralizeStoreImageStyle?: (styleVariant: 1 | 2) => void;
}

export const DirectoryStoresView: React.FC<DirectoryStoresViewProps> = ({
  stores,
  settings,
  currentUser,
  onOpenAuthModal,
  onAddStore,
  onUpdateStore,
  onIncrementStoreViews,
  onImportStoresBatch,
  onDeleteStore,
  onToggleStoreLike,
  onToggleStoreDislike,
  onRateStore,
  onAddStoreComment,
  onDeleteStoreComment,
  onToggleCommentLike,
  onAddCommentReply,
  onGeneralizeStoreImageStyle,
}) => {
  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const isStrictAdmin = currentUser?.role === 'admin';
  const isAdmin = canManage;
  const currentVisitorId = getOrCreateVisitorId(currentUser);

  const getCleanStoreDetails = (store: StoreListingItem): string => {
    const raw = (store.details || '').trim();
    if (!raw) return '';
    if (
      raw === 'محل مسجل بالدليل التجاري' &&
      !store.name.includes('محل') &&
      !store.category.includes('محل')
    ) {
      return '';
    }
    return raw;
  };

  const getStoreCoverPhoto = (store: StoreListingItem): string => {
    const first = store.menuImages?.[0];
    const activeStyle = settings.defaultStoreSvgStyle || 1;
    if (!first || first.startsWith('data:image/svg+xml')) {
      return createSquareAdSvg(
        store.name,
        store.category,
        '#0284C7',
        activeStyle
      );
    }
    return first;
  };

  const renderFormattedStoreName = (rawName: string) => {
    const { mainTitle, parenPart } = splitStoreTitleWithParentheses(rawName);
    const wordCount = mainTitle.split(/\s+/).filter(Boolean).length;
    const isOneOrTwoWords = wordCount <= 2;
    return (
      <span className="inline-flex flex-col items-start leading-snug max-w-full">
        <span
          className={`font-extrabold text-black ${
            isOneOrTwoWords ? 'whitespace-nowrap' : 'break-words'
          }`}
        >
          {mainTitle}
        </span>
        {parenPart && (
          <span className="text-[11px] sm:text-xs font-extrabold text-sky-900 block">
            {parenPart}
          </span>
        )}
      </span>
    );
  };

  // Search, Category Filter & View Layout Mode ('grid' = 2 per row on mobile, 'horizontal' = image on right + details beside it)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [storeLayoutMode, setStoreLayoutMode] = useState<'grid' | 'horizontal'>('grid');
  const [importNotice, setImportNotice] = useState<string>('');
  const [importRejectNotice, setImportRejectNotice] = useState<string>('');
  const [storePendingDelete, setStorePendingDelete] = useState<StoreListingItem | null>(null);
  const [isStoreShareMenuOpen, setIsStoreShareMenuOpen] = useState<boolean>(false);
  const [storeShareCopied, setStoreShareCopied] = useState<boolean>(false);

  const normalizeStoreNameForComparison = (raw: string): string => {
    return (raw || '')
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  const extractRealPhoneTokens = (rawPhone?: string): string[] => {
    if (!rawPhone) return [];
    return String(rawPhone)
      .split(/[-/,،|]+|\s+/)
      .map((part) => part.replace(/[^0-9]/g, ''))
      .map((digits) => (digits.startsWith('201') && digits.length === 12 ? digits.slice(1) : digits))
      .filter(
        (digits) =>
          digits.length >= 8 &&
          digits !== '01000000000' &&
          digits !== '1000000000' &&
          !/^0+$/.test(digits)
      );
  };

  const findSimilarRegisteredStore = (
    candidateName: string,
    candidatePhone?: string,
    excludeStoreId?: string
  ): StoreListingItem | undefined => {
    const normCandidate = normalizeStoreNameForComparison(candidateName);
    const candidatePhones = extractRealPhoneTokens(candidatePhone);
    if (!normCandidate && candidatePhones.length === 0) return undefined;
    return stores.find((s) => {
      if (excludeStoreId && s.id === excludeStoreId) return false;
      const normExisting = normalizeStoreNameForComparison(s.name);
      if (normCandidate && normExisting && normExisting === normCandidate) {
        return true;
      }
      if (candidatePhones.length > 0) {
        const existingPhones = extractRealPhoneTokens(s.phone);
        if (existingPhones.some((ep) => candidatePhones.includes(ep))) {
          return true;
        }
      }
      return false;
    });
  };

  // Deduplicate stores by Name AND Real Phone Numbers so duplicate stores never appear in public view, and collect duplicates for Admin modal
  const { uniqueStores, duplicateStoresEntries } = React.useMemo(() => {
    const seenNames = new Map<string, StoreListingItem>();
    const seenPhones = new Map<string, StoreListingItem>();
    const unique: StoreListingItem[] = [];
    const duplicates: Array<{
      duplicate: StoreListingItem;
      original: StoreListingItem;
      reason: string;
    }> = [];

    for (const st of stores) {
      if (!st) continue;
      const normName = normalizeStoreNameForComparison(st.name);
      const phoneTokens = extractRealPhoneTokens(st.phone);

      const matchedByName = normName ? seenNames.get(normName) : undefined;
      const matchedByPhone = phoneTokens
        .map((p) => seenPhones.get(p))
        .find((found) => Boolean(found));

      if (matchedByName && matchedByName.id !== st.id) {
        duplicates.push({
          duplicate: st,
          original: matchedByName,
          reason: 'تشابه في اسم المحل',
        });
        continue;
      }
      if (matchedByPhone && matchedByPhone.id !== st.id) {
        duplicates.push({
          duplicate: st,
          original: matchedByPhone,
          reason: `تشابه في رقم الهاتف (${st.phone})`,
        });
        continue;
      }

      unique.push(st);
      if (normName && !seenNames.has(normName)) {
        seenNames.set(normName, st);
      }
      phoneTokens.forEach((p) => {
        if (!seenPhones.has(p)) {
          seenPhones.set(p, st);
        }
      });
    }

    return { uniqueStores: unique, duplicateStoresEntries: duplicates };
  }, [stores]);

  // Ensure 'مول دريم بلازا' is always FIRST in storeCategories
  const allStoreCategories = [
    'مول دريم بلازا',
    ...Array.from(
      new Set(
        (settings.storeCategories || []).filter(
          (c) => Boolean(c) && c !== 'مول دريم بلازا'
        )
      )
    ),
  ];

  const STORE_SUB_TYPE_SUGGESTIONS = [
    'سوبر ماركت',
    'موبيل',
    'مطعم',
    'كافيه',
    'صيدلية',
    'ملابس وأحذية',
    'إلكترونيات وكمبيوتر',
    'أدوات منزلية',
    'مخبز وحلواني',
    'عطارة',
    'مكتبة',
    'كوافير وبيوتي سنتر',
    'مجوهرات وإكسسوارات',
    'بصريات ونظارات',
  ];

  // Add / Edit Store Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStoreObj, setEditingStoreObj] = useState<StoreListingItem | null>(null);
  const [storeCategory, setStoreCategory] = useState<string>(
    allStoreCategories[0] || 'سوبر ماركت'
  );
  const [storeSubCategory, setStoreSubCategory] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  const [storeLocationUrl, setStoreLocationUrl] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeDetails, setStoreDetails] = useState('');
  const [menuImages, setMenuImages] = useState<string[]>([]);
  const [selectedSuggestedVariant, setSelectedSuggestedVariant] = useState<1 | 2>(
    settings.defaultStoreSvgStyle || 1
  );
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  const openEditStoreModal = (target: StoreListingItem) => {
    if (!isStrictAdmin) return;
    setEditingStoreObj(target);
    setStoreCategory(target.category);
    setStoreSubCategory(target.subCategory || '');
    setStoreName(target.name);
    setStoreLocationUrl(target.locationUrl || '');
    setStorePhone(target.phone);
    setStoreDetails(getCleanStoreDetails(target));
    setMenuImages(target.menuImages || []);
    setUploadStatusMsg('');
    setIsAddModalOpen(true);
  };

  // Store Details Modal & Comments Pagination States
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [commentLimitStage, setCommentLimitStage] = useState<'initial_5' | 'expanded_15'>(
    'initial_5'
  );
  const [isAllCommentsSubModalOpen, setIsAllCommentsSubModalOpen] = useState(false);

  // Add Rating & Comment Form inside Store Details Modal (0 stars by default until user rates)
  const [newCommentRating, setNewCommentRating] = useState<number>(0);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [ratingOnlySavedNotice, setRatingOnlySavedNotice] = useState<string>('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyDraftText, setReplyDraftText] = useState<string>('');
  const [activeMenuPageIdx, setActiveMenuPageIdx] = useState<number>(0);
  const [menuPanOffsetX, setMenuPanOffsetX] = useState<number>(0);
  const [profanityWarning, setProfanityWarning] = useState<string>('');
  const [openStoreCommentMenuId, setOpenStoreCommentMenuId] = useState<string | null>(null);
  const [hiddenStoreCommentIds, setHiddenStoreCommentIds] = useState<string[]>([]);
  const [editingStoreCommentId, setEditingStoreCommentId] = useState<string | null>(null);
  const [editingStoreCommentText, setEditingStoreCommentText] = useState<string>('');

  useEffect(() => {
    if (!openStoreCommentMenuId) return;
    const handleDocClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && target.closest('[data-store-comment-menu="true"]')) {
        return;
      }
      setOpenStoreCommentMenuId(null);
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [openStoreCommentMenuId]);

  const [isDuplicateStoresModalOpen, setIsDuplicateStoresModalOpen] =
    useState(false);
  const [isStoreExcelPreviewModalOpen, setIsStoreExcelPreviewModalOpen] =
    useState(false);
  const [storeExcelPreviewItems, setStoreExcelPreviewItems] = useState<
    StoreListingItem[]
  >([]);
  const [expandedStoreExcelItemId, setExpandedStoreExcelItemId] = useState<
    string | null
  >(null);
  const [storeExcelForcedCategory, setStoreExcelForcedCategory] = useState<
    string | undefined
  >(undefined);

  const activeStore = stores.find((s) => s.id === activeStoreId) || null;
  const duplicateExistingStore = findSimilarRegisteredStore(
    storeName,
    storePhone,
    editingStoreObj?.id
  );

  // Open store automatically if shared link contains ?storeId=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const targetStoreId = params.get('storeId');
      if (targetStoreId && stores.some((s) => s.id === targetStoreId)) {
        setActiveStoreId(targetStoreId);
      }
    } catch {
      // ignore
    }
  }, [stores.length]);

  // Upload multiple menu images via ImgBB API (or compressed fallback)
  const handleMenuFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingMenu(true);
    setUploadStatusMsg('جاري رفع الصور عبر API التحميل...');
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const res = await uploadImageDynamic(fileList[i], settings.imgbbApiKey);
        uploadedUrls.push(res.url);
      }
      setMenuImages((prev) => {
        const cleanPrev = prev.filter(
          (img) => typeof img === 'string' && !img.startsWith('data:image/svg+xml')
        );
        const nextList = [...cleanPrev, ...uploadedUrls];
        if (editingStoreObj && onUpdateStore) {
          const cleanSubCat = storeSubCategory.trim();
          const updatedStore: StoreListingItem = {
            ...editingStoreObj,
            name: storeName.trim() || editingStoreObj.name,
            category: storeCategory || editingStoreObj.category,
            subCategory: cleanSubCat || undefined,
            locationUrl: storeLocationUrl.trim(),
            phone: storePhone.trim() || editingStoreObj.phone,
            whatsapp: (storePhone.trim() || editingStoreObj.phone).replace(/[^0-9]/g, ''),
            details: storeDetails.trim() || editingStoreObj.details,
            menuImages: nextList,
            updatedAt: Date.now(),
            imagesExplicitlyCleared: false,
          };
          setEditingStoreObj(updatedStore);
          onUpdateStore(updatedStore);
        }
        return nextList;
      });
      setUploadStatusMsg(`تم رفع وحفظ ${uploadedUrls.length} صورة بنجاح!`);
    } catch {
      setUploadStatusMsg('تعذر رفع بعض الصور، يرجى المحاولة مجدداً.');
    } finally {
      setUploadingMenu(false);
    }
  };

  // Submit New Store (Strict Admin Only for both Create & Edit)
  const handleCreateStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrictAdmin) return;
    if (!storeName.trim() || !storePhone.trim()) return;

    const existingDuplicate = findSimilarRegisteredStore(
      storeName,
      storePhone,
      editingStoreObj?.id
    );
    if (existingDuplicate) {
      return;
    }

    const cleanName = storeName.trim();
    const cleanStoreCategory = storeCategory.trim() || 'مول دريم بلازا';
    const [freshSuggested1, freshSuggested2] = createSuggestedStoreSvgPair(
      cleanName,
      cleanStoreCategory
    );
    const chosenDefaultSvg =
      selectedSuggestedVariant === 2 ? freshSuggested2 : freshSuggested1;

    const realUploadedImages = menuImages.filter(
      (img) => typeof img === 'string' && !img.startsWith('data:image/svg+xml')
    );
    const finalMenuImages =
      realUploadedImages.length > 0
        ? realUploadedImages
        : menuImages.length > 0
        ? menuImages.map((img) =>
            img.includes('#0F172A') || img.includes('%230F172A')
              ? freshSuggested2
              : freshSuggested1
          )
        : [chosenDefaultSvg];

    // في حالة تسجيل صيدلية أو غيره لا يُكتب "محل" إلا في حالة كتابة "محل" فقط
    const fallbackDetails =
      cleanName.includes('محل') || cleanStoreCategory.includes('محل')
        ? 'محل مسجل بالدليل التجاري'
        : '';

    const cleanSubCat = storeSubCategory.trim();

    if (editingStoreObj && onUpdateStore) {
      onUpdateStore({
        ...editingStoreObj,
        name: cleanName,
        category: cleanStoreCategory,
        subCategory: cleanSubCat || undefined,
        locationUrl: storeLocationUrl.trim(),
        phone: storePhone.trim(),
        whatsapp: storePhone.trim().replace(/[^0-9]/g, ''),
        details: storeDetails.trim() || fallbackDetails,
        menuImages: finalMenuImages,
        updatedAt: Date.now(),
        imagesExplicitlyCleared: realUploadedImages.length === 0,
      });
    } else {
      const newStore: StoreListingItem = {
        id: `st-${Date.now()}`,
        ownerId: currentUser?.id || 'guest',
        ownerUsername: currentUser?.username || 'زائر',
        name: cleanName,
        category: cleanStoreCategory,
        subCategory: cleanSubCat || undefined,
        locationUrl: storeLocationUrl.trim(),
        phone: storePhone.trim(),
        whatsapp: storePhone.trim().replace(/[^0-9]/g, ''),
        details: storeDetails.trim() || fallbackDetails,
        menuImages: finalMenuImages,
        likes: [],
        dislikes: [],
        ratings: {},
        ratingsResetV2: true,
        comments: [],
        approved: true,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        imagesExplicitlyCleared: realUploadedImages.length === 0,
      };
      onAddStore(newStore);
    }

    setEditingStoreObj(null);
    setStoreSubCategory('');
    setStoreName('');
    setStoreLocationUrl('');
    setStorePhone('');
    setStoreDetails('');
    setMenuImages([]);
    setUploadStatusMsg('');
    setIsAddModalOpen(false);
  };

  // Excel & PDF Store Import Handlers (Opens Preview Modal first on Excel upload)
  const handleExcelImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetCategoryOnly?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const forcedCat =
      targetCategoryOnly ||
      (selectedCategory !== 'all' ? selectedCategory : undefined);
    try {
      const imported = await parseStoresFromExcelFile(
        file,
        currentUser?.username || 'admin',
        currentUser?.id || 'usr-admin-1',
        settings.storeCategories,
        forcedCat
      );
      if (imported.length > 0) {
        setStoreExcelForcedCategory(targetCategoryOnly);
        setStoreExcelPreviewItems(imported);
        setExpandedStoreExcelItemId(null);
        setIsStoreExcelPreviewModalOpen(true);
      } else {
        setImportNotice('لم يتم العثور على بيانات محلات صالحة داخل ملف الإكسيل.');
      }
    } catch {
      setImportNotice('تعذر قراءة ملف الإكسيل، تأكد من صحة الملف.');
    }
    e.target.value = '';
  };

  const handleConfirmStoreExcelPreviewImport = () => {
    const validItems = storeExcelPreviewItems.filter(
      (item) => item.name.trim().length > 0
    );
    if (validItems.length === 0) {
      setIsStoreExcelPreviewModalOpen(false);
      return;
    }

    const existingNormSet = new Set(
      stores.map((s) => normalizeStoreNameForComparison(s.name)).filter(Boolean)
    );
    const existingPhoneSet = new Set(
      stores.flatMap((s) => extractRealPhoneTokens(s.phone))
    );

    const acceptedStores: StoreListingItem[] = [];
    const rejectedDuplicateNames: string[] = [];

    validItems.forEach((item) => {
      const norm = normalizeStoreNameForComparison(item.name);
      if (!norm) return;
      const itemPhones = extractRealPhoneTokens(item.phone);
      const hasDuplicatePhone = itemPhones.some((p) => existingPhoneSet.has(p));

      if (existingNormSet.has(norm) || hasDuplicatePhone) {
        rejectedDuplicateNames.push(item.name.trim());
      } else {
        existingNormSet.add(norm);
        itemPhones.forEach((p) => existingPhoneSet.add(p));
        acceptedStores.push({
          ...item,
          name: item.name.trim(),
          category: item.category.trim() || 'مول دريم بلازا',
          phone: item.phone.trim() || '01000000000',
          whatsapp:
            item.phone
              .trim()
              .split('-')[0]
              .replace(/[^0-9]/g, '') || '01000000000',
          updatedAt: Date.now(),
        });
      }
    });

    if (acceptedStores.length > 0) {
      onImportStoresBatch(acceptedStores);
      setImportNotice(
        storeExcelForcedCategory
          ? `تم إدخال ${acceptedStores.length} عنصر من ملف الإكسيل في قسم (${storeExcelForcedCategory}) بنجاح!`
          : `تم استيراد وتسجيل ${acceptedStores.length} عنصر من ملف الإكسيل بنجاح!`
      );
      setTimeout(() => setImportNotice(''), 6000);
      if (storeExcelForcedCategory) {
        setSelectedCategory(storeExcelForcedCategory);
      }
      setIsAddModalOpen(false);
    }

    if (rejectedDuplicateNames.length > 0) {
      setImportRejectNotice(
        `تم رفض محل (${rejectedDuplicateNames.join(' و ')}) لأنه مضاف من قبل`
      );
    } else {
      setImportRejectNotice('');
    }

    setIsStoreExcelPreviewModalOpen(false);
    setStoreExcelPreviewItems([]);
    setExpandedStoreExcelItemId(null);
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const forcedCat = selectedCategory !== 'all' ? selectedCategory : undefined;
    try {
      const imported = await parseStoresFromPDFFile(
        file,
        currentUser?.username || 'admin',
        currentUser?.id || 'usr-admin-1',
        settings.storeCategories,
        forcedCat
      );
      if (imported.length > 0) {
        const existingNormSet = new Set(
          stores
            .map((s) => normalizeStoreNameForComparison(s.name))
            .filter(Boolean)
        );
        const acceptedStores: StoreListingItem[] = [];
        const rejectedDuplicateNames: string[] = [];

        imported.forEach((item) => {
          const norm = normalizeStoreNameForComparison(item.name);
          if (!norm) return;
          if (existingNormSet.has(norm)) {
            rejectedDuplicateNames.push(item.name.trim());
          } else {
            existingNormSet.add(norm);
            acceptedStores.push(item);
          }
        });

        if (acceptedStores.length > 0) {
          onImportStoresBatch(acceptedStores);
          setImportNotice(`تم استخراج وتسجيل ${acceptedStores.length} عنصر من ملف PDF بنجاح!`);
          setTimeout(() => setImportNotice(''), 6000);
        }
        if (rejectedDuplicateNames.length > 0) {
          setImportRejectNotice(
            `تم رفض محل (${rejectedDuplicateNames.join(' و ')}) لأنه مضاف من قبل`
          );
        }
      }
    } catch {
      setImportNotice('تعذر استخراج البيانات من ملف PDF.');
    }
    e.target.value = '';
  };

  // Download Menu Image
  const handleDownloadMenuImage = (imageUrl: string, storeTitle: string, pageNum: number) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `Menu_${storeTitle}_Page_${pageNum}.png`;
    a.click();
  };

  // Calculate average star rating of a store (0 by default until rated by users)
  const getStoreRatingSummary = (store: StoreListingItem) => {
    const ratingValues = Object.values(store.ratings || {}).filter(
      (v) => typeof v === 'number' && v > 0
    );
    const commentRatings = (store.comments || [])
      .map((c) => c.rating)
      .filter((r) => typeof r === 'number' && r > 0);
    const allRatings = [...ratingValues, ...commentRatings];
    if (allRatings.length === 0) return { avg: 0, count: 0 };
    const sum = allRatings.reduce((a, b) => a + b, 0);
    return {
      avg: Number((sum / allRatings.length).toFixed(1)),
      count: allRatings.length,
    };
  };

  // Filter uniqueStores by search & category (using normalized string comparison so trailing spaces never hide stores and duplicates are excluded)
  const normalizedSelectedCat = normalizeCategoryString(selectedCategory);
  const filteredStores = uniqueStores.filter((s) => {
    if (!s) return false;
    const matchesCategory =
      selectedCategory === 'all' ||
      normalizeCategoryString(s.category) === normalizedSelectedCat;
    const q = searchQuery.trim().toLowerCase();
    const sName = String(s.name || '').toLowerCase();
    const sSub = String(s.subCategory || '').toLowerCase();
    const sCat = String(s.category || '').toLowerCase();
    const sDet = String(s.details || '').toLowerCase();
    const sPhone = String(s.phone || '');
    const matchesSearch =
      !q ||
      sName.includes(q) ||
      sSub.includes(q) ||
      sCat.includes(q) ||
      sDet.includes(q) ||
      sPhone.includes(q);
    return matchesCategory && matchesSearch;
  });

  // Render single comment item (White background & black text for high visibility inside light modal)
  const renderCommentBlock = (store: StoreListingItem, comment: StoreCommentItem) => {
    if (hiddenStoreCommentIds.includes(comment.id)) {
      return (
        <div
          key={comment.id}
          className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-between text-xs text-slate-600"
        >
          <span>تم إخفاء هذا التعليق</span>
          <button
            type="button"
            onClick={() =>
              setHiddenStoreCommentIds((prev) => prev.filter((id) => id !== comment.id))
            }
            className="text-sky-700 font-extrabold hover:underline cursor-pointer"
          >
            إظهار
          </button>
        </div>
      );
    }

    const hasLikedComment = comment.likes.includes(currentVisitorId);
    const isReplyingHere = replyingToCommentId === comment.id;
    const isMenuOpen = openStoreCommentMenuId === comment.id;
    const isEditingThis = editingStoreCommentId === comment.id;
    const canManageStoreComment = Boolean(
      isStrictAdmin ||
        (currentUser &&
          (store.ownerId === currentUser.id ||
            store.ownerUsername === currentUser.username ||
            comment.authorUsername === currentUser.username))
    );

    return (
      <div
        key={comment.id}
        className="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-2 text-black relative"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-black">
                {comment.authorUsername}
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < comment.rating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-[10px] font-semibold text-slate-600">
              {new Date(comment.createdAt).toLocaleString('ar-EG')}
            </div>
          </div>

          {/* 3-Dots Dropdown Menu (تعديل، حذف، إبلاغ، نسخ، إخفاء) */}
          <div className="relative" data-store-comment-menu="true">
            <button
              type="button"
              onClick={() =>
                setOpenStoreCommentMenuId((prev) =>
                  prev === comment.id ? null : comment.id
                )
              }
              title="خيارات التعليق"
              className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 cursor-pointer transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-40 rounded-xl bg-[#0A192F] border border-sky-400/60 shadow-2xl z-50 py-1 space-y-0.5 text-white">
                {canManageStoreComment && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStoreCommentId(comment.id);
                      setEditingStoreCommentText(comment.text);
                      setOpenStoreCommentMenuId(null);
                    }}
                    className="w-full px-3 py-1.5 text-right hover:bg-[#1E293B] text-sky-300 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>تعديل</span>
                  </button>
                )}

                {canManageStoreComment && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteStoreComment(store.id, comment.id);
                      setOpenStoreCommentMenuId(null);
                    }}
                    className="w-full px-3 py-1.5 text-right hover:bg-rose-600/20 text-rose-400 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>حذف</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOpenStoreCommentMenuId(null);
                    setRatingOnlySavedNotice('تم إرسال إبلاغ عن التعليق إلى الإدارة.');
                    setTimeout(() => setRatingOnlySavedNotice(''), 3000);
                  }}
                  className="w-full px-3 py-1.5 text-right hover:bg-[#1E293B] text-amber-300 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span>إبلاغ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(comment.text).catch(() => {});
                    setOpenStoreCommentMenuId(null);
                    setRatingOnlySavedNotice('تم نسخ نص التعليق بنجاح.');
                    setTimeout(() => setRatingOnlySavedNotice(''), 2500);
                  }}
                  className="w-full px-3 py-1.5 text-right hover:bg-[#1E293B] text-[#F8FAFC] text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>نسخ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHiddenStoreCommentIds((prev) => [...prev, comment.id]);
                    setOpenStoreCommentMenuId(null);
                  }}
                  className="w-full px-3 py-1.5 text-right hover:bg-[#1E293B] text-[#94A3B8] hover:text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span>إخفاء</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditingThis ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={editingStoreCommentText}
              onChange={(e) => setEditingStoreCommentText(e.target.value)}
              className="flex-1 rounded-lg bg-white border border-sky-500 px-3 py-1.5 text-xs text-black outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = editingStoreCommentText.trim();
                if (!trimmed) return;
                const updatedStore: StoreListingItem = {
                  ...store,
                  comments: store.comments.map((c) =>
                    c.id === comment.id ? { ...c, text: trimmed } : c
                  ),
                  updatedAt: Date.now(),
                };
                onUpdateStore?.(updatedStore);
                setEditingStoreCommentId(null);
                setEditingStoreCommentText('');
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-extrabold cursor-pointer"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingStoreCommentId(null);
                setEditingStoreCommentText('');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-bold text-black leading-relaxed">
            {comment.text}
          </p>
        )}

        {/* Comment Actions: Like & Reply */}
        <div className="flex items-center gap-4 pt-1 text-xs">
          <button
            type="button"
            onClick={() => onToggleCommentLike(store.id, comment.id)}
            className={`inline-flex items-center gap-1 font-extrabold cursor-pointer transition-colors ${
              hasLikedComment ? 'text-blue-600' : 'text-slate-700 hover:text-black'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>لايك ({comment.likes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setReplyingToCommentId(isReplyingHere ? null : comment.id);
              setReplyDraftText('');
            }}
            className="inline-flex items-center gap-1 font-extrabold text-sky-700 hover:text-sky-900 cursor-pointer"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>رد ({comment.replies.length})</span>
          </button>
        </div>

        {/* Nested Replies List */}
        {comment.replies.length > 0 && (
          <div className="mr-4 pr-3 border-r-2 border-slate-300 space-y-2 pt-1">
            {comment.replies.map((rep) => (
              <div
                key={rep.id}
                className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1 text-black"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-black">{rep.authorUsername}</span>
                  <span className="text-[10px] font-semibold text-slate-600">
                    {new Date(rep.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="font-bold text-black">{rep.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reply Input Box */}
        {isReplyingHere && (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={replyDraftText}
              onChange={(e) => setReplyDraftText(e.target.value)}
              placeholder={`اكتب رداً على ${comment.authorUsername}...`}
              className="flex-1 rounded-lg bg-white border-2 border-slate-300 focus:border-sky-600 px-3 py-1.5 text-xs text-black font-bold outline-none"
            />
            <FluentButton
              variant="primary"
              size="sm"
              onClick={() => {
                if (!replyDraftText.trim()) return;
                if (containsAbusiveWords(replyDraftText)) {
                  setProfanityWarning(ABUSIVE_CONTENT_WARNING_MESSAGE);
                  return;
                }
                setProfanityWarning('');
                onAddCommentReply(store.id, comment.id, {
                  id: `rep-${Date.now()}`,
                  authorId: currentVisitorId,
                  authorUsername: currentUser?.username || 'زائر',
                  text: replyDraftText.trim(),
                  likes: [],
                  createdAt: new Date().toISOString(),
                });
                setReplyDraftText('');
                setReplyingToCommentId(null);
              }}
            >
              إرسال الرد
            </FluentButton>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* 1. Top Action Bar: "أضف منتج / الدليل التجاري" + Button on 1 line + Admin/Moderator Excel/PDF Import & Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#112240]/95 border border-[#334155] rounded-2xl p-3.5 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-nowrap w-full lg:w-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-sm sm:text-xl font-extrabold text-[#F8FAFC] truncate">
              أضف منتج / الدليل التجاري
            </h1>
          </div>

          {/* Primary Buttons right beside the title on the same line (Strict Admin Only) */}
          {isStrictAdmin && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <FluentButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingStoreObj(null);
                  setStoreCategory(
                    selectedCategory !== 'all'
                      ? selectedCategory
                      : allStoreCategories[0] || 'سوبر ماركت'
                  );
                  setStoreSubCategory('');
                  setIsAddModalOpen(true);
                }}
                className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>أضف منتج / محل</span>
              </FluentButton>

              <button
                type="button"
                onClick={() => setIsDuplicateStoresModalOpen(true)}
                className="fluent-reveal inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 text-xs sm:text-sm font-extrabold cursor-pointer shrink-0 whitespace-nowrap shadow"
                title="عرض المحلات المكررة للتعديل أو الحذف النهائي"
              >
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                <span>المحلات المكررة ({duplicateStoresEntries.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Import & Export Toolbar + Unified Store Image Style Selector (Strict Admin Only for Import/Style) */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {isStrictAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSuggestedVariant(1);
                    setGlobalDefaultStoreSvgStyle(1);
                    onGeneralizeStoreImageStyle?.(1);
                    setImportNotice(
                      'تم تعميم الشكل (1) الأساسي كواجهة رئيسية لجميع المحلات بنجاح!'
                    );
                  }}
                  className={`fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer transition-all ${
                    (settings.defaultStoreSvgStyle || 1) === 1
                      ? 'bg-sky-600 text-white border-sky-400 shadow'
                      : 'bg-[#1E293B] hover:bg-[#334155] text-sky-300 border-sky-500/40'
                  }`}
                  title="اختيار الصورة الأساسية (الشكل 1) وتعميم جميع المحلات بنفس الشكل"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>الصورة الأساسية (1) للكل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSuggestedVariant(2);
                    setGlobalDefaultStoreSvgStyle(2);
                    onGeneralizeStoreImageStyle?.(2);
                    setImportNotice(
                      'تم تعميم الشكل (2) الثاني كواجهة رئيسية لجميع المحلات بنجاح!'
                    );
                  }}
                  className={`fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-extrabold border cursor-pointer transition-all ${
                    settings.defaultStoreSvgStyle === 2
                      ? 'bg-sky-600 text-white border-sky-400 shadow'
                      : 'bg-[#1E293B] hover:bg-[#334155] text-sky-300 border-sky-500/40'
                  }`}
                  title="اختيار الصورة الثانية (الشكل 2) وتعميم جميع المحلات بنفس الشكل"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>الصورة الثانية (2) للكل</span>
                </button>

                {/* أضف إكسيل */}
                <label className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-bold text-emerald-300 border border-emerald-500/40 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>أضف إكسيل</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelImport}
                    className="hidden"
                  />
                </label>

                {/* أضف PDF */}
                <label className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-bold text-sky-300 border border-sky-500/40 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>أضف PDF</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFImport}
                    className="hidden"
                  />
                </label>
              </>
            )}

            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportStoresToExcel(filteredStores)}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>تصدير إكسيل</span>
            </FluentButton>

            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportStoresToPDF(filteredStores)}
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>تصدير PDF</span>
            </FluentButton>
          </div>
        )}
      </div>

      {importNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotice('')}
            className="text-[11px] underline cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {importRejectNotice && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border-2 border-rose-400 text-rose-200 text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importRejectNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportRejectNotice('')}
            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 3. Instant Search Bar & Category Filter Dropdown + Single-Row (الكل + شبكي + عرضي) on Mobile */}
      <div className="bg-[#112240]/80 border border-[#334155] rounded-2xl p-3 sm:p-4 space-y-2.5 overflow-x-hidden">
        <div className="flex flex-row items-center gap-2 sm:gap-3 flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0 flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-sky-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  selectedCategory === 'مول دريم بلازا'
                    ? 'ابحث في مول دريم بلازا عن محل (سوبر ماركت، موبيل، مطعم...)...'
                    : 'ابحث بالاسم أو نوع المحل أو القسم أو الرقم...'
                }
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-9 pl-2.5 py-2 sm:py-2.5 text-xs sm:text-sm text-[#F8FAFC] outline-none"
              />
            </div>
          </div>

          {/* Category Dropdown Filter beside Search in 1 line */}
          <div className="flex items-center gap-1.5 shrink-0 w-[135px] sm:w-56">
            <Filter className="w-4 h-4 text-sky-400 shrink-0 hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-[#F8FAFC] font-bold outline-none"
            >
              <option value="all">جميع الأقسام ({stores.length})</option>
              {allStoreCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} (
                  {
                    stores.filter(
                      (s) =>
                        s &&
                        normalizeCategoryString(s.category) ===
                          normalizeCategoryString(cat)
                    ).length
                  }
                  )
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* في نسخة الهاتف: يظهر زر الكل و شبكي و عرضي في سطر واحد بدون مسطرة أفقية */}
        <div className="grid grid-cols-3 sm:flex sm:items-center sm:justify-between gap-1.5 sm:gap-2 pt-0.5 w-full overflow-x-hidden">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`fluent-reveal px-2 sm:px-4 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer transition-all ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            <span>الكل ({stores.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStoreLayoutMode('grid')}
            className={`fluent-reveal px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer transition-all ${
              storeLayoutMode === 'grid'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>شبكي</span>
          </button>

          <button
            type="button"
            onClick={() => setStoreLayoutMode('horizontal')}
            className={`fluent-reveal px-2 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer transition-all ${
              storeLayoutMode === 'horizontal'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5 shrink-0" />
            <span>عرضي</span>
          </button>
        </div>
      </div>

      {/* Store Cards: White background + Black text + Single-line (Like + Dislike + Views) */}
      {filteredStores.length === 0 ? (
        <FluentCard className="p-12 text-center space-y-3">
          <Store className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
          <div className="text-base font-bold text-[#F8FAFC]">
            لا توجد عناصر مطابقة لبحثك في هذا القسم حالياً
          </div>
          {isStrictAdmin && (
            <p className="text-xs text-[#94A3B8]">
              اضغط على زر &quot;أضف منتج / محل&quot; بالأعلى للإضافة في هذا القسم
            </p>
          )}
        </FluentCard>
      ) : storeLayoutMode === 'horizontal' ? (
        /* ================= HORIZONTAL VIEW: خلفية بيضاء وخط أسود واضح ================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {filteredStores.map((store, storeIdx) => {
            const firstMenuPhoto = getStoreCoverPhoto(store);
            const isLiked = store.likes.includes(currentVisitorId);
            const isDisliked = store.dislikes.includes(currentVisitorId);
            const ratingInfo = getStoreRatingSummary(store);
            const cleanDetails = getCleanStoreDetails(store);
            const isPermanentStore = isPermanentDreamPlazaStore(store);

            return (
              <div
                key={store.id || `store-horiz-${storeIdx}`}
                onClick={() => {
                  onIncrementStoreViews?.(store.id);
                  setActiveStoreId(store.id);
                  setNewCommentRating(0);
                  setCommentLimitStage('initial_5');
                  setIsAllCommentsSubModalOpen(false);
                  setActiveMenuPageIdx(0);
                  setMenuPanOffsetX(0);
                  setRatingOnlySavedNotice('');
                }}
                className="fluent-reveal group rounded-2xl bg-white text-black border-2 border-slate-300 hover:border-sky-500 overflow-hidden flex flex-row items-stretch cursor-pointer shadow-lg transition-all"
              >
                {/* Right Side (RTL First Child): الصورة على اليمين */}
                <div className="relative w-28 sm:w-40 shrink-0 bg-white border-l border-slate-200 overflow-hidden flex items-center justify-center">
                  <img
                    src={firstMenuPhoto}
                    alt={store.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/95 border border-amber-400 text-black font-mono-tabular text-[10px] font-extrabold flex items-center gap-0.5 shadow-sm">
                    <Star
                      className={`w-2.5 h-2.5 ${
                        ratingInfo.count > 0
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-400'
                      }`}
                    />
                    {ratingInfo.avg}
                  </span>

                  {/* Strict Admin Only Edit & Delete quick icons on image corner */}
                  {isStrictAdmin && (
                    <div
                      className="absolute bottom-1.5 right-1.5 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditStoreModal(store)}
                        title="تعديل (Admin فقط)"
                        className="p-1 rounded-md bg-white/95 hover:bg-sky-600 text-sky-700 hover:text-white border border-slate-300 shadow cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {!isPermanentStore && (
                        <button
                          type="button"
                          onClick={() => setStorePendingDelete(store)}
                          title="حذف (Admin فقط)"
                          className="p-1 rounded-md bg-white/95 hover:bg-rose-600 text-rose-600 hover:text-white border border-slate-300 shadow cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Left Side (RTL Second Child): الاسم المسجل والتفاصيل بخط أسود */}
                <div className="p-2.5 sm:p-4 flex-1 min-w-0 flex flex-col justify-between space-y-2 relative z-10 bg-white text-black">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-xs sm:text-base font-extrabold text-black leading-snug min-w-0">
                        {renderFormattedStoreName(store.name)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-black text-[10px] font-extrabold">
                          {store.category}
                        </span>
                        {store.subCategory && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-300 text-sky-900 text-[10px] font-extrabold">
                            {store.subCategory}
                          </span>
                        )}
                      </div>
                    </div>
                    {cleanDetails && (
                      <p className="text-[11px] sm:text-xs text-slate-800 font-semibold line-clamp-2 leading-relaxed">
                        {cleanDetails}
                      </p>
                    )}
                  </div>

                  {/* زر لايك و ديس لايك وعدد المشاهدات في سطر واحد */}
                  <div
                    className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 flex-nowrap w-full overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleStoreLike(store.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 border cursor-pointer shrink-0 ${
                        isLiked
                          ? 'bg-[#1877F2] text-white border-[#1877F2]'
                          : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-300'
                      }`}
                    >
                      <span>👍</span>
                      <span className="font-mono-tabular">{store.likes.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleStoreDislike(store.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 border cursor-pointer shrink-0 ${
                        isDisliked
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-300'
                      }`}
                    >
                      <span>👎</span>
                      <span className="font-mono-tabular">{store.dislikes.length}</span>
                    </button>

                    <span
                      title="عدد المشاهدات"
                      className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[10px] sm:text-xs font-extrabold text-black flex items-center justify-center gap-1 font-mono-tabular shrink-0"
                    >
                      <Eye className="w-3 h-3 text-sky-700 shrink-0" />
                      <span>{store.viewsCount || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= GRID VIEW: يظهر في نسخة الهاتف 2 بجانب بعض بخلفية بيضاء وخط أسود ================= */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
          {filteredStores.map((store, storeIdx) => {
            const firstMenuPhoto = getStoreCoverPhoto(store);
            const isLiked = store.likes.includes(currentVisitorId);
            const isDisliked = store.dislikes.includes(currentVisitorId);
            const ratingInfo = getStoreRatingSummary(store);
            const cleanDetails = getCleanStoreDetails(store);
            const isPermanentStore = isPermanentDreamPlazaStore(store);

            return (
              <div
                key={store.id || `store-grid-${storeIdx}`}
                onClick={() => {
                  onIncrementStoreViews?.(store.id);
                  setActiveStoreId(store.id);
                  setNewCommentRating(0);
                  setCommentLimitStage('initial_5');
                  setIsAllCommentsSubModalOpen(false);
                  setActiveMenuPageIdx(0);
                  setMenuPanOffsetX(0);
                  setRatingOnlySavedNotice('');
                }}
                className="fluent-reveal group rounded-2xl bg-white text-black border-2 border-slate-300 hover:border-sky-500 overflow-hidden flex flex-col justify-between cursor-pointer shadow-lg transition-all"
              >
                {/* Top Square Image */}
                <div className="relative w-full aspect-square bg-white border-b border-slate-200 overflow-hidden">
                  <img
                    src={firstMenuPhoto}
                    alt={store.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Category & Star Rating Overlay */}
                  <div className="absolute top-1.5 right-1.5 left-1.5 sm:top-2.5 sm:right-2.5 sm:left-2.5 flex items-center justify-between text-[10px] sm:text-xs gap-1">
                    <span className="px-1.5 sm:px-2.5 py-0.5 rounded-lg bg-white/95 border border-slate-300 text-black font-extrabold truncate shadow-sm">
                      {store.category}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/95 border border-amber-400 text-black font-mono-tabular font-extrabold flex items-center gap-0.5 shrink-0 shadow-sm">
                      <Star
                        className={`w-3 h-3 ${
                          ratingInfo.count > 0
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-400'
                        }`}
                      />
                      {ratingInfo.avg}
                    </span>
                  </div>

                  {store.menuImages.length > 1 && (
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-white/95 border border-slate-300 text-[10px] font-extrabold text-black shadow-sm">
                      صور ({store.menuImages.length})
                    </div>
                  )}

                  {/* Strict Admin Only Edit & Delete quick icons on image bottom-right */}
                  {isStrictAdmin && (
                    <div
                      className="absolute bottom-1.5 right-1.5 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditStoreModal(store)}
                        title="تعديل (Admin فقط)"
                        className="p-1 rounded-md bg-white/95 hover:bg-sky-600 text-sky-700 hover:text-white border border-slate-300 shadow cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {!isPermanentStore && (
                        <button
                          type="button"
                          onClick={() => setStorePendingDelete(store)}
                          title="حذف (Admin فقط)"
                          className="p-1 rounded-md bg-white/95 hover:bg-rose-600 text-rose-600 hover:text-white border border-slate-300 shadow cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Store Registered Name & Optional Details (White background + Black text) */}
                <div className="p-2 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2 bg-white text-black relative z-10">
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-base font-extrabold text-black leading-snug">
                      {renderFormattedStoreName(store.name)}
                    </h3>
                    {store.subCategory && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 border border-sky-300 text-sky-900 text-[10px] font-extrabold">
                        {store.subCategory}
                      </span>
                    )}
                    {cleanDetails && (
                      <p className="text-[10px] sm:text-xs text-slate-800 font-semibold line-clamp-2 leading-relaxed">
                        {cleanDetails}
                      </p>
                    )}
                  </div>

                  {/* في كل منتج مسجل: زر لايك و ديس لايك وعدد المشاهدات في سطر واحد */}
                  <div
                    className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 flex-nowrap w-full overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Like 👍 */}
                    <button
                      type="button"
                      onClick={() => onToggleStoreLike(store.id)}
                      className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-0.5 sm:gap-1 border transition-all cursor-pointer shrink-0 ${
                        isLiked
                          ? 'bg-[#1877F2] text-white border-[#1877F2]'
                          : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs leading-none">👍</span>
                      <span className="font-mono-tabular">{store.likes.length}</span>
                    </button>

                    {/* Dislike 👎 */}
                    <button
                      type="button"
                      onClick={() => onToggleStoreDislike(store.id)}
                      className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-0.5 sm:gap-1 border transition-all cursor-pointer shrink-0 ${
                        isDisliked
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs leading-none">👎</span>
                      <span className="font-mono-tabular">{store.dislikes.length}</span>
                    </button>

                    {/* Views Counter 👁️ */}
                    <span
                      title="عدد المشاهدات لجميع المستخدمين"
                      className="px-1.5 sm:px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[10px] sm:text-xs font-extrabold text-black flex items-center justify-center gap-0.5 sm:gap-1 font-mono-tabular shrink-0"
                    >
                      <Eye className="w-3 h-3 text-sky-700 shrink-0" />
                      <span>{store.viewsCount || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 1. ADD / EDIT STORE MODAL (WHITE BACKGROUND + BLACK TEXT) ================= */}
      <FluentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStoreObj(null);
        }}
        title={editingStoreObj ? `تعديل البيانات: ${editingStoreObj.name}` : 'إضافة جديد إلى الدليل'}
        subtitle="اختر القسم وأدخل الاسم والبيانات وارفع الصور ليظهر فوراً لجميع الزوار"
        maxWidth="2xl"
        theme="light"
      >
        <form onSubmit={handleCreateStoreSubmit} className="space-y-4 text-black">
          {/* Dynamic Category Dropdown + Excel Button for Selected Category Only */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border-2 border-emerald-300 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-black mb-1.5">
                  اختر القسم *
                </label>
                <select
                  value={storeCategory}
                  onChange={(e) => setStoreCategory(e.target.value)}
                  className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-extrabold outline-none"
                >
                  {allStoreCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-black mb-1.5">
                  تحديد نوع المحل (مثال: سوبر ماركت، موبيل، مطعم...)
                </label>
                <div className="space-y-1.5">
                  <select
                    value={
                      STORE_SUB_TYPE_SUGGESTIONS.includes(storeSubCategory)
                        ? storeSubCategory
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setStoreSubCategory(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3 py-2 text-xs text-black font-extrabold outline-none"
                  >
                    <option value="">-- اختر نوع المحل أو اكتبه بالأسفل --</option>
                    {STORE_SUB_TYPE_SUGGESTIONS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={storeSubCategory}
                    onChange={(e) => setStoreSubCategory(e.target.value)}
                    placeholder="أو اكتب نوع المحل هنا (سوبر ماركت / موبيل / ملابس...)"
                    className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3 py-2 text-xs text-black font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] font-extrabold text-emerald-950">
                زر تصدير إكسيل للقسم المختار ({storeCategory}) فقط دون توزيع البيانات في أي قسم آخر:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="fluent-reveal inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shadow-sm">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير إكسيل (إدخال في قسم {storeCategory} فقط)</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleExcelImport(e, storeCategory)}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    exportStoresToExcel(
                      stores.filter(
                        (s) =>
                          s &&
                          normalizeCategoryString(s.category) ===
                            normalizeCategoryString(storeCategory)
                      )
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-400 text-xs font-extrabold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل إكسيل ({storeCategory})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Store Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-black mb-1.5">
                الاسم المسجل (مثال: صيدلية الشفاء / عيادة النور / محل...) *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="اكتب الاسم كما تريد ظهوره بالضبط..."
                className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-bold outline-none"
              />
              {duplicateExistingStore && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border-2 border-rose-400 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-rose-800">
                    هذا المحل مسجل بالفعل باسم: &quot;{duplicateExistingStore.name}&quot;
                  </span>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-extrabold shrink-0 cursor-not-allowed shadow"
                  >
                    مسجل من قبل
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-black mb-1.5">
                رقم الهاتف *
              </label>
              <input
                type="tel"
                required
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-bold font-mono-tabular outline-none"
              />
            </div>
          </div>

          {/* Store Location Google Maps Link */}
          <div>
            <label className="block text-xs font-extrabold text-black mb-1.5">
              اللوكيشن (رابط خرائط جوجل Google Maps — اختياري)
            </label>
            <input
              type="url"
              value={storeLocationUrl}
              onChange={(e) => setStoreLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-bold font-mono-tabular outline-none"
            />
          </div>

          {/* Store Details */}
          <div>
            <label className="block text-xs font-extrabold text-black mb-1.5">
              التفاصيل والعنوان ومواعيد العمل
            </label>
            <textarea
              rows={3}
              value={storeDetails}
              onChange={(e) => setStoreDetails(e.target.value)}
              placeholder="اكتب التفاصيل والخدمات والعروض المتاحة..."
              className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 p-3.5 text-black font-bold outline-none"
            />
          </div>

          {/* Store Menu Image Upload via ImgBB API */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-extrabold text-black">
                  الصور / المنيو (رفع الصور عبر API التحميل)
                </label>
                <p className="text-[11px] font-semibold text-slate-700">
                  تظهر الصورة الأولى كواجهة رئيسية واضحة في البطاقة ولوحة الإعلانات والخصومات
                </p>
              </div>

              <label className="fluent-reveal inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploadingMenu ? 'جاري الرفع...' : 'اختر الصور'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMenuFilesUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadStatusMsg && (
              <div className="text-xs text-emerald-700 font-extrabold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>{uploadStatusMsg}</span>
              </div>
            )}

            {/* صورتان مقترحتان منسقتان باسم المحل والقسم (ولو في أقواس يكون اسم المحل في الأول وأسفله الأقواس) */}
            {(() => {
              const previewName = storeName.trim() || 'اسم المحل (الأقواس)';
              const previewCat = storeCategory.trim() || 'مول دريم بلازا';
              const [suggestedImg1, suggestedImg2] = createSuggestedStoreSvgPair(
                previewName,
                previewCat
              );
              const suggestedPair = [
                {
                  variant: 1 as const,
                  label: 'صورة مقترحة (1) — تصميم كلاسيكي فاتح منسق',
                  url: suggestedImg1,
                },
                {
                  variant: 2 as const,
                  label: 'صورة مقترحة (2) — تصميم ملكي داكن منسق',
                  url: suggestedImg2,
                },
              ];

              return (
                <div className="p-3 rounded-xl bg-white border-2 border-sky-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-sky-900">
                      صور مقترحة للمحل (2 صورة مقترحة منسقة باسم المحل والقسم — ولو في أقواس يظهر اسم المحل بالأعلى وأسفله الأقواس):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuImages((prev) => {
                          const realOnly = prev.filter(
                            (x) => !x.startsWith('data:image/svg+xml')
                          );
                          return [...realOnly, suggestedImg1, suggestedImg2];
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 text-[11px] font-extrabold cursor-pointer transition-colors"
                    >
                      إضافة الصورتين المقترحتين معاً
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {suggestedPair.map((sug) => {
                      const isSelected = selectedSuggestedVariant === sug.variant;
                      return (
                        <div
                          key={sug.variant}
                          onClick={() => {
                            setSelectedSuggestedVariant(sug.variant);
                            setGlobalDefaultStoreSvgStyle(sug.variant);
                            onGeneralizeStoreImageStyle?.(sug.variant);
                            setMenuImages((prev) => {
                              const realOnly = prev.filter(
                                (x) => !x.startsWith('data:image/svg+xml')
                              );
                              return realOnly.length > 0
                                ? [sug.url, ...realOnly]
                                : [sug.url];
                            });
                          }}
                          className={`rounded-xl overflow-hidden border-2 p-2 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/30 shadow-md'
                              : 'border-slate-200 bg-slate-50 hover:border-sky-400'
                          }`}
                        >
                          <img
                            src={sug.url}
                            alt={sug.label}
                            className="w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-lg border border-slate-200 bg-white"
                          />
                          <div className="w-full flex items-center justify-between gap-1 text-[11px] font-extrabold text-black">
                            <span className="truncate">{sug.label}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] shrink-0 ${
                                isSelected
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {isSelected
                                ? 'الرئيسية + تعميم للكل ✓'
                                : 'اختر وتعميم للكل'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {menuImages.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-extrabold text-slate-700">
                  <span>
                    الصور المرفوعة ({menuImages.length}) — اختر الصورة الأساسية (1) أم الصورة الثانية (2) لتظهر في الرئيسية:
                  </span>
                  <div className="flex items-center gap-2">
                    {menuImages.length >= 2 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuImages((prev) => [...prev])
                          }
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold cursor-pointer"
                        >
                          الصورة الأساسية (1) في الرئيسية ✓
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMenuImages((prev) => {
                              if (prev.length < 2) return prev;
                              const copy = [...prev];
                              const second = copy[1];
                              copy.splice(1, 1);
                              return [second, ...copy];
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold cursor-pointer"
                        >
                          جعل الصورة الثانية (2) في الرئيسية
                        </button>
                      </div>
                    )}
                    {menuImages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMenuImages([])}
                        className="text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        حذف جميع الصور
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {menuImages.map((img, i) => {
                    const isPrimary = i === 0;
                    return (
                      <div
                        key={`${i}-${img.slice(0, 24)}`}
                        className={`relative rounded-xl overflow-hidden border-2 bg-white flex flex-col shadow-sm ${
                          isPrimary
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-slate-300'
                        }`}
                      >
                        <div className="relative h-24 w-full bg-slate-100">
                          <img
                            src={img}
                            alt={`صورة ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow ${
                              isPrimary
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/95 text-black border border-slate-300'
                            }`}
                          >
                            {isPrimary ? '1 ★ الرئيسية (تظهر للناس)' : `صورة #${i + 1}`}
                          </span>

                          {/* زر حذف الصورة (القديمة أو الحديثة) */}
                          <button
                            type="button"
                            onClick={() =>
                              setMenuImages((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            title="حذف هذه الصورة"
                            className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-1">
                          {isPrimary ? (
                            <span className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1 px-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>الصورة الرئيسية</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setMenuImages((prev) => {
                                  const target = prev[i];
                                  const rest = prev.filter((_, idx) => idx !== i);
                                  return [target, ...rest];
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-extrabold cursor-pointer transition-colors"
                            >
                              تحديد كرئيسية
                            </button>
                          )}

                          {/* تحديد ترقيم الصورة */}
                          {menuImages.length > 1 && (
                            <select
                              value={i}
                              onChange={(e) => {
                                const newIdx = Number(e.target.value);
                                if (newIdx === i) return;
                                setMenuImages((prev) => {
                                  const copy = [...prev];
                                  const [moved] = copy.splice(i, 1);
                                  copy.splice(newIdx, 0, moved);
                                  return copy;
                                });
                              }}
                              title="ترتيب وترقيم الصورة"
                              className="rounded-lg bg-white border border-slate-300 px-1.5 py-0.5 text-[10px] font-extrabold text-black outline-none cursor-pointer"
                            >
                              {menuImages.map((_, orderIdx) => (
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

          {importRejectNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-900 text-xs font-extrabold flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importRejectNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportRejectNotice('')}
                className="text-[11px] underline cursor-pointer shrink-0"
              >
                إغلاق
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-extrabold cursor-pointer"
            >
              إلغاء
            </button>
            {duplicateExistingStore ? (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-not-allowed shadow-md"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>مسجل من قبل</span>
              </button>
            ) : (
              <FluentButton type="submit" variant="primary" size="lg">
                <Plus className="w-4 h-4" />
                <span>حفظ</span>
              </FluentButton>
            )}
          </div>
        </form>
      </FluentModal>

      {/* ================= 2. STORE DETAILS, RATING, MENU & COMMENTS MODAL (WHITE BACKGROUND + BLACK TEXT) ================= */}
      {activeStore && (
        <FluentModal
          isOpen={!!activeStore}
          onClose={() => setActiveStoreId(null)}
          title={activeStore.name}
          subtitle={
            activeStore.subCategory
              ? `القسم: ${activeStore.category} • نوع المحل: ${activeStore.subCategory}`
              : `القسم: ${activeStore.category}`
          }
          maxWidth="4xl"
          theme="light"
        >
          <div className="space-y-5 text-black">
            {/* Strict Admin Only Edit Store & Delete Store Controls */}
            {isStrictAdmin && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {activeStore.menuImages.length >= 2 && onUpdateStore && (
                  <button
                    type="button"
                    onClick={() => {
                      const reordered = [
                        activeStore.menuImages[1],
                        activeStore.menuImages[0],
                        ...activeStore.menuImages.slice(2),
                      ];
                      onUpdateStore({
                        ...activeStore,
                        menuImages: reordered,
                        updatedAt: Date.now(),
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
                    title="تبديل بين الصورة الأساسية (1) والصورة الثانية (2) لتظهر في الرئيسية"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>تبديل الصورة الأساسية (1) والثانية (2) في الرئيسية</span>
                  </button>
                )}
                <FluentButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const target = activeStore;
                    setActiveStoreId(null);
                    openEditStoreModal(target);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  <span>تعديل البيانات</span>
                </FluentButton>
                {!isPermanentDreamPlazaStore(activeStore) && (
                  <FluentButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setStorePendingDelete(activeStore);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </FluentButton>
                )}
              </div>
            )}

            {/* Phone Row (Number only + Call + WhatsApp in 1 single line) & Conditional Location Row */}
            {(() => {
              const hasValidLocation = Boolean(
                activeStore.locationUrl &&
                  activeStore.locationUrl.trim() !== '' &&
                  activeStore.locationUrl.trim() !== 'https://maps.google.com'
              );
              return (
                <div
                  className={`grid grid-cols-1 ${
                    hasValidLocation ? 'md:grid-cols-2' : ''
                  } gap-3`}
                >
                  {/* الرقم + اتصال + مراسلة في صف واحد بخلفية بيضاء وخط أسود واضح */}
                  <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-300 flex flex-row flex-nowrap items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-black font-mono-tabular truncate">
                      {activeStore.phone}
                    </span>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <a
                        href={`tel:${activeStore.phone}`}
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>اتصال</span>
                      </a>
                      <a
                        href={`https://wa.me/${(
                          activeStore.whatsapp || activeStore.phone
                        ).replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>مراسلة</span>
                      </a>
                    </div>
                  </div>

                  {/* Location with "فتح الرابط" — Hidden completely if store has no registered location */}
                  {hasValidLocation && (
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-700 block">
                          اللوكيشن (Google Maps):
                        </span>
                        <span className="text-xs font-mono-tabular font-bold text-black truncate block">
                          {activeStore.locationUrl}
                        </span>
                      </div>

                      <a
                        href={activeStore.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fluent-reveal inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 shadow whitespace-nowrap"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح الرابط</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* شريط الإعجاب (لايك 👍) والديس لايك (👎) وزر المشاركة (قائمة منسدلة) وعدد المشاهدات لحظياً داخل تفاصيل المحل */}
            <div className="space-y-2">
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap overflow-visible relative">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => onToggleStoreLike(activeStore.id)}
                    className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      activeStore.likes.includes(currentVisitorId)
                        ? 'bg-[#1877F2] text-white border-[#1877F2] shadow'
                        : 'bg-white text-black hover:bg-slate-100 border-slate-300'
                    }`}
                  >
                    <span>👍</span>
                    <span className="whitespace-nowrap">أعجبني</span>
                    <span className="font-mono-tabular px-1 sm:px-1.5 py-0.5 rounded-md bg-black/10">
                      {activeStore.likes.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleStoreDislike(activeStore.id)}
                    className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      activeStore.dislikes.includes(currentVisitorId)
                        ? 'bg-rose-600 text-white border-rose-500 shadow'
                        : 'bg-white text-black hover:bg-slate-100 border-slate-300'
                    }`}
                  >
                    <span>👎</span>
                    <span className="whitespace-nowrap">لم يعجبني</span>
                    <span className="font-mono-tabular px-1 sm:px-1.5 py-0.5 rounded-md bg-black/10">
                      {activeStore.dislikes.length}
                    </span>
                  </button>

                  {/* زر مشاركة بجانب زر لم يعجبني — عند الضغط عليه تظهر قائمة منسدلة بها الخيارات المتاحة */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsStoreShareMenuOpen((prev) => !prev);
                        setStoreShareCopied(false);
                      }}
                      className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isStoreShareMenuOpen
                          ? 'bg-sky-600 text-white border-sky-600 shadow'
                          : 'bg-white text-black hover:bg-slate-100 border-slate-300'
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">مشاركة</span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    {isStoreShareMenuOpen &&
                      (() => {
                        const shareUrl = `${window.location.origin}/?section=directory&storeId=${encodeURIComponent(
                          activeStore.id
                        )}`;
                        const shareTitle = `${activeStore.name} (${activeStore.category}) - هاتف: ${activeStore.phone}`;
                        const fullShareText = `${shareTitle}\n${shareUrl}`;
                        return (
                          <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 w-52 rounded-xl bg-white border-2 border-sky-500 shadow-2xl z-50 py-1.5 space-y-1 text-black">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard
                                  ?.writeText(shareUrl)
                                  .catch(() => {});
                                setStoreShareCopied(true);
                                setTimeout(
                                  () => setStoreShareCopied(false),
                                  2500
                                );
                              }}
                              className="w-full px-3 py-2 text-right hover:bg-slate-100 text-black text-xs font-extrabold flex items-center justify-between gap-2 cursor-pointer transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                                <span>
                                  {storeShareCopied
                                    ? 'تم النسخ ✓'
                                    : 'نسخ الرابط'}
                                </span>
                              </span>
                            </button>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                fullShareText
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setIsStoreShareMenuOpen(false)}
                              className="w-full px-3 py-2 text-right hover:bg-emerald-50 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>واتس اب</span>
                            </a>

                            <a
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                                shareUrl
                              )}&quote=${encodeURIComponent(shareTitle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                navigator.clipboard
                                  ?.writeText(fullShareText)
                                  .catch(() => {});
                                setIsStoreShareMenuOpen(false);
                              }}
                              className="w-full px-3 py-2 text-right hover:bg-sky-50 text-sky-800 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5 text-[#0084FF] shrink-0" />
                              <span>ماسنجر</span>
                            </a>

                            <a
                              href={`https://t.me/share/url?url=${encodeURIComponent(
                                shareUrl
                              )}&text=${encodeURIComponent(shareTitle)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setIsStoreShareMenuOpen(false)}
                              className="w-full px-3 py-2 text-right hover:bg-sky-50 text-sky-800 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5 text-[#229ED9] shrink-0" />
                              <span>تليجرام</span>
                            </a>
                          </div>
                        );
                      })()}
                  </div>
                </div>

                <span
                  title="عدد المشاهدات"
                  className="px-2 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-[11px] sm:text-xs font-extrabold text-black flex items-center justify-center gap-1 sm:gap-1.5 font-mono-tabular whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>{activeStore.viewsCount || 0}</span>
                </span>
              </div>
            </div>

            {/* Store Full Details (Only shown if non-empty after cleaning default "محل" text for pharmacies/clinics) */}
            {getCleanStoreDetails(activeStore) && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-1.5">
                <div className="text-xs font-extrabold text-black">التفاصيل:</div>
                <p className="text-sm font-bold text-black leading-relaxed whitespace-pre-line">
                  {getCleanStoreDetails(activeStore)}
                </p>
              </div>
            )}

            {/* Menu / Images Section with Right/Left Move Buttons & "تحميل" */}
            {activeStore.menuImages.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-black">
                      الصور / المنيو ({activeStore.menuImages.length} صفحة)
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuPanOffsetX((prev) => Math.min(prev + 90, 270));
                        if (activeStore.menuImages.length > 1 && menuPanOffsetX === 0) {
                          setActiveMenuPageIdx((prev) =>
                            prev > 0 ? prev - 1 : activeStore.menuImages.length - 1
                          );
                        }
                      }}
                      className="fluent-reveal px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-black text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-sm"
                      title="تحريك الصورة لليمين"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>يمين</span>
                    </button>

                    {menuPanOffsetX !== 0 && (
                      <button
                        type="button"
                        onClick={() => setMenuPanOffsetX(0)}
                        className="px-2 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-black text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        title="توسيط الصورة"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMenuPanOffsetX((prev) => Math.max(prev - 90, -270));
                        if (activeStore.menuImages.length > 1 && menuPanOffsetX === 0) {
                          setActiveMenuPageIdx((prev) =>
                            prev < activeStore.menuImages.length - 1 ? prev + 1 : 0
                          );
                        }
                      }}
                      className="fluent-reveal px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-black text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-sm"
                      title="تحريك الصورة لليسار"
                    >
                      <span>يسار</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <FluentButton
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        handleDownloadMenuImage(
                          activeStore.menuImages[activeMenuPageIdx] ||
                            getStoreCoverPhoto(activeStore),
                          activeStore.name,
                          activeMenuPageIdx + 1
                        )
                      }
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل الصورة</span>
                    </FluentButton>
                  </div>
                </div>

                {activeStore.menuImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeStore.menuImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveMenuPageIdx(idx);
                          setMenuPanOffsetX(0);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer border ${
                          activeMenuPageIdx === idx
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-black border-slate-300'
                        }`}
                      >
                        صفحة {idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-white">
                  <img
                    src={
                      activeStore.menuImages[activeMenuPageIdx]
                        ? activeStore.menuImages[activeMenuPageIdx].startsWith(
                            'data:image/svg+xml'
                          ) &&
                          activeStore.menuImages[activeMenuPageIdx].includes('0A192F')
                          ? getStoreCoverPhoto(activeStore)
                          : activeStore.menuImages[activeMenuPageIdx]
                        : getStoreCoverPhoto(activeStore)
                    }
                    alt={`صورة ${activeStore.name}`}
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `translateX(${menuPanOffsetX}px)`,
                      transition: 'transform 220ms ease',
                    }}
                    className="w-full max-h-[420px] object-contain mx-auto bg-white"
                  />
                </div>
              </div>
            )}

            {/* Bottom Section: Add Rating (With or Without Comment) & Comment Form */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-black">
                  أضف تقييم وتعليق على {activeStore.name}
                </h4>
                <span className="text-xs font-bold text-slate-700">
                  التقييم العام:{' '}
                  <strong className="text-amber-600 font-mono-tabular">
                    {getStoreRatingSummary(activeStore).avg} / 5
                  </strong>{' '}
                  ({getStoreRatingSummary(activeStore).count} تقييم)
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-black font-extrabold">اختر التقييم:</span>
                  {[1, 2, 3, 4, 5].map((st) => {
                    const currentSelectedStars =
                      newCommentRating > 0
                        ? newCommentRating
                        : activeStore.ratings[currentVisitorId] || 0;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setNewCommentRating(st);
                          onRateStore(activeStore.id, st);
                          setRatingOnlySavedNotice(
                            `تم حفظ تقييمك (${st} من 5 نجوم) بنجاح!`
                          );
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            st <= currentSelectedStars
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* زر إرسال التقييم فقط بدون تعليق */}
                <button
                  type="button"
                  onClick={() => {
                    const chosenStars =
                      newCommentRating > 0
                        ? newCommentRating
                        : activeStore.ratings[currentVisitorId] || 0;
                    if (chosenStars <= 0) {
                      setRatingOnlySavedNotice(
                        'يرجى الضغط على النجوم أولاً لتحديد تقييمك للمحل.'
                      );
                      return;
                    }
                    onRateStore(activeStore.id, chosenStars);
                    setRatingOnlySavedNotice(
                      `تم إرسال تقييمك (${chosenStars} نجوم) بدون تعليق بنجاح!`
                    );
                  }}
                  className="fluent-reveal px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-500 text-black hover:text-white border border-amber-400 text-xs font-extrabold cursor-pointer transition-colors"
                >
                  إرسال التقييم فقط (
                  {newCommentRating > 0
                    ? newCommentRating
                    : activeStore.ratings[currentVisitorId] || 0}{' '}
                  ⭐)
                </button>
              </div>

              {ratingOnlySavedNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-900 text-xs font-extrabold flex items-center justify-between">
                  <span>{ratingOnlySavedNotice}</span>
                  <button
                    type="button"
                    onClick={() => setRatingOnlySavedNotice('')}
                    className="text-[11px] underline cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              )}

              {profanityWarning && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-400 text-rose-800 text-xs font-extrabold">
                  {profanityWarning}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => {
                    setNewCommentText(e.target.value);
                    if (profanityWarning) setProfanityWarning('');
                  }}
                  placeholder="أضف تعليقك هنا (اختياري — يمكنك التقييم بالأعلى بدون تعليق)..."
                  className="flex-1 rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-bold outline-none"
                />
                <FluentButton
                  variant="primary"
                  onClick={() => {
                    const chosenStars =
                      newCommentRating > 0
                        ? newCommentRating
                        : activeStore.ratings[currentVisitorId] || 0;
                    if (!newCommentText.trim()) {
                      if (chosenStars <= 0) {
                        setRatingOnlySavedNotice(
                          'يرجى اختيار عدد النجوم أو كتابة تعليق أولاً.'
                        );
                        return;
                      }
                      onRateStore(activeStore.id, chosenStars);
                      setRatingOnlySavedNotice(
                        `تم حفظ تقييمك (${chosenStars} نجوم) بنجاح!`
                      );
                      return;
                    }
                    if (containsAbusiveWords(newCommentText)) {
                      setProfanityWarning(ABUSIVE_CONTENT_WARNING_MESSAGE);
                      return;
                    }
                    setProfanityWarning('');
                    if (chosenStars > 0) {
                      onRateStore(activeStore.id, chosenStars);
                    }
                    const createdComment: StoreCommentItem = {
                      id: `cmt-${Date.now()}`,
                      authorId: currentVisitorId,
                      authorUsername: currentUser?.username || 'زائر',
                      rating: chosenStars,
                      text: newCommentText.trim(),
                      likes: [],
                      replies: [],
                      createdAt: new Date().toISOString(),
                    };
                    onAddStoreComment(activeStore.id, createdComment);
                    setNewCommentText('');
                    setNewCommentRating(0);
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال</span>
                </FluentButton>
              </div>
            </div>

            {/* Advanced Comments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-black">
                  التعليقات والتقييمات ({activeStore.comments.length})
                </h4>
              </div>

              {activeStore.comments.length === 0 ? (
                <p className="text-xs font-bold text-slate-600">
                  لا توجد تعليقات بعد. كن أول من يضيف تقييماً وتعليقاً!
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {activeStore.comments
                      .slice(0, commentLimitStage === 'initial_5' ? 5 : 15)
                      .map((cmt) => renderCommentBlock(activeStore, cmt))}
                  </div>

                  {commentLimitStage === 'initial_5' &&
                    activeStore.comments.length > 5 && (
                      <div className="pt-2 text-center">
                        <FluentButton
                          variant="secondary"
                          onClick={() => setCommentLimitStage('expanded_15')}
                        >
                          <span>
                            المزيد (عرض 10 تعليقات إضافية من أصل{' '}
                            {activeStore.comments.length})
                          </span>
                        </FluentButton>
                      </div>
                    )}

                  {commentLimitStage === 'expanded_15' &&
                    activeStore.comments.length > 5 && (
                      <div className="pt-2 text-center">
                        <FluentButton
                          variant="primary"
                          onClick={() => setIsAllCommentsSubModalOpen(true)}
                        >
                          <span>
                            إظهار المزيد (فتح جميع التعليقات الـ{' '}
                            {activeStore.comments.length} في نافذة مستقلة)
                          </span>
                        </FluentButton>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Bottom-Left Store Views Counter */}
            <div className="pt-3 border-t border-slate-300 flex items-center justify-end">
              <div className="mr-auto px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-xs font-extrabold text-black flex items-center gap-2 shadow-sm">
                <Eye className="w-4 h-4 text-sky-700" />
                <span>عدد المشاهدات:</span>
                <span className="font-mono-tabular text-sm text-black">
                  {activeStore.viewsCount || 1}
                </span>
              </div>
            </div>
          </div>
        </FluentModal>
      )}

      {/* ================= 3. SUB-MODAL FOR ALL COMMENTS ORDERED VERTICALLY (WHITE BACKGROUND + BLACK TEXT) ================= */}
      {activeStore && isAllCommentsSubModalOpen && (
        <FluentModal
          isOpen={isAllCommentsSubModalOpen}
          onClose={() => setIsAllCommentsSubModalOpen(false)}
          title={`جميع تعليقات ${activeStore.name} (${activeStore.comments.length})`}
          subtitle="مرتبة بالكامل أسفل بعضها مع إمكانية الإعجاب والرد"
          maxWidth="2xl"
          theme="light"
        >
          <div className="space-y-3 text-black">
            {activeStore.comments.map((cmt) => renderCommentBlock(activeStore, cmt))}
          </div>
        </FluentModal>
      )}

      {/* ================= 4. STORE DELETE CONFIRMATION MODAL (شاشة تأكيد الحذف) ================= */}
      {storePendingDelete && (
        <FluentModal
          isOpen={!!storePendingDelete}
          onClose={() => setStorePendingDelete(null)}
          title="شاشة تأكيد الحذف"
          subtitle="تأكيد حذف المحل من الدليل التجاري"
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-black p-1">
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-rose-950">
                  هل أنت متأكد من حذف &quot;{storePendingDelete.name}&quot;؟
                </h4>
                <p className="text-xs font-bold text-rose-800 leading-relaxed">
                  القسم: {storePendingDelete.category} — سيتم حذف المحل وبياناته من الدليل التجاري نهائياً.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStorePendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-extrabold cursor-pointer"
              >
                إلغاء
              </button>
              <FluentButton
                variant="danger"
                onClick={() => {
                  const targetId = storePendingDelete.id;
                  onDeleteStore(targetId);
                  if (activeStoreId === targetId) {
                    setActiveStoreId(null);
                  }
                  setStorePendingDelete(null);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف</span>
              </FluentButton>
            </div>
          </div>
        </FluentModal>
      )}

      {/* ================= 5. STORE EXCEL IMPORT PREVIEW MODAL (شاشة معاينة بيانات الإكسيل للمحلات) ================= */}
      <FluentModal
        isOpen={isStoreExcelPreviewModalOpen}
        onClose={() => {
          setIsStoreExcelPreviewModalOpen(false);
          setExpandedStoreExcelItemId(null);
        }}
        title={`معاينة المحلات المستخرجة من الإكسيل (${storeExcelPreviewItems.length} محل)`}
        subtitle="كل محل في سطر واحد أسفل بعض — اضغط على اسم المحل لعرض جميع التفاصيل أو التعديل أو الحذف قبل الإضافة"
        maxWidth="lg"
        theme="light"
      >
        <div className="space-y-3 text-black w-full overflow-x-hidden">
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden space-y-2 pr-0.5 w-full">
            {storeExcelPreviewItems.map((item, idx) => {
              const isExpanded = expandedStoreExcelItemId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-slate-50 border-2 border-slate-300 hover:border-sky-500 p-2.5 transition-all w-full overflow-x-hidden"
                >
                  {/* سطر واحد لكل محل بدون شريط تمرير يمين ويسار */}
                  <div className="flex items-center justify-between gap-2 w-full overflow-x-hidden">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-hidden">
                      <span className="w-6 h-6 rounded-lg bg-sky-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStoreExcelItemId(isExpanded ? null : item.id)
                        }
                        className="min-w-0 flex-1 text-right font-extrabold text-xs sm:text-sm text-black hover:text-sky-700 truncate cursor-pointer"
                        title="اضغط لعرض جميع التفاصيل أو التعديل"
                      >
                        {item.name}
                      </button>

                      <span className="px-2 py-0.5 rounded-lg bg-sky-100 border border-sky-300 text-sky-900 text-[10px] font-extrabold shrink-0 max-w-[95px] truncate">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-mono-tabular font-extrabold text-slate-700 hidden sm:inline-block max-w-[105px] truncate">
                        {item.phone}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStoreExcelItemId(isExpanded ? null : item.id)
                        }
                        className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300 cursor-pointer transition-colors"
                        title="عرض وتعديل التفاصيل"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStoreExcelPreviewItems((prev) =>
                            prev.filter((row) => row.id !== item.id)
                          )
                        }
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 cursor-pointer transition-colors"
                        title="حذف من القائمة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* التفاصيل الكاملة للمحل عند الضغط على الاسم */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full overflow-x-hidden">
                      <div>
                        <label className="block text-[11px] font-extrabold text-black mb-1">
                          اسم المحل / المنتج
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreExcelPreviewItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id ? { ...row, name: val } : row
                              )
                            );
                          }}
                          className="w-full rounded-lg bg-white border border-slate-300 focus:border-sky-600 px-2.5 py-1.5 text-xs text-black font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-black mb-1">
                          القسم
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreExcelPreviewItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id ? { ...row, category: val } : row
                              )
                            );
                          }}
                          className="w-full rounded-lg bg-white border border-slate-300 focus:border-sky-600 px-2.5 py-1.5 text-xs text-black font-bold outline-none"
                        >
                          {allStoreCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-black mb-1">
                          رقم الهاتف
                        </label>
                        <input
                          type="text"
                          value={item.phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreExcelPreviewItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id ? { ...row, phone: val } : row
                              )
                            );
                          }}
                          className="w-full rounded-lg bg-white border border-slate-300 focus:border-sky-600 px-2.5 py-1.5 text-xs text-black font-bold font-mono-tabular outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-black mb-1">
                          نوع النشاط الفرعي
                        </label>
                        <input
                          type="text"
                          value={item.subCategory || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreExcelPreviewItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, subCategory: val }
                                  : row
                              )
                            );
                          }}
                          className="w-full rounded-lg bg-white border border-slate-300 focus:border-sky-600 px-2.5 py-1.5 text-xs text-black font-bold outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-extrabold text-black mb-1">
                          تفاصيل المحل
                        </label>
                        <input
                          type="text"
                          value={item.details || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreExcelPreviewItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id ? { ...row, details: val } : row
                              )
                            );
                          }}
                          className="w-full rounded-lg bg-white border border-slate-300 focus:border-sky-600 px-2.5 py-1.5 text-xs text-black font-bold outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-300">
            <button
              type="button"
              onClick={() => {
                setIsStoreExcelPreviewModalOpen(false);
                setExpandedStoreExcelItemId(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-black text-xs font-extrabold cursor-pointer"
            >
              إلغاء
            </button>

            <FluentButton
              type="button"
              variant="primary"
              size="lg"
              onClick={handleConfirmStoreExcelPreviewImport}
              disabled={storeExcelPreviewItems.length === 0}
            >
              <Plus className="w-4 h-4" />
              <span>أضف ({storeExcelPreviewItems.length})</span>
            </FluentButton>
          </div>
        </div>
      </FluentModal>

      {/* ================= 6. ADMIN DUPLICATE STORES MODAL (المحلات المكررة - Admin فقط) ================= */}
      {isStrictAdmin && (
        <FluentModal
          isOpen={isDuplicateStoresModalOpen}
          onClose={() => setIsDuplicateStoresModalOpen(false)}
          title={`المحلات المكررة (${duplicateStoresEntries.length})`}
          subtitle="قائمة المحلات المكررة في الاسم أو رقم الهاتف — يمكنك تعديل أي محل أو حذفه نهائياً لحظياً"
          maxWidth="2xl"
          theme="light"
        >
          <div className="space-y-3 text-black w-full overflow-x-hidden">
            {duplicateStoresEntries.length === 0 ? (
              <div className="p-8 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <div className="text-sm sm:text-base font-extrabold text-emerald-950">
                  لا توجد أي محلات مكررة حالياً في الدليل التجاري
                </div>
                <p className="text-xs font-bold text-emerald-800">
                  جميع المحلات المسجلة فريدة من حيث الاسم وأرقام الهواتف.
                </p>
              </div>
            ) : (
              <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden space-y-2.5 pr-0.5">
                {duplicateStoresEntries.map(({ duplicate, original, reason }) => (
                  <div
                    key={duplicate.id}
                    className="p-3 rounded-xl bg-slate-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full overflow-x-hidden"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-extrabold text-black break-words">
                          {duplicate.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-extrabold">
                          {duplicate.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-[10px] font-extrabold">
                          {reason}
                        </span>
                      </div>
                      <div className="text-xs font-mono-tabular font-bold text-slate-800">
                        الهاتف: {duplicate.phone}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600">
                        مكرر مع المحل الأصلي: &quot;{original.name}&quot; ({original.category} — {original.phone})
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDuplicateStoresModalOpen(false);
                          openEditStoreModal(duplicate);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteStore(duplicate.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف نهائي</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FluentModal>
      )}
    </div>
  );
};

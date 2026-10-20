import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  PlatformSettings,
  StoreCommentItem,
  StoreListingItem,
  StoreReplyItem,
  UserAccount,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { createSquareAdSvg, uploadImageDynamic } from '../services/storageService';
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
}) => {
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const currentVisitorId = currentUser?.id || 'guest-visitor';
  const siteCopyrightUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://fluent-hub.app';

  // Search, Category Filter & View Layout Mode ('grid' = 2 per row on mobile, 'horizontal' = image on right + details beside it)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [storeLayoutMode, setStoreLayoutMode] = useState<'grid' | 'horizontal'>('grid');
  const [importNotice, setImportNotice] = useState<string>('');

  // Add / Edit Store Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStoreObj, setEditingStoreObj] = useState<StoreListingItem | null>(null);
  const [storeCategory, setStoreCategory] = useState<string>(
    settings.storeCategories[0] || 'سوبر ماركت'
  );
  const [storeName, setStoreName] = useState('');
  const [storeLocationUrl, setStoreLocationUrl] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeDetails, setStoreDetails] = useState('');
  const [menuImages, setMenuImages] = useState<string[]>([]);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');

  const openEditStoreModal = (target: StoreListingItem) => {
    setEditingStoreObj(target);
    setStoreCategory(target.category);
    setStoreName(target.name);
    setStoreLocationUrl(target.locationUrl || '');
    setStorePhone(target.phone);
    setStoreDetails(target.details || '');
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

  // Add Rating & Comment Form inside Store Details Modal
  const [newCommentRating, setNewCommentRating] = useState<number>(5);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [ratingOnlySavedNotice, setRatingOnlySavedNotice] = useState<string>('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyDraftText, setReplyDraftText] = useState<string>('');
  const [activeMenuPageIdx, setActiveMenuPageIdx] = useState<number>(0);
  const [menuPanOffsetX, setMenuPanOffsetX] = useState<number>(0);
  const [profanityWarning, setProfanityWarning] = useState<string>('');

  const activeStore = stores.find((s) => s.id === activeStoreId) || null;

  // Upload multiple menu images via ImgBB API (or compressed fallback)
  const handleMenuFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingMenu(true);
    setUploadStatusMsg('جاري رفع صور المنيو عبر API التحميل...');
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const res = await uploadImageDynamic(fileList[i], settings.imgbbApiKey);
        uploadedUrls.push(res.url);
      }
      setMenuImages((prev) => [...prev, ...uploadedUrls]);
      setUploadStatusMsg(`تم رفع ${uploadedUrls.length} صورة للمنيو بنجاح!`);
    } catch {
      setUploadStatusMsg('تعذر رفع بعض الصور، يرجى المحاولة مجدداً.');
    } finally {
      setUploadingMenu(false);
    }
  };

  // Submit New Store
  const handleCreateStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storePhone.trim()) return;

    const finalMenuImages =
      menuImages.length > 0
        ? menuImages
        : [createSquareAdSvg(storeName.trim(), storeCategory, '#38BDF8')];

    if (editingStoreObj && onUpdateStore) {
      onUpdateStore({
        ...editingStoreObj,
        name: storeName.trim(),
        category: storeCategory,
        locationUrl: storeLocationUrl.trim(),
        phone: storePhone.trim(),
        whatsapp: storePhone.trim().replace(/[^0-9]/g, ''),
        details: storeDetails.trim() || 'محل مسجل بالدليل التجاري',
        menuImages: finalMenuImages,
      });
    } else {
      const newStore: StoreListingItem = {
        id: `st-${Date.now()}`,
        ownerId: currentUser?.id || 'guest',
        ownerUsername: currentUser?.username || 'زائر',
        name: storeName.trim(),
        category: storeCategory,
        locationUrl: storeLocationUrl.trim(),
        phone: storePhone.trim(),
        whatsapp: storePhone.trim().replace(/[^0-9]/g, ''),
        details: storeDetails.trim() || 'محل مسجل بالدليل التجاري',
        menuImages: finalMenuImages,
        likes: [],
        dislikes: [],
        ratings: {},
        comments: [],
        approved: true,
        createdAt: new Date().toISOString(),
      };
      onAddStore(newStore);
    }

    setEditingStoreObj(null);
    setStoreName('');
    setStoreLocationUrl('');
    setStorePhone('');
    setStoreDetails('');
    setMenuImages([]);
    setUploadStatusMsg('');
    setIsAddModalOpen(false);
  };

  // Excel & PDF Store Import Handlers
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseStoresFromExcelFile(
        file,
        currentUser?.username || 'admin',
        currentUser?.id || 'usr-admin-1',
        settings.storeCategories
      );
      if (imported.length > 0) {
        onImportStoresBatch(imported);
        setImportNotice(`تم استيراد وتسجيل ${imported.length} محل من ملف الإكسيل بنجاح!`);
        setTimeout(() => setImportNotice(''), 4500);
      }
    } catch {
      setImportNotice('تعذر قراءة ملف الإكسيل، تأكد من صحة الملف.');
    }
    e.target.value = '';
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseStoresFromPDFFile(
        file,
        currentUser?.username || 'admin',
        currentUser?.id || 'usr-admin-1',
        settings.storeCategories
      );
      if (imported.length > 0) {
        onImportStoresBatch(imported);
        setImportNotice(`تم استخراج وتسجيل ${imported.length} محل من ملف PDF بنجاح!`);
        setTimeout(() => setImportNotice(''), 4500);
      }
    } catch {
      setImportNotice('تعذر استخراج البيانات من ملف PDF.');
    }
    e.target.value = '';
  };

  // Download Menu Image with Site Link Watermark
  const handleDownloadMenuImage = (imageUrl: string, storeTitle: string, pageNum: number) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `Menu_${storeTitle}_Page_${pageNum}.png`;
    a.click();
  };

  // Calculate average star rating of a store
  const getStoreRatingSummary = (store: StoreListingItem) => {
    const ratingValues = Object.values(store.ratings || {});
    const commentRatings = (store.comments || []).map((c) => c.rating).filter((r) => r > 0);
    const allRatings = [...ratingValues, ...commentRatings];
    if (allRatings.length === 0) return { avg: 5.0, count: 0 };
    const sum = allRatings.reduce((a, b) => a + b, 0);
    return {
      avg: Number((sum / allRatings.length).toFixed(1)),
      count: allRatings.length,
    };
  };

  // Filter stores by search & category
  const filteredStores = stores.filter((s) => {
    const matchesCategory =
      selectedCategory === 'all' || s.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.details.toLowerCase().includes(q) ||
      s.phone.includes(q);
    return matchesCategory && matchesSearch;
  });

  // Render single comment item (used in both main modal and sub-modal)
  const renderCommentBlock = (store: StoreListingItem, comment: StoreCommentItem) => {
    const hasLikedComment = comment.likes.includes(currentVisitorId);
    const isReplyingHere = replyingToCommentId === comment.id;

    return (
      <div
        key={comment.id}
        className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-sky-300">
                {comment.authorUsername}
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < comment.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-[#475569]'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-[10px] text-[#94A3B8]">
              {new Date(comment.createdAt).toLocaleString('ar-EG')}
            </div>
          </div>

          {/* Delete Comment Button: Visible to Admin Only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDeleteStoreComment(store.id, comment.id)}
              title="حذف التعليق (صلاحية Admin)"
              className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>حذف التعليق</span>
            </button>
          )}
        </div>

        <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed">
          {comment.text}
        </p>

        {/* Comment Actions: Like & Reply */}
        <div className="flex items-center gap-4 pt-1 text-xs">
          <button
            type="button"
            onClick={() => onToggleCommentLike(store.id, comment.id)}
            className={`inline-flex items-center gap-1 font-bold cursor-pointer transition-colors ${
              hasLikedComment ? 'text-blue-400' : 'text-[#94A3B8] hover:text-white'
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
            className="inline-flex items-center gap-1 font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>رد ({comment.replies.length})</span>
          </button>
        </div>

        {/* Nested Replies List */}
        {comment.replies.length > 0 && (
          <div className="mr-4 pr-3 border-r-2 border-[#334155] space-y-2 pt-1">
            {comment.replies.map((rep) => (
              <div
                key={rep.id}
                className="p-2.5 rounded-lg bg-[#112240]/90 border border-[#334155]/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">{rep.authorUsername}</span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(rep.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[#F8FAFC]">{rep.text}</p>
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
              className="flex-1 rounded-lg bg-[#112240] border border-sky-400/50 px-3 py-1.5 text-xs text-[#F8FAFC] outline-none"
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
      {/* 1. Top Action Bar: "أضف محل / الدليل التجاري" + "أضف محل" Button on 1 line + Admin Only Excel/PDF Import & Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#112240]/95 border border-[#334155] rounded-2xl p-3.5 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-nowrap w-full lg:w-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-sm sm:text-xl font-extrabold text-[#F8FAFC] truncate">
              أضف محل / الدليل التجاري
            </h1>
          </div>

          {/* Primary "أضف محل" Button right beside the title on the same line */}
          <FluentButton
            variant="primary"
            size="sm"
            onClick={() => {
              setStoreCategory(settings.storeCategories[0] || 'سوبر ماركت');
              setIsAddModalOpen(true);
            }}
            className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>أضف محل</span>
          </FluentButton>
        </div>

        {/* Import & Export Toolbar: Strictly Admin Only ("زر اضف اكسيل او بي دي اف صلاحيات admin فقط") */}
        {currentUser?.role === 'admin' && (
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* 3. Instant Search Bar & Category Filter Dropdown in a Single Row */}
      <div className="bg-[#112240]/80 border border-[#334155] rounded-2xl p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-row items-center gap-2 sm:gap-3 flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0 flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-sky-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن محل أو قسم..."
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
              {settings.storeCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({stores.filter((s) => s.category === cat).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Only "الكل" Button + Layout Toggle (Grid 2-col on mobile vs Horizontal Image-on-Right) */}
        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`fluent-reveal px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-sky-600 text-white'
                : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            الكل ({stores.length})
          </button>

          {/* طريقة العرض: شبكي (2 بجانب بعض) أو عرض عرضي (الصورة يمين وبجانبها التفاصيل) */}
          <div className="flex items-center gap-1.5 bg-[#0A192F] border border-[#334155] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setStoreLayoutMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                storeLayoutMode === 'grid'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>شبكي (2 بجانب بعض)</span>
            </button>
            <button
              type="button"
              onClick={() => setStoreLayoutMode('horizontal')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                storeLayoutMode === 'horizontal'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>عرض عرضي</span>
            </button>
          </div>
        </div>
      </div>

      {/* Store Cards: Grid (2 side-by-side on mobile) OR Horizontal (Image on Right + Details beside it) */}
      {filteredStores.length === 0 ? (
        <FluentCard className="p-12 text-center space-y-3">
          <Store className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
          <div className="text-base font-bold text-[#F8FAFC]">
            لا توجد محلات مطابقة لبحثك في هذا القسم حالياً
          </div>
          <p className="text-xs text-[#94A3B8]">
            اضغط على زر &quot;أضف محل&quot; بالأعلى لإضافة أول محل في هذا القسم
          </p>
        </FluentCard>
      ) : storeLayoutMode === 'horizontal' ? (
        /* ================= HORIZONTAL VIEW: صورة المحل على اليمين وبجانبه التفاصيل ================= */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {filteredStores.map((store) => {
            const firstMenuPhoto =
              store.menuImages[0] ||
              createSquareAdSvg(store.name, store.category, '#38BDF8');
            const isLiked = store.likes.includes(currentVisitorId);
            const isDisliked = store.dislikes.includes(currentVisitorId);
            const ratingInfo = getStoreRatingSummary(store);

            return (
              <div
                key={store.id}
                onClick={() => {
                  onIncrementStoreViews?.(store.id);
                  setActiveStoreId(store.id);
                  setCommentLimitStage('initial_5');
                  setIsAllCommentsSubModalOpen(false);
                  setActiveMenuPageIdx(0);
                  setMenuPanOffsetX(0);
                  setRatingOnlySavedNotice('');
                }}
                className="fluent-reveal group rounded-2xl bg-[#112240] border border-[#334155] hover:border-sky-400/70 overflow-hidden flex flex-row items-stretch cursor-pointer shadow-lg"
              >
                {/* Right Side (RTL First Child): صورة المحل على اليمين */}
                <div className="relative w-28 sm:w-40 shrink-0 bg-[#0A192F] border-l border-[#334155] overflow-hidden">
                  <img
                    src={firstMenuPhoto}
                    alt={store.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#0A192F]/90 border border-amber-400/40 text-amber-300 font-mono-tabular text-[10px] font-bold flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    {ratingInfo.avg}
                  </span>
                </div>

                {/* Left Side (RTL Second Child): التفاصيل بجانبه */}
                <div className="p-2.5 sm:p-4 flex-1 min-w-0 flex flex-col justify-between space-y-2 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="text-xs sm:text-base font-extrabold text-[#F8FAFC] group-hover:text-sky-300 transition-colors truncate">
                        {store.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-lg bg-[#0A192F] border border-sky-400/40 text-sky-300 text-[10px] font-bold shrink-0">
                        {store.category}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {store.details}
                    </p>
                  </div>

                  <div
                    className="pt-2 border-t border-[#334155]/80 flex items-center justify-between gap-1.5 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleStoreLike(store.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 border cursor-pointer ${
                          isLiked
                            ? 'bg-[#1877F2] text-white border-[#1877F2]'
                            : 'bg-[#0A192F] text-[#E2E8F0] border-[#334155]'
                        }`}
                      >
                        <span>👍</span>
                        <span className="font-mono-tabular">({store.likes.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStoreDislike(store.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 border cursor-pointer ${
                          isDisliked
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-[#0A192F] text-[#94A3B8] border-[#334155]'
                        }`}
                      >
                        <span>👎</span>
                        <span className="font-mono-tabular">({store.dislikes.length})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 mr-auto">
                      <span
                        title="عدد المشاهدات لجميع المستخدمين"
                        className="px-2 py-0.5 rounded-lg bg-[#0A192F] border border-[#334155] text-[10px] font-bold text-sky-300 flex items-center gap-1 font-mono-tabular"
                      >
                        <Eye className="w-3 h-3 text-sky-400" />
                        <span>{store.viewsCount || 0}</span>
                      </span>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditStoreModal(store)}
                            className="p-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/30 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStore(store.id)}
                            className="p-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= GRID VIEW: يظهر في نسخة الهاتف 2 محل بجانب بعض ================= */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
          {filteredStores.map((store) => {
            const firstMenuPhoto =
              store.menuImages[0] ||
              createSquareAdSvg(store.name, store.category, '#38BDF8');
            const isLiked = store.likes.includes(currentVisitorId);
            const isDisliked = store.dislikes.includes(currentVisitorId);
            const ratingInfo = getStoreRatingSummary(store);

            return (
              <div
                key={store.id}
                onClick={() => {
                  onIncrementStoreViews?.(store.id);
                  setActiveStoreId(store.id);
                  setCommentLimitStage('initial_5');
                  setIsAllCommentsSubModalOpen(false);
                  setActiveMenuPageIdx(0);
                  setMenuPanOffsetX(0);
                  setRatingOnlySavedNotice('');
                }}
                className="fluent-reveal group rounded-2xl bg-[#112240] border border-[#334155] hover:border-sky-400/70 overflow-hidden flex flex-col justify-between cursor-pointer shadow-lg"
              >
                {/* Top Square Image: First Page of Store Menu */}
                <div className="relative w-full aspect-square bg-[#0A192F] border-b border-[#334155] overflow-hidden">
                  <img
                    src={firstMenuPhoto}
                    alt={store.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-transparent to-transparent opacity-80" />

                  {/* Category & Star Rating Overlay */}
                  <div className="absolute top-2 right-2 left-2 sm:top-3 sm:right-3 sm:left-3 flex items-center justify-between text-[10px] sm:text-xs gap-1">
                    <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[#0A192F]/90 border border-sky-400/40 text-sky-300 font-bold truncate">
                      {store.category}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-[#0A192F]/90 border border-amber-400/40 text-amber-300 font-mono-tabular font-bold flex items-center gap-0.5 shrink-0">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" />
                      {ratingInfo.avg}
                    </span>
                  </div>

                  {store.menuImages.length > 1 && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-[#0A192F]/90 border border-[#334155] text-[10px] text-[#94A3B8]">
                      منيو ({store.menuImages.length})
                    </div>
                  )}
                </div>

                {/* Store Name & Details */}
                <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-4 relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-base font-extrabold text-[#F8FAFC] group-hover:text-sky-300 transition-colors line-clamp-1">
                      {store.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {store.details}
                    </p>
                  </div>

                  {/* Facebook-style Like (👍) and Dislike (👎) Bar */}
                  <div
                    className="pt-2 sm:pt-3 border-t border-[#334155]/80 flex items-center justify-between gap-1 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      {/* Facebook Like 👍 */}
                      <button
                        type="button"
                        onClick={() => onToggleStoreLike(store.id)}
                        className={`px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          isLiked
                            ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.5)]'
                            : 'bg-[#0A192F] text-[#E2E8F0] hover:bg-[#1877F2]/20 border-[#334155]'
                        }`}
                      >
                        <span className="text-xs sm:text-sm leading-none">👍</span>
                        <span className="hidden sm:inline">أعجبني</span>
                        <span className="font-mono-tabular">({store.likes.length})</span>
                      </button>

                      {/* Facebook Dislike 👎 */}
                      <button
                        type="button"
                        onClick={() => onToggleStoreDislike(store.id)}
                        className={`px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          isDisliked
                            ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                            : 'bg-[#0A192F] text-[#94A3B8] hover:bg-rose-600/20 border-[#334155]'
                        }`}
                      >
                        <span className="text-xs sm:text-sm leading-none">👎</span>
                        <span className="font-mono-tabular">({store.dislikes.length})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1 mr-auto">
                      {/* عدد المشاهدات في الأسفل على اليسار لجميع المستخدمين */}
                      <span
                        title="عدد المشاهدات لجميع المستخدمين"
                        className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[#0A192F] border border-[#334155] text-[10px] sm:text-[11px] font-bold text-sky-300 flex items-center gap-0.5 sm:gap-1 font-mono-tabular"
                      >
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
                        <span>{store.viewsCount || 0}</span>
                      </span>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditStoreModal(store)}
                            title="تعديل المحل"
                            className="p-1 sm:p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/30 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStore(store.id)}
                            title="حذف المحل"
                            className="p-1 sm:p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 1. ADD / EDIT STORE MODAL ================= */}
      <FluentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStoreObj(null);
        }}
        title={editingStoreObj ? `تعديل بيانات المحل: ${editingStoreObj.name}` : 'إضافة محل جديد إلى الدليل'}
        subtitle="اختر القسم وأدخل بيانات المحل وارفع صور المنيو ليظهر فوراً لجميع الزوار"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateStoreSubmit} className="space-y-4">
          {/* Dynamic Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اختر القسم *
            </label>
            <select
              value={storeCategory}
              onChange={(e) => setStoreCategory(e.target.value)}
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-bold outline-none"
            >
              {settings.storeCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Store Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                اسم المحل *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="مثال: سوبر ماركت البركة أو مطعم السلطان..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                رقم هاتف المحل *
              </label>
              <input
                type="tel"
                required
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-mono-tabular outline-none"
              />
            </div>
          </div>

          {/* Store Location Google Maps Link */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              لوكيشن المحل (رابط خرائط جوجل Google Maps)
            </label>
            <input
              type="url"
              value={storeLocationUrl}
              onChange={(e) => setStoreLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          {/* Store Details */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              تفاصيل المحل والعنوان ومواعيد العمل
            </label>
            <textarea
              rows={3}
              required
              value={storeDetails}
              onChange={(e) => setStoreDetails(e.target.value)}
              placeholder="اكتب تفاصيل المحل والخدمات والعروض المتاحة..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 p-3.5 text-[#F8FAFC] outline-none"
            />
          </div>

          {/* Store Menu Image Upload via ImgBB API */}
          <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-sky-400">
                  منيو المحل (رفع صور المنيو عبر API التحميل)
                </label>
                <p className="text-[11px] text-[#94A3B8]">
                  تظهر صورة الصفحة الأولى من المنيو كواجهة رئيسية لقالب المحل
                </p>
              </div>

              <label className="fluent-reveal inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploadingMenu ? 'جاري الرفع...' : 'اختر صور المنيو'}</span>
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
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>{uploadStatusMsg}</span>
              </div>
            )}

            {menuImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {menuImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative h-20 rounded-lg overflow-hidden border border-sky-400/50"
                  >
                    <img src={img} alt={`Menu ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#0A192F]/90 text-[10px] font-bold text-sky-300">
                      ص {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
            <FluentButton
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              إلغاء
            </FluentButton>
            <FluentButton type="submit" variant="primary" size="lg">
              <Plus className="w-4 h-4" />
              <span>أضف</span>
            </FluentButton>
          </div>
        </form>
      </FluentModal>

      {/* ================= 2. STORE DETAILS, RATING, MENU & COMMENTS MODAL ================= */}
      {activeStore && (
        <FluentModal
          isOpen={!!activeStore}
          onClose={() => setActiveStoreId(null)}
          title={activeStore.name}
          subtitle={`القسم: ${activeStore.category}`}
          maxWidth="4xl"
        >
          <div className="space-y-5">
            {/* Admin Edit/Delete Store Controls (Top "قيّم هذا المحل الآن" removed per instructions) */}
            {isAdmin && (
              <div className="flex items-center justify-end gap-2">
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
                  <span>تعديل المحل</span>
                </FluentButton>
                <FluentButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onDeleteStore(activeStore.id);
                    setActiveStoreId(null);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحل</span>
                </FluentButton>
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
                  {/* الرقم + اتصال + مراسلة في صف واحد بدون جملة "رقم هاتف المحل:" */}
                  <div className="p-3 sm:p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex flex-row flex-nowrap items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-sky-400 font-mono-tabular truncate">
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
                    <div className="p-3 sm:p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs text-[#94A3B8] block">
                          لوكيشن المحل (Google Maps):
                        </span>
                        <span className="text-xs font-mono-tabular text-[#E2E8F0] truncate block">
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

            {/* Store Full Details */}
            <div className="p-4 rounded-xl bg-[#0A192F]/80 border border-[#334155] space-y-1.5">
              <div className="text-xs font-bold text-sky-400">تفاصيل المحل:</div>
              <p className="text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                {activeStore.details}
              </p>
            </div>

            {/* Menu Section with Right/Left Move Buttons & "تحميل المنيو" (Copyright link hidden) */}
            {activeStore.menuImages.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#0A192F] border border-[#334155] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#F8FAFC]">
                      منيو المحل ({activeStore.menuImages.length} صفحة)
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* أزرار تحريك صورة المنيو يمين ويسار */}
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
                      className="fluent-reveal px-2.5 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1E293B] border border-sky-400/50 text-sky-300 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                      title="تحريك الصورة لليمين"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>يمين</span>
                    </button>

                    {menuPanOffsetX !== 0 && (
                      <button
                        type="button"
                        onClick={() => setMenuPanOffsetX(0)}
                        className="px-2 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
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
                      className="fluent-reveal px-2.5 py-1.5 rounded-xl bg-[#112240] hover:bg-[#1E293B] border border-sky-400/50 text-sky-300 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
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
                            activeStore.menuImages[0],
                          activeStore.name,
                          activeMenuPageIdx + 1
                        )
                      }
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل المنيو</span>
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
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          activeMenuPageIdx === idx
                            ? 'bg-sky-600 text-white'
                            : 'bg-[#112240] text-[#94A3B8]'
                        }`}
                      >
                        صفحة {idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#112240]">
                  <img
                    src={
                      activeStore.menuImages[activeMenuPageIdx] ||
                      activeStore.menuImages[0]
                    }
                    alt={`منيو ${activeStore.name}`}
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `translateX(${menuPanOffsetX}px)`,
                      transition: 'transform 220ms ease',
                    }}
                    className="w-full max-h-[420px] object-contain mx-auto"
                  />
                </div>
              </div>
            )}

            {/* Bottom Section: Add Rating (With or Without Comment) & Comment Form */}
            <div className="p-4 rounded-2xl bg-[#0A192F] border border-sky-400/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-[#F8FAFC]">
                  أضف تقييم وتعليق على {activeStore.name}
                </h4>
                <span className="text-xs text-[#94A3B8]">
                  التقييم العام:{' '}
                  <strong className="text-amber-300 font-mono-tabular">
                    {getStoreRatingSummary(activeStore).avg} / 5
                  </strong>{' '}
                  ({getStoreRatingSummary(activeStore).count} تقييم)
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#112240]/80 p-2.5 rounded-xl border border-[#334155]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#E2E8F0] font-bold">اختر التقييم:</span>
                  {[1, 2, 3, 4, 5].map((st) => (
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
                      className="p-1 rounded-lg hover:bg-[#1E293B] transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          st <=
                          (activeStore.ratings[currentVisitorId] ||
                            newCommentRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[#475569]'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {/* زر إرسال التقييم فقط بدون تعليق */}
                <button
                  type="button"
                  onClick={() => {
                    onRateStore(activeStore.id, newCommentRating);
                    setRatingOnlySavedNotice(
                      `تم إرسال تقييمك (${newCommentRating} نجوم) بدون تعليق بنجاح!`
                    );
                  }}
                  className="fluent-reveal px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-[#0A192F] border border-amber-400/50 text-xs font-extrabold cursor-pointer transition-colors"
                >
                  إرسال التقييم فقط ({newCommentRating} ⭐)
                </button>
              </div>

              {ratingOnlySavedNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center justify-between">
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
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400 text-rose-200 text-xs font-extrabold">
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
                  className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] outline-none"
                />
                <FluentButton
                  variant="primary"
                  onClick={() => {
                    if (!newCommentText.trim()) {
                      // If comment box is empty, still save the rating without requiring a comment!
                      onRateStore(activeStore.id, newCommentRating);
                      setRatingOnlySavedNotice(
                        `تم حفظ تقييمك (${newCommentRating} نجوم) بنجاح!`
                      );
                      return;
                    }
                    if (containsAbusiveWords(newCommentText)) {
                      setProfanityWarning(ABUSIVE_CONTENT_WARNING_MESSAGE);
                      return;
                    }
                    setProfanityWarning('');
                    onRateStore(activeStore.id, newCommentRating);
                    const createdComment: StoreCommentItem = {
                      id: `cmt-${Date.now()}`,
                      authorId: currentVisitorId,
                      authorUsername: currentUser?.username || 'زائر',
                      rating: newCommentRating,
                      text: newCommentText.trim(),
                      likes: [],
                      replies: [],
                      createdAt: new Date().toISOString(),
                    };
                    onAddStoreComment(activeStore.id, createdComment);
                    setNewCommentText('');
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال</span>
                </FluentButton>
              </div>
            </div>

            {/* Advanced Comments Section (5 default -> +10 on first click -> Sub-Modal on second click) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#F8FAFC]">
                  التعليقات والتقييمات ({activeStore.comments.length})
                </h4>
              </div>

              {activeStore.comments.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">
                  لا توجد تعليقات بعد. كن أول من يضيف تقييماً وتعليقاً!
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {activeStore.comments
                      .slice(0, commentLimitStage === 'initial_5' ? 5 : 15)
                      .map((cmt) => renderCommentBlock(activeStore, cmt))}
                  </div>

                  {/* Step 1: If > 5 comments and currently showing 5, show "المزيد" button */}
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

                  {/* Step 2: After clicking "المزيد" once, show "إظهار المزيد" which opens the All-Comments Sub-Modal */}
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

            {/* Bottom-Left Store Views Counter ("يظهر في الأسفل على اليسار عدد المشاهدات لجميع المستخدمين") */}
            <div className="pt-3 border-t border-[#334155] flex items-center justify-end">
              <div className="mr-auto px-3.5 py-2 rounded-xl bg-[#0A192F] border border-sky-400/50 text-xs font-extrabold text-sky-300 flex items-center gap-2 shadow">
                <Eye className="w-4 h-4 text-sky-400" />
                <span>عدد المشاهدات:</span>
                <span className="font-mono-tabular text-sm text-[#F8FAFC]">
                  {activeStore.viewsCount || 1}
                </span>
              </div>
            </div>
          </div>
        </FluentModal>
      )}

      {/* ================= 3. SUB-MODAL FOR ALL COMMENTS ORDERED VERTICALLY ================= */}
      {activeStore && isAllCommentsSubModalOpen && (
        <FluentModal
          isOpen={isAllCommentsSubModalOpen}
          onClose={() => setIsAllCommentsSubModalOpen(false)}
          title={`جميع تعليقات ${activeStore.name} (${activeStore.comments.length})`}
          subtitle="مرتبة بالكامل أسفل بعضها مع إمكانية الإعجاب والرد"
          maxWidth="2xl"
        >
          <div className="space-y-3">
            {activeStore.comments.map((cmt) => renderCommentBlock(activeStore, cmt))}
          </div>
        </FluentModal>
      )}
    </div>
  );
};

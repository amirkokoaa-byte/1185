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

  // Search & Category Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyDraftText, setReplyDraftText] = useState<string>('');
  const [activeMenuPageIdx, setActiveMenuPageIdx] = useState<number>(0);
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
        locationUrl: storeLocationUrl.trim() || 'https://maps.google.com',
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
        locationUrl: storeLocationUrl.trim() || 'https://maps.google.com',
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

        {/* Only "الكل" Button (Categories horizontal scrolling strip hidden per instructions) */}
        <div className="flex items-center gap-2 pt-0.5">
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
        </div>
      </div>

      {/* Store Cards Grid (Clothing-Store Style Square Cards: First Menu Image on Top + Name/Details + Facebook 👍 / 👎) */}
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                  <div className="absolute top-3 right-3 left-3 flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-[#0A192F]/90 border border-sky-400/40 text-sky-300 font-bold">
                      {store.category}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-[#0A192F]/90 border border-amber-400/40 text-amber-300 font-mono-tabular font-bold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {ratingInfo.avg}
                    </span>
                  </div>

                  {store.menuImages.length > 1 && (
                    <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded bg-[#0A192F]/90 border border-[#334155] text-[11px] text-[#94A3B8]">
                      منيو ({store.menuImages.length} صفحات)
                    </div>
                  )}
                </div>

                {/* Store Name & Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4 relative z-10">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-extrabold text-[#F8FAFC] group-hover:text-sky-300 transition-colors line-clamp-1">
                      {store.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                      {store.details}
                    </p>
                  </div>

                  {/* Facebook-style Like (👍) and Dislike (👎) Bar */}
                  <div
                    className="pt-3 border-t border-[#334155]/80 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      {/* Facebook Like 👍 */}
                      <button
                        type="button"
                        onClick={() => onToggleStoreLike(store.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isLiked
                            ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.5)]'
                            : 'bg-[#0A192F] text-[#E2E8F0] hover:bg-[#1877F2]/20 border-[#334155]'
                        }`}
                      >
                        <span className="text-sm leading-none">👍</span>
                        <span>أعجبني</span>
                        <span className="font-mono-tabular">({store.likes.length})</span>
                      </button>

                      {/* Facebook Dislike 👎 */}
                      <button
                        type="button"
                        onClick={() => onToggleStoreDislike(store.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isDisliked
                            ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                            : 'bg-[#0A192F] text-[#94A3B8] hover:bg-rose-600/20 border-[#334155]'
                        }`}
                      >
                        <span className="text-sm leading-none">👎</span>
                        <span className="font-mono-tabular">({store.dislikes.length})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mr-auto">
                      {/* عدد المشاهدات في الأسفل على اليسار لجميع المستخدمين */}
                      <span
                        title="عدد المشاهدات لجميع المستخدمين"
                        className="px-2.5 py-1 rounded-lg bg-[#0A192F] border border-[#334155] text-[11px] font-bold text-sky-300 flex items-center gap-1 font-mono-tabular"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>{store.viewsCount || 0}</span>
                      </span>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditStoreModal(store)}
                            title="تعديل المحل"
                            className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/30 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStore(store.id)}
                            title="حذف المحل"
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="space-y-6">
            {/* Top Interactive 5-Star "قيّم" Section + Admin Edit/Delete Store */}
            <div className="p-4 rounded-2xl bg-[#0A192F] border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <div className="text-sm font-extrabold text-amber-300">
                  قيّم هذا المحل الآن
                </div>
                <div className="text-xs text-[#94A3B8]">
                  التقييم العام:{' '}
                  <strong className="text-[#F8FAFC] font-mono-tabular">
                    {getStoreRatingSummary(activeStore).avg} / 5
                  </strong>{' '}
                  ({getStoreRatingSummary(activeStore).count} تقييم)
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F8FAFC] ml-1">قيّم:</span>
                {[1, 2, 3, 4, 5].map((starNum) => {
                  const userCurrentStars =
                    activeStore.ratings[currentVisitorId] || newCommentRating;
                  const isActiveStar = starNum <= userCurrentStars;
                  return (
                    <button
                      key={starNum}
                      type="button"
                      onClick={() => {
                        setNewCommentRating(starNum);
                        onRateStore(activeStore.id, starNum);
                      }}
                      className="p-1.5 rounded-lg bg-[#112240] hover:bg-[#1E293B] border border-[#334155] transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          isActiveStar
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[#475569]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Row (Call + WhatsApp) & Location Row (Open Link) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone with "اتصال" & "مراسلة" */}
              <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-[#94A3B8] block">رقم هاتف المحل:</span>
                  <span className="text-base font-extrabold text-sky-400 font-mono-tabular">
                    {activeStore.phone}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${activeStore.phone}`}
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/${(
                      activeStore.whatsapp || activeStore.phone
                    ).replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>مراسلة</span>
                  </a>
                </div>
              </div>

              {/* Location with "فتح الرابط" */}
              <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs text-[#94A3B8] block">لوكيشن المحل (Google Maps):</span>
                  <span className="text-xs font-mono-tabular text-[#E2E8F0] truncate block">
                    {activeStore.locationUrl}
                  </span>
                </div>

                <a
                  href={activeStore.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 shadow"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح الرابط</span>
                </a>
              </div>
            </div>

            {/* Store Full Details */}
            <div className="p-4 rounded-xl bg-[#0A192F]/80 border border-[#334155] space-y-1.5">
              <div className="text-xs font-bold text-sky-400">تفاصيل المحل:</div>
              <p className="text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-line">
                {activeStore.details}
              </p>
            </div>

            {/* Menu Section with "تحميل المنيو" and Site Link Copyright Below Image */}
            {activeStore.menuImages.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#0A192F] border border-[#334155] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#F8FAFC]">
                      منيو المحل ({activeStore.menuImages.length} صفحة)
                    </h4>
                  </div>

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

                {activeStore.menuImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeStore.menuImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveMenuPageIdx(idx)}
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

                <div className="rounded-xl overflow-hidden border border-[#334155] bg-[#112240]">
                  <img
                    src={
                      activeStore.menuImages[activeMenuPageIdx] ||
                      activeStore.menuImages[0]
                    }
                    alt={`منيو ${activeStore.name}`}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-[420px] object-contain mx-auto"
                  />
                </div>

                {/* Site Link as Copyright directly underneath the Menu Image */}
                <div className="text-center py-2 px-3 rounded-lg bg-[#112240] border border-[#334155]/80 text-xs text-sky-400 font-mono-tabular">
                  جميع الحقوق محفوظة للمنصة: {siteCopyrightUrl}
                </div>
              </div>
            )}

            {/* Bottom Section: Add Rating & Comment Form */}
            <div className="p-4 rounded-2xl bg-[#0A192F] border border-sky-400/30 space-y-3">
              <h4 className="text-sm font-extrabold text-[#F8FAFC]">
                أضف تقييم وتعليق على {activeStore.name}
              </h4>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#94A3B8]">أضف تقييم:</span>
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewCommentRating(st)}
                    className="cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        st <= newCommentRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-[#475569]'
                      }`}
                    />
                  </button>
                ))}
              </div>

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
                  placeholder="أضف تعليقك هنا ليظهر لحظياً لجميع المستخدمين..."
                  className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] outline-none"
                />
                <FluentButton
                  variant="primary"
                  onClick={() => {
                    if (!newCommentText.trim()) return;
                    if (containsAbusiveWords(newCommentText)) {
                      setProfanityWarning(ABUSIVE_CONTENT_WARNING_MESSAGE);
                      return;
                    }
                    setProfanityWarning('');
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

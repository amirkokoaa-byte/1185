import React, { useState } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Phone,
  MessageCircle,
  ExternalLink,
  Edit3,
  Trash2,
  FileSpreadsheet,
  FileText,
  MapPin,
  Save,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  Upload,
  Image as ImageIcon,
  Briefcase,
  ThumbsUp,
  Star,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PlatformSettings,
  ServicePhoneEntry,
  StoreCommentItem,
  UserAccount,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import {
  ensureServiceProfessionsList,
  getOrCreateVisitorId,
  uploadImageDynamic,
} from '../services/storageService';
import {
  exportServiceNumbersToExcel,
  exportServiceNumbersToPDF,
} from '../services/exportService';

interface ServiceNumbersViewProps {
  serviceNumbers: ServicePhoneEntry[];
  settings?: PlatformSettings;
  currentUser: UserAccount | null;
  onAddServiceNumber: (entry: ServicePhoneEntry) => void;
  onUpdateServiceNumber: (entry: ServicePhoneEntry) => void;
  onDeleteServiceNumber: (id: string) => void;
  onUpdateSettings?: (settings: PlatformSettings) => void;
}

export const ServiceNumbersView: React.FC<ServiceNumbersViewProps> = ({
  serviceNumbers,
  settings,
  currentUser,
  onAddServiceNumber,
  onUpdateServiceNumber,
  onDeleteServiceNumber,
  onUpdateSettings,
}) => {
  // Moderator has all Admin privileges EXCEPT permanent deletion & admin-only table
  const isStrictAdmin =
    currentUser?.role === 'admin' ||
    Boolean(currentUser?.username && currentUser.username.trim().toLowerCase() === 'admin');
  const isAdmin =
    isStrictAdmin || currentUser?.role === 'moderator';

  const visitorKey = getOrCreateVisitorId(currentUser);

  // Professions List (Default 10 professions + any custom added professions)
  const [customLocalProfessions, setCustomLocalProfessions] = useState<string[]>(
    []
  );
  const availableProfessions = ensureServiceProfessionsList([
    ...(settings?.serviceProfessions || []),
    ...customLocalProfessions,
  ]);

  // Search & View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'table' | 'cards'>('both');

  // Add / Edit Service Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ServicePhoneEntry | null>(
    null
  );
  const [providerName, setProviderName] = useState('');
  const [providerProfession, setProviderProfession] = useState('نجار');
  const [isAddingNewProfession, setIsAddingNewProfession] = useState(false);
  const [newProfessionInput, setNewProfessionInput] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerLocationUrl, setProviderLocationUrl] = useState('');
  const [providerImageUrl, setProviderImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Service Details Modal State (with Likes, Views, Star Ratings, Latest 3 Comments + المزيد Dropdown)
  const [inspectingEntryId, setInspectingEntryId] = useState<string | null>(
    null
  );
  const inspectingEntry =
    serviceNumbers.find((s) => s.id === inspectingEntryId) || null;

  // Rating & Comment State inside Worker Modal
  const [commentAuthorName, setCommentAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState<number>(5);
  const [showPreviousCommentsDropdown, setShowPreviousCommentsDropdown] =
    useState(false);
  const [selectedPreviousCommentId, setSelectedPreviousCommentId] =
    useState<string>('');

  const hasValidLocation = (loc?: string) => {
    const clean = (loc || '').trim();
    return Boolean(clean && clean !== 'https://maps.google.com');
  };

  const calculateStarStats = (srv: ServicePhoneEntry) => {
    const ratingsObj = srv.ratings || {};
    const values = Object.values(ratingsObj).filter(
      (v) => typeof v === 'number' && v >= 1 && v <= 5
    );
    if (values.length === 0) {
      return { avg: 0, count: 0, userRating: 0 };
    }
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = Number((sum / values.length).toFixed(1));
    const userRating = ratingsObj[visitorKey] || 0;
    return { avg, count: values.length, userRating };
  };

  // Open Worker Details Modal & Increment Views Count
  const handleOpenWorkerModal = (entry: ServicePhoneEntry) => {
    setInspectingEntryId(entry.id);
    setShowPreviousCommentsDropdown(false);
    setSelectedPreviousCommentId('');
    setCommentText('');
    const currentUserStar = entry.ratings?.[visitorKey] || 5;
    setCommentRating(currentUserStar);
    onUpdateServiceNumber({
      ...entry,
      viewsCount: (entry.viewsCount || 0) + 1,
    });
  };

  // Toggle Like on Worker
  const handleToggleLike = (
    entry: ServicePhoneEntry,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const currentLikes = Array.isArray(entry.likes) ? entry.likes : [];
    const hasLiked = currentLikes.includes(visitorKey);
    const nextLikes = hasLiked
      ? currentLikes.filter((id) => id !== visitorKey)
      : [...currentLikes, visitorKey];
    onUpdateServiceNumber({
      ...entry,
      likes: nextLikes,
    });
  };

  // Rate Worker with 1..5 Stars
  const handleRateWorker = (entry: ServicePhoneEntry, stars: number) => {
    const cleanStars = Math.min(5, Math.max(1, stars));
    setCommentRating(cleanStars);
    const nextRatings = {
      ...(entry.ratings || {}),
      [visitorKey]: cleanStars,
    };
    onUpdateServiceNumber({
      ...entry,
      ratings: nextRatings,
    });
  };

  // Add Comment on Worker
  const handleAddWorkerComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingEntry || !commentText.trim()) return;
    const authorUsername =
      currentUser?.username || commentAuthorName.trim() || 'مستخدم';
    const newComment: StoreCommentItem = {
      id: `srv-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorId: currentUser?.id || visitorKey,
      authorUsername,
      text: commentText.trim(),
      rating: commentRating,
      likes: [],
      replies: [],
      createdAt: new Date().toISOString(),
    };
    const nextRatings = {
      ...(inspectingEntry.ratings || {}),
      [visitorKey]: commentRating,
    };
    const existingComments = Array.isArray(inspectingEntry.comments)
      ? inspectingEntry.comments
      : [];
    onUpdateServiceNumber({
      ...inspectingEntry,
      ratings: nextRatings,
      comments: [newComment, ...existingComments],
    });
    setCommentText('');
  };

  const handleDeleteWorkerComment = (
    entry: ServicePhoneEntry,
    commentId: string
  ) => {
    if (!isAdmin) return;
    const existingComments = Array.isArray(entry.comments)
      ? entry.comments
      : [];
    onUpdateServiceNumber({
      ...entry,
      comments: existingComments.filter((c) => c.id !== commentId),
    });
  };

  // Handle adding a new profession via the "+" button
  const handleAddNewProfession = () => {
    const trimmed = newProfessionInput.trim();
    if (!trimmed) return;
    const updatedList = ensureServiceProfessionsList([
      ...availableProfessions,
      trimmed,
    ]);
    setCustomLocalProfessions(updatedList);
    setProviderProfession(trimmed);
    setNewProfessionInput('');
    setIsAddingNewProfession(false);
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        serviceProfessions: updatedList,
        updatedAt: Date.now(),
      });
    }
  };

  // Open Modal for Adding New Service
  const openAddModal = () => {
    setEditingEntry(null);
    setProviderName('');
    setProviderProfession(availableProfessions[0] || 'نجار');
    setIsAddingNewProfession(false);
    setNewProfessionInput('');
    setProviderNotes('');
    setProviderPhone('');
    setProviderLocationUrl('');
    setProviderImageUrl('');
    setIsFormModalOpen(true);
  };

  // Open Modal for Editing Existing Service (Admin / Moderator)
  const openEditModal = (entry: ServicePhoneEntry) => {
    setEditingEntry(entry);
    setProviderName(entry.title);
    const existingProf = (entry.profession || '').trim();
    if (existingProf && !availableProfessions.includes(existingProf)) {
      setCustomLocalProfessions((prev) =>
        Array.from(new Set([...prev, existingProf]))
      );
    }
    setProviderProfession(existingProf || availableProfessions[0] || 'نجار');
    setIsAddingNewProfession(false);
    setNewProfessionInput('');
    setProviderNotes(entry.notes || '');
    setProviderPhone(entry.phone);
    setProviderLocationUrl(
      hasValidLocation(entry.locationUrl) ? entry.locationUrl : ''
    );
    setProviderImageUrl(entry.imageUrl || '');
    setIsFormModalOpen(true);
  };

  const handleUploadServiceImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImageDynamic(file, settings?.imgbbApiKey);
      setProviderImageUrl(res.url);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Handle Save (Add or Edit)
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !providerPhone.trim()) return;

    const cleanLocation = providerLocationUrl.trim();
    const cleanProfession = providerProfession.trim();
    const cleanNotes = providerNotes.trim();
    const cleanImage = providerImageUrl.trim();

    if (cleanProfession && !availableProfessions.includes(cleanProfession)) {
      const updatedList = ensureServiceProfessionsList([
        ...availableProfessions,
        cleanProfession,
      ]);
      setCustomLocalProfessions(updatedList);
      if (settings && onUpdateSettings) {
        onUpdateSettings({
          ...settings,
          serviceProfessions: updatedList,
          updatedAt: Date.now(),
        });
      }
    }

    if (editingEntry) {
      onUpdateServiceNumber({
        ...editingEntry,
        title: providerName.trim(),
        profession: cleanProfession || undefined,
        phone: providerPhone.trim(),
        locationUrl: cleanLocation,
        imageUrl: cleanImage || undefined,
        notes: cleanNotes || undefined,
      });
    } else {
      const newEntry: ServicePhoneEntry = {
        id: `srvnum-${Date.now()}`,
        title: providerName.trim(),
        profession: cleanProfession || undefined,
        phone: providerPhone.trim(),
        locationUrl: cleanLocation,
        imageUrl: cleanImage || undefined,
        category: cleanProfession || 'خدمات عامة',
        notes: cleanNotes || undefined,
        likes: [],
        viewsCount: 0,
        ratings: {},
        comments: [],
        createdAt: new Date().toISOString(),
      };
      onAddServiceNumber(newEntry);
    }

    setIsFormModalOpen(false);
    setEditingEntry(null);
  };

  const filteredServices = serviceNumbers.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      (s.profession && s.profession.toLowerCase().includes(q)) ||
      s.phone.includes(q) ||
      (s.notes && s.notes.toLowerCase().includes(q)) ||
      (s.locationUrl && s.locationUrl.toLowerCase().includes(q))
    );
  });

  const formatWhatsappNumber = (rawPhone: string) => {
    const digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('01') && digits.length === 11) {
      return `2${digits}`;
    }
    return digits;
  };

  // Sort comments newest first for inspectingEntry
  const sortedInspectorComments = inspectingEntry
    ? [...(inspectingEntry.comments || [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];
  const latestThreeComments = sortedInspectorComments.slice(0, 3);
  const olderComments = sortedInspectorComments.slice(3);

  return (
    <div className="space-y-5 w-full overflow-x-hidden">
      {/* Top Header Bar: Title + Row 1 ("أضف خدمة" + "الكل | بطاقات | جدول" in 1 line) + Row 2 below it (Excel & PDF buttons) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#112240]/95 border border-[#334155] rounded-2xl p-3 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
            <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-xl font-extrabold text-[#F8FAFC]">
              أرقام الخدمات ومقدمي الخدمة
            </h1>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] hidden sm:block">
              دليل أرقام الفنيين، الطوارئ، ومقدمي الخدمات مع الاتصال والمراسلة واللوكيشن المباشر
            </p>
          </div>
        </div>

        {/* Right/Bottom Toolbar: Row 1 = "أضف خدمة" + "الكل | بطاقات | جدول" in 1 line; Row 2 below it = Excel & PDF buttons */}
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          {/* السطر الأول: زر أضف خدمة (لـ admin أو مشرف فقط) + الكل / بطاقات / جدول (لـ admin فقط) */}
          {(isAdmin || isStrictAdmin) && (
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 flex-nowrap w-full">
              {isAdmin && (
                <FluentButton
                  variant="primary"
                  size="sm"
                  onClick={openAddModal}
                  className="shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>أضف خدمة</span>
                </FluentButton>
              )}

              {isStrictAdmin && (
                <div className="flex items-center rounded-xl bg-[#0A192F] border border-[#334155] p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('both')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                      viewMode === 'both'
                        ? 'bg-sky-600 text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      viewMode === 'cards'
                        ? 'bg-sky-600 text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>بطاقات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                      viewMode === 'table'
                        ? 'bg-sky-600 text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span>جدول</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* السطر الثاني أسفلها: أزرار إكسيل و PDF */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full">
              <FluentButton
                variant="secondary"
                size="sm"
                onClick={() => exportServiceNumbersToExcel(filteredServices)}
                className="w-full sm:w-auto justify-center whitespace-nowrap text-xs py-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span>تصدير إكسيل</span>
              </FluentButton>

              <FluentButton
                variant="secondary"
                size="sm"
                onClick={() => exportServiceNumbersToPDF(filteredServices)}
                className="w-full sm:w-auto justify-center whitespace-nowrap text-xs py-1.5"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                <span>تصدير PDF</span>
              </FluentButton>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#112240]/80 border border-[#334155] rounded-2xl p-3 sm:p-4">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم مقدم الخدمة أو المهنة أو رقم الهاتف..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-3 py-2 sm:py-2.5 text-xs sm:text-sm text-[#F8FAFC] outline-none"
            />
          </div>
          <FluentButton variant="primary" size="sm" className="shrink-0">
            <Search className="w-4 h-4" />
            <span>بحث</span>
          </FluentButton>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <FluentCard className="p-10 text-center space-y-3">
          <PhoneCall className="w-10 h-10 text-sky-400 mx-auto opacity-80" />
          <div className="text-base font-bold text-[#F8FAFC]">
            لا توجد خدمات مسجلة مطابقة للبحث حالياً
          </div>
          <p className="text-xs text-[#94A3B8]">
            اضغط على زر &quot;أضف خدمة&quot; بالأعلى لإضافة مقدم خدمة جديد
          </p>
        </FluentCard>
      ) : (
        <>
          {/* 1. Cards View */}
          {(!isStrictAdmin || viewMode === 'both' || viewMode === 'cards') && (
            <div className="flex flex-col space-y-2.5 w-full">
              {filteredServices.map((srv) => {
                const showLocationBtn = hasValidLocation(srv.locationUrl);
                const likesList = Array.isArray(srv.likes) ? srv.likes : [];
                const isLiked = likesList.includes(visitorKey);
                const viewsCount = srv.viewsCount || 0;
                const starStats = calculateStarStats(srv);

                return (
                  <div
                    key={srv.id}
                    onClick={() => handleOpenWorkerModal(srv)}
                    className="fluent-reveal p-2.5 sm:p-4 rounded-2xl bg-white text-black border-2 border-slate-300 hover:border-sky-500 w-full overflow-hidden shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
                      {/* الجانب الأيمن: الصورة المربعة + الاسم والمهنة ورقم الهاتف واللايكات والمشاهدات والتقييم من الخارج */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {srv.imageUrl ? (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                            <img
                              src={srv.imageUrl}
                              alt={srv.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                            <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* الاسم وبجانبه المهنة */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-xs sm:text-base font-extrabold text-black hover:text-sky-700 underline-offset-2 hover:underline break-words leading-snug">
                              {srv.title}
                            </h3>
                            {srv.profession && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-black text-[10px] sm:text-xs font-extrabold whitespace-nowrap">
                                {srv.profession}
                              </span>
                            )}
                          </div>

                          {/* أسفله رقم الهاتف */}
                          <div className="text-xs sm:text-sm font-extrabold text-black font-mono-tabular">
                            {srv.phone}
                          </div>

                          {/* التفاصيل إن وجدت */}
                          {srv.notes && (
                            <p className="text-[11px] text-slate-800 font-semibold line-clamp-1 break-words">
                              {srv.notes}
                            </p>
                          )}

                          {/* شريط اللايكات والمشاهدات والنجوم من الخارج */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleToggleLike(srv, e)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold border cursor-pointer transition-colors ${
                                isLiked
                                  ? 'bg-sky-600 text-white border-sky-700'
                                  : 'bg-slate-100 hover:bg-sky-50 text-black border-slate-300'
                              }`}
                              title="إعجاب (لايك)"
                            >
                              <ThumbsUp className="w-3 h-3 shrink-0" />
                              <span>{likesList.length}</span>
                            </button>

                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-black text-[10px] sm:text-xs font-extrabold"
                              title="عدد المشاهدات"
                            >
                              <Eye className="w-3 h-3 text-sky-700 shrink-0" />
                              <span>{viewsCount}</span>
                            </span>

                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-300 text-black text-[10px] sm:text-xs font-extrabold"
                              title="التقييم بالنجوم"
                            >
                              <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                              <span>
                                {starStats.avg > 0
                                  ? `${starStats.avg} (${starStats.count})`
                                  : 'قيّم الآن'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* الجانب الأيسر: زر الاتصال + زر المراسلة + فتح الموقع + تعديل وحذف */}
                      <div
                        className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 shrink-0 max-w-[46%] sm:max-w-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`tel:${srv.phone}`}
                          className="fluent-reveal inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] sm:text-xs font-bold shadow whitespace-nowrap shrink-0"
                        >
                          <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span>اتصال</span>
                        </a>

                        <a
                          href={`https://wa.me/${formatWhatsappNumber(srv.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fluent-reveal inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold shadow whitespace-nowrap shrink-0"
                        >
                          <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span>مراسلة</span>
                        </a>

                        {showLocationBtn && (
                          <a
                            href={srv.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fluent-reveal inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs font-bold shrink-0 shadow whitespace-nowrap"
                          >
                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                            <span>فتح الموقع</span>
                          </a>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openEditModal(srv)}
                            title="تعديل الخدمة"
                            className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300 cursor-pointer transition-colors shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isStrictAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeleteServiceNumber(srv.id)}
                            title="حذف الخدمة (Admin فقط)"
                            className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 cursor-pointer transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Formatted Table View (White background & black text without horizontal scroll bar on mobile - Admin Only) */}
          {isStrictAdmin && (viewMode === 'both' || viewMode === 'table') && (
            <div className="bg-white text-black border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg w-full">
              <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-black">
                  جدول أرقام الخدمات المنسق ({filteredServices.length} خدمة)
                </h3>
              </div>

              <div className="w-full overflow-x-hidden">
                <table className="w-full text-right border-collapse table-fixed sm:table-auto">
                  <thead>
                    <tr className="bg-slate-50 text-black text-[10px] sm:text-xs border-b border-slate-300">
                      <th className="py-2.5 px-2 sm:px-4 font-extrabold border-l border-slate-200 w-[44%] sm:w-auto">
                        مقدم الخدمة والمهنة
                      </th>
                      <th className="py-2.5 px-2 sm:px-4 font-extrabold border-l border-slate-200 w-[56%] sm:w-auto">
                        رقم الهاتف والتواصل واللوكيشن
                      </th>
                      {isAdmin && (
                        <th className="hidden sm:table-cell py-2.5 px-3 font-extrabold text-center">
                          إدارة
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm text-black">
                    {filteredServices.map((srv) => {
                      const showLocationBtn = hasValidLocation(srv.locationUrl);
                      const likesList = Array.isArray(srv.likes) ? srv.likes : [];
                      const isLiked = likesList.includes(visitorKey);
                      const viewsCount = srv.viewsCount || 0;
                      const starStats = calculateStarStats(srv);

                      return (
                        <tr
                          key={srv.id}
                          onClick={() => handleOpenWorkerModal(srv)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-2 sm:px-4 border-l border-slate-200 align-middle">
                            <div className="flex items-center gap-2 min-w-0">
                              {srv.imageUrl && (
                                <img
                                  src={srv.imageUrl}
                                  alt={srv.title}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-cover border border-slate-300 shrink-0"
                                />
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <div className="font-extrabold text-black hover:text-sky-700 hover:underline break-words leading-snug">
                                  {srv.title}
                                </div>
                                {srv.profession && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-black text-[10px] font-bold">
                                    {srv.profession}
                                  </span>
                                )}
                                {srv.notes && (
                                  <div className="text-[10px] text-slate-800 font-medium line-clamp-1">
                                    {srv.notes}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleLike(srv, e)}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold border cursor-pointer ${
                                      isLiked
                                        ? 'bg-sky-600 text-white border-sky-700'
                                        : 'bg-slate-100 text-black border-slate-300'
                                    }`}
                                  >
                                    <ThumbsUp className="w-2.5 h-2.5" />
                                    <span>{likesList.length}</span>
                                  </button>
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-black text-[10px] font-extrabold">
                                    <Eye className="w-2.5 h-2.5 text-sky-700" />
                                    <span>{viewsCount}</span>
                                  </span>
                                  {starStats.avg > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-black text-[10px] font-extrabold">
                                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                                      <span>{starStats.avg}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td
                            className="py-2.5 px-2 sm:px-4 border-l border-slate-200 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <span className="font-mono-tabular font-extrabold text-black text-xs sm:text-sm">
                                {srv.phone}
                              </span>
                              <div className="flex flex-wrap items-center gap-1">
                                <a
                                  href={`tel:${srv.phone}`}
                                  className="fluent-reveal inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] sm:text-xs font-bold"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>اتصال</span>
                                </a>
                                <a
                                  href={`https://wa.me/${formatWhatsappNumber(
                                    srv.phone
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="fluent-reveal inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>مراسلة</span>
                                </a>
                                {showLocationBtn && (
                                  <a
                                    href={srv.locationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="fluent-reveal inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs font-bold"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>فتح الموقع</span>
                                  </a>
                                )}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(srv)}
                                    className="sm:hidden p-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer"
                                    title="تعديل"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                                {isStrictAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteServiceNumber(srv.id)}
                                    className="sm:hidden p-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {isAdmin && (
                            <td
                              className="hidden sm:table-cell py-2.5 px-3 text-center align-middle"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(srv)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>
                                {isStrictAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteServiceNumber(srv.id)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>حذف</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= MODAL 1: ADD / EDIT SERVICE ("أضف خدمة جديدة") ================= */}
      <FluentModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEntry(null);
        }}
        title={editingEntry ? 'تعديل بيانات مقدم الخدمة' : 'أضف خدمة جديدة'}
        subtitle="أدخل اسم مقدم الخدمة والمهنة والتفاصيل ورقم الهاتف واللوكيشن والصورة"
        maxWidth="lg"
        theme="light"
      >
        <form onSubmit={handleSaveService} className="space-y-4 text-black">
          {/* 1. اسم مقدم الخدمة وبجانبه المهنة (قائمة منسدلة + زر + لإضافة مهنة جديدة) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-black mb-1.5">
                اسم مقدم الخدمة *
              </label>
              <input
                type="text"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="مثال: المعلم حسن..."
                className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-sm text-black font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-black mb-1.5">
                المهنة
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Briefcase className="w-4 h-4 text-sky-700 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={providerProfession}
                    onChange={(e) => setProviderProfession(e.target.value)}
                    className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 pr-9 pl-3 py-2.5 text-sm text-black font-extrabold outline-none cursor-pointer"
                  >
                    {availableProfessions.map((prof) => (
                      <option
                        key={prof}
                        value={prof}
                        className="bg-white text-black font-bold"
                      >
                        {prof}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingNewProfession((prev) => !prev)
                  }
                  title="إضافة مهنة جديدة إلى القائمة"
                  className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold flex items-center justify-center shadow cursor-pointer shrink-0 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {isAddingNewProfession && (
                <div className="mt-2 p-2.5 rounded-xl bg-sky-50 border border-sky-300 flex items-center gap-2">
                  <input
                    type="text"
                    value={newProfessionInput}
                    onChange={(e) => setNewProfessionInput(e.target.value)}
                    placeholder="اكتب اسم المهنة الجديدة..."
                    className="flex-1 min-w-0 rounded-lg bg-white border border-slate-300 focus:border-sky-600 px-2.5 py-1.5 text-xs text-black font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewProfession}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    إضافة
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. أسفل اسم مقدم الخدمة: خانة تفاصيل */}
          <div>
            <label className="block text-xs font-extrabold text-black mb-1.5">
              تفاصيل
            </label>
            <textarea
              rows={2}
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              placeholder="اكتب تفاصيل الخدمة أو المواعيد أو العنوان..."
              className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2 text-sm text-black font-bold outline-none"
            />
          </div>

          {/* 3. أسفله رقم الهاتف */}
          <div>
            <label className="block text-xs font-extrabold text-black mb-1.5">
              رقم الهاتف *
            </label>
            <input
              type="tel"
              required
              value={providerPhone}
              onChange={(e) => setProviderPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-bold font-mono-tabular outline-none"
            />
          </div>

          {/* 4. أسفله خانة اللوكيشن (اختياري) */}
          <div>
            <label className="block text-xs font-extrabold text-black mb-1.5">
              اللوكيشن (اختياري — في حالة عدم تسجيل لوكيشن لا يظهر زر فتح الموقع)
            </label>
            <input
              type="url"
              value={providerLocationUrl}
              onChange={(e) => setProviderLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 px-3.5 py-2.5 text-black font-bold font-mono-tabular outline-none"
            />
          </div>

          {/* 5. أسفل اللوكيشن: زر أضف صورة + خانة يمكن وضع رابط الصورة */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-black flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-700" />
                <span>صورة مقدم الخدمة (رفع صورة أو وضع رابط الصورة)</span>
              </label>

              <label className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer shadow">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingImage ? 'جاري رفع الصورة...' : 'أضف صورة'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadServiceImage}
                  className="hidden"
                />
              </label>
            </div>

            <input
              type="url"
              value={providerImageUrl}
              onChange={(e) => setProviderImageUrl(e.target.value)}
              placeholder="أو ضع رابط الصورة المباشر هنا (https://...)"
              className="w-full rounded-xl bg-white border border-slate-300 focus:border-sky-600 px-3.5 py-2 text-xs text-black font-bold font-mono-tabular outline-none"
            />

            {providerImageUrl && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={providerImageUrl}
                  alt="معاينة"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setProviderImageUrl('')}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  إزالة الصورة
                </button>
              </div>
            )}
          </div>

          {/* 6. زر "حفظ" */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingEntry(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-extrabold cursor-pointer"
            >
              إلغاء
            </button>
            <FluentButton type="submit" variant="primary" size="lg">
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </FluentButton>
          </div>
        </form>
      </FluentModal>

      {/* ================= MODAL 2: WORKER / SERVICE DETAILS MODAL (WITH LIKES, VIEWS, STAR RATINGS & COMMENTS) ================= */}
      {inspectingEntry && (
        <FluentModal
          isOpen={!!inspectingEntry}
          onClose={() => setInspectingEntryId(null)}
          title={inspectingEntry.title}
          subtitle={
            inspectingEntry.profession || 'تفاصيل مقدم الخدمة والتواصل المباشر'
          }
          maxWidth="lg"
          theme="light"
        >
          {(() => {
            const likesList = Array.isArray(inspectingEntry.likes)
              ? inspectingEntry.likes
              : [];
            const isLiked = likesList.includes(visitorKey);
            const viewsCount = inspectingEntry.viewsCount || 0;
            const starStats = calculateStarStats(inspectingEntry);

            return (
              <div className="space-y-4 text-black">
                {/* بطاقة تعريف العامل + زر لايك + عدد اللايكات والمشاهدات */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {inspectingEntry.imageUrl && (
                      <img
                        src={inspectingEntry.imageUrl}
                        alt={inspectingEntry.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-300 shrink-0 bg-white"
                      />
                    )}
                    <div className="space-y-1 min-w-0">
                      <span className="text-xs font-bold text-slate-700">
                        اسم مقدم الخدمة:
                      </span>
                      <div className="text-base font-extrabold text-black flex flex-wrap items-center gap-2">
                        <span>{inspectingEntry.title}</span>
                        {inspectingEntry.profession && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-300 text-black text-xs font-extrabold">
                            {inspectingEntry.profession}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* زر لايك + عدد اللايكات والمشاهدات */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(inspectingEntry, e)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 cursor-pointer transition-all shadow-sm ${
                        isLiked
                          ? 'bg-sky-600 text-white border-sky-700'
                          : 'bg-white hover:bg-sky-50 text-black border-slate-300'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>أعجبني ({likesList.length})</span>
                    </button>

                    <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border-2 border-slate-300 text-xs font-extrabold text-black">
                      <Eye className="w-4 h-4 text-sky-700" />
                      <span>المشاهدات: {viewsCount}</span>
                    </div>
                  </div>
                </div>

                {/* التقييم بالنجوم (مثل المتاحة في المحلات) */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-black block">
                      تقييم مقدم الخدمة بالنجوم:
                    </span>
                    <div className="text-xs font-bold text-slate-800">
                      {starStats.avg > 0
                        ? `متوسط التقييم: ${starStats.avg} من 5 (${starStats.count} تقييم)`
                        : 'كن أول من يقيّم مقدم الخدمة'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeStar =
                        (starStats.userRating || Math.round(starStats.avg)) >=
                        star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            handleRateWorker(inspectingEntry, star)
                          }
                          className="p-1 rounded-lg hover:bg-amber-100 cursor-pointer transition-transform hover:scale-110"
                          title={`تقييم ${star} نجوم`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              activeStar
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {inspectingEntry.notes && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                    <span className="text-xs font-extrabold text-black">
                      تفاصيل:
                    </span>
                    <p className="text-sm font-bold text-black whitespace-pre-wrap leading-relaxed">
                      {inspectingEntry.notes}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      رقم الهاتف:
                    </span>
                    <span className="text-base font-extrabold text-black font-mono-tabular">
                      {inspectingEntry.phone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${inspectingEntry.phone}`}
                      className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={`https://wa.me/${formatWhatsappNumber(
                        inspectingEntry.phone
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>مراسلة</span>
                    </a>
                  </div>
                </div>

                {hasValidLocation(inspectingEntry.locationUrl) && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-700 block">
                        اللوكيشن:
                      </span>
                      <span className="text-xs font-mono-tabular font-bold text-black truncate block">
                        {inspectingEntry.locationUrl}
                      </span>
                    </div>

                    <a
                      href={inspectingEntry.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح الموقع</span>
                    </a>
                  </div>
                )}

                {/* ================= COMMENTS SECTION (آخر 3 تعليقات + زر المزيد لقائمة جميع التعليقات السابقة) ================= */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-extrabold text-black">
                      التعليقات وتجارب المستخدمين ({sortedInspectorComments.length})
                    </h4>
                    <span className="text-[11px] font-bold text-slate-700">
                      يظهر آخر 3 تعليقات
                    </span>
                  </div>

                  {/* نموذج إضافة تعليق جديد */}
                  <form
                    onSubmit={handleAddWorkerComment}
                    className="space-y-2 bg-white p-3 rounded-xl border border-slate-300"
                  >
                    {!currentUser && (
                      <input
                        type="text"
                        value={commentAuthorName}
                        onChange={(e) => setCommentAuthorName(e.target.value)}
                        placeholder="اسمك (اختياري)..."
                        className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs text-black font-bold outline-none"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-black">
                        تقييمك:
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setCommentRating(st)}
                            className="p-0.5 cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                commentRating >= st
                                  ? 'text-amber-500 fill-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="اكتب تعليقك أو تجربتك مع مقدم الخدمة..."
                        className="flex-1 min-w-0 rounded-lg bg-slate-50 border border-slate-300 focus:border-sky-600 px-3 py-2 text-xs text-black font-bold outline-none"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </form>

                  {/* عرض آخر 3 تعليقات */}
                  {latestThreeComments.length === 0 ? (
                    <div className="text-center py-3 text-xs font-bold text-slate-600">
                      لا توجد تعليقات بعد. أضف أول تعليق!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {latestThreeComments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-300 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-black">
                                {cmt.authorUsername}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-[10px] font-extrabold text-black">
                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                                <span>{cmt.rating || 5}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-600">
                                {new Date(cmt.createdAt).toLocaleDateString(
                                  'ar-EG'
                                )}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteWorkerComment(
                                      inspectingEntry,
                                      cmt.id
                                    )
                                  }
                                  className="text-rose-600 hover:text-rose-800 cursor-pointer"
                                  title="حذف التعليق"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-bold text-black break-words">
                            {cmt.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* زر "المزيد" عند وجود تعليقات أخرى لعرض قائمة منسدلة بجميع التعليقات السابقة */}
                  {olderComments.length > 0 && (
                    <div className="pt-1 space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowPreviousCommentsDropdown((prev) => !prev)
                        }
                        className="w-full py-2 px-3 rounded-xl bg-sky-100 hover:bg-sky-200 border border-sky-300 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>
                          المزيد ({olderComments.length} تعليقات سابقة)
                        </span>
                        {showPreviousCommentsDropdown ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {showPreviousCommentsDropdown && (
                        <div className="p-3 rounded-xl bg-white border-2 border-sky-300 space-y-2.5">
                          <label className="block text-xs font-extrabold text-black">
                            قائمة منسدلة بجميع التعليقات السابقة ({sortedInspectorComments.length}):
                          </label>
                          <select
                            value={selectedPreviousCommentId}
                            onChange={(e) =>
                              setSelectedPreviousCommentId(e.target.value)
                            }
                            className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-black font-bold outline-none cursor-pointer"
                          >
                            <option value="">
                              -- اختر من جميع التعليقات السابقة ({sortedInspectorComments.length}) --
                            </option>
                            {sortedInspectorComments.map((cmt, idx) => (
                              <option key={cmt.id} value={cmt.id}>
                                {idx + 1}. {cmt.authorUsername} (★{cmt.rating || 5}):{' '}
                                {cmt.text.slice(0, 65)}
                              </option>
                            ))}
                          </select>

                          <div className="max-h-52 overflow-y-auto space-y-2 pt-1">
                            {olderComments.map((cmt) => (
                              <div
                                key={cmt.id}
                                className={`p-2.5 rounded-lg border space-y-1 ${
                                  selectedPreviousCommentId === cmt.id
                                    ? 'bg-sky-50 border-sky-500'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-extrabold text-black">
                                      {cmt.authorUsername}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-[10px] font-extrabold text-black">
                                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                                      <span>{cmt.rating || 5}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-600">
                                      {new Date(
                                        cmt.createdAt
                                      ).toLocaleDateString('ar-EG')}
                                    </span>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteWorkerComment(
                                            inspectingEntry,
                                            cmt.id
                                          )
                                        }
                                        className="text-rose-600 hover:text-rose-800 cursor-pointer"
                                        title="حذف التعليق"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs font-bold text-black break-words">
                                  {cmt.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin / Moderator Controls inside the Modal */}
                {isAdmin && (
                  <div className="pt-3 border-t border-slate-300 flex items-center justify-between gap-3">
                    <span className="text-xs font-extrabold text-black">
                      صلاحيات الإدارة:
                    </span>
                    <div className="flex items-center gap-2">
                      <FluentButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const target = inspectingEntry;
                          setInspectingEntryId(null);
                          openEditModal(target);
                        }}
                      >
                        <Edit3 className="w-4 h-4 text-amber-400" />
                        <span>تعديل الخدمة</span>
                      </FluentButton>
                      {isStrictAdmin && (
                        <FluentButton
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const targetId = inspectingEntry.id;
                            setInspectingEntryId(null);
                            onDeleteServiceNumber(targetId);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف الخدمة</span>
                        </FluentButton>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </FluentModal>
      )}
    </div>
  );
};



import React, { useEffect, useState } from 'react';
import {
  Plus,
  MapPin,
  Calendar,
  ExternalLink,
  Trash2,
  CheckCircle2,
  FileText,
  X,
  Edit3,
  LayoutGrid,
  LayoutList,
  Download,
} from 'lucide-react';
import {
  ChatModerationPenalty,
  ChatTypingEntry,
  CommentEmojiReactionType,
  CommunityCommentItem,
  CommunityCommentReply,
  CommunityPostItem,
  CommunityPostStatus,
  CommunityPostType,
  CommunityReportReason,
  LiveChatMessageItem,
  PrivateChatMessageItem,
  PrivateChatReportItem,
  PrivateChatStatus,
  UserAccount,
  UtilityLocationEntry,
  UtilitySubmissionItem,
} from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { CommunityHubView } from './CommunityHubView';
import { exportUtilitySubmissionsToPDF } from '../services/exportService';
import { RealOnlinePresenceStats } from '../services/storageService';

interface UtilitiesSubmissionsViewProps {
  utilityTypes: string[];
  utilitySubmissions: UtilitySubmissionItem[];
  utilityPosts: CommunityPostItem[];
  liveChatMessages: LiveChatMessageItem[];
  onlineCount: number;
  onlineStats?: RealOnlinePresenceStats;
  currentUser: UserAccount | null;
  users?: UserAccount[];
  cooldownConfigSeconds?: number;
  autoClearMinutes?: number;
  lastClearedAt?: string;
  chatPenalties?: ChatModerationPenalty[];
  privateChatMessages?: PrivateChatMessageItem[];
  privateChatStatuses?: Record<string, PrivateChatStatus>;
  chatTypingMap?: Record<string, ChatTypingEntry>;
  userBlockedMap?: Record<string, string[]>;
  privateChatReports?: PrivateChatReportItem[];
  onOpenAuthModal: () => void;
  onAddUtilityType: (newTypeName: string) => void;
  onSaveUtilitySubmission: (item: UtilitySubmissionItem) => void;
  onDeleteUtilitySubmission: (id: string) => void;
  onAddUtilityPost: (post: CommunityPostItem) => void;
  onEditUtilityPost: (
    postId: string,
    updatedContent: string,
    updatedPostType?: CommunityPostType
  ) => void;
  onUpdateUtilityPostStatus: (postId: string, status: CommunityPostStatus) => void;
  onDeleteUtilityPost: (postId: string) => void;
  onToggleUtilityPostLike: (postId: string) => void;
  onToggleUtilityPostDislike: (postId: string) => void;
  onReportUtilityPost: (postId: string, reason: CommunityReportReason) => void;
  onRestoreReportedUtilityPost: (postId: string) => void;
  onAddCommentToUtilityPost: (postId: string, comment: CommunityCommentItem) => void;
  onToggleUtilityCommentLike: (postId: string, commentId: string) => void;
  onToggleUtilityCommentEmoji: (
    postId: string,
    commentId: string,
    reaction: CommentEmojiReactionType
  ) => void;
  onAddReplyToUtilityComment: (
    postId: string,
    commentId: string,
    reply: CommunityCommentReply
  ) => void;
  onReportUtilityComment: (
    postId: string,
    commentId: string,
    reason: CommunityReportReason
  ) => void;
  onDeleteUtilityComment: (postId: string, commentId: string) => void;
  onRestoreReportedUtilityComment: (postId: string, commentId: string) => void;
  onTogglePinUtilityComment: (postId: string, commentId: string) => void;
  onSendChatMessage: (
    text: string,
    textColor: string,
    isSystemNotification?: boolean,
    targetUsername?: string
  ) => void;
  onReportChatMessage: (msgId: string, reason: CommunityReportReason) => void;
  onDeleteChatMessage: (msgId: string, notifyUsername?: string) => void;
  onUpdateChatCooldown?: (seconds: number) => void;
  onUpdateAutoClearMinutes?: (minutes: number) => void;
  onClearPublicChatNow?: () => void;
  onClearPrivateChatSession?: (keepOnlyPartnerUsername?: string) => void;
  onApplyChatPenalty?: (
    targetUserId: string,
    targetUsername: string,
    actionType: 'ban' | 'suspend',
    durationLabel: 'ساعة' | 'ساعتين' | 'يوم'
  ) => void;
  onSendPrivateMessage?: (
    receiverId: string,
    receiverUsername: string,
    text: string,
    textColor?: string
  ) => void;
  onMarkPrivateMessagesRead?: (partnerUsername: string) => void;
  onSetChatTypingStatus?: (targetKey: string, isTyping: boolean) => void;
  onRespondPrivateChatRequest?: (
    senderKey: string,
    status: PrivateChatStatus
  ) => void;
  onBlockUserInChat?: (
    blockedUserId: string,
    blockedUsername: string,
    reportReason?: string,
    sampleMessage?: string
  ) => void;
  onDeleteUserAccountFromChat?: (
    targetUserId: string,
    targetUsername: string
  ) => void;
}

function formatUtilityDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatUtilityUpdateDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildGoogleMapsHref(rawLocation: string): string {
  const trimmed = (rawLocation || '').trim();
  if (!trimmed) return 'https://www.google.com/maps';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    trimmed
  )}`;
}

export const UtilitiesSubmissionsView: React.FC<UtilitiesSubmissionsViewProps> = ({
  utilityTypes,
  utilitySubmissions,
  utilityPosts,
  liveChatMessages,
  onlineCount,
  onlineStats,
  currentUser,
  users = [],
  cooldownConfigSeconds = 5,
  autoClearMinutes = 60,
  lastClearedAt,
  chatPenalties = [],
  privateChatMessages = [],
  privateChatStatuses = {},
  chatTypingMap = {},
  userBlockedMap = {},
  privateChatReports = [],
  onOpenAuthModal,
  onAddUtilityType,
  onSaveUtilitySubmission,
  onDeleteUtilitySubmission,
  onAddUtilityPost,
  onEditUtilityPost,
  onUpdateUtilityPostStatus,
  onDeleteUtilityPost,
  onToggleUtilityPostLike,
  onToggleUtilityPostDislike,
  onReportUtilityPost,
  onRestoreReportedUtilityPost,
  onAddCommentToUtilityPost,
  onToggleUtilityCommentLike,
  onToggleUtilityCommentEmoji,
  onAddReplyToUtilityComment,
  onReportUtilityComment,
  onDeleteUtilityComment,
  onRestoreReportedUtilityComment,
  onTogglePinUtilityComment,
  onSendChatMessage,
  onReportChatMessage,
  onDeleteChatMessage,
  onUpdateChatCooldown,
  onUpdateAutoClearMinutes,
  onClearPublicChatNow,
  onClearPrivateChatSession,
  onApplyChatPenalty,
  onSendPrivateMessage,
  onMarkPrivateMessagesRead,
  onSetChatTypingStatus,
  onRespondPrivateChatRequest,
  onBlockUserInChat,
  onDeleteUserAccountFromChat,
}) => {
  const isStrictAdmin = currentUser?.role === 'admin';
  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  const availableTypes =
    Array.isArray(utilityTypes) && utilityTypes.length > 0
      ? utilityTypes
      : ['تقديم المياه', 'تقديم الكهرباء', 'تقديم الغاز'];

  const [selectedUtility, setSelectedUtility] = useState<string>('all');
  const [formTargetUtility, setFormTargetUtility] = useState<string>(
    availableTypes[0] || 'تقديم المياه'
  );
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [utilityLayoutMode, setUtilityLayoutMode] = useState<'list' | 'grid'>('list');
  const [isAddUtilityTypeOpen, setIsAddUtilityTypeOpen] = useState<boolean>(false);
  const [newUtilityTypeName, setNewUtilityTypeName] = useState<string>('');
  const [isPdfPickerOpen, setIsPdfPickerOpen] = useState<boolean>(false);

  // Form states for the selected utility (Admin / Moderator) - only shown when clicking "تعديل"
  const [locations, setLocations] = useState<UtilityLocationEntry[]>([
    { name: '', locationUrl: '' },
  ]);
  const [detailsText, setDetailsText] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string>('');

  // Popup modal state when any user clicks a utility submission card
  const [activeModalUtility, setActiveModalUtility] =
    useState<UtilitySubmissionItem | null>(null);

  const openEditUtilityForm = (targetUtilityName: string) => {
    const targetName =
      targetUtilityName && targetUtilityName !== 'all'
        ? targetUtilityName
        : availableTypes[0] || 'تقديم المياه';
    setFormTargetUtility(targetName);
    const existing = utilitySubmissions.find(
      (u) => u.utilityName === targetName
    );
    if (existing) {
      setLocations(
        existing.locations.length > 0
          ? existing.locations.slice(0, 3)
          : [{ name: '', locationUrl: '' }]
      );
      setDetailsText((existing.details || '').slice(0, 10000));
    } else {
      setLocations([{ name: '', locationUrl: '' }]);
      setDetailsText('');
    }
    setIsEditFormOpen(true);
  };

  // Sync formTargetUtility when user picks a specific utility from the top dropdown
  useEffect(() => {
    if (selectedUtility !== 'all') {
      setFormTargetUtility(selectedUtility);
    }
  }, [selectedUtility]);

  // If the edit form is already open and Admin switches the target utility inside the form, load its data
  useEffect(() => {
    if (!isEditFormOpen) return;
    const existing = utilitySubmissions.find(
      (u) => u.utilityName === formTargetUtility
    );
    if (existing) {
      setLocations(
        existing.locations.length > 0
          ? existing.locations.slice(0, 3)
          : [{ name: '', locationUrl: '' }]
      );
      setDetailsText((existing.details || '').slice(0, 10000));
    } else {
      setLocations([{ name: '', locationUrl: '' }]);
      setDetailsText('');
    }
  }, [formTargetUtility, isEditFormOpen, utilitySubmissions]);

  // Keep activeModalUtility synced in real-time if updated while modal is open
  useEffect(() => {
    if (!activeModalUtility) return;
    const updated = utilitySubmissions.find(
      (u) => u.id === activeModalUtility.id
    );
    if (updated) {
      setActiveModalUtility(updated);
    }
  }, [utilitySubmissions]);

  const handleConfirmAddNewUtilityType = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUtilityTypeName.trim();
    if (!clean) return;
    onAddUtilityType(clean);
    setSelectedUtility(clean);
    setFormTargetUtility(clean);
    setNewUtilityTypeName('');
    setIsAddUtilityTypeOpen(false);
  };

  const handleLocationRowChange = (
    idx: number,
    field: 'name' | 'locationUrl',
    value: string
  ) => {
    setLocations((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const handleAddLocationRow = () => {
    if (locations.length >= 3) return;
    setLocations((prev) => [...prev, { name: '', locationUrl: '' }]);
  };

  const handleRemoveLocationRow = (idx: number) => {
    if (locations.length <= 1) return;
    setLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAdminSubmitUtility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const targetName = formTargetUtility || availableTypes[0] || 'تقديم المياه';
    const existing = utilitySubmissions.find(
      (u) => u.utilityName === targetName
    );
    const cleanedLocations = locations
      .slice(0, 3)
      .map((l) => ({
        name: l.name.trim(),
        locationUrl: l.locationUrl.trim(),
      }))
      .filter((l) => l.name !== '' || l.locationUrl !== '');

    const nowIso = new Date().toISOString();
    const itemToSave: UtilitySubmissionItem = {
      id: existing ? existing.id : `util-${Date.now()}`,
      utilityName: targetName,
      locations: cleanedLocations,
      details: detailsText.slice(0, 10000),
      updatedAt: nowIso,
      createdAt: existing ? existing.createdAt : nowIso,
    };

    onSaveUtilitySubmission(itemToSave);
    setIsEditFormOpen(false);
    setSaveNotice(`تم حفظ وتحديث "${targetName}" لحظياً لجميع المستخدمين.`);
    setTimeout(() => setSaveNotice(''), 3500);
  };

  const filteredUtilitySubmissions =
    selectedUtility === 'all'
      ? utilitySubmissions
      : utilitySubmissions.filter((u) => u.utilityName === selectedUtility);

  const handleHeaderExportPDFClick = () => {
    if (!isStrictAdmin) return;
    if (selectedUtility !== 'all') {
      const targetItem = utilitySubmissions.find(
        (u) => u.utilityName === selectedUtility
      );
      if (targetItem) {
        exportUtilitySubmissionsToPDF([targetItem]);
        return;
      }
    }
    if (utilitySubmissions.length === 1) {
      exportUtilitySubmissionsToPDF([utilitySubmissions[0]]);
      return;
    }
    setIsPdfPickerOpen((v) => !v);
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* 1. Top Section Card: Header + Admin PDF Button beside "تقديمات المرافق" + Dropdown ("إظهار الكل" + المرافق) + "+" Button + View Mode Toggle (عرضي / شبكي) */}
      <FluentCard className="p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 border-b border-[#334155] pb-3.5">
          {/* Row 1: Title "تقديمات المرافق" + Admin-only "تصدير PDF" button right beside it */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-lg font-extrabold text-[#F8FAFC]">
                    تقديمات المرافق
                  </h1>

                  {/* زر تصدير PDF بجانب جملة تقديمات المرافق لصلاحيات Admin فقط */}
                  {isStrictAdmin && (
                    <button
                      type="button"
                      onClick={handleHeaderExportPDFClick}
                      title="تصدير PDF لتفاصيل أي مرفق (خاص بـ Admin)"
                      className="fluent-reveal px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/60 text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">تصدير PDF</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  دليل ومواعيد وأماكن تقديم المياه والكهرباء والغاز والمرافق العامة
                </p>
              </div>
            </div>
          </div>

          {/* قائمة منبثقة سريعة لـ Admin عند الضغط على تصدير PDF بجانب العنوان لاختيار أي مرفق لتصدير تفاصيله أو تصدير الكل */}
          {isStrictAdmin && isPdfPickerOpen && (
            <div className="p-3 rounded-xl bg-[#0A192F] border border-rose-400/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-rose-300">
                <span>اختر المرفق لتصدير تفاصيله كملف PDF:</span>
                <button
                  type="button"
                  onClick={() => setIsPdfPickerOpen(false)}
                  className="text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {utilitySubmissions.length === 0 ? (
                <p className="text-[11px] text-[#94A3B8]">
                  لا توجد مرافق مسجلة حالياً لتصديرها.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportUtilitySubmissionsToPDF(utilitySubmissions);
                      setIsPdfPickerOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer shadow"
                  >
                    تصدير جميع المرافق المسجلة ({utilitySubmissions.length}) PDF
                  </button>
                  {utilitySubmissions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        exportUtilitySubmissionsToPDF([u]);
                        setIsPdfPickerOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#112240] hover:bg-sky-600 text-[#F8FAFC] border border-sky-400/50 text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      PDF: {u.utilityName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Row 2: القائمة المنسدلة (بها إظهار الكل) وبجانبها زر + لإضافة مرافق أخرى + أزرار طريقة العرض (عرضي / شبكي) في سطر واحد */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* القائمة المنسدلة وبجانبها زر + في نفس السطر */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-nowrap">
              <select
                value={selectedUtility}
                onChange={(e) => setSelectedUtility(e.target.value)}
                className="flex-1 sm:w-64 rounded-xl bg-[#0A192F] border border-sky-400/60 focus:border-sky-400 px-3 py-2 text-xs sm:text-sm font-extrabold text-[#F8FAFC] outline-none cursor-pointer shadow min-w-0"
              >
                <option value="all">إظهار الكل</option>
                {availableTypes.map((uType) => (
                  <option key={uType} value={uType}>
                    {uType}
                  </option>
                ))}
              </select>

              {/* زر + بجانب القائمة المنسدلة لإضافة مرافق أخرى */}
              <button
                type="button"
                onClick={() => setIsAddUtilityTypeOpen((v) => !v)}
                title="إضافة مرفق جديد"
                aria-label="إضافة مرفق جديد"
                className="fluent-reveal w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 flex items-center justify-center text-lg font-extrabold shrink-0 cursor-pointer shadow-lg"
              >
                <Plus className="w-5 h-5 relative z-10" />
              </button>

              {/* زر تعديل لإظهار بيانات المرفق للتعديل عند الحاجة فقط */}
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    if (isEditFormOpen) {
                      setIsEditFormOpen(false);
                    } else {
                      openEditUtilityForm(
                        selectedUtility !== 'all'
                          ? selectedUtility
                          : formTargetUtility
                      );
                    }
                  }}
                  title="تعديل بيانات المرفق"
                  className={`fluent-reveal px-3 h-10 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg transition-all ${
                    isEditFormOpen
                      ? 'bg-amber-500 text-[#0A192F] border-amber-300'
                      : 'bg-[#112240] hover:bg-sky-600 text-sky-300 hover:text-white border-sky-400/50'
                  }`}
                >
                  <Edit3 className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">
                    {isEditFormOpen ? 'إغلاق التعديل' : 'تعديل'}
                  </span>
                </button>
              )}
            </div>

            {/* زرين طريقة العرض (عرضي + شبكي) بجانب بعض في سطر واحد */}
            <div className="flex flex-row flex-nowrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setUtilityLayoutMode('list')}
                className={`fluent-reveal flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border cursor-pointer transition-all whitespace-nowrap ${
                  utilityLayoutMode === 'list'
                    ? 'bg-sky-600 text-white border-sky-400 shadow'
                    : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border-[#334155]'
                }`}
              >
                <LayoutList className="w-4 h-4 shrink-0" />
                <span>عرضي</span>
              </button>

              <button
                type="button"
                onClick={() => setUtilityLayoutMode('grid')}
                className={`fluent-reveal flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border cursor-pointer transition-all whitespace-nowrap ${
                  utilityLayoutMode === 'grid'
                    ? 'bg-sky-600 text-white border-sky-400 shadow'
                    : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border-[#334155]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>شبكي</span>
              </button>
            </div>
          </div>
        </div>

        {/* نافذة مصغرة لإضافة مرفق جديد للقائمة المنسدلة عند الضغط على زر + */}
        {isAddUtilityTypeOpen && (
          <form
            onSubmit={handleConfirmAddNewUtilityType}
            className="p-3 rounded-xl bg-[#0A192F] border border-sky-400/50 flex items-center gap-2"
          >
            <input
              type="text"
              value={newUtilityTypeName}
              onChange={(e) => setNewUtilityTypeName(e.target.value)}
              placeholder="اكتب اسم المرفق الجديد (مثال: تقديم التليفون والإنترنت)..."
              className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-[#F8FAFC] outline-none min-w-0"
            />
            <FluentButton type="submit" variant="primary" size="sm">
              أضف
            </FluentButton>
            <button
              type="button"
              onClick={() => setIsAddUtilityTypeOpen(false)}
              className="w-8 h-8 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {saveNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        )}

        {/* 2. لا تظهر البيانات التي بالداخل عند فتح خانة تقديمات المرافق إلا في حالة الضغط على "تعديل" */}
        {canManage && isEditFormOpen && (
          <form
            onSubmit={handleAdminSubmitUtility}
            className="p-3.5 sm:p-4 rounded-2xl bg-[#0A192F]/90 border border-sky-400/40 space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-extrabold text-sky-300">
                <span>تعديل بيانات المرفق:</span>
                <select
                  value={formTargetUtility}
                  onChange={(e) => setFormTargetUtility(e.target.value)}
                  className="rounded-xl bg-[#112240] border border-sky-400/50 px-2.5 py-1 text-xs font-extrabold text-white outline-none cursor-pointer"
                >
                  {availableTypes.map((uType) => (
                    <option key={uType} value={uType}>
                      {uType}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {locations.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddLocationRow}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة اسم ولوكيشن آخر ({locations.length}/3)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditFormOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-rose-600 text-[#94A3B8] hover:text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إغلاق</span>
                </button>
              </div>
            </div>

            {/* خانتين في سطر واحد: الأول الاسم وبجانبه لوكيشن (حتى 3 مرات) */}
            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={loc.name}
                    onChange={(e) =>
                      handleLocationRowChange(idx, 'name', e.target.value)
                    }
                    placeholder="الاسم"
                    className="w-1/2 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm font-bold text-[#F8FAFC] outline-none"
                  />
                  <input
                    type="text"
                    value={loc.locationUrl}
                    onChange={(e) =>
                      handleLocationRowChange(idx, 'locationUrl', e.target.value)
                    }
                    placeholder="لوكيشن"
                    className="w-1/2 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm font-bold text-[#F8FAFC] outline-none"
                  />
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocationRow(idx)}
                      title="حذف السطر"
                      className="w-9 h-9 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* أسفلها مربع كبير بحجم الشاشة ويوجد لها حواف (يكتب حتى 10 آلاف حرف دون إظهار الحد للمستخدم) */}
            <div className="w-full">
              <textarea
                value={detailsText}
                onChange={(e) => setDetailsText(e.target.value.slice(0, 10000))}
                maxLength={10000}
                placeholder={`اكتب جميع تفاصيل وشروط وأوراق ومواعيد ${formTargetUtility}...`}
                className="w-full min-h-[280px] sm:min-h-[360px] rounded-2xl bg-[#112240] border-2 border-sky-400/60 focus:border-sky-400 p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-[#F8FAFC] leading-relaxed outline-none resize-y shadow-[0_0_25px_-8px_rgba(56,189,248,0.35)]"
              />
            </div>

            {/* زر الحفظ / الإضافة في الأسفل */}
            <div className="flex justify-end gap-2">
              <FluentButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditFormOpen(false)}
              >
                إلغاء
              </FluentButton>
              <FluentButton type="submit" variant="primary" size="md">
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </FluentButton>
            </div>
          </form>
        )}

        {/* 3. الخانات المضافة التي تظهر لحظياً لجميع المستخدمين:
            يظهر نوع المرفق بالكامل دون أن يختفي أي جزء من الكلمة + التاريخ فقط (والتاريخ والوقت يظل بالداخل) */}
        <div
          className={
            utilityLayoutMode === 'grid'
              ? 'grid grid-cols-2 gap-2.5 sm:gap-3 pt-1'
              : 'space-y-2.5 pt-1'
          }
        >
          {filteredUtilitySubmissions.length === 0 ? (
            <div className="col-span-2 p-6 rounded-2xl bg-[#0A192F]/80 border border-[#334155] text-center text-xs text-[#94A3B8]">
              لا توجد بيانات تقديم مرافق مضافة حالياً.
            </div>
          ) : (
            filteredUtilitySubmissions.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalUtility(item)}
                className={`fluent-reveal w-full p-3 sm:p-4 rounded-2xl bg-[#0A192F] hover:bg-[#1E293B] border border-sky-400/50 transition-all cursor-pointer shadow-md ${
                  utilityLayoutMode === 'grid'
                    ? 'flex flex-col justify-between gap-2.5'
                    : 'flex flex-col sm:flex-row sm:items-center justify-between gap-2.5'
                }`}
              >
                {/* نوع المرفق بالكامل دون أن يختفي أي جزء من الكلمة */}
                <div className="flex items-start sm:items-center gap-2 min-w-0 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-base font-extrabold text-[#F8FAFC] break-words leading-snug">
                    {item.utilityName}
                  </span>
                </div>

                {/* التاريخ فقط بالخارج + أزرار الإدارة */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap relative z-10">
                  <div className="px-2 py-1 rounded-xl bg-[#112240] border border-[#334155] text-[10px] sm:text-xs font-bold text-amber-300 flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{formatUtilityDateOnly(item.updatedAt)}</span>
                  </div>

                  {canManage && (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditUtilityForm(item.utilityName)}
                        title="تعديل بيانات المرفق"
                        className="px-2 h-7 sm:h-8 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-400/40 flex items-center justify-center gap-1 text-[10px] sm:text-xs font-extrabold cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                        <span>تعديل</span>
                      </button>
                      {isStrictAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => exportUtilitySubmissionsToPDF([item])}
                            title="تصدير PDF لتفاصيل هذا المرفق"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 flex items-center justify-center cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteUtilitySubmission(item.id)}
                            title="حذف المرفق"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </FluentCard>

      {/* 4. الشاشة المنبثقة عند الضغط على خانة المرفق (يظل التاريخ والوقت بالداخل + زر تصدير PDF للـ Admin) */}
      {activeModalUtility && (
        <FluentModal
          isOpen={!!activeModalUtility}
          onClose={() => setActiveModalUtility(null)}
          title={activeModalUtility.utilityName}
          subtitle={`آخر تحديث (التاريخ والوقت): ${formatUtilityUpdateDate(
            activeModalUtility.updatedAt
          )}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {isStrictAdmin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    exportUtilitySubmissionsToPDF([activeModalUtility])
                  }
                  className="fluent-reveal px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Download className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">
                    تصدير تفاصيل هذا المرفق (PDF)
                  </span>
                </button>
              </div>
            )}

            {/* قائمة الأسماء وأزرار التوجه المباشر إلى جوجل ماب */}
            {activeModalUtility.locations &&
              activeModalUtility.locations.length > 0 && (
                <div className="space-y-2">
                  {activeModalUtility.locations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] break-words">
                        {loc.name || activeModalUtility.utilityName}
                      </div>

                      {loc.locationUrl && (
                        <a
                          href={buildGoogleMapsHref(loc.locationUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fluent-reveal px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-lg"
                        >
                          <MapPin className="w-3.5 h-3.5 relative z-10" />
                          <span className="relative z-10">
                            التوجه إلى جوجل ماب مباشرة
                          </span>
                          <ExternalLink className="w-3 h-3 relative z-10" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {/* نص التفاصيل المدخل */}
            {activeModalUtility.details ? (
              <div className="p-4 rounded-2xl bg-[#0A192F] border-2 border-sky-400/50 text-xs sm:text-sm font-bold text-[#F8FAFC] leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {activeModalUtility.details}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] text-center text-xs text-[#94A3B8]">
                لا توجد تفاصيل إضافية مسجلة لهذا المرفق.
              </div>
            )}
          </div>
        </FluentModal>
      )}

      {/* 5. أسفل تلك البيانات: نفس فكرة المنشورات التي في خانة مجتمع بكل تفاصيلها (التعليقات، نوع المنشور، الحظر، اللايكات، المحفوظات) */}
      <CommunityHubView
        posts={utilityPosts}
        liveChatMessages={liveChatMessages}
        onlineCount={onlineCount}
        onlineStats={onlineStats}
        currentUser={currentUser}
        users={users}
        cooldownConfigSeconds={cooldownConfigSeconds}
        autoClearMinutes={autoClearMinutes}
        lastClearedAt={lastClearedAt}
        sectionTitle="منشورات واستفسارات تقديمات المرافق"
        sectionSubtitle="شارك استفساراتك وتجاربك حول تقديم المياه والكهرباء والغاز والمرافق"
        hideLiveChatButton={true}
        savedPostsNamespace="utilities"
        chatPenalties={chatPenalties}
        privateChatMessages={privateChatMessages}
        privateChatStatuses={privateChatStatuses}
        chatTypingMap={chatTypingMap}
        userBlockedMap={userBlockedMap}
        privateChatReports={privateChatReports}
        onOpenAuthModal={onOpenAuthModal}
        onAddCommunityPost={onAddUtilityPost}
        onEditCommunityPost={onEditUtilityPost}
        onUpdatePostStatus={onUpdateUtilityPostStatus}
        onDeletePost={onDeleteUtilityPost}
        onTogglePostLike={onToggleUtilityPostLike}
        onTogglePostDislike={onToggleUtilityPostDislike}
        onReportPost={onReportUtilityPost}
        onRestoreReportedPost={onRestoreReportedUtilityPost}
        onAddCommentToPost={onAddCommentToUtilityPost}
        onToggleCommentLike={onToggleUtilityCommentLike}
        onToggleCommentEmoji={onToggleUtilityCommentEmoji}
        onAddReplyToComment={onAddReplyToUtilityComment}
        onReportComment={onReportUtilityComment}
        onDeleteComment={onDeleteUtilityComment}
        onRestoreReportedComment={onRestoreReportedUtilityComment}
        onTogglePinComment={onTogglePinUtilityComment}
        onSendChatMessage={onSendChatMessage}
        onReportChatMessage={onReportChatMessage}
        onDeleteChatMessage={onDeleteChatMessage}
        onUpdateChatCooldown={onUpdateChatCooldown}
        onUpdateAutoClearMinutes={onUpdateAutoClearMinutes}
        onClearPublicChatNow={onClearPublicChatNow}
        onClearPrivateChatSession={onClearPrivateChatSession}
        onApplyChatPenalty={onApplyChatPenalty}
        onSendPrivateMessage={onSendPrivateMessage}
        onMarkPrivateMessagesRead={onMarkPrivateMessagesRead}
        onSetChatTypingStatus={onSetChatTypingStatus}
        onRespondPrivateChatRequest={onRespondPrivateChatRequest}
        onBlockUserInChat={onBlockUserInChat}
        onDeleteUserAccountFromChat={onDeleteUserAccountFromChat}
      />
    </div>
  );
};

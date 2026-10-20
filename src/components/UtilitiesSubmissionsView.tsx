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
} from 'lucide-react';
import {
  ChatModerationPenalty,
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

interface UtilitiesSubmissionsViewProps {
  utilityTypes: string[];
  utilitySubmissions: UtilitySubmissionItem[];
  utilityPosts: CommunityPostItem[];
  liveChatMessages: LiveChatMessageItem[];
  onlineCount: number;
  currentUser: UserAccount | null;
  users?: UserAccount[];
  cooldownConfigSeconds?: number;
  autoClearMinutes?: number;
  lastClearedAt?: string;
  chatPenalties?: ChatModerationPenalty[];
  privateChatMessages?: PrivateChatMessageItem[];
  privateChatStatuses?: Record<string, PrivateChatStatus>;
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
  currentUser,
  users = [],
  cooldownConfigSeconds = 5,
  autoClearMinutes = 60,
  lastClearedAt,
  chatPenalties = [],
  privateChatMessages = [],
  privateChatStatuses = {},
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
  onRespondPrivateChatRequest,
  onBlockUserInChat,
  onDeleteUserAccountFromChat,
}) => {
  // Strictly Admin only for adding utility types and adding/updating utility submissions ("و زر اضف لا يظهر الا ل صلاحيات admin فقط")
  const isStrictAdmin = currentUser?.role === 'admin';

  const availableTypes =
    Array.isArray(utilityTypes) && utilityTypes.length > 0
      ? utilityTypes
      : ['تقديم المياه', 'تقديم الكهرباء', 'تقديم الغاز'];

  const [selectedUtility, setSelectedUtility] = useState<string>(
    availableTypes[0] || 'تقديم المياه'
  );
  const [isAddUtilityTypeOpen, setIsAddUtilityTypeOpen] = useState<boolean>(false);
  const [newUtilityTypeName, setNewUtilityTypeName] = useState<string>('');

  // Form states for the selected utility (Admin only)
  // Up to 3 (الاسم + لوكيشن) rows in one line
  const [locations, setLocations] = useState<UtilityLocationEntry[]>([
    { name: '', locationUrl: '' },
  ]);
  // Large screen-sized text box (up to 10,000 chars without showing the limit to user)
  const [detailsText, setDetailsText] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string>('');

  // Popup modal state when any user clicks a utility submission card
  const [activeModalUtility, setActiveModalUtility] =
    useState<UtilitySubmissionItem | null>(null);

  // When Admin switches the dropdown option, load existing data for that utility if already saved, or empty fields
  useEffect(() => {
    const existing = utilitySubmissions.find(
      (u) => u.utilityName === selectedUtility
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
  }, [selectedUtility]);

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
    if (!isStrictAdmin) return;
    const clean = newUtilityTypeName.trim();
    if (!clean) return;
    onAddUtilityType(clean);
    setSelectedUtility(clean);
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
    if (!isStrictAdmin) return;

    const existing = utilitySubmissions.find(
      (u) => u.utilityName === selectedUtility
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
      utilityName: selectedUtility,
      locations: cleanedLocations,
      details: detailsText.slice(0, 10000),
      updatedAt: nowIso,
      createdAt: existing ? existing.createdAt : nowIso,
    };

    onSaveUtilitySubmission(itemToSave);
    setSaveNotice(`تم حفظ وتحديث "${selectedUtility}" لحظياً لجميع المستخدمين.`);
    setTimeout(() => setSaveNotice(''), 3500);
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* 1. Top Section Card: Dropdown ("تقديم المياه / تقديم الكهرباء / تقديم الغاز") + "+" Button next to it */}
      <FluentCard className="p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-extrabold text-[#F8FAFC]">
                تقديمات المرافق
              </h1>
              <p className="text-[11px] text-[#94A3B8]">
                دليل ومواعيد وأماكن تقديم المياه والكهرباء والغاز والمرافق العامة
              </p>
            </div>
          </div>

          {/* القائمة المنسدلة وبجانبها زر أضف مرفق (+) فقط */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedUtility}
              onChange={(e) => setSelectedUtility(e.target.value)}
              className="flex-1 sm:w-64 rounded-xl bg-[#0A192F] border border-sky-400/60 focus:border-sky-400 px-3 py-2 text-xs sm:text-sm font-extrabold text-[#F8FAFC] outline-none cursor-pointer shadow"
            >
              {availableTypes.map((uType) => (
                <option key={uType} value={uType}>
                  {uType}
                </option>
              ))}
            </select>

            {/* زر أضف مرفق بجوار القائمة المنسدلة ويكون عبارة عن زر + فقط (لصلاحيات Admin فقط) */}
            {isStrictAdmin && (
              <button
                type="button"
                onClick={() => setIsAddUtilityTypeOpen((v) => !v)}
                title="أضف مرفق"
                aria-label="أضف مرفق"
                className="fluent-reveal w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 flex items-center justify-center text-lg font-extrabold shrink-0 cursor-pointer shadow-lg"
              >
                <Plus className="w-5 h-5 relative z-10" />
              </button>
            )}
          </div>
        </div>

        {/* نافذة مصغرة لإضافة مرفق جديد للقائمة المنسدلة عند الضغط على زر + (للـ Admin فقط) */}
        {isStrictAdmin && isAddUtilityTypeOpen && (
          <form
            onSubmit={handleConfirmAddNewUtilityType}
            className="p-3 rounded-xl bg-[#0A192F] border border-sky-400/50 flex items-center gap-2"
          >
            <input
              type="text"
              value={newUtilityTypeName}
              onChange={(e) => setNewUtilityTypeName(e.target.value)}
              placeholder="اكتب اسم المرفق الجديد (مثال: تقديم التليفون والإنترنت)..."
              className="flex-1 rounded-xl bg-[#112240] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs font-bold text-[#F8FAFC] outline-none"
            />
            <FluentButton type="submit" variant="primary" size="sm">
              أضف
            </FluentButton>
            <button
              type="button"
              onClick={() => setIsAddUtilityTypeOpen(false)}
              className="w-8 h-8 rounded-lg bg-[#1E293B] text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2. Admin Input Form when selecting any option from the dropdown ("و زر اضف لا يظهر الا ل صلاحيات admin فقط") */}
        {isStrictAdmin && (
          <form
            onSubmit={handleAdminSubmitUtility}
            className="p-3.5 sm:p-4 rounded-2xl bg-[#0A192F]/90 border border-sky-400/40 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs sm:text-sm font-extrabold text-sky-300">
                بيانات المرفق المختار: <span className="text-white">{selectedUtility}</span>
              </div>
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
                placeholder={`اكتب جميع تفاصيل وشروط وأوراق ومواعيد ${selectedUtility}...`}
                className="w-full min-h-[280px] sm:min-h-[360px] rounded-2xl bg-[#112240] border-2 border-sky-400/60 focus:border-sky-400 p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-[#F8FAFC] leading-relaxed outline-none resize-y shadow-[0_0_25px_-8px_rgba(56,189,248,0.35)]"
              />
            </div>

            {saveNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveNotice}</span>
              </div>
            )}

            {/* زر أضف في الأسفل (يظهر لصلاحيات Admin فقط) */}
            <div className="flex justify-end">
              <FluentButton type="submit" variant="primary" size="md">
                <Plus className="w-4 h-4" />
                <span>أضف</span>
              </FluentButton>
            </div>
          </form>
        )}

        {/* 3. الخانات المضافة التي تظهر لحظياً لجميع المستخدمين (اسم المرفق وبجانبه تاريخ آخر تحديث) */}
        <div className="space-y-2.5 pt-1">
          {utilitySubmissions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#0A192F]/80 border border-[#334155] text-center text-xs text-[#94A3B8]">
              لا توجد بيانات تقديم مرافق مضافة حالياً.
            </div>
          ) : (
            utilitySubmissions.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveModalUtility(item)}
                className="fluent-reveal w-full p-3.5 sm:p-4 rounded-2xl bg-[#0A192F] hover:bg-[#1E293B] border border-sky-400/50 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-2.5 min-w-0 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-base font-extrabold text-[#F8FAFC] truncate">
                    {item.utilityName}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 relative z-10">
                  <div className="px-2.5 py-1 rounded-xl bg-[#112240] border border-[#334155] text-[10px] sm:text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>آخر تحديث: {formatUtilityUpdateDate(item.updatedAt)}</span>
                  </div>

                  {isStrictAdmin && (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUtility(item.utilityName);
                          setLocations(
                            item.locations.length > 0
                              ? item.locations.slice(0, 3)
                              : [{ name: '', locationUrl: '' }]
                          );
                          setDetailsText(item.details || '');
                        }}
                        title="تعديل بيانات المرفق"
                        className="w-8 h-8 rounded-lg bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-400/40 flex items-center justify-center cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteUtilitySubmission(item.id)}
                        title="حذف المرفق"
                        className="w-8 h-8 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </FluentCard>

      {/* 4. الشاشة المنبثقة عند الضغط على خانة المرفق (تظهر البيانات المدخلة واللوكيشن كزر توجه إلى جوجل ماب مباشرة) */}
      {activeModalUtility && (
        <FluentModal
          isOpen={!!activeModalUtility}
          onClose={() => setActiveModalUtility(null)}
          title={activeModalUtility.utilityName}
          subtitle={`آخر تحديث: ${formatUtilityUpdateDate(
            activeModalUtility.updatedAt
          )}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* قائمة الأسماء وأزرار التوجه المباشر إلى جوجل ماب */}
            {activeModalUtility.locations &&
              activeModalUtility.locations.length > 0 && (
                <div className="space-y-2">
                  {activeModalUtility.locations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-3"
                    >
                      <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate">
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
        onRespondPrivateChatRequest={onRespondPrivateChatRequest}
        onBlockUserInChat={onBlockUserInChat}
        onDeleteUserAccountFromChat={onDeleteUserAccountFromChat}
      />
    </div>
  );
};

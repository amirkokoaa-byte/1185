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
} from 'lucide-react';
import { PlatformSettings, ServicePhoneEntry, UserAccount } from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { uploadImageDynamic } from '../services/storageService';
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
}

export const ServiceNumbersView: React.FC<ServiceNumbersViewProps> = ({
  serviceNumbers,
  settings,
  currentUser,
  onAddServiceNumber,
  onUpdateServiceNumber,
  onDeleteServiceNumber,
}) => {
  // Moderator has all Admin privileges EXCEPT permanent deletion
  const isStrictAdmin = currentUser?.role === 'admin';
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Search & View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'table' | 'cards'>('both');

  // Add / Edit Service Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ServicePhoneEntry | null>(
    null
  );
  const [providerName, setProviderName] = useState('');
  const [providerProfession, setProviderProfession] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerLocationUrl, setProviderLocationUrl] = useState('');
  const [providerImageUrl, setProviderImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Service Details Modal State (with Admin Edit & Delete inside Modal)
  const [inspectingEntryId, setInspectingEntryId] = useState<string | null>(
    null
  );
  const inspectingEntry =
    serviceNumbers.find((s) => s.id === inspectingEntryId) || null;

  const hasValidLocation = (loc?: string) => {
    const clean = (loc || '').trim();
    return Boolean(clean && clean !== 'https://maps.google.com');
  };

  // Open Modal for Adding New Service (Admin Only)
  const openAddModal = () => {
    if (!isStrictAdmin) return;
    setEditingEntry(null);
    setProviderName('');
    setProviderProfession('');
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
    setProviderProfession(entry.profession || '');
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
      if (!isStrictAdmin) return;
      const newEntry: ServicePhoneEntry = {
        id: `srvnum-${Date.now()}`,
        title: providerName.trim(),
        profession: cleanProfession || undefined,
        phone: providerPhone.trim(),
        locationUrl: cleanLocation,
        imageUrl: cleanImage || undefined,
        category: cleanProfession || 'خدمات عامة',
        notes: cleanNotes || undefined,
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
          {/* السطر الأول: زر أضف خدمة (للـ Admin فقط) + الكل / بطاقات / جدول في سطر واحد بدون مسطرة تحريك */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 flex-nowrap w-full">
            {isStrictAdmin && (
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
          </div>

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
          {isStrictAdmin && (
            <p className="text-xs text-[#94A3B8]">
              اضغط على زر &quot;أضف خدمة&quot; بالأعلى لإضافة مقدم خدمة جديد
            </p>
          )}
        </FluentCard>
      ) : (
        <>
          {/* 1. Cards View: يظهر بالخارج لو يوجد صورة يظهر بشكل مربع على اليمين وبجانبه الاسم والمهنة وأسفله رقم الهاتف وعلى اليسار زر الاتصال وزر المراسلة بخلفية بيضاء وخط أسود واضح */}
          {(viewMode === 'both' || viewMode === 'cards') && (
            <div className="flex flex-col space-y-2.5 w-full">
              {filteredServices.map((srv) => {
                const showLocationBtn = hasValidLocation(srv.locationUrl);
                return (
                  <div
                    key={srv.id}
                    onClick={() => setInspectingEntryId(srv.id)}
                    className="fluent-reveal p-2.5 sm:p-4 rounded-2xl bg-white text-black border-2 border-slate-300 hover:border-sky-500 w-full overflow-hidden shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
                      {/* الجانب الأيمن: الصورة المربعة (إن وجدت) + بجانبها الاسم والمهنة وأسفله رقم الهاتف والتفاصيل */}
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

                        <div className="min-w-0 flex-1 space-y-0.5">
                          {/* الاسم وبجانبه المهنة */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-xs sm:text-base font-extrabold text-black break-words leading-snug">
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
                        </div>
                      </div>

                      {/* الجانب الأيسر: زر الاتصال + زر المراسلة + فتح الموقع (فقط في حالة تسجيل لوكيشن) + تعديل وحذف */}
                      <div
                        className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 shrink-0 max-w-[48%] sm:max-w-none"
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

          {/* 2. Formatted Table View (White background & black text without horizontal scroll bar on mobile) */}
          {(viewMode === 'both' || viewMode === 'table') && (
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
                      <th className="py-2.5 px-2 sm:px-4 font-extrabold border-l border-slate-200 w-[42%] sm:w-auto">
                        مقدم الخدمة والمهنة
                      </th>
                      <th className="py-2.5 px-2 sm:px-4 font-extrabold border-l border-slate-200 w-[58%] sm:w-auto">
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
                      return (
                        <tr
                          key={srv.id}
                          onClick={() => setInspectingEntryId(srv.id)}
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
                              <div className="min-w-0">
                                <div className="font-extrabold text-black break-words leading-snug">
                                  {srv.title}
                                </div>
                                {srv.profession && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-black text-[10px] font-bold">
                                    {srv.profession}
                                  </span>
                                )}
                                {srv.notes && (
                                  <div className="text-[10px] text-slate-800 font-medium line-clamp-1 mt-0.5">
                                    {srv.notes}
                                  </div>
                                )}
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

      {/* ================= MODAL 1: ADD / EDIT SERVICE ("أضف خدمة") ================= */}
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
          {/* 1. اسم مقدم الخدمة وبجانبه المهنة */}
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
              <div className="relative">
                <Briefcase className="w-4 h-4 text-sky-700 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={providerProfession}
                  onChange={(e) => setProviderProfession(e.target.value)}
                  placeholder="مثال: فني سباكة / كهربائي / نجار..."
                  className="w-full rounded-xl bg-white border-2 border-slate-300 focus:border-sky-600 pr-9 pl-3.5 py-2.5 text-sm text-black font-bold outline-none"
                />
              </div>
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

          {/* 4. أسفله خانة اللوكيشن (اختياري - في حالة عدم التسجيل لا يظهر زر فتح الموقع) */}
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

      {/* ================= MODAL 2: SERVICE DETAILS MODAL (WHITE BACKGROUND + BLACK TEXT) ================= */}
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
          <div className="space-y-4 text-black">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex items-center gap-3.5">
              {inspectingEntry.imageUrl && (
                <img
                  src={inspectingEntry.imageUrl}
                  alt={inspectingEntry.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-300 shrink-0 bg-white"
                />
              )}
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-bold text-slate-700">اسم مقدم الخدمة:</span>
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

            {inspectingEntry.notes && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
                <span className="text-xs font-extrabold text-black">تفاصيل:</span>
                <p className="text-sm font-bold text-black whitespace-pre-wrap leading-relaxed">
                  {inspectingEntry.notes}
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block">رقم الهاتف:</span>
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
                  <span className="text-xs font-bold text-slate-700 block">اللوكيشن:</span>
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
        </FluentModal>
      )}
    </div>
  );
};


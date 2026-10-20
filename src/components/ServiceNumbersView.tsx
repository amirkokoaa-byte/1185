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
} from 'lucide-react';
import { ServicePhoneEntry, UserAccount } from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import {
  exportServiceNumbersToExcel,
  exportServiceNumbersToPDF,
} from '../services/exportService';

interface ServiceNumbersViewProps {
  serviceNumbers: ServicePhoneEntry[];
  currentUser: UserAccount | null;
  onAddServiceNumber: (entry: ServicePhoneEntry) => void;
  onUpdateServiceNumber: (entry: ServicePhoneEntry) => void;
  onDeleteServiceNumber: (id: string) => void;
}

export const ServiceNumbersView: React.FC<ServiceNumbersViewProps> = ({
  serviceNumbers,
  currentUser,
  onAddServiceNumber,
  onUpdateServiceNumber,
  onDeleteServiceNumber,
}) => {
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Search & View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'both' | 'table' | 'cards'>('both');

  // Add / Edit Service Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ServicePhoneEntry | null>(null);
  const [providerName, setProviderName] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerLocationUrl, setProviderLocationUrl] = useState('');
  const [providerNotes, setProviderNotes] = useState('');

  // Service Details Modal State (with Admin Edit & Delete inside Modal)
  const [inspectingEntryId, setInspectingEntryId] = useState<string | null>(null);
  const inspectingEntry =
    serviceNumbers.find((s) => s.id === inspectingEntryId) || null;

  // Open Modal for Adding New Service
  const openAddModal = () => {
    setEditingEntry(null);
    setProviderName('');
    setProviderPhone('');
    setProviderLocationUrl('');
    setProviderNotes('');
    setIsFormModalOpen(true);
  };

  // Open Modal for Editing Existing Service (Admin Only)
  const openEditModal = (entry: ServicePhoneEntry) => {
    setEditingEntry(entry);
    setProviderName(entry.title);
    setProviderPhone(entry.phone);
    setProviderLocationUrl(entry.locationUrl || '');
    setProviderNotes(entry.notes || '');
    setIsFormModalOpen(true);
  };

  // Handle Save (Add or Edit)
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !providerPhone.trim()) return;

    const cleanLocation =
      providerLocationUrl.trim() || 'https://maps.google.com';

    if (editingEntry) {
      onUpdateServiceNumber({
        ...editingEntry,
        title: providerName.trim(),
        phone: providerPhone.trim(),
        locationUrl: cleanLocation,
        notes: providerNotes.trim() || editingEntry.notes,
      });
    } else {
      const newEntry: ServicePhoneEntry = {
        id: `srvnum-${Date.now()}`,
        title: providerName.trim(),
        phone: providerPhone.trim(),
        locationUrl: cleanLocation,
        category: 'خدمات عامة',
        notes: providerNotes.trim() || undefined,
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
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Top Header Bar: Title + ("أضف خدمة" Button + "الكل | بطاقات | جدول" in 1 line) + Admin Export PDF/Excel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#112240]/95 border border-[#334155] rounded-2xl p-3.5 sm:p-5 shadow-lg">
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

        {/* Single Line: "أضف خدمة" beside "الكل | بطاقات | جدول" + Admin Export */}
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-nowrap overflow-x-auto no-scrollbar">
          <FluentButton
            variant="primary"
            size="sm"
            onClick={openAddModal}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>أضف خدمة</span>
          </FluentButton>

          <div className="flex items-center rounded-xl bg-[#0A192F] border border-[#334155] p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-sky-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-sky-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 shrink-0" />
              <span>جدول</span>
            </button>
          </div>

          {isAdmin && (
            <>
              <FluentButton
                variant="secondary"
                size="sm"
                onClick={() => exportServiceNumbersToExcel(filteredServices)}
                className="shrink-0 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير إكسيل</span>
              </FluentButton>

              <FluentButton
                variant="secondary"
                size="sm"
                onClick={() => exportServiceNumbersToPDF(filteredServices)}
                className="shrink-0 whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-rose-400" />
                <span>تصدير PDF</span>
              </FluentButton>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#112240]/80 border border-[#334155] rounded-2xl p-3 sm:p-4">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم مقدم الخدمة أو رقم الهاتف..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#F8FAFC] outline-none"
            />
          </div>
          <FluentButton variant="primary" size="sm" className="shrink-0">
            <Search className="w-4 h-4" />
            <span>بحث</span>
          </FluentButton>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <FluentCard className="p-12 text-center space-y-3">
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
          {/* 1. Single-Line Stacked Services View ("أي خدمة يتم تسجيلها تظهر في سطر واحد ثم أسفلها الباقي") */}
          {(viewMode === 'both' || viewMode === 'cards') && (
            <div className="flex flex-col space-y-2.5">
              {filteredServices.map((srv) => (
                <FluentCard
                  key={srv.id}
                  onClick={() => setInspectingEntryId(srv.id)}
                  className="p-3 sm:p-4 border-[#334155] hover:border-sky-400/70"
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-3 flex-nowrap overflow-x-auto no-scrollbar">
                    {/* Provider Name */}
                    <div className="flex items-center gap-2 min-w-0 shrink-0">
                      <PhoneCall className="w-4 h-4 text-sky-400 shrink-0" />
                      <h3 className="text-xs sm:text-base font-extrabold text-[#F8FAFC] whitespace-nowrap">
                        {srv.title}
                      </h3>
                    </div>

                    {/* Phone + Call + WhatsApp + Location + Admin Actions in 1 line */}
                    <div
                      className="flex items-center gap-1.5 sm:gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs sm:text-sm font-extrabold text-sky-400 font-mono-tabular whitespace-nowrap px-2 py-1 rounded-lg bg-[#0A192F] border border-[#334155]">
                        {srv.phone}
                      </span>

                      <a
                        href={`tel:${srv.phone}`}
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] sm:text-xs font-bold shadow whitespace-nowrap shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>اتصال</span>
                      </a>

                      <a
                        href={`https://wa.me/${formatWhatsappNumber(srv.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow whitespace-nowrap shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>مراسلة</span>
                      </a>

                      <a
                        href={srv.locationUrl || 'https://maps.google.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] sm:text-xs font-bold shrink-0 shadow whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>فتح الرابط</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setInspectingEntryId(srv.id)}
                        title="عرض التفاصيل"
                        className="p-1.5 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-sky-400 border border-[#334155] cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(srv)}
                            title="تعديل الخدمة (Admin)"
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-[#0A192F] border border-amber-400/40 cursor-pointer transition-colors shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteServiceNumber(srv.id)}
                            title="حذف الخدمة (Admin)"
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 cursor-pointer transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </FluentCard>
              ))}
            </div>
          )}

          {/* 2. Formatted Table View */}
          {(viewMode === 'both' || viewMode === 'table') && (
            <div className="bg-[#112240]/95 border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 bg-[#0A192F] border-b border-[#334155] flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-sky-400">
                  جدول أرقام الخدمات المنسق ({filteredServices.length} خدمة)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#0A192F]/90 text-[#94A3B8] text-xs border-b border-[#334155]">
                      <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60 w-12 text-center">
                        م
                      </th>
                      <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60">
                        اسم مقدم الخدمة
                      </th>
                      <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60">
                        رقم الهاتف والتواصل المباشر
                      </th>
                      <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60">
                        اللوكيشن (Google Maps)
                      </th>
                      {isAdmin && (
                        <th className="py-3.5 px-4 font-bold text-center">
                          إدارة (Admin)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/70 text-sm">
                    {filteredServices.map((srv, idx) => (
                      <tr
                        key={srv.id}
                        onClick={() => setInspectingEntryId(srv.id)}
                        className="hover:bg-[#1E293B]/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 text-center font-mono-tabular text-xs text-[#94A3B8] border-l border-[#334155]/40">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#F8FAFC] border-l border-[#334155]/40">
                          {srv.title}
                        </td>
                        <td
                          className="py-3.5 px-4 border-l border-[#334155]/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono-tabular font-bold text-sky-400">
                              {srv.phone}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${srv.phone}`}
                                className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>اتصال</span>
                              </a>
                              <a
                                href={`https://wa.me/${formatWhatsappNumber(srv.phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>مراسلة</span>
                              </a>
                            </div>
                          </div>
                        </td>
                        <td
                          className="py-3.5 px-4 border-l border-[#334155]/40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#94A3B8] font-mono-tabular truncate max-w-[180px]">
                              {srv.locationUrl || 'https://maps.google.com'}
                            </span>
                            <a
                              href={srv.locationUrl || 'https://maps.google.com'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="fluent-reveal inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>فتح الرابط</span>
                            </a>
                          </div>
                        </td>
                        {isAdmin && (
                          <td
                            className="py-3.5 px-4 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(srv)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-[#0A192F] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteServiceNumber(srv.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
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
        subtitle="أدخل اسم مقدم الخدمة ورقم الهاتف ورابط اللوكيشن ثم اضغط حفظ"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          {/* 1. اسم مقدم الخدمة */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اسم مقدم الخدمة *
            </label>
            <input
              type="text"
              required
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="مثال: المعلم حسن - فني سباكة وكهرباء..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] outline-none"
            />
          </div>

          {/* 2. أسفله رقم الهاتف */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              رقم الهاتف *
            </label>
            <input
              type="tel"
              required
              value={providerPhone}
              onChange={(e) => setProviderPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          {/* 3. أسفله خانة اللوكيشن */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اللوكيشن (رابط خرائط جوجل Google Maps)
            </label>
            <input
              type="url"
              value={providerLocationUrl}
              onChange={(e) => setProviderLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          {/* 4. زر "حفظ" */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
            <FluentButton
              type="button"
              variant="ghost"
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingEntry(null);
              }}
            >
              إلغاء
            </FluentButton>
            <FluentButton type="submit" variant="primary" size="lg">
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </FluentButton>
          </div>
        </form>
      </FluentModal>

      {/* ================= MODAL 2: SERVICE DETAILS MODAL (with Admin Edit & Delete inside Modal) ================= */}
      {inspectingEntry && (
        <FluentModal
          isOpen={!!inspectingEntry}
          onClose={() => setInspectingEntryId(null)}
          title={inspectingEntry.title}
          subtitle="تفاصيل مقدم الخدمة والتواصل المباشر"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
              <span className="text-xs text-[#94A3B8]">اسم مقدم الخدمة:</span>
              <div className="text-base font-extrabold text-[#F8FAFC]">
                {inspectingEntry.title}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#94A3B8] block">رقم الهاتف:</span>
                <span className="text-base font-extrabold text-sky-400 font-mono-tabular">
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
                  href={`https://wa.me/${formatWhatsappNumber(inspectingEntry.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>مراسلة</span>
                </a>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs text-[#94A3B8] block">اللوكيشن:</span>
                <span className="text-xs font-mono-tabular text-[#E2E8F0] truncate block">
                  {inspectingEntry.locationUrl || 'https://maps.google.com'}
                </span>
              </div>

              <a
                href={inspectingEntry.locationUrl || 'https://maps.google.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                <span>فتح الرابط</span>
              </a>
            </div>

            {/* Admin Controls inside the Modal */}
            {isAdmin && (
              <div className="pt-3 border-t border-[#334155] flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-300">
                  صلاحيات المسؤول (Admin):
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
                </div>
              </div>
            )}
          </div>
        </FluentModal>
      )}
    </div>
  );
};

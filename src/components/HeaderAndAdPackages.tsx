import React, { useEffect, useState } from 'react';
import {
  Crown,
  UserPlus,
  LogOut,
  Menu,
  Clock,
  Calendar,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { PlatformSettings, UserAccount } from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { PWAInstallButton } from './PWAInstallPrompt';

interface HeaderAndAdPackagesProps {
  settings: PlatformSettings;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenMobileSidebar: () => void;
}

const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const HeaderAndAdPackages: React.FC<HeaderAndAdPackagesProps> = ({
  settings,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenMobileSidebar,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Ad Packages Duration States
  const [pkg1Days, setPkg1Days] = useState<number>(10); // 1 to 10 days (15 EGP/day, 10 days = 20% off => 120 EGP)
  const [pkg2Days, setPkg2Days] = useState<number>(10); // 1 to 10 days (25 EGP/day, 10 days = 20% off => 200 EGP)
  const [pkg3Days, setPkg3Days] = useState<number>(1); // 1 to 3 days (100 EGP/day)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Day, Date, and 12-hour Clock with Seconds (صباحاً / مساءً)
  const dayName = ARABIC_DAYS[now.getDay()];
  const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}/${String(now.getDate()).padStart(2, '0')}`;

  const rawHours = now.getHours();
  const periodLabel = rawHours >= 12 ? 'مساءً' : 'صباحاً';
  const hours12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const formattedTime = `${String(hours12).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${periodLabel}`;

  // Pricing Calculations
  const pkg1OriginalPrice = pkg1Days * 15;
  const pkg1FinalPrice = pkg1Days === 10 ? 120 : pkg1OriginalPrice;

  const pkg2OriginalPrice = pkg2Days * 25;
  const pkg2FinalPrice = pkg2Days === 10 ? 200 : pkg2OriginalPrice;

  const pkg3FinalPrice = pkg3Days * 100;

  const handleSubscribeWhatsapp = (
    pkgTitle: string,
    days: number,
    price: number,
    hasDiscount: boolean
  ) => {
    const cleanPhone = settings.adminWhatsapp.replace(/[^0-9]/g, '') || '201000000000';
    const userLabel = currentUser ? `المستخدم: ${currentUser.username}` : 'زائر بالموقع';
    const discountNote = hasDiscount ? ' (شامل خصم 20% لباقة الـ 10 أيام)' : '';
    const message = `مرحباً إدارة "${settings.siteName}"،\nأرغب في الاشتراك في:\n*${pkgTitle}*\nالمدة المطلوبة: ${days} ${
      days === 1 ? 'يوم' : 'أيام'
    }\nإجمالي التكلفة: ${price} جنيه${discountNote}\n(${userLabel})`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full fluent-acrylic border-b border-[#334155] shadow-lg">
        {/* 1. Very Top Moving News / Ad Ticker (Full width marquee without label) */}
        <div className="w-full bg-[#0A192F] border-b border-[#334155]/80 py-1.5 px-3 overflow-hidden flex items-center">
          <div className="w-full overflow-hidden relative">
            <div className="animate-news-marquee text-xs sm:text-sm font-semibold text-[#F8FAFC]">
              {settings.marqueeText}
            </div>
          </div>
        </div>

        {/* 2. Main Header Row */}
        <div className="max-w-[1600px] mx-auto px-1.5 sm:px-6 py-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 overflow-x-hidden">
          {/* Row 1 on Mobile / Right Side on Desktop: Mobile Drawer Button + Brand + Auth (Account & Logout) + Crown "للإعلانات" + PWA Install in 1 single line */}
          <div className="flex items-center justify-between lg:justify-start gap-1 sm:gap-2.5 flex-nowrap w-full lg:w-auto min-w-0">
            {/* Mobile Sidebar Trigger */}
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              aria-label="فتح القائمة الجانبية"
              className="lg:hidden fluent-reveal w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#F8FAFC] cursor-pointer shrink-0"
            >
              <Menu className="w-3.5 h-3.5 sm:w-5 sm:h-5 relative z-10" />
            </button>

            {/* Site Brand Title */}
            <div className="hidden sm:flex flex-col shrink-0">
              <span className="text-sm sm:text-base font-extrabold text-[#F8FAFC] tracking-tight whitespace-nowrap">
                {settings.siteName}
              </span>
              <span className="text-[11px] text-[#94A3B8]">
                البوابة الخدمية والتجارية الموحدة
              </span>
            </div>

            {/* Auth Button (Register/Login OR Logged-in Username + Logout in 1 compact group) */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 bg-[#0A192F]/90 border border-[#334155] rounded-lg sm:rounded-xl px-1.5 sm:px-3 py-1 sm:py-1.5 min-w-0 shrink">
                <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                  {(currentUser.role === 'admin' || currentUser.role === 'moderator') && (
                    <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="text-[10px] sm:text-sm font-bold text-sky-300 truncate max-w-[55px] sm:max-w-none">
                    {currentUser.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="fluent-reveal px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-rose-600/85 hover:bg-rose-500 text-white text-[10px] sm:text-xs font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <LogOut className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 relative z-10 shrink-0" />
                  <span className="relative z-10">خروج</span>
                </button>
              </div>
            ) : (
              <FluentButton
                variant="primary"
                size="sm"
                onClick={onOpenAuthModal}
                className="rounded-lg sm:rounded-xl !px-1.5 sm:!px-3.5 !py-1 sm:!py-1.5 !text-[10px] sm:!text-xs whitespace-nowrap shrink-0 !gap-1 sm:!gap-2"
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span>تسجيل الدخول</span>
              </FluentButton>
            )}

            {/* Crown Icon Button with "للإعلانات" */}
            <button
              type="button"
              onClick={() => setIsAdModalOpen(true)}
              className="fluent-reveal flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-b from-amber-500/20 to-[#1E293B] border border-amber-400/50 hover:border-amber-300 text-amber-300 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 fill-amber-400/30 relative z-10 shrink-0" />
              <span className="relative z-10 text-[10px] sm:text-xs font-extrabold text-amber-200 whitespace-nowrap">
                للإعلانات
              </span>
            </button>

            <PWAInstallButton />
          </div>

          {/* Row 2 on Mobile (Directly Below Buttons) / Left Side on Desktop: Live Day, Date, and 12-hour Clock with Seconds */}
          <div className="w-full lg:w-auto flex items-center justify-center lg:justify-end gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-xl bg-[#0A192F]/90 border border-[#334155] text-[11px] sm:text-sm whitespace-nowrap">
            <div className="flex items-center gap-1.5 text-[#94A3B8]">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
              <span className="font-bold text-[#F8FAFC]">{dayName}</span>
              <span className="font-mono-tabular text-[#94A3B8]">{formattedDate}</span>
            </div>
            <span className="text-[#334155]">|</span>
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="font-mono-tabular tracking-wide" dir="ltr">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Ad Packages Modal (Triggered by Crown 👑 "للإعلانات") */}
      <FluentModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        title="👑 باقات الإعلانات المميزة في المنصة"
        subtitle="اختر الباقة والمدة المناسبة لنشاطك التجاري واشترك فوراً عبر واتساب"
        maxWidth="4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Package 1: Moving Square List */}
          <FluentCard className="flex flex-col justify-between space-y-5 border-sky-400/40">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400">الباقة الأولى</span>
                <span className="text-xs font-mono-tabular text-[#94A3B8]">
                  15 جنيه / اليوم
                </span>
              </div>
              <h4 className="text-lg font-extrabold text-[#F8FAFC]">
                إعلان في القائمة المتحركة
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                يظهر إعلانك بشكل مربع مميز في شريط الإعلانات المربعة المتحركة أسفل البانر الرئيسي
                طوال فترة الاشتراك.
              </p>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#F8FAFC]">
                  اختر المدة (من يوم إلى 10 أيام):
                </label>
                <select
                  value={pkg1Days}
                  onChange={(e) => setPkg1Days(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3 py-2.5 text-[#F8FAFC] outline-none"
                >
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام'}
                      {d === 10 ? ' (خصم 20% 🔥)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>سعر اليوم:</span>
                  <span className="font-mono-tabular">15 جنيه</span>
                </div>
                {pkg1Days === 10 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      خصم 20% لباقة 10 أيام:
                    </span>
                    <span className="line-through text-rose-400 font-mono-tabular">
                      150 جنيه
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">الإجمالي المطلوب:</span>
                  <span className="text-xl font-extrabold text-sky-400 font-mono-tabular">
                    {pkg1FinalPrice} جنيه
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                handleSubscribeWhatsapp(
                  'الباقة الأولى (القائمة المتحركة)',
                  pkg1Days,
                  pkg1FinalPrice,
                  pkg1Days === 10
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              <span>اشترك</span>
            </FluentButton>
          </FluentCard>

          {/* Package 2: Top Main Banner */}
          <FluentCard className="flex flex-col justify-between space-y-5 border-amber-400/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">الباقة الثانية · الأكثر طلباً</span>
                <span className="text-xs font-mono-tabular text-[#94A3B8]">
                  25 جنيه / اليوم
                </span>
              </div>
              <h4 className="text-lg font-extrabold text-[#F8FAFC]">
                بانر علوي يظهر لجميع المستخدمين
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                بانر عريض بصدارة الموقع الرئيسية مع إطار مضيء وتبديل تلقائي يضمن أعلى نسبة مشاهدة
                لجميع الزوار.
              </p>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#F8FAFC]">
                  اختر المدة (من يوم إلى 10 أيام):
                </label>
                <select
                  value={pkg2Days}
                  onChange={(e) => setPkg2Days(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] focus:border-amber-400 px-3 py-2.5 text-[#F8FAFC] outline-none"
                >
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'يوم' : d === 2 ? 'يومين' : 'أيام'}
                      {d === 10 ? ' (خصم 20% 🔥)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>سعر اليوم:</span>
                  <span className="font-mono-tabular">25 جنيه</span>
                </div>
                {pkg2Days === 10 && (
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      خصم 20% لباقة 10 أيام:
                    </span>
                    <span className="line-through text-rose-400 font-mono-tabular">
                      250 جنيه
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">الإجمالي المطلوب:</span>
                  <span className="text-xl font-extrabold text-amber-400 font-mono-tabular">
                    {pkg2FinalPrice} جنيه
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant="emerald"
              size="lg"
              className="w-full"
              onClick={() =>
                handleSubscribeWhatsapp(
                  'الباقة الثانية (بانر علوي يظهر لجميع المستخدمين)',
                  pkg2Days,
                  pkg2FinalPrice,
                  pkg2Days === 10
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              <span>اشترك</span>
            </FluentButton>
          </FluentCard>

          {/* Package 3: Entry Popup Ad */}
          <FluentCard className="flex flex-col justify-between space-y-5 border-indigo-400/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">الباقة الثالثة · VIP</span>
                <span className="text-xs font-mono-tabular text-[#94A3B8]">
                  100 جنيه / اليوم
                </span>
              </div>
              <h4 className="text-lg font-extrabold text-[#F8FAFC]">
                شاشة منبثقة عند دخول الموقع
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                إعلان حصري يظهر كشاشة منبثقة (Pop-up) في منتصف الشاشة تلقائياً لكل زائر فور فتح
                الموقع.
              </p>

              <div className="pt-2 space-y-2">
                <label className="block text-xs font-bold text-[#F8FAFC]">
                  اختر المدة (من يوم إلى 3 أيام):
                </label>
                <select
                  value={pkg3Days}
                  onChange={(e) => setPkg3Days(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] focus:border-indigo-400 px-3 py-2.5 text-[#F8FAFC] outline-none"
                >
                  <option value={1}>يوم واحد (100 جنيه)</option>
                  <option value={2}>يومين (200 جنيه)</option>
                  <option value={3}>3 أيام (300 جنيه)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>سعر اليوم:</span>
                  <span className="font-mono-tabular">100 جنيه</span>
                </div>
                <div className="pt-2 border-t border-[#334155] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">الإجمالي المطلوب:</span>
                  <span className="text-xl font-extrabold text-indigo-400 font-mono-tabular">
                    {pkg3FinalPrice} جنيه
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() =>
                handleSubscribeWhatsapp(
                  'الباقة الثالثة (شاشة منبثقة عند دخول الموقع)',
                  pkg3Days,
                  pkg3FinalPrice,
                  false
                )
              }
            >
              <MessageCircle className="w-4 h-4" />
              <span>اشترك</span>
            </FluentButton>
          </FluentCard>
        </div>
      </FluentModal>
    </>
  );
};

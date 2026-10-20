import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Phone,
  MessageCircle,
  Sparkles,
  Pin,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Compass,
  X,
} from 'lucide-react';
import {
  MainSectionId,
  PopupAdConfig,
  SquareMovingAd,
  StoreListingItem,
  TopBannerAd,
} from '../types';
import { FluentButton, FluentModal } from './FluentUI';

interface TopBannersAndSquareAdsProps {
  topBanners: TopBannerAd[];
  squareAds: SquareMovingAd[];
  stores: StoreListingItem[];
  popupAd: PopupAdConfig;
  showBannersAndSquareAds?: boolean;
  onNavigateSection?: (section: MainSectionId) => void;
  onEntryPopupClosed?: () => void;
}

const ROTATION_STORAGE_KEY = 'fluent_square_ads_rotation_v2';
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export const TopBannersAndSquareAds: React.FC<TopBannersAndSquareAdsProps> = ({
  topBanners,
  squareAds,
  stores,
  popupAd,
  showBannersAndSquareAds = true,
  onNavigateSection,
  onEntryPopupClosed,
}) => {
  // Re-evaluate expiration every 30 seconds so expired ads automatically disappear
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const activeBanners = useMemo(
    () =>
      topBanners.filter((b) => {
        if (!b.active) return false;
        if (b.expiresAt && new Date(b.expiresAt).getTime() < nowTick) return false;
        return true;
      }),
    [topBanners, nowTick]
  );

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const [selectedSquareAd, setSelectedSquareAd] = useState<SquareMovingAd | null>(null);
  const [selectedTopBanner, setSelectedTopBanner] = useState<TopBannerAd | null>(null);
  const [fullImagePreviewUrl, setFullImagePreviewUrl] = useState<string | null>(null);

  // Entry Pop-up Ad state (opens automatically on entry if active and not expired)
  const [showEntryPopup, setShowEntryPopup] = useState<boolean>(() => {
    if (!popupAd || !popupAd.active) return false;
    if (popupAd.expiresAt && new Date(popupAd.expiresAt).getTime() < Date.now()) {
      return false;
    }
    return true;
  });

  const handleCloseEntryPopup = () => {
    setShowEntryPopup(false);
    if (onEntryPopupClosed) {
      onEntryPopupClosed();
    }
  };

  // 1. Auto-advance Top Banner every 2 seconds (2000ms) with smooth transition
  useEffect(() => {
    if (activeBanners.length <= 1 || isBannerPaused) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeBanners.length, isBannerPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsBannerPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && activeBanners.length > 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      if (Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
        } else {
          setCurrentBannerIndex(
            (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
          );
        }
      }
    }
    touchStartXRef.current = null;
    setTimeout(() => setIsBannerPaused(false), 1200);
  };

  // 2. Moving Square Ads Logic
  const displayedSquareAds = useMemo(() => {
    const validAds = squareAds.filter((ad) => {
      if (!ad.active) return false;
      if (ad.expiresAt && new Date(ad.expiresAt).getTime() < nowTick) return false;
      return true;
    });

    const storeDerivedAds: SquareMovingAd[] = stores
      .filter((s) => s.approved)
      .map((s) => ({
        id: `store-sq-${s.id}`,
        title: s.name,
        category: s.category,
        imageUrl: s.menuImages?.[0] || '',
        locationUrl: s.locationUrl,
        phone: s.phone,
        menuImages: s.menuImages,
        description: s.details,
        isAdminPinned: Boolean(s.featuredInMarquee),
        active: true,
        createdAt: s.createdAt,
      }));

    const combinedPool = [...validAds];
    storeDerivedAds.forEach((sd) => {
      if (!combinedPool.some((c) => c.title === sd.title)) {
        combinedPool.push(sd);
      }
    });

    const adminPinnedAds = combinedPool.filter((ad) => ad.isAdminPinned);

    if (adminPinnedAds.length > 0) {
      const unpinnedPool = combinedPool.filter((ad) => !ad.isAdminPinned);
      const rotatedRandom = selectRandomPerCategoryEvery3Hours(unpinnedPool, nowTick);
      return [...adminPinnedAds, ...rotatedRandom];
    }

    return selectRandomPerCategoryEvery3Hours(combinedPool, nowTick);
  }, [squareAds, stores, nowTick]);

  const currentBanner = activeBanners[currentBannerIndex] || activeBanners[0];

  const formatWhatsapp = (rawPhone: string) => {
    const digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('01') && digits.length === 11) return `2${digits}`;
    return digits;
  };

  const handleNavigateInternalSection = (target?: string) => {
    if (!target || !onNavigateSection) return;
    if (
      target === 'directory' ||
      target === 'services_numbers' ||
      target === 'tawsila' ||
      target === 'community' ||
      target === 'settings'
    ) {
      onNavigateSection(target);
    } else {
      onNavigateSection('directory');
    }
  };

  return (
    <section className="w-full space-y-4 overflow-x-hidden">
      {/* 1. Main Top Banner Carousel (Full uncropped image via object-contain + full text visibility) */}
      {showBannersAndSquareAds && currentBanner && (
        <div
          className="fluent-reveal relative w-full rounded-2xl bg-[#112240] border-2 border-sky-400/50 shadow-[0_0_25px_-5px_rgba(56,189,248,0.35)] overflow-hidden select-none"
          onMouseEnter={() => setIsBannerPaused(true)}
          onMouseLeave={() => setIsBannerPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative w-full">
            {/* Full Uncropped Banner Image Container */}
            <div
              onClick={() => setSelectedTopBanner(currentBanner)}
              className="relative w-full bg-[#0A192F] flex items-center justify-center cursor-pointer overflow-hidden"
            >
              <img
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[320px] sm:max-h-[380px] object-contain mx-auto block"
              />
            </div>

            {/* Banner Full Text & Action Bar Below Image (Nothing hidden or cropped) */}
            <div
              onClick={() => setSelectedTopBanner(currentBanner)}
              className="p-3.5 sm:p-4 bg-[#112240] border-t border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-extrabold text-[#F8FAFC] break-words whitespace-normal leading-snug">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-xs sm:text-sm text-[#E2E8F0] break-words whitespace-normal leading-relaxed">
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>

              <div
                className="flex flex-wrap items-center gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {currentBanner.phone && (
                  <a
                    href={`tel:${currentBanner.phone}`}
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/95 hover:bg-sky-500 text-white text-xs font-bold shadow-lg"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                )}
                {(currentBanner.whatsappPhone || currentBanner.phone) && (
                  <a
                    href={`https://wa.me/${formatWhatsapp(
                      currentBanner.whatsappPhone || currentBanner.phone || ''
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/95 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400/50 shadow-lg"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>مراسلة</span>
                  </a>
                )}
                {currentBanner.locationUrl && (
                  <a
                    href={currentBanner.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/95 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح اللوكيشن</span>
                  </a>
                )}
              </div>
            </div>

            {/* Next / Prev Quick Arrows for Desktop */}
            {activeBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentBannerIndex(
                      (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                    )
                  }
                  aria-label="البانر السابق"
                  className="hidden sm:flex absolute right-3 top-1/3 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#0A192F]/85 hover:bg-sky-600 text-white border border-[#334155] items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length)
                  }
                  aria-label="البانر التالي"
                  className="hidden sm:flex absolute left-3 top-1/3 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-[#0A192F]/85 hover:bg-sky-600 text-white border border-[#334155] items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Indicator Dots */}
            {activeBanners.length > 1 && (
              <div className="py-2 bg-[#0A192F]/90 border-t border-[#334155]/60 flex items-center justify-center gap-2">
                {activeBanners.map((b, idx) => {
                  const isSelected = idx === currentBannerIndex;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      aria-label={`الانتقال إلى البنر ${idx + 1}`}
                      onClick={() => setCurrentBannerIndex(idx)}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'w-7 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]'
                          : 'w-2.5 bg-[#94A3B8]/50 hover:bg-[#F8FAFC]'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Moving Square Ads Strip Below Top Banner (Full image + Full text without truncation) */}
      {showBannersAndSquareAds && displayedSquareAds.length > 0 && (
        <div className="fluent-reveal w-full rounded-2xl bg-[#112240]/90 border border-sky-400/40 p-3.5 shadow-lg overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-extrabold text-[#F8FAFC]">
                قائمة الإعلانات المربعة المتحركة
              </h3>
            </div>
          </div>

          {/* Continuous Slow Moving Square Cards Track */}
          <div className="w-full overflow-x-auto sm:overflow-hidden py-1 relative z-10">
            <div className="animate-square-ads gap-3.5 items-stretch">
              {[...displayedSquareAds, ...displayedSquareAds].map((ad, idx) => (
                <div
                  key={`${ad.id}-${idx}`}
                  onClick={() => setSelectedSquareAd(ad)}
                  className="fluent-reveal w-48 sm:w-56 shrink-0 rounded-xl bg-[#0A192F] border border-[#334155] hover:border-sky-400 overflow-hidden cursor-pointer flex flex-col justify-between"
                >
                  {/* Full Uncropped Ad Image */}
                  <div className="relative w-full h-36 sm:h-40 bg-[#0A192F] border-b border-[#334155]/70 flex items-center justify-center overflow-hidden p-1">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                    {ad.isAdminPinned && (
                      <div
                        title="إعلان مثبت من الإدارة"
                        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-[#0A192F] text-[10px] font-extrabold flex items-center gap-0.5 shadow"
                      >
                        <Pin className="w-2.5 h-2.5" />
                        <span>مثبت</span>
                      </div>
                    )}
                  </div>

                  {/* Full Uncut Written Text (No truncate or ellipsis) */}
                  <div className="p-3 space-y-1 text-right relative z-10 flex-1 flex flex-col justify-center">
                    <div className="text-[11px] text-sky-400 font-bold break-words whitespace-normal leading-snug">
                      {ad.category}
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] break-words whitespace-normal leading-snug">
                      {ad.title}
                    </div>
                    {ad.description && (
                      <div className="text-[11px] text-[#94A3B8] break-words whitespace-normal leading-relaxed pt-0.5">
                        {ad.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal when user clicks a Top Banner (Full uncropped image + full text) */}
      {selectedTopBanner && (
        <FluentModal
          isOpen={!!selectedTopBanner}
          onClose={() => setSelectedTopBanner(null)}
          title={selectedTopBanner.title}
          subtitle={selectedTopBanner.subtitle || 'تفاصيل الإعلان والمنيو واللوكيشن'}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div
              onClick={() => setFullImagePreviewUrl(selectedTopBanner.imageUrl)}
              className="w-full rounded-xl overflow-hidden bg-[#0A192F] border border-[#334155] flex items-center justify-center p-2 cursor-zoom-in"
            >
              <img
                src={selectedTopBanner.imageUrl}
                alt={selectedTopBanner.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            {selectedTopBanner.subtitle && (
              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] text-sm text-[#F8FAFC] whitespace-pre-wrap break-words leading-relaxed">
                {selectedTopBanner.subtitle}
              </div>
            )}

            {selectedTopBanner.phone && (
              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-[#94A3B8]">
                  رقم الهاتف:{' '}
                  <strong className="text-sky-400 font-mono-tabular text-sm">
                    {selectedTopBanner.phone}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedTopBanner.phone}`}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/${formatWhatsapp(selectedTopBanner.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>مراسلة</span>
                  </a>
                </div>
              </div>
            )}

            {selectedTopBanner.locationUrl && (
              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                <span className="text-xs text-[#94A3B8] break-all">
                  لوكيشن المكان: {selectedTopBanner.locationUrl}
                </span>
                <a
                  href={selectedTopBanner.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح</span>
                </a>
              </div>
            )}

            {selectedTopBanner.menuImages && selectedTopBanner.menuImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-sky-400">
                  صور إضافية / منيو المكان (اضغط على أي صورة لعرضها بالحجم الكامل):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTopBanner.menuImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setFullImagePreviewUrl(img)}
                      className="w-full rounded-xl bg-[#0A192F] border border-[#334155] p-1.5 flex items-center justify-center cursor-zoom-in"
                    >
                      <img
                        src={img}
                        alt={`Menu ${i + 1}`}
                        className="w-full max-h-72 object-contain rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTopBanner.targetSection && (
              <div className="flex justify-end">
                <FluentButton
                  variant="primary"
                  onClick={() => {
                    handleNavigateInternalSection(selectedTopBanner.targetSection);
                    setSelectedTopBanner(null);
                  }}
                >
                  <Compass className="w-4 h-4" />
                  <span>التوجه إلى القسم المحدد بالموقع</span>
                </FluentButton>
              </div>
            )}
          </div>
        </FluentModal>
      )}

      {/* Modal when user clicks a Square Moving Ad (Full uncropped image + full text) */}
      {selectedSquareAd && (
        <FluentModal
          isOpen={!!selectedSquareAd}
          onClose={() => setSelectedSquareAd(null)}
          title={selectedSquareAd.title}
          subtitle={`القسم: ${selectedSquareAd.category}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div
              onClick={() => setFullImagePreviewUrl(selectedSquareAd.imageUrl)}
              className="w-full rounded-xl overflow-hidden bg-[#0A192F] border border-[#334155] flex items-center justify-center p-2 cursor-zoom-in"
            >
              <img
                src={selectedSquareAd.imageUrl}
                alt={selectedSquareAd.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-1.5">
              <div className="text-xs font-bold text-sky-400 break-words whitespace-normal">
                {selectedSquareAd.category}
              </div>
              <div className="text-base font-extrabold text-[#F8FAFC] break-words whitespace-normal">
                {selectedSquareAd.title}
              </div>
              {selectedSquareAd.description && (
                <p className="text-sm text-[#E2E8F0] whitespace-pre-wrap break-words leading-relaxed pt-1">
                  {selectedSquareAd.description}
                </p>
              )}
            </div>

            {selectedSquareAd.phone && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-[#0A192F] border border-[#334155]">
                <span className="text-xs text-[#94A3B8]">
                  رقم الهاتف:{' '}
                  <strong className="text-sky-400 font-mono-tabular">
                    {selectedSquareAd.phone}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedSquareAd.phone}`}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                  <a
                    href={`https://wa.me/${formatWhatsapp(selectedSquareAd.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>مراسلة</span>
                  </a>
                </div>
              </div>
            )}

            {selectedSquareAd.locationUrl && (
              <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                <span className="text-xs text-[#94A3B8] break-all">
                  لوكيشن المكان: {selectedSquareAd.locationUrl}
                </span>
                <a
                  href={selectedSquareAd.locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح</span>
                </a>
              </div>
            )}

            {selectedSquareAd.menuImages && selectedSquareAd.menuImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-sky-400">
                  صور المنيو / الإعلان (اضغط على أي صورة لعرضها كاملة):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSquareAd.menuImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setFullImagePreviewUrl(img)}
                      className="w-full rounded-xl bg-[#0A192F] border border-[#334155] p-1.5 flex items-center justify-center cursor-zoom-in"
                    >
                      <img
                        src={img}
                        alt={`Menu ${i + 1}`}
                        className="w-full max-h-72 object-contain rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSquareAd.targetSection && (
              <div className="flex justify-end">
                <FluentButton
                  variant="primary"
                  onClick={() => {
                    handleNavigateInternalSection(selectedSquareAd.targetSection);
                    setSelectedSquareAd(null);
                  }}
                >
                  <Compass className="w-4 h-4" />
                  <span>التوجه إلى القسم المحدد بالموقع</span>
                </FluentButton>
              </div>
            )}
          </div>
        </FluentModal>
      )}

      {/* 3. Entry Pop-up Ad Modal (Appears automatically on site entry; closing it opens Auth Modal) */}
      <FluentModal
        isOpen={
          showEntryPopup &&
          popupAd.active &&
          (!popupAd.expiresAt || new Date(popupAd.expiresAt).getTime() > nowTick)
        }
        onClose={handleCloseEntryPopup}
        title={popupAd.title || 'مرحباً بكم في موقع خدمات التخيل 1185'}
        subtitle="إعلان الشاشة المنبثقة الترحيبي"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {popupAd.imageUrl && (
            <div
              onClick={() => setFullImagePreviewUrl(popupAd.imageUrl)}
              className="w-full rounded-xl overflow-hidden bg-[#0A192F] border border-sky-400/40 flex items-center justify-center p-2 cursor-zoom-in"
            >
              <img
                src={popupAd.imageUrl}
                alt={popupAd.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[60vh] object-contain"
              />
            </div>
          )}

          {popupAd.description && (
            <p className="text-sm text-[#F8FAFC] whitespace-pre-wrap break-words leading-relaxed">
              {popupAd.description}
            </p>
          )}

          {(popupAd.phone || popupAd.locationUrl) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {popupAd.phone && (
                <div className="p-3 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-xs font-bold text-sky-400">
                    {popupAd.phone}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${popupAd.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-bold"
                    >
                      اتصال
                    </a>
                    <a
                      href={`https://wa.me/${formatWhatsapp(popupAd.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                    >
                      مراسلة
                    </a>
                  </div>
                </div>
              )}

              {popupAd.locationUrl && (
                <div className="p-3 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                  <span className="text-xs text-[#94A3B8] truncate">لوكيشن المكان</span>
                  <a
                    href={popupAd.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>فتح</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {popupAd.menuImages && popupAd.menuImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {popupAd.menuImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setFullImagePreviewUrl(img)}
                  className="w-full rounded-lg bg-[#0A192F] border border-[#334155] p-1 flex items-center justify-center cursor-zoom-in"
                >
                  <img
                    src={img}
                    alt={`Popup Menu ${i + 1}`}
                    className="w-full max-h-56 object-contain rounded"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#334155]">
            <FluentButton variant="ghost" onClick={handleCloseEntryPopup}>
              إغلاق
            </FluentButton>
            {popupAd.targetSection && (
              <FluentButton
                variant="primary"
                onClick={() => {
                  handleNavigateInternalSection(popupAd.targetSection);
                  handleCloseEntryPopup();
                }}
              >
                <Compass className="w-4 h-4" />
                <span>انتقل إلى القسم</span>
              </FluentButton>
            )}
            {popupAd.whatsappPhone && (
              <FluentButton
                variant="emerald"
                onClick={() => {
                  const clean = formatWhatsapp(popupAd.whatsappPhone || '');
                  window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer');
                }}
              >
                <MessageCircle className="w-4 h-4" />
                <span>{popupAd.buttonText || 'تواصل عبر واتساب'}</span>
              </FluentButton>
            )}
          </div>
        </div>
      </FluentModal>

      {/* Full Image Lightbox Preview Modal (100% Complete Uncropped View) */}
      {fullImagePreviewUrl && (
        <div
          className="fixed inset-0 z-[70] bg-[#0A192F]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setFullImagePreviewUrl(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFullImagePreviewUrl(null)}
              className="mb-3 self-start px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <X className="w-4 h-4" />
              <span>إغلاق معاينة الصورة الكاملة</span>
            </button>
            <img
              src={fullImagePreviewUrl}
              alt="معاينة الصورة كاملة"
              className="w-full max-h-[82vh] object-contain rounded-2xl border border-sky-400/50 bg-[#0A192F] shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};

function selectRandomPerCategoryEvery3Hours(
  pool: SquareMovingAd[],
  nowMs: number
): SquareMovingAd[] {
  if (pool.length === 0) return [];

  const currentBucket = Math.floor(nowMs / THREE_HOURS_MS);

  try {
    const cachedRaw = localStorage.getItem(ROTATION_STORAGE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed.bucket === currentBucket && Array.isArray(parsed.ids)) {
        const matched = parsed.ids
          .map((id: string) => pool.find((item) => item.id === id))
          .filter(Boolean) as SquareMovingAd[];
        if (matched.length > 0) {
          return matched;
        }
      }
    }
  } catch {
    // ignore storage errors
  }

  const byCategory = new Map<string, SquareMovingAd[]>();
  pool.forEach((ad) => {
    const list = byCategory.get(ad.category) || [];
    list.push(ad);
    byCategory.set(ad.category, list);
  });

  const selected: SquareMovingAd[] = [];
  byCategory.forEach((items) => {
    const randomIndex = Math.floor(Math.random() * items.length);
    selected.push(items[randomIndex]);
  });

  try {
    localStorage.setItem(
      ROTATION_STORAGE_KEY,
      JSON.stringify({
        bucket: currentBucket,
        ids: selected.map((s) => s.id),
      })
    );
  } catch {
    // ignore
  }

  return selected;
}

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
  Trash2,
  CheckSquare,
} from 'lucide-react';
import {
  MainSectionId,
  PopupAdConfig,
  SquareMovingAd,
  StoreListingItem,
  TopBannerAd,
} from '../types';
import { FluentButton, FluentModal } from './FluentUI';
import { createSquareAdSvg } from '../services/storageService';

const normalizeWhiteAdSvg = (imgUrl: string | undefined, title: string, category: string) => {
  if (!imgUrl) return createSquareAdSvg(title, category, '#0284C7');
  if (
    imgUrl.startsWith('data:image/svg+xml') &&
    (imgUrl.includes('%230A192F') || imgUrl.includes('#0A192F'))
  ) {
    return createSquareAdSvg(title, category, '#0284C7');
  }
  return imgUrl;
};

interface TopBannersAndSquareAdsProps {
  topBanners: TopBannerAd[];
  squareAds: SquareMovingAd[];
  stores: StoreListingItem[];
  popupAd: PopupAdConfig;
  isAdmin?: boolean;
  showBannersAndSquareAds?: boolean;
  onNavigateSection?: (section: MainSectionId) => void;
  onEntryPopupClosed?: () => void;
  onBulkDeleteAds?: (
    squareAdIds: string[],
    topBannerIds: string[],
    storeIds: string[]
  ) => void;
}

const ROTATION_STORAGE_KEY = 'fluent_square_ads_rotation_v2';
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

export const TopBannersAndSquareAds: React.FC<TopBannersAndSquareAdsProps> = ({
  topBanners,
  squareAds,
  stores,
  popupAd,
  isAdmin = false,
  showBannersAndSquareAds = true,
  onNavigateSection,
  onEntryPopupClosed,
  onBulkDeleteAds,
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

  // Admin Bulk Selection & Delete Confirmation States
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedAdKeys, setSelectedAdKeys] = useState<string[]>([]);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  const toggleSelectAdKey = (key: string) => {
    setSelectedAdKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setConfirmingBulkDelete(false);
  };

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

  // 1. Auto-advance Top Banner every 5 seconds (5000ms) with smooth transition
  useEffect(() => {
    if (activeBanners.length <= 1 || isBannerPaused || isBulkSelectMode) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length, isBannerPaused, isBulkSelectMode]);

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
    const validAds = squareAds
      .filter((ad) => {
        if (!ad.active) return false;
        if (ad.expiresAt && new Date(ad.expiresAt).getTime() < nowTick) return false;
        return true;
      })
      .map((ad) => ({
        ...ad,
        imageUrl: normalizeWhiteAdSvg(ad.imageUrl, ad.title, ad.category),
      }));

    const storeDerivedAds: SquareMovingAd[] = stores
      .filter((s) => s.approved)
      .map((s) => ({
        id: `store-sq-${s.id}`,
        title: s.name,
        category: s.category,
        imageUrl: normalizeWhiteAdSvg(s.menuImages?.[0], s.name, s.category),
        locationUrl: s.locationUrl,
        phone: s.phone,
        menuImages: (s.menuImages || []).map((img) =>
          normalizeWhiteAdSvg(img, s.name, s.category)
        ),
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

  const handleConfirmExecuteBulkDelete = () => {
    if (!onBulkDeleteAds || selectedAdKeys.length === 0) return;
    const sqIds: string[] = [];
    const tbIds: string[] = [];
    const stIds: string[] = [];

    selectedAdKeys.forEach((key) => {
      if (key.startsWith('tb:')) {
        tbIds.push(key.slice(3));
      } else if (key.startsWith('sq:store-sq-')) {
        stIds.push(key.slice('sq:store-sq-'.length));
      } else if (key.startsWith('sq:')) {
        sqIds.push(key.slice(3));
      }
    });

    onBulkDeleteAds(sqIds, tbIds, stIds);
    setSelectedAdKeys([]);
    setConfirmingBulkDelete(false);
    setIsBulkSelectMode(false);
  };

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

  const cleanAdDescription = (title: string, category?: string, desc?: string) => {
    if (!desc) return '';
    if (
      desc.trim() === 'محل مسجل بالدليل التجاري' &&
      !title.includes('محل') &&
      !(category || '').includes('محل')
    ) {
      return '';
    }
    return desc;
  };

  return (
    <section className="w-full space-y-4 overflow-x-hidden">
      {/* 1. Main Top Banner Carousel (White background + Black text + Full uncropped image via object-contain) */}
      {showBannersAndSquareAds && currentBanner && (
        <div
          className="fluent-reveal relative w-full rounded-2xl bg-white text-black border-2 border-sky-500/60 shadow-lg overflow-hidden select-none"
          onMouseEnter={() => setIsBannerPaused(true)}
          onMouseLeave={() => setIsBannerPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative w-full">
            {/* Admin Checkbox on Top Banner when in Bulk Select Mode */}
            {isAdmin && isBulkSelectMode && (
              <label
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 border-2 border-rose-500 text-xs font-extrabold text-black cursor-pointer shadow-lg"
              >
                <input
                  type="checkbox"
                  checked={selectedAdKeys.includes(`tb:${currentBanner.id}`)}
                  onChange={() => toggleSelectAdKey(`tb:${currentBanner.id}`)}
                  className="w-4 h-4 accent-rose-600"
                />
                <span>تحديد هذا البنر للحذف</span>
              </label>
            )}

            {/* Full Uncropped Banner Image Container */}
            <div
              onClick={() => setSelectedTopBanner(currentBanner)}
              className="relative w-full bg-white flex items-center justify-center cursor-pointer overflow-hidden"
            >
              <img
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[300px] sm:max-h-[360px] object-contain mx-auto block"
              />
            </div>

            {/* Banner Full Text & Action Bar Below Image (White background + Black text) */}
            <div
              onClick={() => setSelectedTopBanner(currentBanner)}
              className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer"
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                <h2 className="text-sm sm:text-lg font-extrabold text-black break-words whitespace-normal leading-snug">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 break-words whitespace-normal leading-relaxed">
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
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
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
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
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
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
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
                  className="hidden sm:flex absolute right-3 top-1/3 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-sky-600 text-black hover:text-white border border-slate-300 items-center justify-center cursor-pointer transition-colors shadow"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length)
                  }
                  aria-label="البانر التالي"
                  className="hidden sm:flex absolute left-3 top-1/3 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-sky-600 text-black hover:text-white border border-slate-300 items-center justify-center cursor-pointer transition-colors shadow"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Indicator Dots */}
            {activeBanners.length > 1 && (
              <div className="py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-center gap-2">
                {activeBanners.map((b, idx) => {
                  const isSelected = idx === currentBannerIndex;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      aria-label={`الانتقال إلى البنر ${idx + 1}`}
                      onClick={() => setCurrentBannerIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'w-6 bg-sky-600'
                          : 'w-2 bg-slate-400 hover:bg-slate-600'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. لوحة الإعلانات والخصومات (Medium Size Strip + White Background + Black Text + Clear Image + Only Registered Name outside) */}
      {showBannersAndSquareAds && displayedSquareAds.length > 0 && (
        <div className="fluent-reveal w-full rounded-2xl bg-white text-black border-2 border-slate-300 p-2.5 sm:p-3 shadow-md overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1 relative z-10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="text-xs sm:text-sm font-extrabold text-black">
                لوحة الإعلانات والخصومات
              </h3>
            </div>

            {/* Admin Only: Multi-Select & Bulk Delete Ads with Confirmation Button */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1.5">
                {!isBulkSelectMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkSelectMode(true);
                      setSelectedAdKeys([]);
                      setConfirmingBulkDelete(false);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border border-slate-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                    <span>تحديد إعلانات للحذف</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = [
                          ...displayedSquareAds.map((a) => `sq:${a.id}`),
                          ...activeBanners.map((b) => `tb:${b.id}`),
                        ];
                        if (selectedAdKeys.length === allKeys.length) {
                          setSelectedAdKeys([]);
                        } else {
                          setSelectedAdKeys(allKeys);
                        }
                        setConfirmingBulkDelete(false);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-black border border-amber-400 text-[11px] font-extrabold cursor-pointer"
                    >
                      تحديد الكل ({selectedAdKeys.length})
                    </button>

                    {selectedAdKeys.length > 0 && !confirmingBulkDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmingBulkDelete(true)}
                        className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف المحدد ({selectedAdKeys.length})</span>
                      </button>
                    )}

                    {confirmingBulkDelete && (
                      <button
                        type="button"
                        onClick={handleConfirmExecuteBulkDelete}
                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border-2 border-black/30 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer animate-pulse shadow-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>تأكيد الحذف ({selectedAdKeys.length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkSelectMode(false);
                        setSelectedAdKeys([]);
                        setConfirmingBulkDelete(false);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-200 text-black hover:bg-slate-300 text-[11px] font-extrabold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Medium-Sized Moving Square Cards Track: Clear Image + Only Registered Name outside; click opens full details */}
          <div className="w-full overflow-x-auto sm:overflow-hidden py-0.5 relative z-10">
            <div
              className={
                isBulkSelectMode
                  ? 'flex flex-wrap gap-2.5 items-stretch'
                  : 'animate-square-ads gap-2.5 items-stretch'
              }
            >
              {(isBulkSelectMode
                ? displayedSquareAds
                : [...displayedSquareAds, ...displayedSquareAds]
              ).map((ad, idx) => {
                const adKey = `sq:${ad.id}`;
                const isSelectedForDelete = selectedAdKeys.includes(adKey);
                const outsideLabel = ad.title?.trim() || ad.category || '';
                return (
                  <div
                    key={`${ad.id}-${idx}`}
                    onClick={() => {
                      if (isAdmin && isBulkSelectMode) {
                        toggleSelectAdKey(adKey);
                      } else {
                        setSelectedSquareAd(ad);
                      }
                    }}
                    title="اضغط لعرض كافة البيانات والتفاصيل"
                    className={`fluent-reveal w-32 sm:w-36 shrink-0 rounded-xl bg-white text-black border overflow-hidden cursor-pointer flex flex-col justify-between shadow-sm transition-transform hover:scale-[1.02] ${
                      isSelectedForDelete
                        ? 'border-2 border-rose-600 ring-2 ring-rose-500/40'
                        : 'border-slate-300 hover:border-sky-500'
                    }`}
                  >
                    {/* Clear Uploaded Ad Image in Medium Square */}
                    <div className="relative w-full h-24 sm:h-28 bg-white flex items-center justify-center overflow-hidden p-1">
                      <img
                        src={ad.imageUrl}
                        alt={outsideLabel}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      {isAdmin && isBulkSelectMode && (
                        <div className="absolute top-1 left-1 z-20 bg-white/95 p-1 rounded-lg border border-rose-500 shadow">
                          <input
                            type="checkbox"
                            checked={isSelectedForDelete}
                            onChange={() => toggleSelectAdKey(adKey)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 accent-rose-600 cursor-pointer block"
                          />
                        </div>
                      )}
                      {ad.isAdminPinned && (
                        <div
                          title="إعلان مثبت من الإدارة"
                          className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-extrabold flex items-center gap-0.5 shadow"
                        >
                          <Pin className="w-2.5 h-2.5" />
                          <span>مثبت</span>
                        </div>
                      )}
                    </div>

                    {/* Outside Label: ONLY the registered store/place name (e.g., صيدلية / عيادة / مركز / اسم المسجل فقط) */}
                    <div className="px-2 py-1.5 bg-white border-t border-slate-200 text-center relative z-10">
                      <div className="text-[11px] sm:text-xs font-extrabold text-black truncate">
                        {outsideLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal when user clicks a Top Banner (White background + Black text + Full details) */}
      {selectedTopBanner && (
        <FluentModal
          isOpen={!!selectedTopBanner}
          onClose={() => setSelectedTopBanner(null)}
          title={selectedTopBanner.title}
          subtitle={selectedTopBanner.subtitle || 'تفاصيل الإعلان والمنيو واللوكيشن'}
          maxWidth="3xl"
          theme="light"
        >
          <div className="space-y-4 text-black">
            <div
              onClick={() => setFullImagePreviewUrl(selectedTopBanner.imageUrl)}
              className="w-full rounded-xl overflow-hidden bg-white border border-slate-300 flex items-center justify-center p-2 cursor-zoom-in"
            >
              <img
                src={selectedTopBanner.imageUrl}
                alt={selectedTopBanner.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            {selectedTopBanner.subtitle && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-black whitespace-pre-wrap break-words leading-relaxed">
                {selectedTopBanner.subtitle}
              </div>
            )}

            {selectedTopBanner.phone && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  رقم الهاتف:{' '}
                  <strong className="text-black font-mono-tabular text-sm font-extrabold">
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
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 break-all">
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
                <div className="text-xs font-extrabold text-black">
                  صور إضافية / منيو المكان (اضغط على أي صورة لعرضها بالحجم الكامل):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTopBanner.menuImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setFullImagePreviewUrl(img)}
                      className="w-full rounded-xl bg-white border border-slate-300 p-1.5 flex items-center justify-center cursor-zoom-in"
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

      {/* Modal when user clicks a Square Moving Ad (White background + Black text + All Details visible) */}
      {selectedSquareAd && (
        <FluentModal
          isOpen={!!selectedSquareAd}
          onClose={() => setSelectedSquareAd(null)}
          title={selectedSquareAd.title}
          subtitle={selectedSquareAd.category ? `القسم: ${selectedSquareAd.category}` : undefined}
          maxWidth="2xl"
          theme="light"
        >
          <div className="space-y-4 text-black">
            <div
              onClick={() => setFullImagePreviewUrl(selectedSquareAd.imageUrl)}
              className="w-full rounded-xl overflow-hidden bg-white border border-slate-300 flex items-center justify-center p-2 cursor-zoom-in"
            >
              <img
                src={selectedSquareAd.imageUrl}
                alt={selectedSquareAd.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1.5">
              {selectedSquareAd.category && (
                <div className="text-xs font-extrabold text-sky-800 break-words whitespace-normal">
                  {selectedSquareAd.category}
                </div>
              )}
              <div className="text-base font-extrabold text-black break-words whitespace-normal">
                {selectedSquareAd.title}
              </div>
              {cleanAdDescription(
                selectedSquareAd.title,
                selectedSquareAd.category,
                selectedSquareAd.description
              ) && (
                <p className="text-sm font-semibold text-black whitespace-pre-wrap break-words leading-relaxed pt-1">
                  {cleanAdDescription(
                    selectedSquareAd.title,
                    selectedSquareAd.category,
                    selectedSquareAd.description
                  )}
                </p>
              )}
            </div>

            {selectedSquareAd.phone && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-300">
                <span className="text-xs font-bold text-slate-800">
                  رقم الهاتف:{' '}
                  <strong className="text-black font-mono-tabular text-sm font-extrabold">
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

            {selectedSquareAd.locationUrl &&
              selectedSquareAd.locationUrl.trim() !== '' &&
              selectedSquareAd.locationUrl.trim() !== 'https://maps.google.com' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 break-all">
                    اللوكيشن: {selectedSquareAd.locationUrl}
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
                <div className="text-xs font-extrabold text-black">
                  صور المنيو / الإعلان (اضغط على أي صورة لعرضها كاملة):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSquareAd.menuImages.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setFullImagePreviewUrl(img)}
                      className="w-full rounded-xl bg-white border border-slate-300 p-1.5 flex items-center justify-center cursor-zoom-in"
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

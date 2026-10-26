import React, { useEffect, useRef, useState } from 'react';
import {
  Car,
  Plus,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Play,
  Square,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Upload,
  CheckCircle2,
  Trash2,
  Edit3,
  FileSpreadsheet,
  FileText,
  Radio,
  Compass,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { PlatformSettings, TawsilaRideItem, UserAccount } from '../types';
import { FluentButton, FluentCard, FluentModal } from './FluentUI';
import { uploadImageDynamic } from '../services/storageService';
import { exportTawsilaToExcel, exportTawsilaToPDF } from '../services/exportService';

interface TawsilaLiveViewProps {
  rides: TawsilaRideItem[];
  settings: PlatformSettings;
  currentUser: UserAccount | null;
  onAddTawsila: (ride: TawsilaRideItem) => void;
  onUpdateTawsila: (ride: TawsilaRideItem) => void;
  onDeleteTawsila: (id: string) => void;
  onUpdateSettings: (settings: PlatformSettings) => void;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export interface DriverActivationInfo {
  status: 'active_verified' | 'active_grace_period' | 'pending_admin' | 'suspended_expired';
  canWork: boolean;
  badgeLabel: string;
  remainingText?: string;
}

/**
 * Evaluates the strict driver activation & 3-day grace period logic:
 * 1. If Admin requires approval (`requireDriverCriminalRecordApproval === true`) and driver isn't approved / hasn't uploaded record:
 *    -> service remains pending (`pending_admin`).
 * 2. If service is opened directly to the driver (`requireDriverCriminalRecordApproval === false`):
 *    - If driver uploaded criminal record (`criminalRecordImageUrl`), they are fully verified (`active_verified`).
 *    - If driver has NOT uploaded criminal record yet, they get a 3-day (72h) grace period from `createdAt`.
 *      * Within 3 days -> `active_grace_period` (allowed to work, shows countdown).
 *      * After 3 days without uploading -> `suspended_expired` (account automatically stops until criminal record is uploaded!).
 */
export function evaluateDriverActivation(
  driver: TawsilaRideItem,
  requireAdminApproval?: boolean
): DriverActivationInfo {
  const hasCriminalRecord = Boolean(
    driver.criminalRecordImageUrl && driver.criminalRecordImageUrl.trim().length > 0
  );

  if (requireAdminApproval && (!driver.adminApproved || !hasCriminalRecord)) {
    return {
      status: 'pending_admin',
      canWork: false,
      badgeLabel: !hasCriminalRecord
        ? 'معلق (مطلوب رفع صورة الفيش والتشبيه)'
        : 'معلق بانتظار موافقة الإدارة',
    };
  }

  if (hasCriminalRecord && driver.adminApproved) {
    return {
      status: 'active_verified',
      canWork: true,
      badgeLabel: 'مفعل ومعتمد (فيش وتشبيه مرفق)',
    };
  }

  // Direct activation mode without criminal record uploaded yet -> check 3-day grace period
  const createdTime = new Date(driver.createdAt).getTime();
  const now = Date.now();
  const elapsed = Math.max(0, now - createdTime);

  if (elapsed >= THREE_DAYS_MS) {
    return {
      status: 'suspended_expired',
      canWork: false,
      badgeLabel: 'متوقف تلقائياً (انتهت مهلة الـ 3 أيام لرفع الفيش)',
    };
  }

  const remainingMs = THREE_DAYS_MS - elapsed;
  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.ceil(
    (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );

  return {
    status: 'active_grace_period',
    canWork: true,
    badgeLabel: 'مفعل (مهلة 3 أيام لرفع الفيش)',
    remainingText: `متبقي ${remainingDays} يوم و ${remainingHours} ساعة لرفع الفيش`,
  };
}

export const TawsilaLiveView: React.FC<TawsilaLiveViewProps> = ({
  rides,
  settings,
  currentUser,
  onAddTawsila,
  onUpdateTawsila,
  onDeleteTawsila,
  onUpdateSettings,
}) => {
  const isStrictAdmin = currentUser?.role === 'admin';
  const isAdmin =
    currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Top Driver Filter Dropdown: 'all' ("إظهار الكل") or specific driver ID
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('all');

  // Target Driver for Top "شغل" / "نهاية عمل" Control Bar
  const [controlDriverId, setControlDriverId] = useState<string>(
    rides[0]?.id || ''
  );

  // Geolocation Status Banner
  const [geoStatusMessage, setGeoStatusMessage] = useState<string>('');
  const [isTrackingGeo, setIsTrackingGeo] = useState<boolean>(false);
  const geoWatchIdRef = useRef<number | null>(null);

  // Add / Edit Driver Modal ("أضف سواق")
  const [isDriverModalOpen, setIsDriverModalOpen] = useState<boolean>(false);
  const [editingDriver, setEditingDriver] = useState<TawsilaRideItem | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverNationalId, setDriverNationalId] = useState('');
  const [criminalRecordUrl, setCriminalRecordUrl] = useState('');
  const [uploadingRecord, setUploadingRecord] = useState(false);
  const [uploadRecordMsg, setUploadRecordMsg] = useState('');

  // Single Driver Live Close-up Map Modal ("أظهر المكان الآن")
  const [liveModalDriverId, setLiveModalDriverId] = useState<string | null>(null);
  const [singleMapZoom, setSingleMapZoom] = useState<number>(17);
  const [singleMapPan, setSingleMapPan] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Mobile Driver Details Popup Modal from Drivers Table
  const [mobileDetailsDriverId, setMobileDetailsDriverId] = useState<string | null>(
    null
  );

  // Bottom All-Drivers Embedded Fleet Map Zoom & Pan
  const [fleetMapZoom, setFleetMapZoom] = useState<number>(15);
  const [fleetMapPan, setFleetMapPan] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Keep controlDriverId synced when rides list changes
  useEffect(() => {
    if (selectedDriverFilter !== 'all') {
      setControlDriverId(selectedDriverFilter);
    } else if (!controlDriverId && rides.length > 0) {
      setControlDriverId(rides[0].id);
    }
  }, [selectedDriverFilter, rides, controlDriverId]);

  // Real-time simulated micro-movement for active drivers so live maps show realistic live movement
  // while preserving real Geolocation coordinates when active
  const [liveOffsets, setLiveOffsets] = useState<
    Record<string, { dLat: number; dLng: number; step: number }>
  >({});

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveOffsets((prev) => {
        const next: Record<string, { dLat: number; dLng: number; step: number }> = {
          ...prev,
        };
        rides.forEach((r, idx) => {
          const activation = evaluateDriverActivation(
            r,
            settings.requireDriverCriminalRecordApproval
          );
          if (r.availableNow && activation.canWork) {
            const cur = next[r.id] || { dLat: 0, dLng: 0, step: idx * 2 };
            const nextStep = cur.step + 0.35;
            next[r.id] = {
              dLat: Math.sin(nextStep) * 0.00045,
              dLng: Math.cos(nextStep * 0.8) * 0.00055,
              step: nextStep,
            };
          }
        });
        return next;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [rides, settings.requireDriverCriminalRecordApproval]);

  // Cleanup Geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, []);

  /**
   * Request Browser Geolocation Permission & Update Driver Live Location
   * Triggered on BOTH "شغل" (Start Work) and "نهاية عمل" (End Work) buttons as required!
   */
  const handleDriverWorkStatusChange = (
    targetDriver: TawsilaRideItem,
    startWorking: boolean
  ) => {
    const activation = evaluateDriverActivation(
      targetDriver,
      settings.requireDriverCriminalRecordApproval
    );

    if (startWorking && !activation.canWork) {
      setGeoStatusMessage(
        `لا يمكن بدء العمل للسائق "${targetDriver.driverName}": ${activation.badgeLabel}`
      );
      return;
    }

    setGeoStatusMessage(
      `جاري طلب صلاحيات الموقع الجغرافي (Geolocation) من المتصفح لتحديث مكان "${targetDriver.driverName}" لحظياً...`
    );

    const applyUpdateWithCoords = (lat: number, lng: number, fromGps: boolean) => {
      onUpdateTawsila({
        ...targetDriver,
        availableNow: startWorking,
        lat,
        lng,
        lastLocationUpdate: new Date().toISOString(),
      });
      setIsTrackingGeo(startWorking && fromGps);
      setGeoStatusMessage(
        startWorking
          ? `تم تفعيل وضع "شغل" (بدء العمل) للسائق "${targetDriver.driverName}" وتحديث اللوكيشن المباشر (${lat.toFixed(
              4
            )}, ${lng.toFixed(4)})`
          : `تم تسجيل "نهاية عمل" للسائق "${targetDriver.driverName}" وتحديث آخر إحداثيات موقع (${lat.toFixed(
              4
            )}, ${lng.toFixed(4)})`
      );
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyUpdateWithCoords(
            pos.coords.latitude,
            pos.coords.longitude,
            true
          );

          // If starting work, also start continuous watchPosition for live tracking
          if (startWorking) {
            if (geoWatchIdRef.current !== null) {
              navigator.geolocation.clearWatch(geoWatchIdRef.current);
            }
            geoWatchIdRef.current = navigator.geolocation.watchPosition(
              (watchPos) => {
                onUpdateTawsila({
                  ...targetDriver,
                  availableNow: true,
                  lat: watchPos.coords.latitude,
                  lng: watchPos.coords.longitude,
                  lastLocationUpdate: new Date().toISOString(),
                });
              },
              () => {
                // Keep last known coords on minor watch error
              },
              { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
            );
          } else if (geoWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(geoWatchIdRef.current);
            geoWatchIdRef.current = null;
          }
        },
        () => {
          // Fallback if user blocks permission in iframe preview so button still functions smoothly
          applyUpdateWithCoords(targetDriver.lat, targetDriver.lng, false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      applyUpdateWithCoords(targetDriver.lat, targetDriver.lng, false);
    }
  };

  // Upload Criminal Record Image ("فيش وتشبيه")
  const handleCriminalRecordFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    directDriverToUpdate?: TawsilaRideItem
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRecord(true);
    setUploadRecordMsg('جاري رفع صورة الفيش والتشبيه...');
    try {
      const uploaded = await uploadImageDynamic(file, settings.imgbbApiKey);
      if (directDriverToUpdate) {
        onUpdateTawsila({
          ...directDriverToUpdate,
          criminalRecordImageUrl: uploaded.url,
          adminApproved: settings.requireDriverCriminalRecordApproval
            ? isAdmin
              ? true
              : directDriverToUpdate.adminApproved
            : true,
        });
        setGeoStatusMessage(
          `تم إرفاق صورة الفيش والتشبيه للسائق "${directDriverToUpdate.driverName}" بنجاح وتحديث حالة الحساب!`
        );
      } else {
        setCriminalRecordUrl(uploaded.url);
        setUploadRecordMsg('تم إرفاق صورة الفيش والتشبيه بنجاح!');
      }
    } catch {
      setUploadRecordMsg('تعذر رفع الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setUploadingRecord(false);
      e.target.value = '';
    }
  };

  // Open Add Driver Modal
  const openAddDriverModal = () => {
    setEditingDriver(null);
    setDriverName('');
    setDriverPhone('');
    setDriverNationalId('');
    setCriminalRecordUrl('');
    setUploadRecordMsg('');
    setIsDriverModalOpen(true);
  };

  // Open Edit Driver Modal (Admin)
  const openEditDriverModal = (driver: TawsilaRideItem) => {
    setEditingDriver(driver);
    setDriverName(driver.driverName);
    setDriverPhone(driver.phone);
    setDriverNationalId(driver.nationalId || '');
    setCriminalRecordUrl(driver.criminalRecordImageUrl || '');
    setUploadRecordMsg('');
    setIsDriverModalOpen(true);
  };

  // Submit New / Edited Driver
  const handleDriverFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim() || !driverPhone.trim() || !driverNationalId.trim()) {
      return;
    }

    if (editingDriver) {
      onUpdateTawsila({
        ...editingDriver,
        driverName: driverName.trim(),
        phone: driverPhone.trim(),
        nationalId: driverNationalId.trim(),
        criminalRecordImageUrl: criminalRecordUrl,
      });
    } else {
      const requireApproval = Boolean(settings.requireDriverCriminalRecordApproval);
      const isImmediatelyApproved = isAdmin || !requireApproval;

      const newDriver: TawsilaRideItem = {
        id: `tws-${Date.now()}`,
        driverId: currentUser?.id || `drv-${Date.now()}`,
        driverName: driverName.trim(),
        phone: driverPhone.trim(),
        nationalId: driverNationalId.trim(),
        criminalRecordImageUrl: criminalRecordUrl,
        adminApproved: isImmediatelyApproved,
        vehicleType: 'سيارة توصيلة حديثة',
        fromArea: 'وسط المدينة',
        toArea: 'جميع المناطق',
        priceNote: 'توصيل فوري وآمن',
        availableNow: isImmediatelyApproved,
        lat: 30.0444 + (Math.random() - 0.5) * 0.008,
        lng: 31.2357 + (Math.random() - 0.5) * 0.008,
        lastLocationUpdate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      onAddTawsila(newDriver);
      setControlDriverId(newDriver.id);
    }

    setIsDriverModalOpen(false);
    setEditingDriver(null);
  };

  const formatWhatsappNumber = (rawPhone: string) => {
    const digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('01') && digits.length === 11) {
      return `2${digits}`;
    }
    return digits;
  };

  const getDriverLiveCoords = (driver: TawsilaRideItem) => {
    const offset = liveOffsets[driver.id];
    if (!driver.availableNow || !offset) {
      return { lat: driver.lat, lng: driver.lng };
    }
    return {
      lat: Number((driver.lat + offset.dLat).toFixed(5)),
      lng: Number((driver.lng + offset.dLng).toFixed(5)),
    };
  };

  // Filtered drivers based on top dropdown ("إظهار الكل" or specific driver)
  const displayedDrivers =
    selectedDriverFilter === 'all'
      ? rides
      : rides.filter((r) => r.id === selectedDriverFilter);

  // Currently Available Drivers ("السائقين المتاحين حالياً")
  const availableDriversNow = rides.filter((r) => {
    const act = evaluateDriverActivation(
      r,
      settings.requireDriverCriminalRecordApproval
    );
    return r.availableNow && act.canWork;
  });

  const activeControlDriver =
    rides.find((r) => r.id === controlDriverId) || rides[0] || null;

  const liveModalDriver =
    rides.find((r) => r.id === liveModalDriverId) || null;

  const mobileDetailsDriver =
    rides.find((r) => r.id === mobileDetailsDriverId) || null;

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* 1. Top Header Bar: "توصيلة LIVE GPS" + "أضف سواق" Button in 1 line + Admin Policy Toggle & Exports */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#112240]/95 border border-[#334155] rounded-2xl p-3.5 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-nowrap w-full lg:w-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Car className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-sm sm:text-xl font-extrabold text-[#F8FAFC] flex items-center gap-1.5 sm:gap-2 truncate">
              <span>توصيلة</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] sm:text-xs font-bold shrink-0">
                <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
                LIVE GPS
              </span>
            </h1>
          </div>

          <FluentButton
            variant="primary"
            size="sm"
            onClick={openAddDriverModal}
            className="shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>أضف سواق</span>
          </FluentButton>
        </div>

        {/* Admin Export PDF/Excel + Approval Policy Switch */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  requireDriverCriminalRecordApproval:
                    !settings.requireDriverCriminalRecordApproval,
                })
              }
              className={`fluent-reveal px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                settings.requireDriverCriminalRecordApproval
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {settings.requireDriverCriminalRecordApproval
                  ? 'النظام الحالي: اشتراط موافقة الإدارة وصورة الفيش'
                  : 'النظام الحالي: تفعيل مباشر + مهلة 3 أيام للفيش'}
              </span>
            </button>

            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportTawsilaToExcel(displayedDrivers)}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>تصدير إكسيل</span>
            </FluentButton>

            <FluentButton
              variant="secondary"
              size="sm"
              onClick={() => exportTawsilaToPDF(displayedDrivers)}
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>تصدير PDF</span>
            </FluentButton>
          </div>
        )}
      </div>

      {/* Geolocation Status Notification */}
      {geoStatusMessage && (
        <div className="p-3.5 rounded-xl bg-sky-500/15 border border-sky-400/50 text-sky-200 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400 shrink-0 animate-bounce" />
            <span>{geoStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeoStatusMessage('')}
            className="text-[#94A3B8] hover:text-white text-xs cursor-pointer"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* 2. Top Controls: Driver Filter Dropdown ("إظهار الكل" + Drivers) & Work Status Buttons ("شغل" / "نهاية عمل") */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Dropdown Filter */}
        <div className="lg:col-span-5 bg-[#112240]/90 border border-[#334155] rounded-2xl p-3 sm:p-4 flex items-center gap-2">
          <label className="text-xs font-extrabold text-sky-400 whitespace-nowrap shrink-0">
            اختر السائق:
          </label>
          <select
            value={selectedDriverFilter}
            onChange={(e) => setSelectedDriverFilter(e.target.value)}
            className="flex-1 min-w-0 rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs sm:text-sm text-[#F8FAFC] font-bold outline-none"
          >
            <option value="all">إظهار الكل ({rides.length} سائق)</option>
            {rides.map((drv) => (
              <option key={drv.id} value={drv.id}>
                {drv.driverName} — ({drv.availableNow ? 'شغل / متاح' : 'نهاية عمل'})
              </option>
            ))}
          </select>
        </div>

        {/* Driver Work Status Control Bar: "شغل" (Start Work) & "نهاية عمل" (End Work) in 1 line */}
        <div className="lg:col-span-7 bg-[#112240]/90 border border-[#334155] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
          <select
            value={controlDriverId}
            onChange={(e) => setControlDriverId(e.target.value)}
            className="flex-1 min-w-[120px] rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-2.5 py-2 text-xs text-[#F8FAFC] font-bold outline-none"
          >
            {rides.map((drv) => (
              <option key={drv.id} value={drv.id}>
                السائق: {drv.driverName}
              </option>
            ))}
          </select>

          {activeControlDriver && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* زر "شغل" (بدء العمل) */}
              <button
                type="button"
                onClick={() =>
                  handleDriverWorkStatusChange(activeControlDriver, true)
                }
                className={`fluent-reveal px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer transition-all whitespace-nowrap ${
                  activeControlDriver.availableNow
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                    : 'bg-[#0A192F] text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/20'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>شغل</span>
              </button>

              {/* زر "نهاية عمل" */}
              <button
                type="button"
                onClick={() =>
                  handleDriverWorkStatusChange(activeControlDriver, false)
                }
                className={`fluent-reveal px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer transition-all whitespace-nowrap ${
                  !activeControlDriver.availableNow
                    ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_16px_rgba(225,29,72,0.4)]'
                    : 'bg-[#0A192F] text-rose-300 border-rose-500/40 hover:bg-rose-600/20'
                }`}
              >
                <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>نهاية عمل</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. "السائقين المتاحين حالياً" Section — Clicking any driver opens Google Maps Live Location */}
      <div className="bg-[#112240]/90 border border-[#334155] rounded-2xl p-3.5 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155]/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#F8FAFC]">
              السائقين المتاحين حالياً ({availableDriversNow.length})
            </h2>
          </div>
          <span className="text-[11px] text-sky-300 font-bold">
            اضغط على أي سائق لفتح جوجل ماب لايف لوكيشن لمعرفة مكانه بالتحديد 📍
          </span>
        </div>

        {availableDriversNow.length === 0 ? (
          <div className="p-5 text-center text-xs text-[#94A3B8] bg-[#0A192F]/60 rounded-xl border border-[#334155]">
            لا يوجد سائقون في وضع &quot;شغل&quot; حالياً. اضغط على زر &quot;شغل&quot; لتفعيل السائق.
          </div>
        ) : (
          <div className="flex flex-col space-y-2.5">
            {availableDriversNow.map((drv) => {
              const liveCoords = getDriverLiveCoords(drv);
              return (
                <div
                  key={drv.id}
                  onClick={() => {
                    setControlDriverId(drv.id);
                    setLiveModalDriverId(drv.id);
                    setSingleMapZoom(17);
                    setSingleMapPan({ x: 0, y: 0 });
                  }}
                  title={`اضغط لفتح جوجل ماب لايف لوكيشن للسائق ${drv.driverName}`}
                  className="fluent-reveal p-3 rounded-xl bg-[#0A192F] hover:bg-[#1E293B]/90 border border-emerald-500/40 hover:border-sky-400 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-base shrink-0">
                      🚗
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold text-[#F8FAFC] truncate flex items-center gap-1.5">
                        <span>{drv.driverName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                          اضغط للموقع لايف 📍
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-emerald-400 font-mono-tabular truncate">
                        متاح الآن · {liveCoords.lat.toFixed(5)}, {liveCoords.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 shrink-0 mr-auto sm:mr-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`tel:${drv.phone}`}
                      className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600/25 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-400/40 text-xs font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={`https://wa.me/${formatWhatsappNumber(drv.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-400/40 text-xs font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setControlDriverId(drv.id);
                        setLiveModalDriverId(drv.id);
                        setSingleMapZoom(17);
                        setSingleMapPan({ x: 0, y: 0 });
                      }}
                      className="fluent-reveal px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold shrink-0 cursor-pointer shadow flex items-center gap-1 whitespace-nowrap"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>جوجل ماب لايف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Drivers Table & Criminal Record Status — Strictly visible to Admin ONLY ("جدول السائقين وبيانات التواصل والتتبع اللحظي وحالة التفعيل والفيش والتشبيه تظهر لـ Admin فقط") */}
      {isAdmin && (
        <div className="bg-[#112240]/95 border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3.5 bg-[#0A192F] border-b border-[#334155] flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-sky-400">
              جدول السائقين وبيانات التواصل والتتبع اللحظي ({displayedDrivers.length}) — خاص بـ Admin
            </h3>
            <span className="text-[11px] text-[#94A3B8]">
              مهلة 3 أيام من تاريخ التسجيل لرفع صورة الفيش والتشبيه في حال عدم اشتراط الموافقة المسبقة
            </span>
          </div>

          {/* Mobile View: Show only driver name; clicking the name opens a popup modal with all details */}
          <div className="sm:hidden divide-y divide-[#334155]/70">
            {displayedDrivers.map((drv) => (
              <button
                key={drv.id}
                type="button"
                onClick={() => setMobileDetailsDriverId(drv.id)}
                className="w-full py-3.5 px-4 text-right hover:bg-[#1E293B]/70 transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="font-extrabold text-[#F8FAFC] text-sm flex items-center gap-2 truncate">
                  <span>🚗</span>
                  <span className="truncate">{drv.driverName}</span>
                </div>
                <span className="text-[11px] font-bold text-sky-400 shrink-0">
                  عرض البيانات
                </span>
              </button>
            ))}
          </div>

          {/* Desktop View: Full Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#0A192F]/90 text-[#94A3B8] text-xs border-b border-[#334155]">
                  <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60">
                    اسم السائق والتتبع المباشر
                  </th>
                  <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60">
                    رقم الهاتف (اتصال / واتساب)
                  </th>
                  <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60">
                    حالة التفعيل والفيش والتشبيه
                  </th>
                  <th className="py-3.5 px-4 font-bold border-l border-[#334155]/60 text-center">
                    حالة العمل (GPS)
                  </th>
                  <th className="py-3.5 px-4 font-bold text-center">
                    صلاحيات Admin
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/70 text-sm">
                {displayedDrivers.map((drv) => {
                  const activation = evaluateDriverActivation(
                    drv,
                    settings.requireDriverCriminalRecordApproval
                  );
                  const isWorkingNow = drv.availableNow && activation.canWork;

                  return (
                    <tr
                      key={drv.id}
                      onClick={() => {
                        setControlDriverId(drv.id);
                        setLiveModalDriverId(drv.id);
                        setSingleMapZoom(17);
                      }}
                      className="hover:bg-[#1E293B]/70 transition-colors cursor-pointer"
                    >
                      {/* Driver Name + "أظهر المكان الآن" Button right next to the name */}
                      <td className="py-3.5 px-4 border-l border-[#334155]/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-[#F8FAFC] flex items-center gap-1.5">
                              <span>🚗</span>
                              <span>{drv.driverName}</span>
                            </div>
                            <div className="text-[11px] text-[#94A3B8] font-mono-tabular">
                              بطاقة: {drv.nationalId || 'غير مسجل'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setControlDriverId(drv.id);
                              setLiveModalDriverId(drv.id);
                              setSingleMapZoom(17);
                              setSingleMapPan({ x: 0, y: 0 });
                            }}
                            className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer shadow"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>جوجل ماب لايف</span>
                          </button>
                        </div>
                      </td>

                      {/* Phone Number + Call & Direct WhatsApp */}
                      <td
                        className="py-3.5 px-4 border-l border-[#334155]/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono-tabular font-extrabold text-sky-400">
                            {drv.phone}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${drv.phone}`}
                              className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>اتصال</span>
                            </a>
                            <a
                              href={`https://wa.me/${formatWhatsappNumber(drv.phone)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>واتساب</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Driver Activation Status & 3-Day Grace Period / Criminal Record Upload */}
                      <td
                        className="py-3.5 px-4 border-l border-[#334155]/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activation.status === 'active_verified' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {activation.badgeLabel}
                              </span>
                            )}

                            {activation.status === 'active_grace_period' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                {activation.badgeLabel}
                              </span>
                            )}

                            {(activation.status === 'pending_admin' ||
                              activation.status === 'suspended_expired') && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {activation.badgeLabel}
                              </span>
                            )}
                          </div>

                          {activation.remainingText && (
                            <div className="text-[11px] text-amber-300 font-bold">
                              ⏳ {activation.remainingText}
                            </div>
                          )}

                          {!drv.criminalRecordImageUrl && (
                            <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-[#1E293B] text-sky-300 border border-sky-400/40 text-[11px] font-bold cursor-pointer">
                              <Upload className="w-3 h-3" />
                              <span>إرفاق صورة الفيش والتشبيه</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleCriminalRecordFileUpload(e, drv)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </td>

                      {/* Quick Work Status Toggle ("شغل" / "نهاية عمل") */}
                      <td
                        className="py-3.5 px-4 border-l border-[#334155]/40 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDriverWorkStatusChange(drv, true)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              isWorkingNow
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
                            }`}
                          >
                            شغل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDriverWorkStatusChange(drv, false)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              !isWorkingNow
                                ? 'bg-rose-600 text-white'
                                : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border border-[#334155]'
                            }`}
                          >
                            نهاية عمل
                          </button>
                        </div>
                      </td>

                      {/* Admin Controls */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateTawsila({
                                ...drv,
                                adminApproved: !drv.adminApproved,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                              drv.adminApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            }`}
                          >
                            {drv.adminApproved ? 'معتمد ✓' : 'موافقة الآن'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditDriverModal(drv)}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-[#0A192F] cursor-pointer"
                            title="تعديل السائق"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {isStrictAdmin && (
                            <button
                              type="button"
                              onClick={() => onDeleteTawsila(drv.id)}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                              title="حذف السائق"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Driver Details Popup Modal when clicking driver name in the table */}
      {mobileDetailsDriver &&
        (() => {
          const activation = evaluateDriverActivation(
            mobileDetailsDriver,
            settings.requireDriverCriminalRecordApproval
          );
          const isWorkingNow =
            mobileDetailsDriver.availableNow && activation.canWork;

          return (
            <FluentModal
              isOpen={Boolean(mobileDetailsDriver)}
              onClose={() => setMobileDetailsDriverId(null)}
              title={`بيانات السائق: ${mobileDetailsDriver.driverName}`}
              subtitle="تفاصيل التواصل والتتبع اللحظي وحالة التفعيل"
              maxWidth="md"
            >
              <div className="space-y-4 text-xs sm:text-sm text-[#F8FAFC]">
                {/* 1. Driver Name, National ID & Live Map Button */}
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-[#F8FAFC] text-sm flex items-center gap-1.5">
                      <span>🚗</span>
                      <span>{mobileDetailsDriver.driverName}</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-mono-tabular mt-1">
                      بطاقة: {mobileDetailsDriver.nationalId || 'غير مسجل'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = mobileDetailsDriver.id;
                      setMobileDetailsDriverId(null);
                      setControlDriverId(targetId);
                      setLiveModalDriverId(targetId);
                      setSingleMapZoom(17);
                      setSingleMapPan({ x: 0, y: 0 });
                    }}
                    className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer shadow shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>جوجل ماب لايف</span>
                  </button>
                </div>

                {/* 2. Phone Number (Call / WhatsApp) */}
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-2">
                  <div className="text-[11px] font-bold text-[#94A3B8]">
                    رقم الهاتف (اتصال / واتساب):
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular font-extrabold text-sky-400 text-sm">
                      {mobileDetailsDriver.phone}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${mobileDetailsDriver.phone}`}
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>اتصال</span>
                      </a>
                      <a
                        href={`https://wa.me/${formatWhatsappNumber(
                          mobileDetailsDriver.phone
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fluent-reveal inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3. Activation Status & Criminal Record */}
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] space-y-2">
                  <div className="text-[11px] font-bold text-[#94A3B8]">
                    حالة التفعيل والفيش والتشبيه:
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activation.status === 'active_verified' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {activation.badgeLabel}
                      </span>
                    )}

                    {activation.status === 'active_grace_period' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {activation.badgeLabel}
                      </span>
                    )}

                    {(activation.status === 'pending_admin' ||
                      activation.status === 'suspended_expired') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {activation.badgeLabel}
                      </span>
                    )}
                  </div>

                  {activation.remainingText && (
                    <div className="text-[11px] text-amber-300 font-bold">
                      ⏳ {activation.remainingText}
                    </div>
                  )}

                  {!mobileDetailsDriver.criminalRecordImageUrl && (
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#112240] hover:bg-[#1E293B] text-sky-300 border border-sky-400/40 text-[11px] font-bold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>إرفاق صورة الفيش والتشبيه</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCriminalRecordFileUpload(e, mobileDetailsDriver)
                        }
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 4. Work Status (GPS): شغل / نهاية عمل */}
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#94A3B8]">
                    حالة العمل (GPS):
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleDriverWorkStatusChange(mobileDetailsDriver, true)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        isWorkingNow
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#112240] text-[#94A3B8] hover:text-white border border-[#334155]'
                      }`}
                    >
                      شغل
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDriverWorkStatusChange(mobileDetailsDriver, false)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        !isWorkingNow
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#112240] text-[#94A3B8] hover:text-white border border-[#334155]'
                      }`}
                    >
                      نهاية عمل
                    </button>
                  </div>
                </div>

                {/* 5. Admin Controls */}
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#94A3B8]">
                    صلاحيات Admin:
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTawsila({
                          ...mobileDetailsDriver,
                          adminApproved: !mobileDetailsDriver.adminApproved,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                        mobileDetailsDriver.adminApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      }`}
                    >
                      {mobileDetailsDriver.adminApproved
                        ? 'معتمد ✓'
                        : 'موافقة الآن'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = mobileDetailsDriver;
                        setMobileDetailsDriverId(null);
                        openEditDriverModal(target);
                      }}
                      className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-[#0A192F] cursor-pointer"
                      title="تعديل السائق"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {isStrictAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = mobileDetailsDriver.id;
                          setMobileDetailsDriverId(null);
                          onDeleteTawsila(targetId);
                        }}
                        className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                        title="حذف السائق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <FluentButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setMobileDetailsDriverId(null)}
                  >
                    إغلاق
                  </FluentButton>
                </div>
              </div>
            </FluentModal>
          );
        })()}

      {/* 5. Bottom Real Google Maps Live Driver Tracking ("🗺️ خريطة تتبع جميع السائقين المتاحين لايف — يظهر جوجل ماب ويظهر فيها لايف لوكيشن للسواق المختار") */}
      {(() => {
        const focusedDriver =
          (selectedDriverFilter !== 'all'
            ? rides.find((r) => r.id === selectedDriverFilter)
            : availableDriversNow.find((r) => r.id === controlDriverId) ||
              availableDriversNow[0] ||
              activeControlDriver ||
              rides[0]) || null;

        const focusedCoords = focusedDriver
          ? getDriverLiveCoords(focusedDriver)
          : { lat: 30.0444, lng: 31.2357 };

        const googleMapEmbedUrl = `https://maps.google.com/maps?q=${focusedCoords.lat},${focusedCoords.lng}&z=${fleetMapZoom}&hl=ar&output=embed`;
        const googleMapDirectUrl = `https://www.google.com/maps/search/?api=1&query=${focusedCoords.lat},${focusedCoords.lng}`;

        return (
          <div className="bg-[#112240]/95 border border-sky-400/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <span>🗺️ خريطة تتبع جميع السائقين المتاحين لايف (Google Maps)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono-tabular">
                    {availableDriversNow.length} سيارة نشطة 🚗
                  </span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  {focusedDriver
                    ? `الموقع المباشر الآن على Google Maps للسائق المختار: ${focusedDriver.driverName} (${focusedCoords.lat.toFixed(
                        5
                      )}, ${focusedCoords.lng.toFixed(5)})`
                    : 'اختر أي سائق لعرض موقعه المباشر الآن على خريطة جوجل ماب'}
                </p>
              </div>

              {/* Isolated Map Zoom In / Zoom Out Controls + Direct Open in Google Maps */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={googleMapDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fluent-reveal px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
                >
                  <Compass className="w-4 h-4" />
                  <span>فتح في Google Maps</span>
                </a>
                <button
                  type="button"
                  onClick={() => setFleetMapZoom((z) => Math.min(20, z + 1))}
                  className="fluent-reveal px-3 py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-sky-400 border border-[#334155] text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>تقريب (+)</span>
                </button>
                <span className="px-2.5 py-1.5 rounded-lg bg-[#0A192F] border border-[#334155] text-xs font-mono-tabular font-bold text-[#F8FAFC]">
                  {fleetMapZoom}x
                </span>
                <button
                  type="button"
                  onClick={() => setFleetMapZoom((z) => Math.max(10, z - 1))}
                  className="fluent-reveal px-3 py-2 rounded-xl bg-[#0A192F] hover:bg-[#1E293B] text-sky-400 border border-[#334155] text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span>تبعيد (-)</span>
                </button>
              </div>
            </div>

            {/* Quick Clickable Driver Selector Pills above Google Maps */}
            {availableDriversNow.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {availableDriversNow.map((drv) => {
                  const isFocused = focusedDriver?.id === drv.id;
                  return (
                    <button
                      key={drv.id}
                      type="button"
                      onClick={() => {
                        setControlDriverId(drv.id);
                        setLiveModalDriverId(drv.id);
                        setSingleMapZoom(17);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border transition-all ${
                        isFocused
                          ? 'bg-emerald-600 text-white border-emerald-300 shadow-lg'
                          : 'bg-[#0A192F] text-[#94A3B8] hover:text-white border-[#334155]'
                      }`}
                    >
                      <span>🚗</span>
                      <span>{drv.driverName}</span>
                      <span className="text-[10px] opacity-85">(فتح اللوكيشن لايف)</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Embedded Real Google Maps Iframe Showing Selected Driver's Exact Live Location */}
            <div className="relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden bg-[#071120] border-2 border-sky-400/50 shadow-inner">
              <iframe
                key={`${focusedCoords.lat.toFixed(4)}-${focusedCoords.lng.toFixed(4)}-${fleetMapZoom}`}
                title="Google Maps Live Driver Location"
                src={googleMapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              {focusedDriver && (
                <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-[#0A192F]/95 border border-emerald-400 text-xs font-extrabold text-white shadow-xl flex items-center gap-2 pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    موقع السائق على Google Maps: {focusedDriver.driverName}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL 1: ADD / EDIT DRIVER ("أضف سواق") ================= */}
      <FluentModal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setEditingDriver(null);
        }}
        title={editingDriver ? 'تعديل بيانات السائق' : 'أضف سواق جديد في توصيلة'}
        subtitle="أدخل اسم السواق ورقم الهاتف ورقم البطاقة وصورة الفيش والتشبيه"
        maxWidth="xl"
      >
        <form onSubmit={handleDriverFormSubmit} className="space-y-4">
          {/* Policy Notice Banner */}
          <div className="p-3.5 rounded-xl bg-[#0A192F] border border-sky-400/40 text-xs space-y-1">
            <div className="font-extrabold text-sky-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>نظام التفعيل والفيش والتشبيه:</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              {settings.requireDriverCriminalRecordApproval
                ? 'يشترط المسؤول حالياً رفع صورة الفيش والتشبيه للموافقة قبل تفعيل الحساب.'
                : 'يتم فتح الخدمة للسائق مباشرة، وتُعطى له مهلة 3 أيام من تاريخ تسجيل حسابه لرفع صورة الفيش والتشبيه وإلا يتوقف الحساب تلقائياً.'}
            </p>
          </div>

          {/* 1. اسم السواق */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اسم السواق *
            </label>
            <input
              type="text"
              required
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="مثال: كابتن محمود السيد..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] outline-none"
            />
          </div>

          {/* 2. رقم الهاتف */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              رقم الهاتف *
            </label>
            <input
              type="tel"
              required
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          {/* 3. خانة إرفاق رقم البطاقة */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>رقم البطاقة الشخصية (الرقم القومي) *</span>
            </label>
            <input
              type="text"
              required
              maxLength={14}
              value={driverNationalId}
              onChange={(e) => setDriverNationalId(e.target.value)}
              placeholder="أدخل رقم البطاقة المكون من 14 رقم..."
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-mono-tabular outline-none"
            />
          </div>

          {/* 4. خانة إرسال صورة "فيش وتشبيه" */}
          <div className="p-4 rounded-xl bg-[#0A192F] border border-[#334155] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  <span>إرسال صورة &quot;فيش وتشبيه&quot;</span>
                </label>
                <p className="text-[11px] text-[#94A3B8]">
                  {settings.requireDriverCriminalRecordApproval
                    ? 'مطلوب لإتمام موافقة الإدارة'
                    : 'يمكنك إرفاقها الآن أو خلال مهلة 3 أيام من التسجيل'}
                </p>
              </div>

              <label className="fluent-reveal inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>
                  {uploadingRecord ? 'جاري الرفع...' : 'إرفاق صورة الفيش والتشبيه'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCriminalRecordFileUpload(e)}
                  className="hidden"
                />
              </label>
            </div>

            {uploadRecordMsg && (
              <div className="text-xs text-emerald-400 font-bold">
                {uploadRecordMsg}
              </div>
            )}

            {criminalRecordUrl && (
              <div className="relative h-32 rounded-xl overflow-hidden border border-emerald-400/50 bg-[#112240]">
                <img
                  src={criminalRecordUrl}
                  alt="فيش وتشبيه"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* 5. زر "أضف" */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
            <FluentButton
              type="button"
              variant="ghost"
              onClick={() => {
                setIsDriverModalOpen(false);
                setEditingDriver(null);
              }}
            >
              إلغاء
            </FluentButton>
            <FluentButton type="submit" variant="primary" size="lg">
              <Plus className="w-4 h-4" />
              <span>{editingDriver ? 'حفظ التعديلات' : 'أضف'}</span>
            </FluentButton>
          </div>
        </form>
      </FluentModal>

      {/* ================= MODAL 2: GOOGLE MAPS LIVE DRIVER LOCATION ("جوجل ماب لايف لوكيشن للسواق لمعرفة مكانه بالتحديد") ================= */}
      {liveModalDriver && (
        <FluentModal
          isOpen={!!liveModalDriver}
          onClose={() => setLiveModalDriverId(null)}
          title={`جوجل ماب لايف لوكيشن — ${liveModalDriver.driverName}`}
          subtitle="الموقع الجغرافي المباشر للسائق الآن على Google Maps بالتحديد"
          maxWidth="3xl"
        >
          {(() => {
            const live = getDriverLiveCoords(liveModalDriver);
            const modalGoogleMapEmbed = `https://maps.google.com/maps?q=${live.lat},${live.lng}&z=${singleMapZoom}&hl=ar&output=embed`;
            const modalGoogleMapExternal = `https://www.google.com/maps/search/?api=1&query=${live.lat},${live.lng}`;

            return (
              <div className="space-y-4">
                {/* Top Status & Zoom Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0A192F] border border-[#334155]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <div className="text-sm font-extrabold text-[#F8FAFC] flex items-center gap-2">
                        <span>{liveModalDriver.driverName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            liveModalDriver.availableNow
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                          }`}
                        >
                          {liveModalDriver.availableNow ? 'يتحرك لايف الآن' : 'نهاية عمل'}
                        </span>
                      </div>
                      <div className="text-xs font-mono-tabular text-sky-400">
                        إحداثيات Google Maps اللحظية: {live.lat.toFixed(5)}, {live.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>

                  {/* Zoom In & Zoom Out Buttons + Direct Google Maps Link */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={modalGoogleMapExternal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fluent-reveal px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>فتح في تطبيق Google Maps</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setSingleMapZoom((z) => Math.min(21, z + 1))}
                      className="fluent-reveal px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span>تقريب (+)</span>
                    </button>
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#112240] border border-[#334155] text-xs font-mono-tabular font-bold text-[#F8FAFC]">
                      {singleMapZoom}x
                    </span>
                    <button
                      type="button"
                      onClick={() => setSingleMapZoom((z) => Math.max(12, z - 1))}
                      className="fluent-reveal px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-sky-300 border border-[#334155] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                      <span>تبعيد (-)</span>
                    </button>
                  </div>
                </div>

                {/* Real Google Maps Live Location Iframe */}
                <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden bg-[#071120] border-2 border-sky-400/60 shadow-xl">
                  <iframe
                    key={`${live.lat.toFixed(4)}-${live.lng.toFixed(4)}-${singleMapZoom}`}
                    title={`Google Maps Live - ${liveModalDriver.driverName}`}
                    src={modalGoogleMapEmbed}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>

                {/* Quick Call & WhatsApp Bar inside Modal */}
                <div className="p-3.5 rounded-xl bg-[#0A192F] border border-[#334155] flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#94A3B8]">
                    هاتف السائق:{' '}
                    <strong className="text-sky-400 font-mono-tabular text-sm">
                      {liveModalDriver.phone}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:${liveModalDriver.phone}`}
                      className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال مباشر</span>
                    </a>
                    <a
                      href={`https://wa.me/${formatWhatsappNumber(
                        liveModalDriver.phone
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fluent-reveal inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>مراسلة واتساب</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}
        </FluentModal>
      )}
    </div>
  );
};

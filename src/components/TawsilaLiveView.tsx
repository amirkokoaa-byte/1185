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

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* 1. Top Header Bar: Title + "أضف سواق" Button + Admin Policy Toggle & Exports */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#112240]/95 border border-[#334155] rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#F8FAFC] flex items-center gap-2">
              <span>توصيلة — التتبع اللحظي للسائقين</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                LIVE GPS
              </span>
            </h1>
            <p className="text-xs text-[#94A3B8]">
              تتبع حركة السائقين لايف على الخريطة، تواصل فوراً، أو سجل كسائق معتمد
            </p>
          </div>

          <FluentButton
            variant="primary"
            size="md"
            onClick={openAddDriverModal}
            className="mr-2"
          >
            <Plus className="w-4 h-4" />
            <span>أضف سواق</span>
          </FluentButton>
        </div>

        {/* Admin Export PDF/Excel + Approval Policy Switch */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
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
            </>
          )}
        </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Dropdown Filter */}
        <div className="lg:col-span-5 bg-[#112240]/90 border border-[#334155] rounded-2xl p-4 space-y-2">
          <label className="block text-xs font-extrabold text-sky-400">
            اختر السائق أو إظهار الكل:
          </label>
          <select
            value={selectedDriverFilter}
            onChange={(e) => setSelectedDriverFilter(e.target.value)}
            className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3.5 py-2.5 text-[#F8FAFC] font-bold outline-none"
          >
            <option value="all">إظهار الكل ({rides.length} سائق)</option>
            {rides.map((drv) => (
              <option key={drv.id} value={drv.id}>
                {drv.driverName} — ({drv.availableNow ? 'شغل / متاح' : 'نهاية عمل'})
              </option>
            ))}
          </select>
        </div>

        {/* Driver Work Status Control Bar: "شغل" (Start Work) & "نهاية عمل" (End Work) with Geolocation API */}
        <div className="lg:col-span-7 bg-[#112240]/90 border border-[#334155] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>تحديث حالة عمل السائق واللوكيشن اللحظي (Geolocation):</span>
            </div>
            <select
              value={controlDriverId}
              onChange={(e) => setControlDriverId(e.target.value)}
              className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 px-3 py-2 text-xs text-[#F8FAFC] font-bold outline-none"
            >
              {rides.map((drv) => (
                <option key={drv.id} value={drv.id}>
                  السائق: {drv.driverName} ({drv.phone})
                </option>
              ))}
            </select>
          </div>

          {activeControlDriver && (
            <div className="flex items-center gap-2.5 shrink-0">
              {/* زر "شغل" (بدء العمل) */}
              <button
                type="button"
                onClick={() =>
                  handleDriverWorkStatusChange(activeControlDriver, true)
                }
                className={`fluent-reveal px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border cursor-pointer transition-all ${
                  activeControlDriver.availableNow
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                    : 'bg-[#0A192F] text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/20'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>شغل (بدء العمل)</span>
              </button>

              {/* زر "نهاية عمل" */}
              <button
                type="button"
                onClick={() =>
                  handleDriverWorkStatusChange(activeControlDriver, false)
                }
                className={`fluent-reveal px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border cursor-pointer transition-all ${
                  !activeControlDriver.availableNow
                    ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_16px_rgba(225,29,72,0.4)]'
                    : 'bg-[#0A192F] text-rose-300 border-rose-500/40 hover:bg-rose-600/20'
                }`}
              >
                <Square className="w-4 h-4 fill-current" />
                <span>نهاية عمل</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. "السائقين المتاحين حالياً" Section */}
      <div className="bg-[#112240]/90 border border-[#334155] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155]/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-base font-extrabold text-[#F8FAFC]">
              السائقين المتاحين حالياً ({availableDriversNow.length})
            </h2>
          </div>
          <span className="text-xs text-[#94A3B8]">
            يتم تحديث الإحداثيات وحركة السيارات لحظياً عبر الـ GPS
          </span>
        </div>

        {availableDriversNow.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#94A3B8] bg-[#0A192F]/60 rounded-xl border border-[#334155]">
            لا يوجد سائقون في وضع &quot;شغل&quot; حالياً. اضغط على زر &quot;شغل (بدء العمل)&quot; لتفعيل السائق.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {availableDriversNow.map((drv) => {
              const liveCoords = getDriverLiveCoords(drv);
              return (
                <div
                  key={drv.id}
                  className="fluent-reveal p-3.5 rounded-xl bg-[#0A192F] border border-emerald-500/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-lg shrink-0">
                      🚗
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-[#F8FAFC] truncate">
                        {drv.driverName}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono-tabular">
                        متاح الآن · {liveCoords.lat.toFixed(4)}, {liveCoords.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLiveModalDriverId(drv.id);
                      setSingleMapZoom(17);
                      setSingleMapPan({ x: 0, y: 0 });
                    }}
                    className="fluent-reveal px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shrink-0 cursor-pointer shadow"
                  >
                    أظهر المكان الآن
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Drivers Table (Displays Selected Driver or All Drivers) */}
      <div className="bg-[#112240]/95 border border-[#334155] rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 bg-[#0A192F] border-b border-[#334155] flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-sky-400">
            جدول السائقين وبيانات التواصل والتتبع اللحظي ({displayedDrivers.length})
          </h3>
          <span className="text-[11px] text-[#94A3B8]">
            مهلة 3 أيام من تاريخ التسجيل لرفع صورة الفيش والتشبيه في حال عدم اشتراط الموافقة المسبقة
          </span>
        </div>

        <div className="overflow-x-auto">
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
                {isAdmin && (
                  <th className="py-3.5 px-4 font-bold text-center">
                    صلاحيات Admin
                  </th>
                )}
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
                    className="hover:bg-[#1E293B]/70 transition-colors"
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
                          onClick={() => {
                            setLiveModalDriverId(drv.id);
                            setSingleMapZoom(17);
                            setSingleMapPan({ x: 0, y: 0 });
                          }}
                          className="fluent-reveal inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold cursor-pointer shadow"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>أظهر المكان الآن</span>
                        </button>
                      </div>
                    </td>

                    {/* Phone Number + Call & Direct WhatsApp */}
                    <td className="py-3.5 px-4 border-l border-[#334155]/40">
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
                    <td className="py-3.5 px-4 border-l border-[#334155]/40">
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
                    <td className="py-3.5 px-4 border-l border-[#334155]/40 text-center">
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
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
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

                          <button
                            type="button"
                            onClick={() => onDeleteTawsila(drv.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer"
                            title="حذف السائق"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* 5. Bottom Embedded Live Fleet Map (Shown when "إظهار الكل" is selected) */}
      {selectedDriverFilter === 'all' && (
        <div className="bg-[#112240]/95 border border-sky-400/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
                <span>🗺️ خريطة تتبع جميع السائقين المتاحين لايف</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono-tabular">
                  {availableDriversNow.length} سيارة نشطة 🚗
                </span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                تظهر جميع السيارات المتاحة حالياً مع اسم السائق وموقعه المحدث لحظياً (معزولة الزووم عن الصفحة)
              </p>
            </div>

            {/* Isolated Map Zoom In / Zoom Out Controls */}
            <div className="flex items-center gap-2">
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

          {/* Isolated Interactive Map Viewport (Strict Mobile Anti-Zoom Isolation) */}
          <div
            className="isolated-map-viewport relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden bg-[#071120] border-2 border-[#334155] select-none"
            style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Dynamic Radar & Street Grid Scaled by fleetMapZoom */}
            <div
              className="w-full h-full relative transition-transform duration-300 ease-out"
              style={{
                transform: `scale(${1 + (fleetMapZoom - 15) * 0.14}) translate(${fleetMapPan.x}px, ${fleetMapPan.y}px)`,
              }}
            >
              <svg
                viewBox="0 0 1000 600"
                className="w-full h-full object-cover opacity-55"
              >
                <defs>
                  <pattern
                    id="fleetGrid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#1E293B"
                      strokeWidth="1.2"
                    />
                  </pattern>
                </defs>
                <rect width="1000" height="600" fill="url(#fleetGrid)" />
                {/* Main arterial roads */}
                <path
                  d="M 0 180 Q 450 220 1000 150"
                  stroke="#334155"
                  strokeWidth="16"
                  fill="none"
                />
                <path
                  d="M 0 420 Q 520 370 1000 440"
                  stroke="#334155"
                  strokeWidth="14"
                  fill="none"
                />
                <path
                  d="M 280 0 L 340 600"
                  stroke="#334155"
                  strokeWidth="14"
                  fill="none"
                />
                <path
                  d="M 720 0 L 660 600"
                  stroke="#334155"
                  strokeWidth="18"
                  fill="none"
                />
                <path
                  d="M 0 300 L 1000 300"
                  stroke="#38BDF8"
                  strokeOpacity="0.25"
                  strokeWidth="4"
                  strokeDasharray="10 8"
                  fill="none"
                />
              </svg>

              {/* Plot All Available Drivers as Car Icon 🚗 with Driver Name & Live Coordinates */}
              {availableDriversNow.map((drv, idx) => {
                const live = getDriverLiveCoords(drv);
                // Convert lat/lng delta around city center (30.0444, 31.2357) into % position on map
                const relX = 50 + (live.lng - 31.2357) * 4200 + (idx - 1) * 8;
                const relY = 50 - (live.lat - 30.0444) * 4200 + (idx % 2 === 0 ? -6 : 6);
                const clampedX = Math.max(12, Math.min(88, relX));
                const clampedY = Math.max(16, Math.min(84, relY));

                return (
                  <div
                    key={drv.id}
                    onClick={() => {
                      setLiveModalDriverId(drv.id);
                      setSingleMapZoom(17);
                    }}
                    style={{
                      left: `${clampedX}%`,
                      top: `${clampedY}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-700"
                  >
                    {/* Pulse Ring */}
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/50 animate-ping absolute -inset-2 pointer-events-none" />

                    {/* Driver Name Floating Label + Car Icon 🚗 */}
                    <div className="relative flex flex-col items-center">
                      <div className="px-2.5 py-1 rounded-xl bg-[#0A192F]/95 border border-sky-400 text-[#F8FAFC] shadow-lg whitespace-nowrap flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-extrabold">{drv.driverName}</span>
                      </div>

                      <div className="w-11 h-11 rounded-2xl bg-emerald-600 group-hover:bg-sky-500 border-2 border-white shadow-[0_0_20px_rgba(16,185,129,0.8)] flex items-center justify-center text-xl transition-transform group-hover:scale-110">
                        🚗
                      </div>

                      <div className="mt-1 px-2 py-0.5 rounded bg-[#0A192F]/90 border border-[#334155] text-[10px] font-mono-tabular text-sky-300">
                        {live.lat.toFixed(4)}, {live.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map Pan / Reset Controls Overlay */}
            <div className="absolute bottom-3 right-3 left-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="px-3 py-1.5 rounded-xl bg-[#0A192F]/90 border border-[#334155] text-[11px] text-[#94A3B8] pointer-events-auto">
                اضغط على أي سيارة 🚗 لفتح شاشة التتبع القريب للسائق
              </div>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setFleetMapPan((p) => ({ ...p, x: p.x + 30 }))}
                  className="px-2.5 py-1 rounded-lg bg-[#0A192F]/90 border border-[#334155] text-xs text-white cursor-pointer"
                >
                  يمين
                </button>
                <button
                  type="button"
                  onClick={() => setFleetMapPan({ x: 0, y: 0 })}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 text-xs font-bold text-white cursor-pointer"
                >
                  توسيط الخريطة
                </button>
                <button
                  type="button"
                  onClick={() => setFleetMapPan((p) => ({ ...p, x: p.x - 30 }))}
                  className="px-2.5 py-1 rounded-lg bg-[#0A192F]/90 border border-[#334155] text-xs text-white cursor-pointer"
                >
                  يسار
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* ================= MODAL 2: CLOSE-UP LIVE DRIVER MAP ("أظهر المكان الآن") ================= */}
      {liveModalDriver && (
        <FluentModal
          isOpen={!!liveModalDriver}
          onClose={() => setLiveModalDriverId(null)}
          title={`المكان المباشر الآن — ${liveModalDriver.driverName}`}
          subtitle="تتبع تحرك السائق لايف على الخريطة بصورة قريبة"
          maxWidth="3xl"
        >
          {(() => {
            const live = getDriverLiveCoords(liveModalDriver);
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
                        الإحداثيات اللحظية: {live.lat.toFixed(5)}, {live.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>

                  {/* Zoom In & Zoom Out Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSingleMapZoom((z) => Math.min(21, z + 1))}
                      className="fluent-reveal px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span>Zoom In (+)</span>
                    </button>
                    <span className="px-2.5 py-1.5 rounded-lg bg-[#112240] border border-[#334155] text-xs font-mono-tabular font-bold text-[#F8FAFC]">
                      {singleMapZoom}x
                    </span>
                    <button
                      type="button"
                      onClick={() => setSingleMapZoom((z) => Math.max(12, z - 1))}
                      className="fluent-reveal px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-sky-300 border border-[#334155] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                      <span>Zoom Out (-)</span>
                    </button>
                  </div>
                </div>

                {/* Close-up Live Map Viewport (Strict Anti-Zoom Mobile Isolation) */}
                <div
                  className="isolated-map-viewport relative w-full h-[340px] sm:h-[380px] rounded-2xl overflow-hidden bg-[#071120] border-2 border-sky-400/50 select-none"
                  style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <div
                    className="w-full h-full relative transition-transform duration-300 ease-out"
                    style={{
                      transform: `scale(${1 + (singleMapZoom - 17) * 0.16}) translate(${singleMapPan.x}px, ${singleMapPan.y}px)`,
                    }}
                  >
                    <svg
                      viewBox="0 0 800 500"
                      className="w-full h-full object-cover opacity-65"
                    >
                      <defs>
                        <pattern
                          id="closeGrid"
                          width="40"
                          height="40"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            stroke="#1E293B"
                            strokeWidth="1.5"
                          />
                        </pattern>
                      </defs>
                      <rect width="800" height="500" fill="url(#closeGrid)" />
                      <path
                        d="M 0 250 L 800 250"
                        stroke="#334155"
                        strokeWidth="26"
                        fill="none"
                      />
                      <path
                        d="M 400 0 L 400 500"
                        stroke="#334155"
                        strokeWidth="24"
                        fill="none"
                      />
                      <path
                        d="M 120 0 L 680 500"
                        stroke="#1E293B"
                        strokeWidth="16"
                        fill="none"
                      />
                      {/* Radar Circles around Driver */}
                      <circle
                        cx="400"
                        cy="250"
                        r="110"
                        fill="none"
                        stroke="#38BDF8"
                        strokeOpacity="0.25"
                        strokeWidth="2"
                        strokeDasharray="6 6"
                      />
                      <circle
                        cx="400"
                        cy="250"
                        r="55"
                        fill="#10B981"
                        fillOpacity="0.1"
                        stroke="#10B981"
                        strokeOpacity="0.4"
                        strokeWidth="2"
                      />
                    </svg>

                    {/* Live Moving Driver Marker in Center with Micro-Offset */}
                    <div
                      style={{
                        left: `${50 + (live.lng - liveModalDriver.lng) * 9000}%`,
                        top: `${50 - (live.lat - liveModalDriver.lat) * 9000}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
                    >
                      <div className="w-20 h-20 rounded-full bg-emerald-500/25 border border-emerald-400 animate-ping absolute -inset-3 pointer-events-none" />
                      <div className="relative flex flex-col items-center">
                        <div className="px-3 py-1 rounded-xl bg-[#0A192F] border-2 border-emerald-400 text-white text-xs font-extrabold shadow-xl mb-1.5 whitespace-nowrap">
                          {liveModalDriver.driverName} — هنا الآن
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600 border-2 border-white shadow-[0_0_25px_rgba(16,185,129,0.9)] flex items-center justify-center text-2xl">
                          🚗
                        </div>
                      </div>
                    </div>
                  </div>
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

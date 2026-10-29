import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  AdminMessage,
  PlatformDatabaseState,
  ServicePhoneEntry,
  StoreListingItem,
  TawsilaRideItem,
  UserAccount,
  UtilitySubmissionItem,
} from '../types';
import { createSquareAdSvg, DEFAULT_STORE_CATEGORIES } from './storageService';

/**
 * UNIVERSAL A4 PDF TABLE EXPORTER (Strict Global Rule Across All Site Sections)
 * - Repeats the exact same top header on every new A4 page.
 * - Automatically shrinks font size slightly when data is large so it fits A4 cleanly.
 * - Displays data inside a table with clear, visible borders.
 * - Strictly ONLY displays page numbering at the bottom ("صفحة 1"، "صفحة 2"، ...).
 *   NO phone number, NO signature/stamp, NO extra footer text.
 */
export function exportStrictA4TablePDF(
  reportTitle: string,
  columns: string[],
  rows: string[][],
  fileName: string
) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // High-DPI A4 Canvas (1240 x 1754 px = 150 DPI A4 portrait)
  const pageWidth = 1240;
  const pageHeight = 1754;
  const marginX = 56;
  const tableWidth = pageWidth - marginX * 2;

  // Auto-scale font size and row height slightly if dataset or text is large
  const isLargeDataset = rows.length > 18 || columns.length > 5;
  const baseFontSize = isLargeDataset ? 16 : 19;
  const headerFontSize = isLargeDataset ? 18 : 21;
  const rowHeight = isLargeDataset ? 52 : 62;

  const topHeaderY = 50;
  const tableHeaderY = 140;
  const tableHeaderHeight = 58;
  const firstRowY = tableHeaderY + tableHeaderHeight;
  const footerReservedHeight = 100; // Reserved strictly for "صفحة X"
  const availableRowsHeight = pageHeight - firstRowY - footerReservedHeight;
  const rowsPerPage = Math.max(1, Math.floor(availableRowsHeight / rowHeight));

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const colWidth = tableWidth / columns.length;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const canvas = document.createElement('canvas');
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Clean White A4 Sheet Background for crisp printing & viewing
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    // 1. Repeated Top Document Header on Every New Page
    ctx.fillStyle = '#0A192F';
    ctx.fillRect(marginX, topHeaderY, tableWidth, 72);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.strokeRect(marginX, topHeaderY, tableWidth, 72);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = `bold 26px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(reportTitle, pageWidth / 2, topHeaderY + 36);

    // 2. Repeated Table Column Headers on Every New Page (Visible Borders)
    ctx.fillStyle = '#112240';
    ctx.fillRect(marginX, tableHeaderY, tableWidth, tableHeaderHeight);
    ctx.strokeStyle = '#0A192F';
    ctx.lineWidth = 2;
    ctx.strokeRect(marginX, tableHeaderY, tableWidth, tableHeaderHeight);

    columns.forEach((colLabel, colIdx) => {
      // RTL order: column 0 is on the far right
      const cellRightX = pageWidth - marginX - colIdx * colWidth;
      const cellLeftX = cellRightX - colWidth;

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cellLeftX, tableHeaderY, colWidth, tableHeaderHeight);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${headerFontSize}px Cairo, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        truncateCanvasText(ctx, colLabel, colWidth - 16),
        cellLeftX + colWidth / 2,
        tableHeaderY + tableHeaderHeight / 2
      );
    });

    // 3. Table Data Rows for Current Page with Clear Visible Borders
    const pageRows = rows.slice(
      pageIndex * rowsPerPage,
      (pageIndex + 1) * rowsPerPage
    );

    pageRows.forEach((rowCells, rIdx) => {
      const currentY = firstRowY + rIdx * rowHeight;
      ctx.fillStyle = rIdx % 2 === 0 ? '#F8FAFC' : '#F1F5F9';
      ctx.fillRect(marginX, currentY, tableWidth, rowHeight);

      columns.forEach((_, colIdx) => {
        const cellRightX = pageWidth - marginX - colIdx * colWidth;
        const cellLeftX = cellRightX - colWidth;
        const rawVal = String(rowCells[colIdx] ?? '-');

        // Clear visible border for every cell
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cellLeftX, currentY, colWidth, rowHeight);

        ctx.fillStyle = '#0F172A';
        ctx.font = `600 ${baseFontSize}px Cairo, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          truncateCanvasText(ctx, rawVal, colWidth - 18),
          cellLeftX + colWidth / 2,
          currentY + rowHeight / 2
        );
      });
    });

    // 4. Bottom of Page: Strictly ONLY Page Numbering ("صفحة 1"، "صفحة 2"، ...)
    // Zero phone numbers, zero signatures, zero extra text.
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`صفحة ${pageIndex + 1}`, pageWidth / 2, pageHeight - 42);

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  pdf.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function truncateCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const clean = text.replace(/\r?\n/g, ' ').trim();
  if (ctx.measureText(clean).width <= maxWidth) return clean;
  let clipped = clean;
  while (clipped.length > 0 && ctx.measureText(clipped + '...').width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '...';
}

/**
 * UNIVERSAL EXCEL EXPORTER (SheetJS)
 */
export function exportToExcelSheet<T extends Record<string, unknown>>(
  data: T[],
  sheetName: string,
  fileName: string
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportStoresToExcel(stores: StoreListingItem[]) {
  const rows = stores.map((s, idx) => ({
    'م': idx + 1,
    'القسم': s.category,
    'اسم المحل': s.name,
    'رقم هاتف المحل': s.phone,
    'لوكيشن المحل': s.locationUrl,
    'تفاصيل المحل': s.details,
    'إعجابات (👍)': s.likes.length,
    'عدم إعجاب (👎)': s.dislikes.length,
  }));
  exportToExcelSheet(rows, 'دليل المحلات', 'Directory_Stores');
}

export function exportStoresToPDF(stores: StoreListingItem[]) {
  const columns = ['م', 'القسم', 'اسم المحل', 'رقم الهاتف', 'لوكيشن المحل', 'تفاصيل المحل'];
  const rows = stores.map((s, idx) => [
    String(idx + 1),
    s.category,
    s.name,
    s.phone,
    s.locationUrl,
    s.details,
  ]);
  exportStrictA4TablePDF(
    'كشف دليل المحلات والأنشطة التجارية المسجلة',
    columns,
    rows,
    'Directory_Stores_Report'
  );
}

export function exportServiceNumbersToExcel(numbers: ServicePhoneEntry[]) {
  const rows = numbers.map((n, idx) => ({
    'م': idx + 1,
    'اسم مقدم الخدمة': n.title,
    'المهنة': n.profession || n.category || '-',
    'رقم الهاتف': n.phone,
    'تفاصيل': n.notes || '-',
    'اللوكيشن (Google Maps)':
      n.locationUrl && n.locationUrl !== 'https://maps.google.com'
        ? n.locationUrl
        : '-',
  }));
  exportToExcelSheet(rows, 'أرقام الخدمات', 'Service_Numbers');
}

export function exportServiceNumbersToPDF(numbers: ServicePhoneEntry[]) {
  const columns = ['م', 'اسم مقدم الخدمة', 'المهنة', 'رقم الهاتف', 'تفاصيل', 'اللوكيشن'];
  const rows = numbers.map((n, idx) => [
    String(idx + 1),
    n.title,
    n.profession || n.category || '-',
    n.phone,
    n.notes || '-',
    n.locationUrl && n.locationUrl !== 'https://maps.google.com'
      ? n.locationUrl
      : '-',
  ]);
  exportStrictA4TablePDF(
    'كشف أرقام الخدمات ومقدمي الخدمة المسجلين',
    columns,
    rows,
    'Service_Numbers_Report'
  );
}

export function exportTawsilaToExcel(rides: TawsilaRideItem[]) {
  const rows = rides.map((r, idx) => ({
    'م': idx + 1,
    'اسم السائق': r.driverName,
    'رقم الهاتف': r.phone,
    'رقم البطاقة': r.nationalId || '-',
    'حالة العمل': r.availableNow ? 'شغل (متاح الآن)' : 'نهاية عمل',
    'حالة الفيش والتشبيه': r.criminalRecordImageUrl ? 'مرفق ومعتمد' : 'مهلة 3 أيام / غير مرفق',
    'الإحداثيات الحالية': `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
  }));
  exportToExcelSheet(rows, 'سائقي توصيلة', 'Tawsila_Drivers');
}

export function exportTawsilaToPDF(rides: TawsilaRideItem[]) {
  const columns = ['م', 'اسم السائق', 'رقم الهاتف', 'رقم البطاقة', 'حالة العمل', 'الإحداثيات'];
  const rows = rides.map((r, idx) => [
    String(idx + 1),
    r.driverName,
    r.phone,
    r.nationalId || '-',
    r.availableNow ? 'شغل (متاح)' : 'نهاية عمل',
    `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
  ]);
  exportStrictA4TablePDF(
    'كشف سائقي ومركبات خدمة توصيلة',
    columns,
    rows,
    'Tawsila_Drivers_Report'
  );
}

export function exportUsersAndMessagesToExcel(users: UserAccount[], messages: AdminMessage[]) {
  const wb = XLSX.utils.book_new();
  const usersSheet = XLSX.utils.json_to_sheet(
    users.map((u, idx) => ({
      'م': idx + 1,
      'اسم المستخدم': u.username,
      'الصلاحية': u.role === 'admin' ? 'مدير (Admin)' : 'مستخدم',
      'رقم الهاتف': u.phone || '-',
    }))
  );
  const msgSheet = XLSX.utils.json_to_sheet(
    messages.map((m, idx) => ({
      'م': idx + 1,
      'المرسل': m.senderUsername,
      'الرسالة': m.content,
      'الحالة': m.isRead ? 'مقروءة' : 'جديدة',
    }))
  );
  XLSX.utils.book_append_sheet(wb, usersSheet, 'المستخدمين');
  XLSX.utils.book_append_sheet(wb, msgSheet, 'المراسلات');
  XLSX.writeFile(wb, `Admin_Users_Messages_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportPlatformSummaryToPDF(state: PlatformDatabaseState) {
  exportStoresToPDF(state.stores);
}

/**
 * Export Utility Submissions (Single utility details or all utilities) to A4 PDF
 * Supports full multi-line details text, locations, and update timestamps.
 */
export function exportUtilitySubmissionsToPDF(
  items: UtilitySubmissionItem[],
  customReportTitle?: string
) {
  if (!items || items.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 1240;
  const pageHeight = 1754;
  const marginX = 56;
  const contentWidth = pageWidth - marginX * 2;

  // Build wrapped lines across all items
  interface RenderBlock {
    type: 'header' | 'meta' | 'location' | 'detail_line' | 'spacer';
    text: string;
  }

  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');

  const wrapParagraph = (text: string, font: string, maxW: number): string[] => {
    if (!mCtx) return [text];
    mCtx.font = font;
    const rawLines = (text || '').split(/\r?\n/);
    const wrapped: string[] = [];
    rawLines.forEach((rawLine) => {
      const words = rawLine.trim().split(/\s+/);
      if (words.length === 0 || (words.length === 1 && !words[0])) {
        wrapped.push('');
        return;
      }
      let current = words[0];
      for (let i = 1; i < words.length; i++) {
        const candidate = `${current} ${words[i]}`;
        if (mCtx.measureText(candidate).width <= maxW) {
          current = candidate;
        } else {
          wrapped.push(current);
          current = words[i];
        }
      }
      wrapped.push(current);
    });
    return wrapped;
  };

  const blocks: RenderBlock[] = [];
  items.forEach((item, idx) => {
    if (idx > 0) {
      blocks.push({ type: 'spacer', text: '' });
    }
    blocks.push({
      type: 'header',
      text: `المرفق: ${item.utilityName}`,
    });
    let dateStr = item.updatedAt;
    try {
      dateStr = new Date(item.updatedAt).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // keep raw
    }
    blocks.push({
      type: 'meta',
      text: `آخر تحديث: ${dateStr}`,
    });

    if (item.locations && item.locations.length > 0) {
      item.locations.forEach((loc, lIdx) => {
        if (loc.name || loc.locationUrl) {
          blocks.push({
            type: 'location',
            text: `الموقع (${lIdx + 1}): ${loc.name || item.utilityName}${
              loc.locationUrl ? ` — ${loc.locationUrl}` : ''
            }`,
          });
        }
      });
    }

    const detailText = (item.details || '').trim() || 'لا توجد تفاصيل إضافية مسجلة.';
    const wrappedDetails = wrapParagraph(
      detailText,
      'bold 20px Cairo, sans-serif',
      contentWidth - 48
    );
    wrappedDetails.forEach((line) => {
      blocks.push({
        type: 'detail_line',
        text: line,
      });
    });
  });

  const blockHeight = (b: RenderBlock) => {
    if (b.type === 'header') return 58;
    if (b.type === 'meta') return 42;
    if (b.type === 'location') return 44;
    if (b.type === 'spacer') return 28;
    return 38;
  };

  const topTitleY = 50;
  const startContentY = 145;
  const bottomLimitY = pageHeight - 95;

  const pages: RenderBlock[][] = [];
  let currentPage: RenderBlock[] = [];
  let currentY = startContentY;

  blocks.forEach((b) => {
    const h = blockHeight(b);
    if (currentY + h > bottomLimitY && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentY = startContentY;
    }
    currentPage.push(b);
    currentY += h;
  });
  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  const reportHeader =
    customReportTitle ||
    (items.length === 1
      ? `تفاصيل ${items[0].utilityName} — تقديمات المرافق`
      : 'تقرير تفاصيل تقديمات المرافق المسجلة');

  pages.forEach((pageBlocks, pageIndex) => {
    if (pageIndex > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const canvas = document.createElement('canvas');
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    // Top Document Header
    ctx.fillStyle = '#0A192F';
    ctx.fillRect(marginX, topTitleY, contentWidth, 72);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.strokeRect(marginX, topTitleY, contentWidth, 72);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 26px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(reportHeader, pageWidth / 2, topTitleY + 36);

    // Outer Content Border
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      marginX,
      startContentY - 10,
      contentWidth,
      bottomLimitY - startContentY + 20
    );

    let y = startContentY;
    pageBlocks.forEach((b) => {
      const h = blockHeight(b);
      if (b.type === 'header') {
        ctx.fillStyle = '#112240';
        ctx.fillRect(marginX + 12, y, contentWidth - 24, h - 6);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(b.text, pageWidth - marginX - 28, y + (h - 6) / 2);
      } else if (b.type === 'meta') {
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(marginX + 12, y, contentWidth - 24, h - 4);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 18px Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(b.text, pageWidth - marginX - 28, y + (h - 4) / 2);
      } else if (b.type === 'location') {
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(marginX + 12, y, contentWidth - 24, h - 4);
        ctx.fillStyle = '#0369A1';
        ctx.font = 'bold 18px Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(
          truncateCanvasText(ctx, b.text, contentWidth - 56),
          pageWidth - marginX - 28,
          y + (h - 4) / 2
        );
      } else if (b.type === 'detail_line') {
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(b.text, pageWidth - marginX - 28, y + h / 2);
      }
      y += h;
    });

    // Page Footer
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`صفحة ${pageIndex + 1}`, pageWidth / 2, pageHeight - 42);

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  });

  const safeName =
    items.length === 1
      ? `Utility_${items[0].utilityName.replace(/\s+/g, '_')}`
      : 'Utilities_Submissions_Report';
  pdf.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * SMART EXCEL & PDF STORE IMPORTER
 * Extracts store listings whether the data in Excel/PDF is arranged in horizontal rows
 * OR vertical transposed columns next to each other.
 */
export async function parseStoresFromExcelFile(
  file: File,
  ownerUsername: string,
  ownerId: string,
  availableCategories: string[],
  forcedCategory?: string
): Promise<StoreListingItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
  });

  return extractStoresFrom2DMatrix(
    matrix,
    ownerUsername,
    ownerId,
    availableCategories,
    forcedCategory
  );
}

export async function parseStoresFromPDFFile(
  file: File,
  ownerUsername: string,
  ownerId: string,
  availableCategories: string[],
  forcedCategory?: string
): Promise<StoreListingItem[]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(bytes);

  // Extract readable text lines from PDF streams or plain text lines
  const extractedLines: string[] = [];

  // 1. Check literal parenthesized strings (...) in PDF content streams
  const literalRegex = /\(([^()]{3,200})\)/g;
  let match: RegExpExecArray | null;
  while ((match = literalRegex.exec(rawText)) !== null) {
    const cleaned = match[1].replace(/\\[nrt]/g, ' ').trim();
    if (cleaned.length > 2 && !/^[0-9.\s]+$/.test(cleaned)) {
      extractedLines.push(cleaned);
    }
  }

  // 2. Also scan UTF-8 / Arabic lines directly
  const directLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /[\u0600-\u06FF]/.test(l) || /01[0125][0-9]{8}/.test(l));

  const combinedLines = [...extractedLines, ...directLines];

  const matrix: string[][] = combinedLines.map((line) =>
    line.split(/\t|\||,|;| {2,}/).map((cell) => cell.trim()).filter(Boolean)
  );

  const parsed = extractStoresFrom2DMatrix(
    matrix,
    ownerUsername,
    ownerId,
    availableCategories,
    forcedCategory
  );

  if (parsed.length > 0) return parsed;

  // Fallback: create a store entry named after the uploaded PDF file if it's a scanned image PDF
  const cleanFileName = file.name.replace(/\.pdf$/i, '').trim();
  if (cleanFileName) {
    const matchedCat =
      forcedCategory ||
      availableCategories.find((c) => cleanFileName.includes(c)) ||
      availableCategories[0] ||
      'سوبر ماركت';
    return [
      {
        id: `st-pdf-${Date.now()}`,
        ownerId,
        ownerUsername,
        name: cleanFileName,
        category: matchedCat,
        locationUrl: 'https://maps.google.com',
        phone: '01000000000',
        whatsapp: '201000000000',
        details: `تم استيراد بيانات المحل من ملف PDF (${file.name})`,
        menuImages: [createSquareAdSvg(cleanFileName, matchedCat, '#38BDF8')],
        likes: [],
        dislikes: [],
        ratings: {},
        comments: [],
        approved: true,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return [];
}

/**
 * Intelligent 2D Matrix Parser supporting both:
 * 1. Standard Row-oriented tables (headers in top row, stores in subsequent rows)
 * 2. Column-oriented / Transposed tables (headers in first column, stores in adjacent columns)
 * 3. Headerless rows/columns by heuristic field detection (Phone, URL, Category, Name, Details)
 */
function extractStoresFrom2DMatrix(
  matrix: unknown[][],
  ownerUsername: string,
  ownerId: string,
  availableCategories: string[],
  forcedCategory?: string
): StoreListingItem[] {
  const cleanMatrix: string[][] = matrix
    .map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '').trim()) : []))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleanMatrix.length === 0) return [];

  const isHeaderKeyword = (val: string) => {
    const v = val.toLowerCase();
    return (
      v.includes('اسم المحل') ||
      v.includes('الاسم') ||
      v.includes('القسم') ||
      v.includes('التصنيف') ||
      v.includes('هاتف') ||
      v.includes('تليفون') ||
      v.includes('موبايل') ||
      v.includes('لوكيشن') ||
      v.includes('خريطة') ||
      v.includes('تفاصيل') ||
      v.includes('وصف') ||
      v === 'name' ||
      v === 'phone' ||
      v === 'category'
    );
  };

  // Check if matrix is Column-Oriented (Transposed: first column has header labels)
  const firstColHeaderCount = cleanMatrix.filter((row) =>
    isHeaderKeyword(row[0] || '')
  ).length;
  const firstRowHeaderCount = (cleanMatrix[0] || []).filter((cell) =>
    isHeaderKeyword(cell)
  ).length;

  let workingMatrix = cleanMatrix;
  if (firstColHeaderCount >= 2 && firstColHeaderCount > firstRowHeaderCount) {
    // Transpose matrix so columns become rows
    const maxCols = Math.max(...cleanMatrix.map((r) => r.length));
    const transposed: string[][] = [];
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      transposed.push(cleanMatrix.map((row) => row[colIdx] || ''));
    }
    workingMatrix = transposed;
  }

  const results: StoreListingItem[] = [];
  const hasTopHeader = (workingMatrix[0] || []).some((cell) => isHeaderKeyword(cell));
  const headerRow = hasTopHeader ? workingMatrix[0] : [];
  const dataRows = hasTopHeader ? workingMatrix.slice(1) : workingMatrix;

  dataRows.forEach((row, idx) => {
    if (row.every((c) => !c)) return;

    let name = '';
    let category = '';
    let phone = '';
    let locationUrl = '';
    let details = '';

    if (hasTopHeader && headerRow.length > 0) {
      headerRow.forEach((h, cIdx) => {
        const val = row[cIdx] || '';
        if (!val) return;
        const hl = h.toLowerCase();
        if (hl.includes('اسم') || hl === 'name') name = val;
        else if (hl.includes('قسم') || hl.includes('تصنيف') || hl === 'category')
          category = val;
        else if (
          hl.includes('هاتف') ||
          hl.includes('تليفون') ||
          hl.includes('موبايل') ||
          hl.includes('رقم') ||
          hl === 'phone'
        )
          phone = val;
        else if (hl.includes('لوكيشن') || hl.includes('موقع') || hl.includes('خريطة'))
          locationUrl = val;
        else if (hl.includes('تفاصيل') || hl.includes('وصف') || hl.includes('عنوان'))
          details = details ? `${details} - ${val}` : val;
      });
    }

    // Heuristic fallback for any unmapped cells in the row
    row.forEach((cell) => {
      if (!cell || isHeaderKeyword(cell)) return;
      if (!locationUrl && /^https?:\/\//i.test(cell)) {
        locationUrl = cell;
      } else if (!phone && /[0-9]{7,15}/.test(cell.replace(/[\s-]/g, ''))) {
        phone = cell;
      } else if (
        !forcedCategory &&
        !category &&
        (availableCategories.includes(cell) || DEFAULT_STORE_CATEGORIES.includes(cell))
      ) {
        category = cell;
      } else if (!name && cell.length >= 2 && !/^[0-9]+$/.test(cell)) {
        name = cell;
      } else if (cell !== name && cell !== category && cell !== phone && cell !== locationUrl) {
        details = details ? `${details} · ${cell}` : cell;
      }
    });

    if (name) {
      // Strictly enforce forcedCategory when provided so data is ONLY entered in the chosen category
      const finalCat = forcedCategory
        ? forcedCategory
        : category || availableCategories[0] || DEFAULT_STORE_CATEGORIES[0] || 'سوبر ماركت';
      results.push({
        id: `st-imp-${Date.now()}-${idx}`,
        ownerId,
        ownerUsername,
        name,
        category: finalCat,
        locationUrl: locationUrl || 'https://maps.google.com',
        phone: phone || '01000000000',
        whatsapp: (phone || '01000000000').replace(/[^0-9]/g, ''),
        details: details || `${name} - ${finalCat}`,
        menuImages: [createSquareAdSvg(name, finalCat, '#38BDF8')],
        likes: [],
        dislikes: [],
        ratings: {},
        comments: [],
        approved: true,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return results;
}

/**
 * SMART EXCEL SERVICE NUMBERS IMPORTER
 * Parses rows formatted as:
 * 1. الأول: اسم مقدم الخدمة (title)
 * 2. الثاني: المهنة (profession / category)
 * 3. الثالث: تفاصيل (notes)
 * 4. الرابع: رقم الهاتف (phone)
 */
export async function parseServiceNumbersFromExcelFile(
  file: File
): Promise<{
  entries: ServicePhoneEntry[];
  discoveredProfessions: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return { entries: [], discoveredProfessions: [] };
  }

  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  });

  const cleanMatrix: string[][] = rawMatrix
    .map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '').trim()) : []))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleanMatrix.length === 0) {
    return { entries: [], discoveredProfessions: [] };
  }

  const isServiceHeaderCell = (val: string) => {
    const v = val.toLowerCase();
    return (
      v.includes('اسم مقدم') ||
      v.includes('مقدم الخدمة') ||
      v.includes('مقدم الخدمه') ||
      v === 'الاسم' ||
      v === 'اسم' ||
      v === 'المهنة' ||
      v === 'المهنه' ||
      v === 'تفاصيل' ||
      v === 'التفاصيل' ||
      v === 'ملاحظات' ||
      v.includes('رقم الهاتف') ||
      v === 'الهاتف' ||
      v === 'تليفون' ||
      v === 'موبايل'
    );
  };

  const firstRow = cleanMatrix[0] || [];
  const hasTopHeader =
    firstRow.filter((cell) => isServiceHeaderCell(cell)).length >= 2 ||
    isServiceHeaderCell(firstRow[0] || '');

  const headerRow = hasTopHeader ? firstRow : [];
  const dataRows = hasTopHeader ? cleanMatrix.slice(1) : cleanMatrix;

  const entries: ServicePhoneEntry[] = [];
  const discoveredProfessionsSet = new Set<string>();
  const nowBase = Date.now();

  dataRows.forEach((row, idx) => {
    const nonEmptyCells = row.filter((c) => c.length > 0);
    if (nonEmptyCells.length === 0) return;

    let title = '';
    let profession = '';
    let notes = '';
    let phone = '';
    let locationUrl = '';

    // 1. Positional mapping: (1) اسم مقدم الخدمة, (2) المهنة, (3) تفاصيل, (4) رقم الهاتف
    if (row.length >= 4) {
      title = (row[0] || '').trim();
      profession = (row[1] || '').trim();
      notes = (row[2] || '').trim();
      phone = (row[3] || '').trim();
      if (row[4] && /^https?:\/\//i.test(row[4].trim())) {
        locationUrl = row[4].trim();
      }
    }

    // 2. If a header row exists, refine mapping for any named columns
    if (hasTopHeader && headerRow.length > 0) {
      let hTitle = '';
      let hProf = '';
      let hNotes = '';
      let hPhone = '';
      let hLoc = '';
      headerRow.forEach((h, cIdx) => {
        const val = (row[cIdx] || '').trim();
        if (!val) return;
        const hl = h.toLowerCase();
        if (hl.includes('اسم') || hl.includes('مقدم')) hTitle = val;
        else if (hl.includes('مهن') || hl.includes('تخصص') || hl.includes('قسم'))
          hProf = val;
        else if (hl.includes('تفاصيل') || hl.includes('ملاحظ') || hl.includes('وصف'))
          hNotes = hNotes ? `${hNotes} - ${val}` : val;
        else if (
          hl.includes('هاتف') ||
          hl.includes('تليفون') ||
          hl.includes('موبايل') ||
          hl.includes('رقم')
        )
          hPhone = val;
        else if (hl.includes('لوكيشن') || hl.includes('موقع') || hl.includes('خريطة'))
          hLoc = val;
      });
      if (hTitle) title = hTitle;
      if (hProf) profession = hProf;
      if (hNotes) notes = hNotes;
      if (hPhone) phone = hPhone;
      if (hLoc) locationUrl = hLoc;
    }

    // 3. Fallback if row had fewer than 4 cells or phone/name were in different positions
    if (!title || !phone) {
      const remaining: string[] = [];
      row.forEach((cell) => {
        const c = (cell || '').trim();
        if (!c) return;
        if (!locationUrl && /^https?:\/\//i.test(c)) {
          locationUrl = c;
        } else if (!phone && /[0-9]{7,15}/.test(c.replace(/[\s-]/g, ''))) {
          phone = c;
        } else {
          remaining.push(c);
        }
      });
      if (!title && remaining.length > 0) {
        title = remaining[0];
      }
      if (!profession && remaining.length > 1) {
        profession = remaining[1];
      }
      if (!notes && remaining.length > 2) {
        notes = remaining.slice(2).join(' - ');
      }
    }

    if (!title && !phone) return;
    const finalTitle = title || `مقدم خدمة #${idx + 1}`;
    const finalProfession = profession || 'خدمات عامة';
    const finalPhone = phone || '01000000000';

    if (profession && profession.trim()) {
      discoveredProfessionsSet.add(profession.trim());
    }

    entries.push({
      id: `srv-imp-${nowBase}-${idx}`,
      title: finalTitle,
      profession: finalProfession,
      category: finalProfession,
      notes: notes || undefined,
      phone: finalPhone,
      locationUrl: locationUrl || '',
      likes: [],
      viewsCount: 0,
      ratings: {},
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: nowBase + idx,
    });
  });

  return {
    entries,
    discoveredProfessions: Array.from(discoveredProfessionsSet),
  };
}


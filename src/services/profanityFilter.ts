/**
 * Arabic Profanity & Abusive Language Filter
 * Blocks offensive/abusive words in Live Chat, Private Chat, Community Posts, and Comments.
 */

const BANNED_ARABIC_ROOTS: string[] = [
  'كلب',
  'حيوان',
  'حيون',
  'عرص',
  'معرص',
  'تعريص',
  'كسمك',
  'كسم',
  'كسمين',
  'ابن وسخه',
  'ابن وسخة',
  'بنت وسخه',
  'ولاد وسخه',
  'وسخه',
  'وسخة',
  'متناك',
  'متناكه',
  'منيوك',
  'منيوكه',
  'يتناك',
  'نيك',
  'شرموط',
  'شرموطه',
  'شراميط',
  'خول',
  'خولات',
  'قحبه',
  'قحبة',
  'لبوه',
  'لبوة',
  'زاني',
  'زانيه',
  'احا',
  'أحا',
  'كسختك',
  'طيز',
  'زب',
  'زبي',
  'خرا',
  'ابن الكلب',
  'ابن الحرام',
  'سافل',
  'منحط',
  'نجس',
];

function normalizeArabicForFilter(input: string): string {
  return input
    .toLowerCase()
    // Remove tashkeel / diacritics and tatweel
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Normalize alef variants
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize teh marbuta
    .replace(/ة/g, 'ه')
    // Normalize alef maksura
    .replace(/ى/g, 'ي')
    // Replace punctuation/symbols between letters with space
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،؛"'✨🔥⚡]/g, ' ')
    // Collapse repeated characters (e.g. كلببب -> كلب)
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsAbusiveWords(text: string): boolean {
  if (!text || !text.trim()) return false;
  const normalized = normalizeArabicForFilter(text);
  const words = normalized.split(' ');

  for (const bad of BANNED_ARABIC_ROOTS) {
    const normBad = normalizeArabicForFilter(bad);
    if (normBad.includes(' ')) {
      // Multi-word phrase check
      if (normalized.includes(normBad)) {
        return true;
      }
    } else {
      // Exact word or with common Arabic prefixes (يا، ال، و، ب، ك، ل)
      for (const w of words) {
        if (
          w === normBad ||
          w === `ال${normBad}` ||
          w === `يا${normBad}` ||
          w === `و${normBad}` ||
          w === `ك${normBad}` ||
          w === `ب${normBad}`
        ) {
          return true;
        }
        // Strong substring match for severe roots
        if (
          (normBad === 'كسم' ||
            normBad === 'متناك' ||
            normBad === 'منيوك' ||
            normBad === 'شرموط' ||
            normBad === 'معرص' ||
            normBad === 'قحبه') &&
          w.includes(normBad)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

export const ABUSIVE_CONTENT_WARNING_MESSAGE =
  'تم حظر النشر/الإرسال: يحتوي النص على كلمات مسيئة أو غير لائقة مخالفة لقواعد المجتمع.';

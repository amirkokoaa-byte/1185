import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Store,
  ShoppingBag,
  MessageCircle,
  UserCheck,
  UserPlus,
  Users,
  Shield,
  Briefcase,
  GraduationCap,
  Heart,
  Calendar,
  Plus,
  Trash2,
  Check,
  X,
  Lock,
  Globe,
  Filter,
  Sparkles,
  Edit3,
  ChevronDown,
  Phone,
  Settings,
  Smile,
  BadgeCheck,
  UserMinus,
  Eye,
  FileText,
  Type,
  Ban,
  Menu,
} from 'lucide-react';
import {
  MainSectionId,
  UserAccount,
  UserPersonalProfile,
  ProfileFieldPrivacy,
  CustomFriendList,
  CommunityPostItem,
  PostPrivacyLevel,
} from '../types';

export interface GameAvatarOption {
  id: string;
  label: string;
  gender: 'male' | 'female';
  svgDataUri: string;
}

function buildDisneyOrCartoonAvatarSvg(
  bgGradStart: string,
  bgGradEnd: string,
  skinColor: string,
  hairColor: string,
  outfitColor: string,
  isFemale: boolean,
  accessory:
    | 'crown'
    | 'headband'
    | 'glasses'
    | 'tiara'
    | 'hood'
    | 'cap'
    | 'ribbon'
    | 'floral'
    | 'jasmine'
    | 'elsa'
    | 'belle'
    | 'ariel'
    | 'rapunzel'
    | 'stitch'
    | 'cat'
    | 'minion'
    | 'none_avatar'
): string {
  if (accessory === 'none_avatar') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <rect width="120" height="120" rx="60" fill="#1E293B"/>
      <circle cx="60" cy="44" r="18" fill="#475569"/>
      <path d="M26 104 C28 76, 92 76, 94 104 Z" fill="#475569"/>
      <text x="60" y="112" text-anchor="middle" fill="#94A3B8" font-family="Cairo, sans-serif" font-size="10" font-weight="700">لا يوجد صورة</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (accessory === 'stitch') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="stBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7"/>
          <stop offset="100%" stop-color="#1E3A8A"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#stBg)" stroke="#38BDF8" stroke-width="3"/>
      <!-- Big Stitch Ears -->
      <path d="M26 52 C4 22, 6 62, 28 68 Z" fill="#3B82F6" stroke="#1D4ED8" stroke-width="2"/>
      <path d="M24 52 C10 30, 12 58, 26 64 Z" fill="#F472B6"/>
      <path d="M94 52 C116 22, 114 62, 92 68 Z" fill="#3B82F6" stroke="#1D4ED8" stroke-width="2"/>
      <path d="M96 52 C110 30, 108 58, 94 64 Z" fill="#F472B6"/>
      <!-- Body & Head -->
      <path d="M32 108 C36 84, 84 84, 88 108 Z" fill="#2563EB"/>
      <ellipse cx="60" cy="98" rx="18" ry="12" fill="#93C5FD"/>
      <ellipse cx="60" cy="58" rx="30" ry="26" fill="#3B82F6" stroke="#1D4ED8" stroke-width="2"/>
      <!-- Eye patches -->
      <ellipse cx="47" cy="55" rx="9" ry="11" fill="#93C5FD"/>
      <ellipse cx="73" cy="55" rx="9" ry="11" fill="#93C5FD"/>
      <circle cx="48" cy="56" r="5.5" fill="#0F172A"/>
      <circle cx="72" cy="56" r="5.5" fill="#0F172A"/>
      <circle cx="46" cy="54" r="2" fill="#FFFFFF"/>
      <circle cx="70" cy="54" r="2" fill="#FFFFFF"/>
      <!-- Big Blue Nose -->
      <ellipse cx="60" cy="63" rx="7" ry="5" fill="#1E3A8A"/>
      <!-- Cute Smile -->
      <path d="M46 72 Q60 80 74 72" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (accessory === 'cat') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="catBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F43F5E"/>
          <stop offset="100%" stop-color="#881337"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#catBg)" stroke="#FDA4AF" stroke-width="3"/>
      <!-- Cat Ears -->
      <polygon points="32,48 28,20 50,36" fill="#FFF1F2" stroke="#FB7185" stroke-width="2"/>
      <polygon points="35,44 32,26 46,37" fill="#FDA4AF"/>
      <polygon points="88,48 92,20 70,36" fill="#FFF1F2" stroke="#FB7185" stroke-width="2"/>
      <polygon points="85,44 88,26 74,37" fill="#FDA4AF"/>
      <!-- Cat Body & Head -->
      <path d="M34 108 C38 84, 82 84, 86 108 Z" fill="#FFF1F2"/>
      <ellipse cx="60" cy="60" rx="28" ry="25" fill="#FFF1F2" stroke="#FECDD3" stroke-width="2"/>
      <!-- Pink Bow -->
      <circle cx="60" cy="86" r="4" fill="#E11D48"/>
      <polygon points="50,82 60,86 50,90" fill="#FB7185"/>
      <polygon points="70,82 60,86 70,90" fill="#FB7185"/>
      <!-- Eyes -->
      <circle cx="48" cy="57" r="4.5" fill="#0F172A"/>
      <circle cx="72" cy="57" r="4.5" fill="#0F172A"/>
      <circle cx="46.5" cy="55.5" r="1.5" fill="#FFFFFF"/>
      <circle cx="70.5" cy="55.5" r="1.5" fill="#FFFFFF"/>
      <!-- Pink Nose & Whiskers -->
      <polygon points="57,64 63,64 60,68" fill="#FB7185"/>
      <path d="M54 71 Q60 75 66 71" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
      <line x1="24" y1="60" x2="38" y2="63" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="24" y1="67" x2="38" y2="67" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="96" y1="60" x2="82" y2="63" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="96" y1="67" x2="82" y2="67" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (accessory === 'minion') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="minBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E40AF"/>
          <stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#minBg)" stroke="#FACC15" stroke-width="3"/>
      <!-- Minion Yellow Capsule Head/Body -->
      <rect x="34" y="24" width="52" height="82" rx="26" fill="#FACC15" stroke="#EAB308" stroke-width="2"/>
      <!-- Spiky Hair -->
      <path d="M52 24 Q50 14 46 16 M60 24 Q60 12 60 12 M68 24 Q70 14 74 16" stroke="#0F172A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <!-- Goggle Strap -->
      <rect x="33" y="47" width="54" height="8" fill="#1E293B"/>
      <!-- Goggles -->
      <circle cx="49" cy="51" r="11" fill="#E2E8F0" stroke="#64748B" stroke-width="3"/>
      <circle cx="71" cy="51" r="11" fill="#E2E8F0" stroke="#64748B" stroke-width="3"/>
      <circle cx="50" cy="51" r="6.5" fill="#FFFBEB"/>
      <circle cx="70" cy="51" r="6.5" fill="#FFFBEB"/>
      <circle cx="50" cy="51" r="3.8" fill="#78350F"/>
      <circle cx="70" cy="51" r="3.8" fill="#78350F"/>
      <circle cx="49" cy="49.5" r="1.4" fill="#FFFFFF"/>
      <circle cx="69" cy="49.5" r="1.4" fill="#FFFFFF"/>
      <!-- Smile -->
      <path d="M47 70 Q60 79 73 70" fill="none" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Blue Overalls -->
      <path d="M34 84 L86 84 L86 106 L34 106 Z" fill="#2563EB"/>
      <rect x="44" y="76" width="32" height="14" rx="3" fill="#1D4ED8"/>
      <circle cx="60" cy="86" r="4" fill="#0F172A"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const hairBack = isFemale
    ? `<path d="M26 52 C24 85, 32 102, 40 108 L80 108 C88 102, 96 85, 94 52 C92 26, 78 18, 60 18 C42 18, 28 26, 26 52 Z" fill="${hairColor}" />`
    : `<path d="M30 48 C30 25, 44 18, 60 18 C76 18, 90 25, 90 48 Z" fill="${hairColor}" />`;

  const hairFront = isFemale
    ? `<path d="M30 46 Q45 26 60 34 Q75 26 90 46 Q86 24 60 22 Q34 24 30 46 Z" fill="${hairColor}" />`
    : `<path d="M30 44 Q42 28 60 32 Q78 28 90 44 Q88 22 60 20 Q32 22 30 44 Z" fill="${hairColor}" />`;

  let accSvg = '';
  if (accessory === 'crown' || accessory === 'jasmine' || accessory === 'elsa' || accessory === 'belle' || accessory === 'ariel' || accessory === 'rapunzel') {
    const gemColor =
      accessory === 'jasmine'
        ? '#06B6D4'
        : accessory === 'elsa'
        ? '#38BDF8'
        : accessory === 'belle'
        ? '#F43F5E'
        : accessory === 'ariel'
        ? '#10B981'
        : '#EC4899';
    accSvg = `<polygon points="40,24 48,11 60,20 72,11 80,24" fill="#FBBF24" stroke="#F59E0B" stroke-width="1.5"/><circle cx="60" cy="17" r="3" fill="${gemColor}"/>`;
  } else if (accessory === 'tiara') {
    accSvg = `<path d="M42 24 Q60 10 78 24 Z" fill="#F472B6" stroke="#FBBF24" stroke-width="1.5"/><circle cx="60" cy="18" r="3" fill="#38BDF8"/>`;
  } else if (accessory === 'headband') {
    accSvg = `<rect x="33" y="28" width="54" height="6" rx="3" fill="#EF4444"/><circle cx="60" cy="31" r="3.5" fill="#FBBF24"/>`;
  } else if (accessory === 'glasses') {
    accSvg = `<rect x="37" y="48" width="18" height="12" rx="4" fill="none" stroke="#38BDF8" stroke-width="2.5"/><rect x="65" y="48" width="18" height="12" rx="4" fill="none" stroke="#38BDF8" stroke-width="2.5"/><line x1="55" y1="54" x2="65" y2="54" stroke="#38BDF8" stroke-width="2.5"/>`;
  } else if (accessory === 'cap') {
    accSvg = `<path d="M30 34 Q60 14 90 34 L98 38 L28 38 Z" fill="#10B981"/>`;
  } else if (accessory === 'ribbon') {
    accSvg = `<circle cx="78" cy="28" r="6" fill="#FB7185"/><circle cx="85" cy="24" r="5" fill="#F43F5E"/><circle cx="72" cy="24" r="5" fill="#F43F5E"/>`;
  } else if (accessory === 'floral') {
    accSvg = `<circle cx="42" cy="26" r="4.5" fill="#F472B6"/><circle cx="52" cy="23" r="4.5" fill="#FB923C"/><circle cx="62" cy="23" r="4.5" fill="#FACC15"/><circle cx="72" cy="26" r="4.5" fill="#38BDF8"/>`;
  }

  const eyelashes = isFemale
    ? `<path d="M40 50 L37 47 M80 50 L83 47" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>`
    : '';

  const blush = isFemale
    ? `<ellipse cx="42" cy="63" rx="5" ry="2.8" fill="#FB7185" opacity="0.55"/><ellipse cx="78" cy="63" rx="5" ry="2.8" fill="#FB7185" opacity="0.55"/>`
    : `<ellipse cx="42" cy="63" rx="4" ry="2" fill="#FB7185" opacity="0.3"/><ellipse cx="78" cy="63" rx="4" ry="2" fill="#FB7185" opacity="0.3"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradStart}"/>
        <stop offset="100%" stop-color="${bgGradEnd}"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#bg)" stroke="#ffffff" stroke-width="3" stroke-opacity="0.35"/>
    ${hairBack}
    <!-- Neck & Outfit -->
    <rect x="52" y="74" width="16" height="16" rx="6" fill="${skinColor}"/>
    <path d="M24 114 C28 86, 44 84, 60 84 C76 84, 92 86, 96 114 Z" fill="${outfitColor}"/>
    <path d="M48 84 L60 98 L72 84 Z" fill="#FFFFFF" opacity="0.8"/>
    <!-- Ears -->
    <circle cx="32" cy="56" r="6" fill="${skinColor}"/>
    <circle cx="88" cy="56" r="6" fill="${skinColor}"/>
    <!-- Face -->
    <ellipse cx="60" cy="55" rx="26" ry="27" fill="${skinColor}"/>
    <!-- Eyes (Big expressive Disney cartoon eyes) -->
    ${eyelashes}
    <ellipse cx="47" cy="54" rx="5.5" ry="6.5" fill="#0F172A"/>
    <ellipse cx="73" cy="54" rx="5.5" ry="6.5" fill="#0F172A"/>
    <circle cx="45" cy="51.5" r="2.2" fill="#FFFFFF"/>
    <circle cx="71" cy="51.5" r="2.2" fill="#FFFFFF"/>
    <circle cx="49" cy="56.5" r="1.1" fill="#FFFFFF"/>
    <circle cx="75" cy="56.5" r="1.1" fill="#FFFFFF"/>
    <!-- Eyebrows -->
    <path d="M40 44 Q47 41 53 44" fill="none" stroke="${hairColor}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M67 44 Q73 41 80 44" fill="none" stroke="${hairColor}" stroke-width="2.2" stroke-linecap="round"/>
    ${blush}
    <!-- Cute Nose & Smile -->
    <path d="M59 59 Q60 61 61 59" fill="none" stroke="#D97706" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M51 67 Q60 74 69 67" fill="none" stroke="${isFemale ? '#E11D48' : '#7C2D12'}" stroke-width="2.5" stroke-linecap="round"/>
    ${hairFront}
    ${accSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a custom text avatar SVG:
 * - Maximum 4 words
 * - 1 or 2 words -> rendered on 1 single centered line
 * - 3 or 4 words -> rendered on 2 lines (2 words per line)
 */
export function buildCustomTextAvatarSvg(rawText: string): string {
  const words = String(rawText || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  if (words.length === 0) {
    return buildDisneyOrCartoonAvatarSvg(
      '#1E293B',
      '#0F172A',
      '#FDE68A',
      '#1E293B',
      '#0284C7',
      false,
      'none_avatar'
    );
  }

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  let textNodes = '';
  if (words.length <= 2) {
    const singleLine = escapeXml(words.join(' '));
    const fontSize = singleLine.length > 12 ? 12 : singleLine.length > 8 ? 14 : 17;
    textNodes = `<text x="60" y="65" text-anchor="middle" fill="#FFFFFF" font-family="Cairo, sans-serif" font-size="${fontSize}" font-weight="900">${singleLine}</text>`;
  } else {
    const line1 = escapeXml(words.slice(0, 2).join(' '));
    const line2 = escapeXml(words.slice(2, 4).join(' '));
    const maxLen = Math.max(line1.length, line2.length);
    const fontSize = maxLen > 12 ? 11 : maxLen > 8 ? 13 : 15;
    textNodes = `
      <text x="60" y="53" text-anchor="middle" fill="#FFFFFF" font-family="Cairo, sans-serif" font-size="${fontSize}" font-weight="900">${line1}</text>
      <text x="60" y="75" text-anchor="middle" fill="#FDE047" font-family="Cairo, sans-serif" font-size="${fontSize}" font-weight="900">${line2}</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="txtAvBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284C7"/>
        <stop offset="50%" stop-color="#4F46E5"/>
        <stop offset="100%" stop-color="#7C3AED"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#txtAvBg)" stroke="#38BDF8" stroke-width="3"/>
    ${textNodes}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const GAME_AVATARS: GameAvatarOption[] = [
  // خيار لا يوجد صورة
  {
    id: 'avatar_none',
    label: 'لا يوجد صورة',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#1E293B',
      '#0F172A',
      '#FDE68A',
      '#1E293B',
      '#334155',
      false,
      'none_avatar'
    ),
  },
  // شخصيات كرتون مميزة (ستيتش - قطة - مينيونز)
  {
    id: 'cartoon_stitch',
    label: 'ستيتش (Stitch)',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#0284C7',
      '#1E3A8A',
      '#3B82F6',
      '#1D4ED8',
      '#2563EB',
      false,
      'stitch'
    ),
  },
  {
    id: 'cartoon_cat',
    label: 'قطة لطيفة (Cat)',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#F43F5E',
      '#881337',
      '#FFF1F2',
      '#FDA4AF',
      '#FB7185',
      true,
      'cat'
    ),
  },
  {
    id: 'cartoon_minion',
    label: 'مينيونز (Minions)',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#1E40AF',
      '#0F172A',
      '#FACC15',
      '#0F172A',
      '#2563EB',
      false,
      'minion'
    ),
  },
  // أميرات ديزني وشخصيات ديزني
  {
    id: 'disney_princess_jasmine',
    label: 'الأميرة ياسمين (ديزني)',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#06B6D4',
      '#0E7490',
      '#F3C69F',
      '#0F172A',
      '#22D3EE',
      true,
      'jasmine'
    ),
  },
  {
    id: 'disney_princess_elsa',
    label: 'الأميرة إلسا (ديزني)',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#38BDF8',
      '#0284C7',
      '#FFF1F2',
      '#FEF08A',
      '#7DD3FC',
      true,
      'elsa'
    ),
  },
  {
    id: 'disney_princess_belle',
    label: 'الأميرة بيل (ديزني)',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#F59E0B',
      '#B45309',
      '#FDE68A',
      '#78350F',
      '#FACC15',
      true,
      'belle'
    ),
  },
  {
    id: 'disney_princess_ariel',
    label: 'الأميرة أرييل (ديزني)',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#10B981',
      '#047857',
      '#FFE4E6',
      '#DC2626',
      '#34D399',
      true,
      'ariel'
    ),
  },
  {
    id: 'disney_princess_rapunzel',
    label: 'الأميرة رابونزل (ديزني)',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#A855F7',
      '#6B21A8',
      '#FFE4E6',
      '#FACC15',
      '#C084FC',
      true,
      'rapunzel'
    ),
  },
  {
    id: 'girl_princess_1',
    label: 'الأميرة سندريلا',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#EC4899',
      '#8B5CF6',
      '#FDE2E4',
      '#4A2511',
      '#F43F5E',
      true,
      'tiara'
    ),
  },
  {
    id: 'girl_star_2',
    label: 'نجمة الزهور',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#F472B6',
      '#FB7185',
      '#FFF1F2',
      '#B45309',
      '#A855F7',
      true,
      'floral'
    ),
  },
  {
    id: 'girl_ribbon_3',
    label: 'فراشة الربيع',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#A78BFA',
      '#EC4899',
      '#FDE68A',
      '#1E293B',
      '#EC4899',
      true,
      'ribbon'
    ),
  },
  {
    id: 'girl_queen_4',
    label: 'ملكة التاج',
    gender: 'female',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#38BDF8',
      '#818CF8',
      '#FFE4E6',
      '#7C2D12',
      '#0EA5E9',
      true,
      'crown'
    ),
  },
  {
    id: 'boy_prince_1',
    label: 'الأمير علاء الدين (ديزني)',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#0EA5E9',
      '#2563EB',
      '#FDE68A',
      '#1E293B',
      '#1D4ED8',
      false,
      'crown'
    ),
  },
  {
    id: 'boy_hero_2',
    label: 'البطل المغامر',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#10B981',
      '#059669',
      '#FED7AA',
      '#451A03',
      '#EF4444',
      false,
      'headband'
    ),
  },
  {
    id: 'boy_smart_3',
    label: 'المبتكر الذكي',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#6366F1',
      '#4F46E5',
      '#FEF3C7',
      '#334155',
      '#0284C7',
      false,
      'glasses'
    ),
  },
  {
    id: 'boy_captain_4',
    label: 'الكابتن الرياضي',
    gender: 'male',
    svgDataUri: buildDisneyOrCartoonAvatarSvg(
      '#F59E0B',
      '#EA580C',
      '#FDE68A',
      '#27272A',
      '#0F172A',
      false,
      'cap'
    ),
  },
];

export function getAvatarDataUriById(
  avatarId?: string,
  fallbackName?: string,
  customText?: string
): string {
  if (avatarId === 'avatar_custom_text' && customText && customText.trim()) {
    return buildCustomTextAvatarSvg(customText);
  }
  const found = GAME_AVATARS.find((a) => a.id === avatarId);
  if (found) return found.svgDataUri;
  if (customText && customText.trim()) {
    return buildCustomTextAvatarSvg(customText);
  }
  const seed = (fallbackName || 'user').trim();
  const idx =
    seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    GAME_AVATARS.length;
  return GAME_AVATARS[idx].svgDataUri;
}

export function getUserAvatarDataUri(
  user?: Pick<UserAccount, 'avatarId' | 'username' | 'gender' | 'profile'> | null,
  fallbackName?: string
): string {
  if (!user) {
    return getAvatarDataUriById(undefined, fallbackName);
  }
  if (
    user.avatarId === 'avatar_custom_text' ||
    (user.profile?.customAvatarText &&
      user.profile.customAvatarText.trim().length > 0 &&
      !user.avatarId)
  ) {
    return buildCustomTextAvatarSvg(
      user.profile?.customAvatarText || user.username || fallbackName || ''
    );
  }
  if (user.avatarId) {
    const found = GAME_AVATARS.find((a) => a.id === user.avatarId);
    if (found) return found.svgDataUri;
  }
  const pool =
    user.gender === 'female'
      ? GAME_AVATARS.filter((a) => a.gender === 'female')
      : user.gender === 'male'
      ? GAME_AVATARS.filter((a) => a.gender === 'male' && a.id !== 'avatar_none')
      : GAME_AVATARS.filter((a) => a.id !== 'avatar_none');
  const safePool = pool.length > 0 ? pool : GAME_AVATARS;
  const seed = (user.username || fallbackName || 'user').trim();
  const idx =
    seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    safePool.length;
  return safePool[idx].svgDataUri;
}

export const getRandomAvatarIdByGender = (
  gender: 'male' | 'female' = 'male'
): string => {
  const candidates = GAME_AVATARS.filter(
    (a) => a.gender === gender && a.id !== 'avatar_none'
  );
  if (candidates.length === 0) return 'boy_hero_1';
  return candidates[Math.floor(Math.random() * candidates.length)].id;
};

/**
 * Facebook-style Blue Verification Checkmark Badge ("العلامة الزرقاء - حساب موثق").
 * Hovering or clicking opens a popup showing "حساب موثق" with a close button and closes when clicking anywhere on screen.
 */
export const VerifiedBlueBadge: React.FC<{
  className?: string;
  size?: number;
}> = ({ className = '', size = 16 }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsPopupOpen(true)}
      onMouseLeave={() => setIsPopupOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setIsPopupOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsPopupOpen((prev) => !prev);
          }
        }}
        className="inline-flex items-center justify-center rounded-full focus:outline-none transition hover:scale-110 cursor-pointer"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm shrink-0"
        >
          <circle cx="12" cy="12" r="10.5" fill="#1877F2" stroke="#FFFFFF" strokeWidth="1.5" />
          <path
            d="M7.5 12.5L10.5 15.5L16.8 9.2"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {isPopupOpen && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-[9999] whitespace-nowrap rounded-xl bg-slate-900/95 border border-sky-500/60 px-2.5 py-1 shadow-xl text-center animate-fadeIn block"
        >
          <span className="flex items-center justify-center gap-1 text-sky-400 font-black text-[11px]">
            <BadgeCheck className="w-3.5 h-3.5 fill-sky-500 text-white shrink-0" />
            <span>حساب موثق</span>
          </span>
        </span>
      )}
    </span>
  );
};

interface FacebookMobileBottomBarProps {
  activeSection?: MainSectionId | string;
  activeTab?: MainSectionId | string;
  isChatHistoryOpen?: boolean;
  isMobileMenuOpen?: boolean;
  unreadPrivateMessagesCount?: number;
  unreadChatCount?: number;
  onSelectHomeFeed: () => void;
  onSelectStoresDirectory?: () => void;
  onSelectDirectory?: () => void;
  onSelectMarketplace: () => void;
  onSelectMessages: () => void;
  onSelectPersonalProfile?: () => void;
  onSelectProfile?: () => void;
  onOpenMobileMenu?: () => void;
}

export const FacebookMobileBottomBar: React.FC<FacebookMobileBottomBarProps> = ({
  activeSection,
  activeTab,
  isChatHistoryOpen = false,
  isMobileMenuOpen = false,
  unreadPrivateMessagesCount,
  unreadChatCount,
  onSelectHomeFeed,
  onSelectStoresDirectory,
  onSelectDirectory,
  onSelectMarketplace,
  onSelectMessages,
  onSelectPersonalProfile,
  onSelectProfile,
  onOpenMobileMenu,
}) => {
  const currentSec = activeSection || activeTab || 'directory';
  const badgeCount = unreadPrivateMessagesCount ?? unreadChatCount ?? 0;
  const [isBarVisible, setIsBarVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    lastScrollYRef.current = window.scrollY || 0;

    const handleScroll = () => {
      const currentY = window.scrollY || 0;
      const delta = currentY - lastScrollYRef.current;
      if (delta > 8 && currentY > 60) {
        setIsBarVisible(false);
      } else if (delta < -4 || currentY <= 40) {
        setIsBarVisible(true);
      }
      lastScrollYRef.current = currentY;
    };

    const handlePageClick = () => {
      setIsBarVisible(true);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handlePageClick, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handlePageClick);
    };
  }, []);

  const showBar = isBarVisible || isMobileMenuOpen || isChatHistoryOpen;

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className={`fixed bottom-0 inset-x-0 z-[95] bg-[#18191A]/98 backdrop-blur-xl border-t border-slate-700/80 shadow-[0_-6px_25px_rgba(0,0,0,0.65)] px-1 py-1 transition-all duration-300 ${
        showBar
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="grid grid-cols-6 lg:grid-cols-5 items-center max-w-md lg:max-w-3xl mx-auto">
        {/* 1. الصفحة الرئيسية */}
        <button
          type="button"
          onClick={onSelectHomeFeed}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition relative cursor-pointer ${
            currentSec === 'home_feed' && !isChatHistoryOpen && !isMobileMenuOpen
              ? 'text-[#1877F2]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentSec === 'home_feed' && !isChatHistoryOpen && !isMobileMenuOpen && (
            <span className="absolute top-0 inset-x-3 h-0.5 bg-[#1877F2] rounded-full" />
          )}
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9.5px] sm:text-[10px] lg:text-xs font-black mt-0.5 whitespace-nowrap leading-tight">
            الصفحة الرئيسية
          </span>
        </button>

        {/* 2. الدليل (دليل المحلات) */}
        <button
          type="button"
          onClick={() => {
            onSelectStoresDirectory?.();
            onSelectDirectory?.();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition relative cursor-pointer ${
            (currentSec === 'directory' || currentSec === 'stores_guide') &&
            !isChatHistoryOpen &&
            !isMobileMenuOpen
              ? 'text-[#1877F2]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {(currentSec === 'directory' || currentSec === 'stores_guide') &&
            !isChatHistoryOpen &&
            !isMobileMenuOpen && (
              <span className="absolute top-0 inset-x-3 h-0.5 bg-[#1877F2] rounded-full" />
            )}
          <Store className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9.5px] sm:text-[10px] lg:text-xs font-black mt-0.5 whitespace-nowrap leading-tight">
            الدليل
          </span>
        </button>

        {/* 3. Marketplace */}
        <button
          type="button"
          onClick={onSelectMarketplace}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition relative cursor-pointer ${
            currentSec === 'buy_sell' && !isChatHistoryOpen && !isMobileMenuOpen
              ? 'text-[#1877F2]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentSec === 'buy_sell' && !isChatHistoryOpen && !isMobileMenuOpen && (
            <span className="absolute top-0 inset-x-3 h-0.5 bg-[#1877F2] rounded-full" />
          )}
          <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9.5px] sm:text-[10px] lg:text-xs font-black mt-0.5 whitespace-nowrap leading-tight">
            Marketplace
          </span>
        </button>

        {/* 4. مراسلات */}
        <button
          type="button"
          onClick={onSelectMessages}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition relative cursor-pointer ${
            isChatHistoryOpen && !isMobileMenuOpen
              ? 'text-[#1877F2]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isChatHistoryOpen && !isMobileMenuOpen && (
            <span className="absolute top-0 inset-x-3 h-0.5 bg-[#1877F2] rounded-full" />
          )}
          <div className="relative">
            <MessageCircle className="w-5 h-5 stroke-[2.2]" />
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow">
                {badgeCount}
              </span>
            )}
          </div>
          <span className="text-[9.5px] sm:text-[10px] lg:text-xs font-black mt-0.5 whitespace-nowrap leading-tight">
            مراسلات
          </span>
        </button>

        {/* 5. ملف شخصي */}
        <button
          type="button"
          onClick={() => {
            onSelectPersonalProfile?.();
            onSelectProfile?.();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition relative cursor-pointer ${
            (currentSec === 'profile' || currentSec === 'personal_profile') &&
            !isChatHistoryOpen &&
            !isMobileMenuOpen
              ? 'text-[#1877F2]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {(currentSec === 'profile' || currentSec === 'personal_profile') &&
            !isChatHistoryOpen &&
            !isMobileMenuOpen && (
              <span className="absolute top-0 inset-x-3 h-0.5 bg-[#1877F2] rounded-full" />
            )}
          <UserCheck className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9.5px] sm:text-[10px] lg:text-xs font-black mt-0.5 whitespace-nowrap leading-tight">
            ملف شخصي
          </span>
        </button>

        {/* 6. القائمه (في نسخة الهاتف فقط بعد زر ملف شخصي لفتح القائمة الجانبية) */}
        <button
          type="button"
          onClick={() => onOpenMobileMenu?.()}
          className={`lg:hidden flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition relative cursor-pointer ${
            isMobileMenuOpen
              ? 'text-[#1877F2]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isMobileMenuOpen && (
            <span className="absolute top-0 inset-x-3 h-0.5 bg-[#1877F2] rounded-full" />
          )}
          <Menu className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[9.5px] sm:text-[10px] font-black mt-0.5 whitespace-nowrap leading-tight">
            القائمه
          </span>
        </button>
      </div>
    </nav>
  );
};

export const FacebookBottomNavBar = FacebookMobileBottomBar;

interface PersonalProfileHeaderSectionProps {
  currentUser: UserAccount | null;
  viewedUsername: string | null;
  allUsers: UserAccount[];
  userPosts: CommunityPostItem[];
  isAdmin: boolean;
  pendingSentRequestToTarget?: boolean;
  onUpdateUserAccount: (updatedUser: UserAccount) => void;
  onDeleteMultiplePosts: (postIds: string[]) => void;
  onUpdateMultiplePostsPrivacy?: (
    postIds: string[],
    privacy: PostPrivacyLevel
  ) => void;
  onSelectProfileUsername: (username: string) => void;
  onSendFriendRequest?: (targetUsername: string) => void;
  onCancelFriendRequest?: (targetUsername: string) => void;
  onUnfriendUser?: (targetUsername: string) => void;
  onToggleFollowUser?: (targetUsername: string) => void;
  onOpenRequestLogin: () => void;
}

const NOTE_EMOJIS = ['😊', '❤️', '🔥', '✨', '🌹', '👍', '🎉', '👑', '🤲', '💪', '😎', '🌟'];

export const PersonalProfileHeaderSection: React.FC<
  PersonalProfileHeaderSectionProps
> = ({
  currentUser,
  viewedUsername,
  allUsers,
  userPosts,
  isAdmin,
  pendingSentRequestToTarget = false,
  onUpdateUserAccount,
  onDeleteMultiplePosts,
  onUpdateMultiplePostsPrivacy,
  onSelectProfileUsername,
  onSendFriendRequest,
  onCancelFriendRequest,
  onUnfriendUser,
  onToggleFollowUser,
  onOpenRequestLogin,
}) => {
  const effectiveTargetUsername =
    viewedUsername || currentUser?.username || '';
  const targetUser =
    allUsers.find(
      (u) =>
        u.username.trim().toLowerCase() ===
        effectiveTargetUsername.trim().toLowerCase()
    ) ||
    (currentUser &&
    currentUser.username.trim().toLowerCase() ===
      effectiveTargetUsername.trim().toLowerCase()
      ? currentUser
      : null);

  const isOwnProfile = Boolean(
    currentUser &&
      targetUser &&
      (currentUser.id === targetUser.id ||
        currentUser.username.trim().toLowerCase() ===
          targetUser.username.trim().toLowerCase())
  );

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isDetailsEditorOpen, setIsDetailsEditorOpen] = useState(false);
  const [isFilterPostsModalOpen, setIsFilterPostsModalOpen] = useState(false);
  const [filterPostsMode, setFilterPostsMode] = useState<'all' | 'private'>('all');
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [isCustomListsModalOpen, setIsCustomListsModalOpen] = useState(false);
  const [isGearMenuOpen, setIsGearMenuOpen] = useState(false);
  const [isFriendDropdownOpen, setIsFriendDropdownOpen] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [selectedPostIdsForDelete, setSelectedPostIdsForDelete] = useState<
    string[]
  >([]);

  // Custom Text inside Avatar state (max 4 words)
  const [customAvatarTextDraft, setCustomAvatarTextDraft] = useState(
    targetUser?.profile?.customAvatarText || ''
  );
  const [customAvatarTextWarning, setCustomAvatarTextWarning] = useState<string | null>(
    null
  );

  // Profile Note state (max 100 chars)
  const [noteDraft, setNoteDraft] = useState(targetUser?.profile?.noteText || '');
  const [noteWarning, setNoteWarning] = useState<string | null>(null);

  // Personal details form state
  const targetProfile: UserPersonalProfile = targetUser?.profile || {};
  const [birthDate, setBirthDate] = useState(targetProfile.birthDate || '');
  const [birthDatePrivacy, setBirthDatePrivacy] =
    useState<ProfileFieldPrivacy>(targetProfile.birthDatePrivacy || 'public');
  const [qualification, setQualification] = useState(
    targetProfile.qualification || ''
  );
  const [qualificationPrivacy, setQualificationPrivacy] =
    useState<ProfileFieldPrivacy>(
      targetProfile.qualificationPrivacy || 'public'
    );
  const [maritalStatus, setMaritalStatus] = useState(
    targetProfile.maritalStatus || ''
  );
  const [maritalStatusPrivacy, setMaritalStatusPrivacy] =
    useState<ProfileFieldPrivacy>(
      targetProfile.maritalStatusPrivacy || 'public'
    );
  const [phoneValue, setPhoneValue] = useState(
    targetProfile.phone || targetUser?.phone || ''
  );
  const [phonePrivacy, setPhonePrivacy] = useState<ProfileFieldPrivacy>(
    targetProfile.phonePrivacy || 'private'
  );
  const [jobsPrivacy, setJobsPrivacy] = useState<ProfileFieldPrivacy>(
    targetProfile.jobsPrivacy || 'public'
  );
  const [jobsList, setJobsList] = useState(
    targetProfile.jobs && targetProfile.jobs.length > 0
      ? targetProfile.jobs
      : [{ id: 'job-1', title: '' }]
  );

  // Custom Friend List Editor State
  const [newListName, setNewListName] = useState('');
  const [newListMembers, setNewListMembers] = useState<string[]>([]);

  const gearRef = useRef<HTMLDivElement | null>(null);
  const friendMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const p = targetUser?.profile || {};
    setBirthDate(p.birthDate || '');
    setBirthDatePrivacy(p.birthDatePrivacy || 'public');
    setQualification(p.qualification || '');
    setQualificationPrivacy(p.qualificationPrivacy || 'public');
    setMaritalStatus(p.maritalStatus || '');
    setMaritalStatusPrivacy(p.maritalStatusPrivacy || 'public');
    setPhoneValue(p.phone || targetUser?.phone || '');
    setPhonePrivacy(p.phonePrivacy || 'private');
    setJobsPrivacy(p.jobsPrivacy || 'public');
    setJobsList(
      p.jobs && p.jobs.length > 0 ? p.jobs : [{ id: 'job-1', title: '' }]
    );
    setNoteDraft(p.noteText || '');
    setCustomAvatarTextDraft(p.customAvatarText || '');
  }, [targetUser]);

  if (!targetUser) {
    return (
      <div className="rounded-3xl bg-slate-900/95 border border-slate-700/80 p-6 text-center shadow-xl mb-4">
        <UserCheck className="w-12 h-12 text-sky-400 mx-auto mb-2" />
        <h3 className="text-base font-black text-white mb-1">
          الملف الشخصي غير متاح حالياً
        </h3>
        <p className="text-xs text-slate-300 mb-4">
          يرجى تسجيل الدخول لعرض صفحتك الشخصية وتخصيص صورتك الرمزية وبياناتك
        </p>
        <button
          type="button"
          onClick={onOpenRequestLogin}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black transition shadow-lg"
        >
          تسجيل الدخول / إنشاء حساب
        </button>
      </div>
    );
  }

  // Confirmed friends & followers calculation
  const targetFriendsList = Array.from(
    new Set([
      ...(targetProfile.friendUsernames || []),
      ...(targetProfile.followingUsernames || []),
    ])
  );
  const targetFollowingList = targetFriendsList;

  // Followers of targetUser: explicit followersUsernames + anyone who has targetUser in their followingUsernames or friendUsernames
  const followersUsers = allUsers.filter((u) => {
    if (
      u.username.trim().toLowerCase() ===
      targetUser.username.trim().toLowerCase()
    ) {
      return false;
    }
    const inTargetFollowers = (targetProfile.followersUsernames || []).some(
      (f) => f.trim().toLowerCase() === u.username.trim().toLowerCase()
    );
    const followsTarget = (u.profile?.followingUsernames || []).some(
      (f) => f.trim().toLowerCase() === targetUser.username.trim().toLowerCase()
    );
    const friendOfTarget = (u.profile?.friendUsernames || []).some(
      (f) => f.trim().toLowerCase() === targetUser.username.trim().toLowerCase()
    );
    return inTargetFollowers || followsTarget || friendOfTarget;
  });

  const currentUserFriends = Array.from(
    new Set([
      ...(currentUser?.profile?.friendUsernames || []),
      ...(currentUser?.profile?.followingUsernames || []),
    ])
  );

  const isFriendWithTarget = Boolean(
    currentUser &&
      (currentUserFriends.some(
        (f) =>
          f.trim().toLowerCase() === targetUser.username.trim().toLowerCase()
      ) ||
        targetFriendsList.some(
          (f) =>
            f.trim().toLowerCase() === currentUser.username.trim().toLowerCase()
        ))
  );

  const isFollowingTarget = Boolean(
    currentUser &&
      followersUsers.some(
        (u) =>
          u.username.trim().toLowerCase() ===
          currentUser.username.trim().toLowerCase()
      )
  );

  const isMutualFriend = isFriendWithTarget;

  // Check if profile is locked for non-friends
  const isLockedForViewer =
    Boolean(targetProfile.isProfileLocked) &&
    !isOwnProfile &&
    !isFriendWithTarget &&
    !isAdmin;

  // Visibility helper for Personal Details:
  // - public: visible to all users and friends immediately
  // - friends: visible to friends
  // - private: visible ONLY to profile owner (not even other admins unless own profile)
  const canViewField = (privacy?: ProfileFieldPrivacy): boolean => {
    if (isOwnProfile) return true;
    if (isLockedForViewer) return false;
    const p = privacy || 'public';
    if (p === 'public') return true;
    if (p === 'friends') return isMutualFriend;
    return false;
  };

  // Calculate Age from birthDate (Day / Month / Year)
  const computeAgeYears = (isoDate?: string): number | null => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    return age >= 0 && age <= 120 ? age : null;
  };

  const ageYears = computeAgeYears(targetProfile.birthDate);

  const handleSaveAvatar = (avatarId: string) => {
    if (!isOwnProfile) return;
    const chosen = GAME_AVATARS.find((a) => a.id === avatarId);
    onUpdateUserAccount({
      ...targetUser,
      avatarId,
      gender: chosen?.gender || targetUser.gender,
      updatedAt: Date.now(),
    });
    setIsAvatarPickerOpen(false);
  };

  const handleCustomAvatarTextChange = (rawVal: string) => {
    const words = rawVal.trim().split(/\s+/).filter(Boolean);
    if (words.length > 4) {
      setCustomAvatarTextWarning(
        '⚠️ لا يمكن كتابة أكثر من 4 كلمات داخل الصورة الشخصية'
      );
      return;
    }
    setCustomAvatarTextWarning(null);
    setCustomAvatarTextDraft(rawVal);
  };

  const handleSaveCustomTextAvatar = () => {
    if (!isOwnProfile) return;
    const cleanText = customAvatarTextDraft
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .join(' ');
    if (!cleanText) return;
    onUpdateUserAccount({
      ...targetUser,
      avatarId: 'avatar_custom_text',
      profile: {
        ...(targetUser.profile || {}),
        customAvatarText: cleanText,
      },
      updatedAt: Date.now(),
    });
    setIsAvatarPickerOpen(false);
  };

  const handleNoteInputChange = (val: string) => {
    if (val.length > 100) {
      setNoteWarning(
        '⚠️ عفواً، وصلت للحد الأقصى المسموح به في الملاحظة (100 حرف فقط)'
      );
      setNoteDraft(val.slice(0, 100));
      return;
    }
    setNoteWarning(null);
    setNoteDraft(val);
  };

  const handleSaveNote = () => {
    if (!isOwnProfile) return;
    onUpdateUserAccount({
      ...targetUser,
      profile: {
        ...(targetUser.profile || {}),
        noteText: noteDraft.trim().slice(0, 100),
      },
      updatedAt: Date.now(),
    });
    setIsNoteEditorOpen(false);
    setNoteWarning(null);
  };

  const handleToggleProfileLock = () => {
    if (!isOwnProfile) return;
    onUpdateUserAccount({
      ...targetUser,
      profile: {
        ...(targetUser.profile || {}),
        isProfileLocked: !targetProfile.isProfileLocked,
      },
      updatedAt: Date.now(),
    });
  };

  const handleToggleDisableFriendRequests = () => {
    if (!isOwnProfile) return;
    onUpdateUserAccount({
      ...targetUser,
      profile: {
        ...(targetUser.profile || {}),
        disableFriendRequests: !targetProfile.disableFriendRequests,
      },
      updatedAt: Date.now(),
    });
  };

  const isStrictAdmin = Boolean(isAdmin && currentUser?.role === 'admin');

  const handleAdminToggleVerified = () => {
    if (!isStrictAdmin) return;
    onUpdateUserAccount({
      ...targetUser,
      isVerified: !targetUser.isVerified,
      updatedAt: Date.now(),
    });
  };

  const handleSavePersonalDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile) return;
    const cleanedJobs = jobsList
      .map((j) => ({ ...j, title: j.title.trim() }))
      .filter((j) => j.title.length > 0);
    const nextProfile: UserPersonalProfile = {
      ...(targetUser.profile || {}),
      birthDate: birthDate.trim() || undefined,
      birthDatePrivacy,
      qualification: qualification.trim() || undefined,
      qualificationPrivacy,
      maritalStatus: maritalStatus.trim() || undefined,
      maritalStatusPrivacy,
      phone: phoneValue.trim() || undefined,
      phonePrivacy,
      jobs: cleanedJobs,
      jobsPrivacy,
      noteText: noteDraft.trim().slice(0, 100),
    };
    onUpdateUserAccount({
      ...targetUser,
      phone: phoneValue.trim() || targetUser.phone,
      profile: nextProfile,
      updatedAt: Date.now(),
    });
    setIsDetailsEditorOpen(false);
  };

  const handleCreateCustomFriendList = () => {
    if (!isOwnProfile || !newListName.trim()) return;
    const existingLists = targetProfile.customFriendLists || [];
    const newList: CustomFriendList = {
      id: `flist-${Date.now()}`,
      title: newListName.trim(),
      memberUsernames: newListMembers,
      name: newListName.trim(),
      usernames: newListMembers,
    };
    onUpdateUserAccount({
      ...targetUser,
      profile: {
        ...targetProfile,
        customFriendLists: [...existingLists, newList],
      },
      updatedAt: Date.now(),
    });
    setNewListName('');
    setNewListMembers([]);
  };

  const handleDeleteCustomFriendList = (listId: string) => {
    if (!isOwnProfile) return;
    const existingLists = targetProfile.customFriendLists || [];
    onUpdateUserAccount({
      ...targetUser,
      profile: {
        ...targetProfile,
        customFriendLists: existingLists.filter((l) => l.id !== listId),
      },
      updatedAt: Date.now(),
    });
  };

  const privacyBadgeLabel = (p?: ProfileFieldPrivacy) => {
    if (p === 'private') return '🔒 خاص';
    if (p === 'friends') return '👥 أصدقاء';
    return '🌐 عام';
  };

  const visibleJobs = (targetProfile.jobs || []).filter(
    (j) => j.title && j.title.trim()
  );
  const effectivePhone = (targetProfile.phone || targetUser.phone || '').trim();

  // Filter posts strictly belonging to this Personal Profile
  const profileOnlyPosts = userPosts.filter(
    (p) =>
      p.postSource === 'profile' ||
      (p.isProfileOrHomePost &&
        p.postSource !== 'home_feed' &&
        p.postSource !== 'community' &&
        p.postSource !== 'buy_sell' &&
        p.postSource !== 'utilities')
  );

  const displayedFilterModalPosts =
    filterPostsMode === 'private'
      ? profileOnlyPosts.filter((p) => p.privacy === 'private')
      : profileOnlyPosts;

  return (
    <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 shadow-2xl overflow-visible relative z-30 mb-4">
      {/* Cover Banner */}
      <div className="h-20 sm:h-28 rounded-t-3xl overflow-hidden bg-gradient-to-r from-[#1877F2] via-indigo-600 to-purple-700 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_60%)]" />
        {/* Admin Blue Badge Grant/Revoke Button on top-left of banner (Strictly Admin Only) */}
        {isStrictAdmin && (
          <button
            type="button"
            onClick={handleAdminToggleVerified}
            className={`absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-lg border transition cursor-pointer ${
              targetUser.isVerified
                ? 'bg-sky-500 text-white border-white/40 hover:bg-rose-600'
                : 'bg-slate-900/90 text-sky-300 border-sky-500/40 hover:bg-sky-600 hover:text-white'
            }`}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>
              {targetUser.isVerified
                ? 'إلغاء العلامة الزرقاء'
                : 'منح العلامة الزرقاء'}
            </span>
          </button>
        )}

        {viewedUsername &&
          currentUser &&
          viewedUsername.trim().toLowerCase() !==
            currentUser.username.trim().toLowerCase() && (
            <button
              type="button"
              onClick={() => onSelectProfileUsername(currentUser.username)}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-white text-[10px] font-black border border-white/15 backdrop-blur-md transition flex items-center gap-1"
            >
              <span>العودة لملفي الشخصي</span>
            </button>
          )}
      </div>

      {/* Main Profile Info Container */}
      <div className="px-3 sm:px-6 pb-4 -mt-10 sm:-mt-12 relative">
        {/* Avatar + Name + Compact Personal Details on the Right */}
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-end justify-between w-full gap-2">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <img
                src={getUserAvatarDataUri(targetUser)}
                alt={targetUser.username}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-slate-900 shadow-2xl bg-slate-800 object-cover"
              />
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                  title="تغيير الشخصية الكرتونية"
                  className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-[9px] font-black shadow-lg border border-slate-900 flex items-center gap-0.5 transition"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>تغيير</span>
                </button>
              )}
            </div>

            {/* Account Name & Role */}
            <div className="flex-1 min-w-0 pt-10 sm:pt-12">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white truncate">
                  {targetUser.username}
                </h2>
                {targetUser.isVerified && <VerifiedBlueBadge size={18} />}
                {targetUser.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black">
                    الإدارة
                  </span>
                )}
                {targetProfile.isProfileLocked && (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-black flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>مقفل</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compact Personal Details on the Right Inside the Same Card Below Avatar & Name */}
          {!isLockedForViewer && (
            <div className="w-full text-right pr-1 space-y-0.5">
              {ageYears !== null &&
                canViewField(targetProfile.birthDatePrivacy) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-bold leading-tight">
                    <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
                    <span>العمر: {ageYears} سنة</span>
                    {isOwnProfile && (
                      <span className="text-[9px] text-slate-400">
                        ({privacyBadgeLabel(targetProfile.birthDatePrivacy)})
                      </span>
                    )}
                  </div>
                )}

              {visibleJobs.length > 0 &&
                canViewField(targetProfile.jobsPrivacy) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-bold leading-tight">
                    <Briefcase className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      الوظيفة: {visibleJobs.map((j) => j.title).join(' ، ')}
                    </span>
                    {isOwnProfile && (
                      <span className="text-[9px] text-slate-400 shrink-0">
                        ({privacyBadgeLabel(targetProfile.jobsPrivacy)})
                      </span>
                    )}
                  </div>
                )}

              {targetProfile.qualification &&
                canViewField(targetProfile.qualificationPrivacy) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-bold leading-tight">
                    <GraduationCap className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">
                      المؤهل: {targetProfile.qualification}
                    </span>
                    {isOwnProfile && (
                      <span className="text-[9px] text-slate-400 shrink-0">
                        ({privacyBadgeLabel(targetProfile.qualificationPrivacy)})
                      </span>
                    )}
                  </div>
                )}

              {targetProfile.maritalStatus &&
                canViewField(targetProfile.maritalStatusPrivacy) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-bold leading-tight">
                    <Heart className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>الحالة الاجتماعية: {targetProfile.maritalStatus}</span>
                    {isOwnProfile && (
                      <span className="text-[9px] text-slate-400">
                        ({privacyBadgeLabel(targetProfile.maritalStatusPrivacy)})
                      </span>
                    )}
                  </div>
                )}

              {effectivePhone && canViewField(targetProfile.phonePrivacy) && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-200 font-bold leading-tight">
                  <Phone className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span dir="ltr">{effectivePhone}</span>
                  {isOwnProfile && (
                    <span className="text-[9px] text-slate-400">
                      ({privacyBadgeLabel(targetProfile.phonePrivacy)})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Locked Profile Notice for Non-Friends */}
          {isLockedForViewer && (
            <div className="w-full rounded-xl bg-slate-950/90 border border-rose-500/30 p-2.5 text-center my-1">
              <p className="text-[11px] font-black text-rose-300 flex items-center justify-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  قام {targetUser.username} بقفل صفحته الشخصية (تظهر المنشورات والبيانات للأصدقاء فقط)
                </span>
              </p>
            </div>
          )}

          {/* Single Row: (إضافة صديق / صديق + متابعة) + المتابعين + أتابعه — ALL IN ONE ROW without clipping */}
          <div className="w-full flex items-center gap-1 sm:gap-2 flex-nowrap mt-1">
            {/* Slot 1: Friend / Follow Buttons (Hidden for profile owner: لا يظهر لصاحب الحساب) */}
            {!isOwnProfile && (
              <div
                ref={friendMenuRef}
                className="relative flex items-center gap-1 shrink-0 z-40"
              >
                {isFriendWithTarget ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFriendDropdownOpen((prev) => !prev);
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/50 text-emerald-300 flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>صديق</span>
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                    {isFriendDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[210]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFriendDropdownOpen(false);
                          }}
                        />
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 z-[220] w-40 rounded-xl bg-slate-900 border border-slate-600 shadow-2xl p-1.5 animate-fadeIn"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsFriendDropdownOpen(false);
                              if (onUnfriendUser) {
                                onUnfriendUser(targetUser.username);
                              }
                            }}
                            className="w-full px-2.5 py-2 rounded-lg text-right text-xs font-black text-rose-400 hover:bg-rose-500/15 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <UserMinus className="w-4 h-4 shrink-0" />
                            <span>إلغاء الصداقة</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!targetProfile.disableFriendRequests ? (
                      pendingSentRequestToTarget ? (
                        <button
                          type="button"
                          onClick={() =>
                            onCancelFriendRequest &&
                            onCancelFriendRequest(targetUser.username)
                          }
                          className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1 whitespace-nowrap transition"
                        >
                          <Check className="w-3 h-3 shrink-0" />
                          <span>تم الطلب</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              onOpenRequestLogin();
                              return;
                            }
                            if (onSendFriendRequest) {
                              onSendFriendRequest(targetUser.username);
                            }
                          }}
                          className="px-2 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black bg-[#1877F2] hover:bg-blue-600 text-white shadow flex items-center gap-1 whitespace-nowrap transition"
                        >
                          <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          <span>إضافة صديق</span>
                        </button>
                      )
                    ) : (
                      <span className="px-2 py-1.5 rounded-xl text-[9px] font-black bg-slate-800 border border-slate-700 text-slate-400 whitespace-nowrap">
                        الطلبات مقفلة
                      </span>
                    )}

                    {/* Follow Button next to Add Friend so Followers count also increases */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          onOpenRequestLogin();
                          return;
                        }
                        if (onToggleFollowUser) {
                          onToggleFollowUser(targetUser.username);
                        }
                      }}
                      className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black border flex items-center gap-0.5 whitespace-nowrap transition ${
                        isFollowingTarget
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white'
                      }`}
                    >
                      <span>{isFollowingTarget ? 'متابَع ✓' : 'متابعة'}</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Slot 2: المتابعين */}
            <button
              type="button"
              onClick={() =>
                !isLockedForViewer && setIsFollowersModalOpen(true)
              }
              className="flex-1 min-w-0 px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-[10px] sm:text-xs font-black text-white flex items-center justify-center gap-1 whitespace-nowrap transition"
            >
              <span className="text-slate-300">المتابعين</span>
              <span className="text-sky-400">({followersUsers.length})</span>
            </button>

            {/* Slot 3: أتابعه */}
            <button
              type="button"
              onClick={() =>
                !isLockedForViewer && setIsFollowingModalOpen(true)
              }
              className="flex-1 min-w-0 px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-[10px] sm:text-xs font-black text-white flex items-center justify-center gap-1 whitespace-nowrap transition"
            >
              <span className="text-slate-300">أتابعه</span>
              <span className="text-emerald-400">
                ({targetFollowingList.length})
              </span>
            </button>
          </div>

          {/* Note Display & Inline Editor ("خانة ملاحظة بحد أقصى 100 حرف وإيموشن أسفل الأزرار في سطر واحد أو سطرين في الهاتف") */}
          {!isLockedForViewer &&
            (targetProfile.noteText || isOwnProfile) && (
              <div className="w-full mt-1">
                {targetProfile.noteText && !isNoteEditorOpen && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/80">
                    <p className="text-[11px] sm:text-xs font-bold text-amber-200 line-clamp-2 leading-snug break-words flex-1">
                      💬 {targetProfile.noteText}
                    </p>
                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => setIsNoteEditorOpen(true)}
                        className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-black text-sky-300 shrink-0"
                      >
                        تعديل الملاحظة
                      </button>
                    )}
                  </div>
                )}

                {isOwnProfile && !targetProfile.noteText && !isNoteEditorOpen && (
                  <button
                    type="button"
                    onClick={() => setIsNoteEditorOpen(true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-dashed border-slate-700 text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition"
                  >
                    <Smile className="w-3.5 h-3.5 text-amber-400" />
                    <span>+ أضف ملاحظة قصيرة (حتى 100 حرف مع إيموشن)</span>
                  </button>
                )}

                {isOwnProfile && isNoteEditorOpen && (
                  <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-sky-500/40 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-sky-300">
                        ملاحظة الحالة (تظهر أسفل الأزرار - بحد أقصى 100 حرف)
                      </span>
                      <span
                        className={`text-[10px] font-black ${
                          noteDraft.length >= 100
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {noteDraft.length} / 100
                      </span>
                    </div>
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => handleNoteInputChange(e.target.value)}
                      placeholder="اكتب ملاحظة قصيرة أو حالة..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    {noteWarning && (
                      <p className="text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1">
                        {noteWarning}
                      </p>
                    )}
                    <div className="flex items-center gap-1 flex-wrap">
                      {NOTE_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleNoteInputChange(noteDraft + em)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      {targetProfile.noteText && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteDraft('');
                            onUpdateUserAccount({
                              ...targetUser,
                              profile: {
                                ...(targetUser.profile || {}),
                                noteText: '',
                              },
                              updatedAt: Date.now(),
                            });
                            setIsNoteEditorOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-300 text-[10px] font-black"
                        >
                          حذف
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsNoteEditorOpen(false);
                          setNoteWarning(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-black"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black"
                      >
                        حفظ الملاحظة
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Owner Controls Row Below: تفاصيل شخصية + قوائم الأصدقاء + الترس ⚙️ + فلترة المنشورات (تم إخفاء زر تغيير الشخصية الكبير والاكتفاء بزر تغيير أسفل الصورة) */}
          {isOwnProfile && (
            <div className="w-full flex items-center gap-1.5 flex-wrap mt-1 relative z-40">
              <button
                type="button"
                onClick={() => setIsDetailsEditorOpen((prev) => !prev)}
                className="flex-1 min-w-[95px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-black border border-slate-700 flex items-center justify-center gap-1 whitespace-nowrap transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>تفاصيل شخصية</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCustomListsModalOpen(true)}
                className="flex-1 min-w-[95px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-black border border-slate-700 flex items-center justify-center gap-1 whitespace-nowrap transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>قوائم الأصدقاء</span>
              </button>

              {/* Gear Settings Button (الترس ⚙️ في الصفحة الشخصية) */}
              <div ref={gearRef} className="relative z-50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGearMenuOpen((prev) => !prev);
                  }}
                  title="إعدادات الملف الشخصي والخصوصية"
                  className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                    isGearMenuOpen ||
                    targetProfile.isProfileLocked ||
                    targetProfile.disableFriendRequests
                      ? 'bg-sky-600/25 border-sky-500/60 text-sky-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </button>

                {isGearMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[210]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsGearMenuOpen(false);
                      }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1.5 z-[220] w-64 max-w-[88vw] rounded-2xl bg-slate-900 border border-slate-600 shadow-2xl p-3 space-y-2 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-sky-400" />
                          <span>إعدادات الملف الشخصي</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsGearMenuOpen(false)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Options inside Gear Menu: تفاصيل شخصية & قوائم الأصدقاء */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsGearMenuOpen(false);
                          setIsDetailsEditorOpen((prev) => !prev);
                        }}
                        className="w-full p-2 rounded-xl border bg-slate-800/80 border-slate-700 text-slate-100 hover:bg-slate-800 text-right transition flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="text-[11px] font-black flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>تفاصيل شخصية</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[9px] font-black">
                          فتح
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsGearMenuOpen(false);
                          setIsCustomListsModalOpen(true);
                        }}
                        className="w-full p-2 rounded-xl border bg-slate-800/80 border-slate-700 text-slate-100 hover:bg-slate-800 text-right transition flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="text-[11px] font-black flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>قوائم الأصدقاء</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                          إدارة
                        </span>
                      </button>

                      {/* Option 1: Lock Personal Profile */}
                      <button
                        type="button"
                        onClick={handleToggleProfileLock}
                        className={`w-full p-2 rounded-xl border text-right transition flex items-center justify-between gap-2 cursor-pointer ${
                          targetProfile.isProfileLocked
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black flex items-center gap-1">
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>قفل الصفحة الشخصية</span>
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            لا يظهر لغير الأصدقاء إلا اسمك وزر أضف صديق فقط
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black shrink-0 ${
                            targetProfile.isProfileLocked
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {targetProfile.isProfileLocked ? 'مفعّل' : 'مغلق'}
                        </span>
                      </button>

                      {/* Option 2: Lock Friend Requests */}
                      <button
                        type="button"
                        onClick={handleToggleDisableFriendRequests}
                        className={`w-full p-2 rounded-xl border text-right transition flex items-center justify-between gap-2 cursor-pointer ${
                          targetProfile.disableFriendRequests
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black flex items-center gap-1">
                            <Ban className="w-3 h-3 shrink-0" />
                            <span>قفل عدم إرسال طلبات صداقة</span>
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            منع الحسابات الأخرى من إرسال طلبات صداقة لك
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black shrink-0 ${
                            targetProfile.disableFriendRequests
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {targetProfile.disableFriendRequests
                            ? 'مفعّل'
                            : 'مغلق'}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPostIdsForDelete([]);
                  setIsFilterPostsModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-[11px] font-black border border-amber-500/40 flex items-center gap-1 whitespace-nowrap transition"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>فلترة المنشورات</span>
              </button>
            </div>
          )}
        </div>

        {/* Cartoon Avatar Selector Drawer (Includes Disney Princesses, Stitch, Cat, Minion, No Image, and Custom Text Avatar up to 4 words) */}
        {isOwnProfile && isAvatarPickerOpen && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-950/95 border border-sky-500/40 shadow-2xl animate-fadeIn space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  اختر شخصيتك (أميرات ديزني، ستيتش، قطة، مينيونز، أو نص داخل الصورة)
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Text Inside Avatar Option (Up to 4 words: 1-2 words on 1 line, 3-4 words on 2 lines) */}
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
              <label className="block text-[11px] font-black text-sky-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>
                  كتابة نص يظهر داخل الصورة الشخصية (بحد أقصى 4 كلمات: كلمتان في سطر واحد، و4 كلمات في سطرين)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <img
                  src={buildCustomTextAvatarSvg(
                    customAvatarTextDraft || targetUser.username
                  )}
                  alt="معاينة النص"
                  className="w-12 h-12 rounded-full border-2 border-sky-400 shrink-0"
                />
                <input
                  type="text"
                  value={customAvatarTextDraft}
                  onChange={(e) => handleCustomAvatarTextChange(e.target.value)}
                  placeholder="اكتب حتى 4 كلمات..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomTextAvatar}
                  className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black whitespace-nowrap"
                >
                  اعتماد النص
                </button>
              </div>
              {customAvatarTextWarning && (
                <p className="text-[10px] font-black text-rose-400">
                  {customAvatarTextWarning}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {GAME_AVATARS.map((av) => {
                const isSelected = targetUser.avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => handleSaveAvatar(av.id)}
                    className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-sky-600/25 border-sky-400 shadow-lg scale-[1.03]'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={av.svgDataUri}
                      alt={av.label}
                      className="w-14 h-14 rounded-full shadow-md"
                    />
                    <span className="text-[10px] font-black text-white text-center leading-tight">
                      {av.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Personal Details Editor Form */}
        {isOwnProfile && isDetailsEditorOpen && (
          <form
            onSubmit={handleSavePersonalDetails}
            className="mt-4 p-4 rounded-2xl bg-slate-950/95 border border-sky-500/40 shadow-2xl space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>تعديل التفاصيل الشخصية والخصوصية</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsDetailsEditorOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Phone Number + Privacy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-cyan-400" />
                <span>رقم الهاتف:</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder="01000000000"
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <select
                value={phonePrivacy}
                onChange={(e) =>
                  setPhonePrivacy(e.target.value as ProfileFieldPrivacy)
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-sky-300"
              >
                <option value="public">🌐 عام (للجميع)</option>
                <option value="friends">👥 أصدقاء فقط</option>
                <option value="private">🔒 خاص (لي فقط)</option>
              </select>
            </div>

            {/* Birth Date + Privacy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>تاريخ الميلاد (يحسب العمر تلقائياً):</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <select
                value={birthDatePrivacy}
                onChange={(e) =>
                  setBirthDatePrivacy(e.target.value as ProfileFieldPrivacy)
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-sky-300"
              >
                <option value="public">🌐 عام (للجميع)</option>
                <option value="friends">👥 أصدقاء فقط</option>
                <option value="private">🔒 خاص (لي فقط)</option>
              </select>
            </div>

            {/* Qualification + Privacy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>المؤهل الدراسي:</span>
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="مثال: بكالوريوس هندسة / تجارة..."
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <select
                value={qualificationPrivacy}
                onChange={(e) =>
                  setQualificationPrivacy(
                    e.target.value as ProfileFieldPrivacy
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-sky-300"
              >
                <option value="public">🌐 عام (للجميع)</option>
                <option value="friends">👥 أصدقاء فقط</option>
                <option value="private">🔒 خاص (لي فقط)</option>
              </select>
            </div>

            {/* Marital Status + Privacy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>الحالة الاجتماعية:</span>
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="">-- اختر الحالة الاجتماعية --</option>
                <option value="أعزب / عزباء">أعزب / عزباء</option>
                <option value="مرتبط / مرتبطة">مرتبط / مرتبطة</option>
                <option value="خاطب / مخطوبة">خاطب / مخطوبة</option>
                <option value="متزوج / متزوجة">متزوج / متزوجة</option>
              </select>
              <select
                value={maritalStatusPrivacy}
                onChange={(e) =>
                  setMaritalStatusPrivacy(
                    e.target.value as ProfileFieldPrivacy
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-sky-300"
              >
                <option value="public">🌐 عام (للجميع)</option>
                <option value="friends">👥 أصدقاء فقط</option>
                <option value="private">🔒 خاص (لي فقط)</option>
              </select>
            </div>

            {/* Jobs List + Privacy */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>الوظيفة / جهات العمل:</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={jobsPrivacy}
                    onChange={(e) =>
                      setJobsPrivacy(e.target.value as ProfileFieldPrivacy)
                    }
                    className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-sky-300"
                  >
                    <option value="public">🌐 عام (للجميع)</option>
                    <option value="friends">👥 أصدقاء فقط</option>
                    <option value="private">🔒 خاص (لي فقط)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setJobsList((prev) => [
                        ...prev,
                        { id: `job-${Date.now()}`, title: '' },
                      ])
                    }
                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة وظيفة أخرى</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {jobsList.map((job, idx) => (
                  <div key={job.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={job.title}
                      onChange={(e) =>
                        setJobsList((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, title: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder={`الوظيفة ${idx + 1} (مثال: محاسب، مهندس، تاجر...)`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                    {jobsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setJobsList((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-1.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDetailsEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التفاصيل الشخصية</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal: Followers (المتابعين) */}
      {isFollowersModalOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFollowersModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-4 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>المتابعين ({followersUsers.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFollowersModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-800/80 my-2">
              {followersUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  لا يوجد متابعين حالياً
                </p>
              ) : (
                followersUsers.map((u) => (
                  <div
                    key={u.id}
                    className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-slate-800/50 rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsFollowersModalOpen(false);
                        onSelectProfileUsername(u.username);
                      }}
                      className="flex items-center gap-2.5 text-right flex-1 min-w-0"
                    >
                      <img
                        src={getUserAvatarDataUri(u)}
                        alt={u.username}
                        className="w-9 h-9 rounded-full border border-slate-700 shrink-0"
                      />
                      <span className="text-xs font-black text-white truncate">
                        {u.username}
                      </span>
                      {u.isVerified && <VerifiedBlueBadge size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFollowersModalOpen(false);
                        onSelectProfileUsername(u.username);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-black shrink-0"
                    >
                      عرض الملف
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Following (أتابعه) with ability to visit profile AND unfriend right inside the modal */}
      {isFollowingModalOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFollowingModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-4 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>أتابعه ({targetFollowingList.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFollowingModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-800/80 my-2">
              {targetFollowingList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  لا يتابع أي حساب حالياً
                </p>
              ) : (
                targetFollowingList.map((uname) => {
                  const uObj = allUsers.find(
                    (x) =>
                      x.username.trim().toLowerCase() ===
                      uname.trim().toLowerCase()
                  );
                  return (
                    <div
                      key={uname}
                      className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-slate-800/50 rounded-xl"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsFollowingModalOpen(false);
                          onSelectProfileUsername(uname);
                        }}
                        className="flex items-center gap-2.5 text-right flex-1 min-w-0"
                      >
                        <img
                          src={getUserAvatarDataUri(uObj, uname)}
                          alt={uname}
                          className="w-9 h-9 rounded-full border border-slate-700 shrink-0"
                        />
                        <span className="text-xs font-black text-white truncate">
                          {uname}
                        </span>
                        {uObj?.isVerified && <VerifiedBlueBadge size={14} />}
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFollowingModalOpen(false);
                            onSelectProfileUsername(uname);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-[10px] font-black"
                        >
                          دخول للصفحة
                        </button>
                        {isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUnfriendUser) {
                                onUnfriendUser(uname);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-black flex items-center gap-1 transition"
                          >
                            <UserMinus className="w-3 h-3" />
                            <span>إلغاء الصداقة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Custom Friend Lists (قوائم الأصدقاء المخصصة) */}
      {isCustomListsModalOpen && isOwnProfile && (
        <div
          className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsCustomListsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-4 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>قوائم الأصدقاء المخصصة (لنشر المنشورات المحددة)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomListsModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 my-3 pr-1">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-black text-sky-400">
                  إنشاء قائمة أصدقاء جديدة
                </h4>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="اسم القائمة (مثال: أصدقاء العمل، العائلة...)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <p className="text-[11px] font-bold text-slate-300">
                  اختر الأصدقاء داخل هذه القائمة:
                </p>
                <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-1.5 p-1">
                  {targetFollowingList.length === 0 ? (
                    <p className="col-span-2 text-[11px] text-slate-400 py-2">
                      أضف أصدقاء أولاً لتتمكن من إضافتهم في قائمة مخصصة
                    </p>
                  ) : (
                    targetFollowingList.map((uname) => {
                      const checked = newListMembers.includes(uname);
                      return (
                        <label
                          key={uname}
                          className={`flex items-center gap-2 p-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                            checked
                              ? 'bg-sky-600/20 border-sky-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setNewListMembers((prev) =>
                                checked
                                  ? prev.filter((x) => x !== uname)
                                  : [...prev, uname]
                              )
                            }
                          />
                          <span className="truncate">{uname}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCreateCustomFriendList}
                  disabled={!newListName.trim() || newListMembers.length === 0}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black transition"
                >
                  حفظ القائمة المخصصة
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-white">
                  القوائم المحفوظة (
                  {(targetProfile.customFriendLists || []).length})
                </h4>
                {(targetProfile.customFriendLists || []).map((list) => (
                  <div
                    key={list.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-black text-emerald-400">
                        {list.title || list.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        الأعضاء (
                        {(list.memberUsernames || list.usernames || []).length}
                        ):{' '}
                        {(list.memberUsernames || list.usernames || []).join(
                          ' ، '
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomFriendList(list.id)}
                      className="p-1.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Filter & Bulk Manage Personal Profile Posts (فلترة منشورات الصفحة الشخصية فقط + تحويل الخاص إلى عام + الحذف) */}
      {isFilterPostsModalOpen && isOwnProfile && (
        <div
          className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsFilterPostsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-4 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>
                  فلترة وإدارة منشورات الملف الشخصي ({profileOnlyPosts.length})
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterPostsModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Mode Tabs: All Profile Posts vs Private Posts Only */}
            <div className="flex items-center gap-1.5 pt-2.5">
              <button
                type="button"
                onClick={() => {
                  setFilterPostsMode('all');
                  setSelectedPostIdsForDelete([]);
                }}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-black border transition ${
                  filterPostsMode === 'all'
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                جميع منشوراتي الشخصية ({profileOnlyPosts.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterPostsMode('private');
                  setSelectedPostIdsForDelete([]);
                }}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-black border transition ${
                  filterPostsMode === 'private'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                🔒 المنشورات الخاصة فقط (
                {profileOnlyPosts.filter((p) => p.privacy === 'private').length})
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (
                    selectedPostIdsForDelete.length ===
                    displayedFilterModalPosts.length
                  ) {
                    setSelectedPostIdsForDelete([]);
                  } else {
                    setSelectedPostIdsForDelete(
                      displayedFilterModalPosts.map((p) => p.id)
                    );
                  }
                }}
                className="text-sky-400 font-black hover:underline"
              >
                {selectedPostIdsForDelete.length ===
                  displayedFilterModalPosts.length &&
                displayedFilterModalPosts.length > 0
                  ? 'إلغاء تحديد الكل'
                  : 'تحديد الكل'}
              </button>

              <div className="flex items-center gap-1.5">
                {onUpdateMultiplePostsPrivacy && (
                  <button
                    type="button"
                    disabled={selectedPostIdsForDelete.length === 0}
                    onClick={() => {
                      onUpdateMultiplePostsPrivacy(
                        selectedPostIdsForDelete,
                        'public'
                      );
                      setSelectedPostIdsForDelete([]);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>
                      تحويل المحدد لعام ({selectedPostIdsForDelete.length})
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={selectedPostIdsForDelete.length === 0}
                  onClick={() => {
                    onDeleteMultiplePosts(selectedPostIdsForDelete);
                    setSelectedPostIdsForDelete([]);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد ({selectedPostIdsForDelete.length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-800 my-2">
              {displayedFilterModalPosts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  {filterPostsMode === 'private'
                    ? 'لا توجد منشورات خاصة حالياً'
                    : 'لا توجد منشورات في صفحتك الشخصية حالياً'}
                </p>
              ) : (
                displayedFilterModalPosts.map((post) => {
                  const isChecked = selectedPostIdsForDelete.includes(post.id);
                  return (
                    <div
                      key={post.id}
                      className="flex items-start gap-2.5 p-2.5 hover:bg-slate-800/50 rounded-xl"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSelectedPostIdsForDelete((prev) =>
                            isChecked
                              ? prev.filter((id) => id !== post.id)
                              : [...prev, post.id]
                          )
                        }
                        className="mt-1 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[10px] font-black text-sky-400">
                            {post.privacy === 'private'
                              ? '🔒 منشور خاص'
                              : post.privacy === 'friends'
                              ? '👥 الأصدقاء'
                              : post.privacy === 'custom'
                              ? '✨ مخصص'
                              : '🌐 منشور عام'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {post.privacy === 'private' &&
                              onUpdateMultiplePostsPrivacy && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateMultiplePostsPrivacy(
                                      [post.id],
                                      'public'
                                    )
                                  }
                                  className="px-2 py-0.5 rounded-md bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[9px] font-black transition"
                                >
                                  تحويل لعام 🌐
                                </button>
                              )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(post.createdAt).toLocaleDateString(
                                'ar-EG'
                              )}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

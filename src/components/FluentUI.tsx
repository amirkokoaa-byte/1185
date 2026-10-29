import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Global hook that attaches pointer & touch listeners to update CSS variables
 * (--reveal-x, --reveal-y, --reveal-opacity) on any `.fluent-reveal` element.
 */
export function useGlobalFluentReveal() {
  useEffect(() => {
    const updateRevealPosition = (clientX: number, clientY: number) => {
      const elements = document.querySelectorAll<HTMLElement>('.fluent-reveal');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Only calculate for elements near the pointer/finger to keep 60fps performance
        if (
          clientX >= rect.left - 120 &&
          clientX <= rect.right + 120 &&
          clientY >= rect.top - 120 &&
          clientY <= rect.bottom + 120
        ) {
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          el.style.setProperty('--reveal-x', `${x}px`);
          el.style.setProperty('--reveal-y', `${y}px`);
          el.style.setProperty('--reveal-opacity', '1');
        } else {
          el.style.setProperty('--reveal-opacity', '0');
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateRevealPosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        updateRevealPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        updateRevealPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleClearReveal = () => {
      const elements = document.querySelectorAll<HTMLElement>('.fluent-reveal');
      elements.forEach((el) => {
        el.style.setProperty('--reveal-opacity', '0');
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleClearReveal, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleClearReveal);
    };
  }, []);
}

interface FluentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const FluentCard: React.FC<FluentCardProps> = ({
  children,
  className = '',
  noPadding = false,
  ...props
}) => {
  return (
    <div
      className={`fluent-reveal rounded-xl bg-[#112240]/90 border border-[#334155]/80 text-[#F8FAFC] ${
        noPadding ? '' : 'p-5'
      } ${className}`}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};

interface FluentButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const FluentButton: React.FC<FluentButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    primary:
      'bg-sky-600 hover:bg-sky-500 text-white border border-sky-400/50 shadow-sm',
    secondary:
      'bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-[#475569]/70',
    emerald:
      'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50',
    danger:
      'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-400/50',
    ghost:
      'bg-transparent hover:bg-[#1E293B]/80 text-[#94A3B8] hover:text-white border border-transparent hover:border-[#334155]',
  }[variant];

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[38px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-5 py-3 text-base min-h-[48px]',
  }[size];

  return (
    <button
      className={`fluent-reveal inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
};

interface FluentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  theme?: 'dark' | 'light';
  children: React.ReactNode;
}

/**
 * Windows 10 Fluent Modal with clear top (X) close button and full mobile viewport harmony
 */
export const FluentModal: React.FC<FluentModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = '2xl',
  theme = 'dark',
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'w-screen max-w-[98vw]',
  }[maxWidth];

  const isLight = theme === 'light';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0A192F]/80 backdrop-blur-md overflow-y-auto overflow-x-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClass} rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col ${
          isLight
            ? 'bg-white border-2 border-slate-300 text-black'
            : 'bg-[#112240] border border-sky-400/35 text-[#F8FAFC]'
        }`}
      >
        {/* Top Modal Header with Clear (X) Button */}
        <div
          className={`flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b ${
            isLight
              ? 'bg-slate-50 border-slate-300'
              : 'bg-[#0A192F]/90 border-[#334155]'
          }`}
        >
          <div className="min-w-0">
            <h3
              className={`text-base sm:text-lg font-extrabold truncate ${
                isLight ? 'text-black' : 'text-[#F8FAFC]'
              }`}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className={`text-xs font-bold truncate mt-0.5 ${
                  isLight ? 'text-slate-700' : 'text-[#94A3B8]'
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className={`fluent-reveal w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-rose-600 text-black hover:text-white border-slate-300 hover:border-rose-500'
                : 'bg-[#1E293B] hover:bg-rose-600 text-[#F8FAFC] border-[#334155] hover:border-rose-400'
            }`}
          >
            <X className="w-5 h-5 relative z-10" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div
          className={`p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 space-y-4 ${
            isLight ? 'bg-white text-black' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

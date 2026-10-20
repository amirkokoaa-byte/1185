import React, { useState } from 'react';
import {
  User,
  Lock,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { UserAccount } from '../types';
import { FluentButton, FluentModal } from './FluentUI';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onAuthenticate: (user: UserAccount, rememberMe: boolean) => void;
  onRegisterNewUser: (newUser: UserAccount, rememberMe: boolean) => void;
  onResetUserPassword: (userId: string, newPassword: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onAuthenticate,
  onRegisterNewUser,
  onResetUserPassword,
}) => {
  const [viewMode, setViewMode] = useState<'main' | 'forgot_password'>('main');

  // Main Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<boolean>(true); // Checked by default
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Forgot Password State
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Check if `forgotUsername` matches an existing registered user in the database
  const matchedForgotUser = users.find(
    (u) =>
      u.username.trim().toLowerCase() === forgotUsername.trim().toLowerCase() &&
      forgotUsername.trim().length > 0
  );

  const resetMessages = () => setFeedback(null);

  // 1. Login Handler
  const handleLogin = () => {
    resetMessages();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setFeedback({
        type: 'error',
        message: 'يرجى كتابة اسم المستخدم والباسورد أولاً.',
      });
      return;
    }

    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (!foundUser || foundUser.password !== password) {
      setFeedback({
        type: 'error',
        message: 'اسم المستخدم أو الباسورد غير صحيح، يرجى التأكد والمحاولة مجدداً.',
      });
      return;
    }

    if (foundUser.isBanned) {
      setFeedback({
        type: 'error',
        message: 'تم إيقاف هذا الحساب من قِبل إدارة الموقع.',
      });
      return;
    }

    onAuthenticate(foundUser, rememberMe);
    setUsername('');
    setPassword('');
    onClose();
  };

  // 2. Register New Account Handler (Prevents duplicate usernames strictly)
  const handleRegister = () => {
    resetMessages();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setFeedback({
        type: 'error',
        message: 'يرجى إدخال اسم المستخدم والباسورد لإنشاء الحساب.',
      });
      return;
    }

    // Strict check: Prevent registering any account with a username matching a pre-existing user
    const duplicateUser = users.some(
      (u) => u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
    );

    if (duplicateUser) {
      setFeedback({
        type: 'error',
        message:
          'عذراً، اسم المستخدم هذا مسجل مسبقاً في قاعدة البيانات! يرجى اختيار اسم مستخدم مختلف تماماً لمنع تداخل البيانات.',
      });
      return;
    }

    const createdUser: UserAccount = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password, // Accepts numbers, letters, or symbols freely
      role: cleanUsername.toLowerCase() === 'admin' ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };

    onRegisterNewUser(createdUser, rememberMe);
    setUsername('');
    setPassword('');
    onClose();
  };

  // 3. Forgot Password Submit Handler
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!matchedForgotUser) {
      setFeedback({
        type: 'error',
        message: 'اسم المستخدم غير مسجل في قاعدة البيانات.',
      });
      return;
    }
    if (!newPassword) {
      setFeedback({
        type: 'error',
        message: 'يرجى كتابة الباسورد الجديد.',
      });
      return;
    }

    onResetUserPassword(matchedForgotUser.id, newPassword);
    setFeedback({
      type: 'success',
      message: 'تم تعيين الباسورد الجديد بنجاح! يمكنك الآن تسجيل الدخول.',
    });
    setTimeout(() => {
      setViewMode('main');
      setUsername(matchedForgotUser.username);
      setPassword(newPassword);
      setForgotUsername('');
      setNewPassword('');
      setFeedback(null);
    }, 1200);
  };

  return (
    <FluentModal
      isOpen={isOpen}
      onClose={() => {
        setViewMode('main');
        setFeedback(null);
        onClose();
      }}
      title={
        viewMode === 'main'
          ? 'تسجيل الدخول وإنشاء الحسابات'
          : 'استعادة وتعيين الباسورد الجديد'
      }
      subtitle={
        viewMode === 'main'
          ? 'أدخل اسم المستخدم والباسورد للدخول أو إنشاء حساب جديد فوراً'
          : 'اكتب اسم المستخدم المسجل أولاً لتفعيل خانة الباسورد الجديد'
      }
      maxWidth="md"
    >
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-start gap-2 ${
            feedback.type === 'error'
              ? 'bg-rose-500/15 border-rose-400 text-rose-200'
              : 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {viewMode === 'main' ? (
        <div className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اسم المستخدم
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  resetMessages();
                }}
                placeholder="اكتب اسم المستخدم الخاص بك..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>
          </div>

          {/* Password Input (Accepts numbers, letters, symbols freely) */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              الباسورد (يقبل أرقام أو حروف أو رموز بحرية تامة)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  resetMessages();
                }}
                placeholder="أدخل كلمة المرور..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>
          </div>

          {/* Remember Me Checkbox (Checked by default) & Forgot Password Link */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-[#F8FAFC]">
                حفظ البيانات (للدخول المباشر تلقائياً)
              </span>
            </label>

            <button
              type="button"
              onClick={() => {
                setViewMode('forgot_password');
                setForgotUsername(username);
                setNewPassword('');
                resetMessages();
              }}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
            >
              نسيت الباسورد؟
            </button>
          </div>

          {/* Action Buttons: Login & Register New Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#334155]">
            <FluentButton
              type="button"
              variant="primary"
              size="lg"
              onClick={handleLogin}
              className="w-full"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </FluentButton>

            <FluentButton
              type="button"
              variant="emerald"
              size="lg"
              onClick={handleRegister}
              className="w-full"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل حساب جديد</span>
            </FluentButton>
          </div>
        </div>
      ) : (
        /* Forgot Password View */
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              1. اكتب اسم المستخدم المسجل أولاً
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={forgotUsername}
                onChange={(e) => {
                  setForgotUsername(e.target.value);
                  if (!e.target.value.trim()) setNewPassword('');
                  resetMessages();
                }}
                placeholder="اكتب اسم المستخدم للتحقق..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>
            <p className="text-[11px] mt-1.5 font-semibold">
              {matchedForgotUser ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم التحقق من وجود الحساب! يمكنك الآن كتابة الباسورد الجديد بالأسفل.
                </span>
              ) : (
                <span className="text-amber-300">
                  تظل خانة الباسورد الجديد مغلقة حتى كتابة اسم مستخدم صحيح ومسجل فعلياً.
                </span>
              )}
            </p>
          </div>

          {/* New Password Input: Strictly DISABLED unless `matchedForgotUser` exists */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              2. الباسورد الجديد
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                disabled={!matchedForgotUser}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={
                  matchedForgotUser
                    ? 'اكتب الباسورد الجديد هنا...'
                    : 'مغلق حتى التحقق من اسم المستخدم أعلاه'
                }
                className={`w-full rounded-xl border pr-10 pl-4 py-2.5 outline-none transition-colors ${
                  matchedForgotUser
                    ? 'bg-[#0A192F] border-emerald-400 text-[#F8FAFC]'
                    : 'bg-[#0A192F]/40 border-[#334155]/50 text-[#64748B] cursor-not-allowed'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#334155]">
            <FluentButton
              type="button"
              variant="ghost"
              onClick={() => {
                setViewMode('main');
                resetMessages();
              }}
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع لتسجيل الدخول</span>
            </FluentButton>

            <FluentButton
              type="submit"
              variant="primary"
              disabled={!matchedForgotUser || !newPassword}
            >
              <span>حفظ الباسورد الجديد</span>
            </FluentButton>
          </div>
        </form>
      )}
    </FluentModal>
  );
};

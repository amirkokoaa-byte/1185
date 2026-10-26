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

const LOCKED_ACCOUNT_STORAGE_KEY = 'nakhil_1185_locked_account_v1';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onAuthenticate,
  onRegisterNewUser,
  onResetUserPassword,
}) => {
  const [viewMode, setViewMode] = useState<'main' | 'forgot_password'>('main');

  // Load saved fixed accountName if user already registered an account
  const [lockedAccountName, setLockedAccountName] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCKED_ACCOUNT_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Track whether the user has ever logged in or registered on this device before
  const [hasUsedAuthBefore, setHasUsedAuthBefore] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(LOCKED_ACCOUNT_STORAGE_KEY));
    } catch {
      return false;
    }
  });

  // Show "الاسم الذي يظهر للمستخدمين (عند إنشاء حساب جديد)" ONLY on the very first time, OR when user clicks "تسجيل حساب جديد"
  const [isCreatingNewAccount, setIsCreatingNewAccount] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(LOCKED_ACCOUNT_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  // Main Auth State
  const [accountName, setAccountName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<boolean>(true); // Checked by default
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Verify if lockedAccountName still exists in database (if account was deleted from DB, unlock it)
  const lockedUserInDb = React.useMemo(() => {
    const cleanLocked = lockedAccountName.trim().toLowerCase();
    if (!cleanLocked) return null;
    return (
      users.find(
        (u) =>
          (u.accountName && u.accountName.trim().toLowerCase() === cleanLocked) ||
          u.username.trim().toLowerCase() === cleanLocked
      ) || null
    );
  }, [lockedAccountName, users]);

  const hasRegisteredLockedAccount = Boolean(lockedAccountName.trim() && lockedUserInDb);

  React.useEffect(() => {
    if (lockedAccountName && users.length > 0 && !lockedUserInDb) {
      // Account was permanently deleted from database
      try {
        localStorage.removeItem(LOCKED_ACCOUNT_STORAGE_KEY);
      } catch {
        // ignore
      }
      setLockedAccountName('');
      setAccountName('');
    } else if (hasRegisteredLockedAccount && lockedUserInDb && !isCreatingNewAccount) {
      const fixedAcc = lockedUserInDb.accountName || lockedUserInDb.username;
      setAccountName(fixedAcc);
    }
  }, [
    lockedAccountName,
    lockedUserInDb,
    hasRegisteredLockedAccount,
    isCreatingNewAccount,
    users.length,
    isOpen,
  ]);

  // Whenever modal opens after the first time, default to login-only fields (اسم الحساب + الباسورد فقط)
  React.useEffect(() => {
    if (isOpen) {
      try {
        const storedAcc = localStorage.getItem(LOCKED_ACCOUNT_STORAGE_KEY) || '';
        if (storedAcc) {
          setHasUsedAuthBefore(true);
          setIsCreatingNewAccount(false);
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  // Forgot Password State
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Check if `forgotUsername` matches an existing registered user by `accountName` or `username`
  const matchedForgotUser = users.find((u) => {
    const query = forgotUsername.trim().toLowerCase();
    if (!query) return false;
    const accMatch =
      u.accountName && u.accountName.trim().toLowerCase() === query;
    const userMatch = u.username.trim().toLowerCase() === query;
    return Boolean(accMatch || userMatch);
  });

  const isForgotPasswordEnabled = forgotUsername.trim().length > 0;

  const resetMessages = () => setFeedback(null);

  // 1. Login Handler
  const handleLogin = () => {
    resetMessages();
    const effectiveAccount = (
      hasRegisteredLockedAccount && !isCreatingNewAccount
        ? accountName.trim() || lockedUserInDb?.accountName || lockedAccountName
        : accountName
    ).trim();

    if (!effectiveAccount || !password) {
      setFeedback({
        type: 'error',
        message: 'يرجى كتابة اسم الحساب والباسورد أولاً.',
      });
      return;
    }

    const lowerAccount = effectiveAccount.toLowerCase();

    // Match by accountName or username
    const foundUser = users.find(
      (u) =>
        (u.accountName && u.accountName.trim().toLowerCase() === lowerAccount) ||
        u.username.trim().toLowerCase() === lowerAccount
    );

    if (!foundUser || foundUser.password !== password) {
      setFeedback({
        type: 'error',
        message: 'اسم الحساب أو الباسورد غير صحيح، يرجى التأكد والمحاولة مجدداً.',
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

    // Mark that the user has logged in at least once so next time only اسم الحساب and الباسورد appear
    const fixedAccName = foundUser.accountName || foundUser.username;
    try {
      localStorage.setItem(LOCKED_ACCOUNT_STORAGE_KEY, fixedAccName);
    } catch {
      // ignore
    }
    setLockedAccountName(fixedAccName);
    setHasUsedAuthBefore(true);
    setIsCreatingNewAccount(false);

    onAuthenticate(foundUser, true);
    setPassword('');
    onClose();
  };

  // 2. Register New Account Handler
  const isAdminAccountInput =
    accountName.trim().toLowerCase() === 'admin' ||
    displayName.trim().toLowerCase() === 'admin';

  const handleRegister = () => {
    resetMessages();

    // If the "الاسم الذي يظهر للمستخدمين (عند إنشاء حساب جديد)" field is currently hidden,
    // clicking "تسجيل حساب جديد" reveals it so the user can create a new account.
    if (!isCreatingNewAccount) {
      setIsCreatingNewAccount(true);
      setAccountName('');
      setDisplayName('');
      setPassword('');
      return;
    }

    const cleanAccount = accountName.trim();
    const lowerAccount = cleanAccount.toLowerCase();
    const cleanDisplay =
      lowerAccount === 'admin' ? 'admin' : displayName.trim();

    if (!cleanAccount || (!isAdminAccountInput && !cleanDisplay) || !password) {
      setFeedback({
        type: 'error',
        message:
          'يرجى إدخال اسم الحساب، والاسم الذي يظهر للمستخدمين، والباسورد لإنشاء الحساب.',
      });
      return;
    }

    const lowerDisplay = cleanDisplay.toLowerCase();

    if (lowerAccount !== 'admin' && lowerDisplay === 'admin') {
      setFeedback({
        type: 'error',
        message:
          'الاسم الظاهر (admin) مخصص لمدير النظام فقط، يرجى اختيار اسم آخر يظهر للمستخدمين.',
      });
      return;
    }

    // Prevent duplicate accountName or displayName
    const duplicateUser = users.some(
      (u) =>
        (u.accountName &&
          u.accountName.trim().toLowerCase() === lowerAccount) ||
        u.username.trim().toLowerCase() === lowerAccount ||
        u.username.trim().toLowerCase() === lowerDisplay
    );

    if (duplicateUser) {
      setFeedback({
        type: 'error',
        message:
          'عذراً، اسم الحساب أو الاسم الظاهر للمستخدمين مسجل مسبقاً! يرجى اختيار اسم مختلف.',
      });
      return;
    }

    const createdUser: UserAccount = {
      id: `usr-${Date.now()}`,
      accountName: cleanAccount,
      username: lowerAccount === 'admin' ? 'admin' : cleanDisplay,
      password, // Accepts numbers, letters, or symbols freely
      role: lowerAccount === 'admin' ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };

    // Persist accountName so after first registration, only اسم الحساب and الباسورد appear
    try {
      localStorage.setItem(LOCKED_ACCOUNT_STORAGE_KEY, cleanAccount);
    } catch {
      // ignore
    }
    setLockedAccountName(cleanAccount);
    setHasUsedAuthBefore(true);
    setIsCreatingNewAccount(false);

    onRegisterNewUser(createdUser, true);
    setAccountName(cleanAccount);
    setDisplayName('');
    setPassword('');
    onClose();
  };

  // 3. Forgot Password Submit Handler
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!forgotUsername.trim()) {
      setFeedback({
        type: 'error',
        message: 'يرجى كتابة اسم الحساب أولاً.',
      });
      return;
    }
    if (!matchedForgotUser) {
      setFeedback({
        type: 'error',
        message: 'اسم الحساب غير مسجل في قاعدة البيانات.',
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
      message: 'تم حفظ الباسورد الجديد بنجاح! يمكنك الآن تسجيل الدخول.',
    });
    setTimeout(() => {
      setViewMode('main');
      setAccountName(matchedForgotUser.accountName || matchedForgotUser.username);
      setPassword(newPassword);
      setForgotUsername('');
      setNewPassword('');
      setFeedback(null);
    }, 1000);
  };

  const showDisplayNameInput = isCreatingNewAccount && !isAdminAccountInput;

  return (
    <FluentModal
      isOpen={isOpen}
      onClose={() => {
        setViewMode('main');
        setFeedback(null);
        if (hasUsedAuthBefore) {
          setIsCreatingNewAccount(false);
        }
        onClose();
      }}
      title={
        viewMode === 'main'
          ? 'تسجيل الدخول وإنشاء الحسابات'
          : 'نسيت الباسورد - تعيين باسورد جديد'
      }
      subtitle={
        viewMode === 'main'
          ? showDisplayNameInput
            ? 'أدخل اسم الحساب والاسم الذي يظهر للمستخدمين والباسورد لإنشاء حساب جديد'
            : 'أدخل اسم الحساب والباسورد لتسجيل الدخول'
          : 'اكتب اسم الحساب لتفعيل خانة الباسورد وكتابة الباسورد الجديد'
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
          {/* 1. Account Name (اسم الحساب) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#94A3B8]">
                اسم الحساب
              </label>
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  resetMessages();
                }}
                placeholder="اكتب اسم الحساب الخاص بتسجيل الدخول..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>
          </div>

          {/* 2. Public Display Name Input: يظهر فقط في أول مرة أو عند اختيار تسجيل حساب جديد */}
          {showDisplayNameInput && (
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1.5">
                الاسم الذي يظهر للمستخدمين (عند إنشاء حساب جديد)
              </label>
              <div className="relative">
                <UserPlus className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    resetMessages();
                  }}
                  placeholder="اكتب الاسم الذي يظهر للمستخدمين في الموقع..."
                  className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-emerald-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
                />
              </div>
            </div>
          )}

          {/* 3. Password Input (خانة الباسورد) */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              الباسورد
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
                placeholder="أدخل الباسورد..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>
          </div>

          {/* Remember Me Checkbox & Forgot Password Link */}
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
                setForgotUsername(accountName);
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
        /* Forgot Password View: اسم الحساب + خانة الباسورد (تُفعّل عند كتابة الاسم) + حفظ الباسورد الجديد */
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              اسم الحساب
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
                placeholder="اكتب اسم الحساب..."
                className="w-full rounded-xl bg-[#0A192F] border border-[#334155] focus:border-sky-400 pr-10 pl-4 py-2.5 text-[#F8FAFC] outline-none"
              />
            </div>
            <p className="text-[11px] mt-1.5 font-semibold">
              {matchedForgotUser ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم العثور على الحساب ({matchedForgotUser.username})! اكتب الباسورد الجديد بالأسفل واضغط حفظ.
                </span>
              ) : isForgotPasswordEnabled ? (
                <span className="text-sky-300">
                  تم تفعيل خانة الباسورد لكتابة الباسورد الجديد.
                </span>
              ) : (
                <span className="text-amber-300">
                  اكتب اسم الحساب أعلاه لتفعيل خانة الباسورد وكتابة الباسورد الجديد.
                </span>
              )}
            </p>
          </div>

          {/* خانة الباسورد: يتم تفعيلها فور كتابة الاسم */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              الباسورد الجديد
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                disabled={!isForgotPasswordEnabled}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={
                  isForgotPasswordEnabled
                    ? 'اكتب الباسورد الجديد هنا...'
                    : 'يتم تفعيل خانة الباسورد عند كتابة اسم الحساب أعلاه'
                }
                className={`w-full rounded-xl border pr-10 pl-4 py-2.5 outline-none transition-colors ${
                  isForgotPasswordEnabled
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
              disabled={!isForgotPasswordEnabled || !newPassword}
            >
              <span>حفظ الباسورد الجديد</span>
            </FluentButton>
          </div>
        </form>
      )}
    </FluentModal>
  );
};

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
    } else if (hasRegisteredLockedAccount && lockedUserInDb) {
      const fixedAcc = lockedUserInDb.accountName || lockedUserInDb.username;
      setAccountName(fixedAcc);
      if (!displayName) {
        setDisplayName(lockedUserInDb.username);
      }
    }
  }, [lockedAccountName, lockedUserInDb, hasRegisteredLockedAccount, users.length, isOpen]);

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
      hasRegisteredLockedAccount
        ? lockedUserInDb?.accountName || lockedAccountName
        : accountName
    ).trim();
    const cleanDisplay = displayName.trim();

    if ((!effectiveAccount && !cleanDisplay) || !password) {
      setFeedback({
        type: 'error',
        message: hasRegisteredLockedAccount
          ? 'يرجى كتابة الاسم الذي يظهر للمستخدمين والباسورد أولاً.'
          : 'يرجى كتابة اسم الحساب والباسورد أولاً.',
      });
      return;
    }

    const lowerAccount = effectiveAccount.toLowerCase();
    const lowerDisplay = cleanDisplay.toLowerCase();

    // Allow matching by fixed accountName or by displayName (or admin)
    let foundUser = users.find(
      (u) =>
        (lowerDisplay &&
          (u.username.trim().toLowerCase() === lowerDisplay ||
            (u.accountName && u.accountName.trim().toLowerCase() === lowerDisplay))) ||
        (lowerAccount &&
          ((u.accountName && u.accountName.trim().toLowerCase() === lowerAccount) ||
            u.username.trim().toLowerCase() === lowerAccount))
    );

    if (!foundUser || foundUser.password !== password) {
      setFeedback({
        type: 'error',
        message: 'البيانات أو الباسورد غير صحيح، يرجى التأكد والمحاولة مجدداً.',
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

    // Lock accountName on device if not admin
    const fixedAccName = foundUser.accountName || foundUser.username;
    if (fixedAccName.toLowerCase() !== 'admin') {
      try {
        localStorage.setItem(LOCKED_ACCOUNT_STORAGE_KEY, fixedAccName);
      } catch {
        // ignore
      }
      setLockedAccountName(fixedAccName);
    }

    onAuthenticate(foundUser, true);
    setPassword('');
    onClose();
  };

  // 2. Register New Account Handler
  const effectiveAccountForAdminCheck = hasRegisteredLockedAccount
    ? lockedUserInDb?.accountName || lockedAccountName
    : accountName;
  const isAdminAccountInput =
    effectiveAccountForAdminCheck.trim().toLowerCase() === 'admin' ||
    displayName.trim().toLowerCase() === 'admin';

  const handleRegister = () => {
    resetMessages();
    if (hasRegisteredLockedAccount) {
      setFeedback({
        type: 'error',
        message:
          'تم تسجيل حساب بالفعل واسم الحساب ثابت ولا يمكن تغييره. يرجى الضغط على "تسجيل الدخول".',
      });
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

    // Persist fixed accountName so it stays constant and cannot be changed
    if (lowerAccount !== 'admin') {
      try {
        localStorage.setItem(LOCKED_ACCOUNT_STORAGE_KEY, cleanAccount);
      } catch {
        // ignore
      }
      setLockedAccountName(cleanAccount);
    }

    onRegisterNewUser(createdUser, true);
    setAccountName(cleanAccount);
    setDisplayName(createdUser.username);
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
      setDisplayName(matchedForgotUser.username);
      setPassword(newPassword);
      setForgotUsername('');
      setNewPassword('');
      setFeedback(null);
    }, 1000);
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
          : 'نسيت الباسورد - تعيين باسورد جديد'
      }
      subtitle={
        viewMode === 'main'
          ? hasRegisteredLockedAccount
            ? 'اسم الحساب ثابت، أدخل الاسم الذي يظهر للمستخدمين والباسورد لتسجيل الدخول'
            : 'أدخل اسم الحساب والباسورد للدخول، أو أضف الاسم الذي يظهر للمستخدمين عند إنشاء حساب جديد'
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
          {/* 1. Account Name (اسم الحساب): Fixed & Read-Only after account registration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#94A3B8]">
                اسم الحساب
              </label>
              {hasRegisteredLockedAccount && (
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  ثابت لا يمكن تغييره
                </span>
              )}
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={
                  hasRegisteredLockedAccount
                    ? lockedUserInDb?.accountName || lockedAccountName
                    : accountName
                }
                readOnly={hasRegisteredLockedAccount}
                disabled={hasRegisteredLockedAccount}
                onChange={(e) => {
                  if (hasRegisteredLockedAccount) return;
                  setAccountName(e.target.value);
                  resetMessages();
                }}
                placeholder="اكتب اسم الحساب الخاص بتسجيل الدخول..."
                className={`w-full rounded-xl border pr-10 pl-4 py-2.5 outline-none ${
                  hasRegisteredLockedAccount
                    ? 'bg-[#0A192F]/60 border-amber-500/40 text-amber-200 font-bold cursor-not-allowed select-none'
                    : 'bg-[#0A192F] border-[#334155] focus:border-sky-400 text-[#F8FAFC]'
                }`}
              />
            </div>
          </div>

          {/* 2. Public Display Name Input (الاسم الذي يظهر للمستخدمين) */}
          {(!isAdminAccountInput || hasRegisteredLockedAccount) && (
            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1.5">
                {hasRegisteredLockedAccount
                  ? 'الاسم الذي يظهر للمستخدمين'
                  : 'الاسم الذي يظهر للمستخدمين (عند إنشاء حساب جديد)'}
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
                setForgotUsername(
                  hasRegisteredLockedAccount
                    ? lockedUserInDb?.accountName || lockedAccountName
                    : accountName
                );
                setNewPassword('');
                resetMessages();
              }}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
            >
              نسيت الباسورد؟
            </button>
          </div>

          {/* Action Buttons: Login & Register New Account */}
          <div
            className={`grid grid-cols-1 ${
              hasRegisteredLockedAccount ? '' : 'sm:grid-cols-2'
            } gap-3 pt-3 border-t border-[#334155]`}
          >
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

            {!hasRegisteredLockedAccount && (
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
            )}
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

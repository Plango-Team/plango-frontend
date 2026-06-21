import {
  patchState,
  signalMethod,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  IAuthResponse,
  IUser,
  ILoginRequest,
  ISignUpRequest,
  IForgotPasswordRequest,
  IVerifyOtpRequest,
  IResetPasswordRequest,
  IResendVerificationRequest,
  AccountType,
} from '../../core/models/iuser';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth/auth.service';
import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotificationService } from '../../shared/services/push-notification.service';
import { ApiErrorService } from '../../core/services/api-error.service';
import { LanguageService } from '../../core/services/language.service';

export type AuthState = {
  user: IUser | null;
  token: string | null; 
  accountType: AccountType | null;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
};

export const authStore = signalStore(
  {
    providedIn: 'root',
  },
  withState({
    user: null,
    token: null,
    accountType: null,
    isLoading: false,
    error: null,
    successMessage: null,
  } as AuthState),
  withComputed((store) => ({
    isAuthenticated: computed(() => !!store.user()),
    isOrganization: computed(() => store.accountType() === 'organization'),
  })),
  withMethods((
    store,
    authService = inject(AuthService),
    router = inject(Router),
    pushNotifications = inject(PushNotificationService),
    apiErrors = inject(ApiErrorService),
    language = inject(LanguageService),
  ) => ({
    goToHome: signalMethod<void>(() => {
      const user = store.user();
      if (!user) {
        router.navigate(['/auth/login']);
        return;
      }

      router.navigate([authService.getHomeRoute(user)]);
    }),

    // ─────── تسجيل الدخول ───────
    login: rxMethod<ILoginRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((credentials) =>
          authService.login(credentials).pipe(
            tap({
              next: (response) => {
                patchState(store, {
                  user: response.user,
                  token: response.token,
                  accountType: response.user.accountType,
                  isLoading: false,
                });
                localStorage.setItem('token', response.token);
                router.navigate([authService.getHomeRoute(response.user)]);
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: apiErrors.message(
                    err,
                    'حدث خطأ أثناء تسجيل الدخول',
                    'An error occurred while signing in.',
                  ),
                });
              },
            }),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),

    // ─────── إنشاء حساب ───────
    signUp: rxMethod<ISignUpRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((userData) =>
          authService.signUp(userData).pipe(
            tap((response) => {
              patchState(store,{isLoading:false, successMessage:response.message});
                router.navigate(['/auth/login']); }),
              catchError((err) => {
                const Berror = err.error?.message
                patchState(store, {
                  isLoading: false,
                  error: Berror || 'حدث خطأ أثناء إنشاء الحساب',
                });
                router.navigate(['/auth/login']);
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: apiErrors.message(
                    err,
                    'حدث خطأ أثناء إنشاء الحساب',
                    'An error occurred while creating the account.',
                  ),
                });
              },
            }),
            catchError(() => of(null)),
          ),
    ),

    // ─────── إرسال OTP لنسيان كلمة المرور ───────
    forgotPassword: rxMethod<IForgotPasswordRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((data) =>
          authService.forgotPassword(data).pipe(
            tap({
              next: (response) => {
                patchState(store, {
                  isLoading: false,
                  successMessage: response.message,
                });
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: apiErrors.message(
                    err,
                    'حدث خطأ أثناء إرسال كود التحقق',
                    'An error occurred while sending the verification code.',
                  ),
                });
              },
            }),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),

    // ─────── التحقق من OTP ───────
    // verifyOtp: rxMethod<IVerifyOtpRequest>(
    //   pipe(
    //     tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
    //     switchMap((data) =>
    //       authService.verifyOtp(data).pipe(
    //         tap({
    //           next: (response) => {
    //             patchState(store, {
    //               isLoading: false,
    //               successMessage: response.message,
    //             });
    //           },
    //           error: (err) => {
    //             patchState(store, {
    //               isLoading: false,
    //               error: err.message || 'كود التحقق غير صحيح',
    //             });
    //           },
    //         }),
    //         catchError(() => of(null)),
    //       ),
    //     ),
    //   ),
    // ),

    // ─────── تفعيل البريد الإلكتروني بعد التسجيل ───────
    verifyEmail: rxMethod<string>(  
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((token) =>
          authService.verifyEmail(token).pipe(
            tap({
              next: (response) => {
                patchState(store, {
                  isLoading: false,
                  successMessage: response.message,
                });
                // بعد التفعيل نوجّه المستخدم لصفحة تسجيل الدخول
                router.navigate(['/auth/login']);
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: apiErrors.message(
                    err,
                    'حدث خطأ أثناء تفعيل البريد الإلكتروني',
                    'An error occurred while verifying the email address.',
                  ),
                });
              },
            }),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),

    // ─────── إعادة إرسال رابط تفعيل البريد الإلكتروني ───────
    resendVerification: rxMethod<IResendVerificationRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((data) =>
          authService.resendVerification(data).pipe(
            tap({
              next: (response) => {
                patchState(store, {
                  isLoading: false,
                  successMessage: response.message,
                });
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: apiErrors.message(
                    err,
                    'حدث خطأ أثناء إعادة إرسال التحقق',
                    'An error occurred while resending verification.',
                  ),
                });
              },
            }),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),

    // ─────── إعادة تعيين كلمة المرور ───────
    resetPassword: rxMethod<IResetPasswordRequest>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((data) =>
          authService.resetPassword(data).pipe(
            tap({
              next: (response) => {
                patchState(store, {
                  isLoading: false,
                  successMessage: response.message,
                });
                // التوجيه لصفحة تسجيل الدخول بعد 2 ثانية
                setTimeout(() => router.navigate(['/auth/login']), 2000);
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: apiErrors.message(
                    err,
                    'حدث خطأ أثناء تغيير كلمة المرور',
                    'An error occurred while changing the password.',
                  ),
                });
              },
            }),
            catchError(() => of(null)),
          ),
        ),
      ),
    ),

    // ─────── تسجيل الخروج ───────
    logOut: signalMethod<void>(() => {
      void pushNotifications.deleteCurrentToken();
      localStorage.removeItem('token');
      patchState(store, {
        user: null,
        token: null,
        accountType: null,
        successMessage: null,
        error: null,
      });
      router.navigate(['/']);
    }),

    // ─────── مسح الرسائل ───────
    clearError: signalMethod<void>(() => {
      patchState(store, { error: null });
    }),

    clearSuccess: signalMethod<void>(() => {
      patchState(store, { successMessage: null });
    }),

    setLoading: signalMethod<boolean>((isLoading) => {
      patchState(store, { isLoading });
    }),

    setError: signalMethod<string | null>((errorMessage) => { 
      patchState(store, { error: errorMessage });
    }), 

    setSuccessMessage: signalMethod<string | null>((successMessage) => {
      patchState(store, { successMessage });
    }),

    setAuthSession: signalMethod<{ user: IUser; token: string | null }>((session) => {
      patchState(store, {
        user: session.user,
        token: session.token,
        accountType: session.user.accountType,
      });
    }),

    patchCurrentUser: signalMethod<Partial<IUser>>((changes) => {
      const current = store.user();
      if (!current) return;
      const user = { ...current, ...changes };
      patchState(store, {
        user,
        accountType: user.accountType,
      });
    }),

    updateCurrentUser: rxMethod<Partial<IUser>>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((changes) => {
          const current = store.user();
          if (!current) {
            patchState(store, {
              isLoading: false,
              error: language.text(
                'لا يوجد مستخدم مسجّل حالياً',
                'No user is currently signed in.',
              ),
            });
            return of(null);
          }

          return authService
            .updateUser(current._id, {
              ...changes,
              updatedAt: new Date(),
            })
            .pipe(
              tap({
                next: (user) => {
                  patchState(store, {
                    user,
                    isLoading: false,
                    successMessage: language.text(
                      'تم حفظ إعدادات المؤسسة',
                      'Organization settings saved.',
                    ),
                  });
                },
                error: (err) => {
                  patchState(store, {
                    isLoading: false,
                    error: apiErrors.message(
                      err,
                      'حدث خطأ أثناء تحديث بيانات المؤسسة',
                      'An error occurred while updating organization details.',
                    ),
                  });
                },
              }),
              catchError(() => of(null)),
            );
        }),
      ),
    ),

    // ─────── تهيئة المصادقة عند تحميل التطبيق ───────
    initAuth: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true })),
        switchMap(() => {
          const publicAuthPaths = [
            '/auth/login',
            '/auth/signup',
            '/auth/forget-password',
            '/auth/reset-password',
            '/reset-password',
            '/verify-email',
            '/auth/verify-email',
            '/auth/email/confirm-change',
            '/auth/callback',
          ];
          const currentPath =
            typeof window !== 'undefined' ? window.location.pathname : '';

          if (publicAuthPaths.some((path) => currentPath.startsWith(path))) {
            patchState(store, { isLoading: false });
            return of(null);
          }

          return authService.getCurrentUser().pipe(
            tap({
              next: (user) => {
                const token = localStorage.getItem('token') || null;
                patchState(store, {
                  user,
                  token,
                  accountType: user.accountType,
                  isLoading: false,
                });
                if (store.accountType() === 'organization') {
                  router.navigate(['/organization']);
                }
              },
              error: () => {
                localStorage.removeItem('token');
                patchState(store, {
                  user: null,
                  token: null,
                  accountType: null,
                  isLoading: false,
                });
                router.navigate(['/auth/login']);
              },
            }),
            catchError(() => of(null)),
          );
        }),
      ),
    ),
  })),
);

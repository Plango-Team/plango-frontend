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
    accountType: computed(() => store.accountType() ?? null),
    isOrganization: computed(() => store.accountType() === 'organization'),
  })),
  withMethods((store, authService = inject(AuthService), router = inject(Router)) => ({
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
                  isLoading: false,
                });
                localStorage.setItem('token', response.token);
                router.navigate([authService.getHomeRoute(response.user)]);
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.message || 'حدث خطأ أثناء تسجيل الدخول',
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
            tap({
              next: (response) => {
                patchState(store, {
                  isLoading: false,
                  successMessage: 'تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني للتأكيد',
                });
                router.navigate(['/auth/login']);
              },
              error: (err) => {
                patchState(store, {
                  isLoading: false,
                  error: err.message || 'حدث خطأ أثناء إنشاء الحساب',
                });
              },
            }),
            catchError(() => of(null)),
          ),
        ),
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
                  error: err.message || 'حدث خطأ أثناء إرسال كود التحقق',
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
                  error: err.message || 'حدث خطأ أثناء تفعيل البريد الإلكتروني',
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
                  error: err.message || 'حدث خطأ أثناء إعادة إرسال التحقق',
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
                  error: err.message || 'حدث خطأ أثناء تغيير كلمة المرور',
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
      localStorage.removeItem('token');
      patchState(store, { user: null, token: null, successMessage: null, error: null });
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

    setAuthSession: signalMethod<{ user: IUser; token: string }>((session) => {
      patchState(store, { user: session.user, token: session.token });
    }),

    updateCurrentUser: rxMethod<Partial<IUser>>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, successMessage: null })),
        switchMap((changes) => {
          const current = store.user();
          if (!current) {
            patchState(store, { isLoading: false, error: 'لا يوجد مستخدم مسجّل حالياً' });
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
                    successMessage: 'تم حفظ إعدادات المؤسسة',
                  });
                },
                error: (err) => {
                  patchState(store, {
                    isLoading: false,
                    error: err.message || 'حدث خطأ أثناء تحديث بيانات المؤسسة',
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
          return authService.getCurrentUser().pipe(
            tap({
              next: (user) => {
                const token = localStorage.getItem('token') || null;
                patchState(store, { user, token, isLoading: false });
                if (store.accountType() === 'organization') {
                  router.navigate(['/organization']);
                }
              },
              error: () => {
                localStorage.removeItem('token');
                patchState(store, { user: null, token: null, isLoading: false });
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

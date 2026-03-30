import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, delay, of, throwError } from 'rxjs';
import {
  IAuthResponse,
  IUser,
  ILoginRequest,
  ISignUpRequest,
  IForgotPasswordRequest,
  IVerifyOtpRequest,
  IResetPasswordRequest,
  IMessageResponse,
} from '../../models/iuser';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Mock OTP storage (سيتم استبداله بالـ Backend الحقيقي)
  private mockOtpStore = new Map<string, string>();

  /**
   * تسجيل الدخول
   * JSON Server لا يدعم /login، لذا سنبحث عن المستخدم بالإيميل والباسورد
   */
  login(credentials: ILoginRequest): Observable<IAuthResponse> {
    return this.http.get<IUser[]>(`${this.baseUrl}/users`).pipe(
      delay(800),
      map((users) => {
        const user = users.find(
          (u) => u.email === credentials.email && u.password === credentials.password,
        );

        if (!user) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        return {
          token: `fake-jwt-token-${user.id}`,
          user: user,
          expiresIn: 3600,
        } as IAuthResponse;
      }),
    );
  }

  /**
   * إنشاء حساب جديد
   * POST لمجموعة الـ users في JSON Server
   */
  signUp(userData: ISignUpRequest): Observable<IAuthResponse> {
    const newUser: Partial<IUser> = {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      userName: `${userData.firstName.toLowerCase()}_${userData.lastName.toLowerCase()}`,
      phoneNumber: userData.phoneNumber,
      role: 'user',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'dark',
        language: 'ar',
        preferredTransport: 'car',
        defaultBufferTime: 15,
        notifications: {
          email: true,
          push: userData.preferences.notifications,
          departureAlerts: true,
        },
      },
    };

    return this.http.post<IUser>(`${this.baseUrl}/users`, newUser).pipe(
      delay(800),
      map((user) => {
        return {
          token: `fake-jwt-token-${user.id}-${Date.now()}`,
          user: user,
          expiresIn: 3600,
        } as IAuthResponse;
      }),
    );
  }

  /**
   * إرسال كود OTP لإعادة تعيين كلمة المرور
   * Mock: بنولد كود عشوائي ونخزنه محلياً
   */
  forgotPassword(data: IForgotPasswordRequest): Observable<IMessageResponse> {
    return this.http.get<IUser[]>(`${this.baseUrl}/users`).pipe(
      delay(800),
      map((users) => {
        const user = users.find((u) => u.email === data.email);

        if (!user) {
          throw new Error('لا يوجد حساب مسجل بهذا البريد الإلكتروني');
        }

        // توليد OTP وهمي
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.mockOtpStore.set(data.email, otp);

        // طباعة الـ OTP في الكونسول (للتطوير فقط)
        console.log(`🔐 OTP for ${data.email}: ${otp}`);

        return { message: `تم إرسال كود التحقق إلى ${data.email}` };
      }),
    );
  }

  /**
   * التحقق من كود OTP
   * Mock: مقارنة الكود المخزن محلياً
   */
  verifyOtp(data: IVerifyOtpRequest): Observable<IMessageResponse> {
    return of(null).pipe(
      delay(800),
      map(() => {
        const storedOtp = this.mockOtpStore.get(data.email);

        if (!storedOtp || storedOtp !== data.otp) {
          throw new Error('كود التحقق غير صحيح أو منتهي الصلاحية');
        }

        return { message: 'تم التحقق بنجاح' };
      }),
    );
  }

  /**
   * إرسال كود OTP للتحقق من الحساب بعد التسجيل
   * Mock: بنولد كود عشوائي
   */
  sendSignUpOtp(email: string): Observable<IMessageResponse> {
    return of(null).pipe(
      delay(800),
      map(() => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.mockOtpStore.set(email, otp);

        console.log(`🔐 Signup OTP for ${email}: ${otp}`);

        return { message: `تم إرسال كود التحقق إلى ${email}` };
      }),
    );
  }

  /**
   * إعادة تعيين كلمة المرور بعد التحقق من OTP
   * Mock: تحديث الباسورد في JSON Server
   */
  resetPassword(data: IResetPasswordRequest): Observable<IMessageResponse> {
    const storedOtp = this.mockOtpStore.get(data.email);

    if (!storedOtp || storedOtp !== data.otp) {
      return throwError(() => new Error('كود التحقق غير صحيح'));
    }

    return this.http.get<IUser[]>(`${this.baseUrl}/users`).pipe(
      delay(800),
      map((users) => {
        const user = users.find((u) => u.email === data.email);

        if (!user) {
          throw new Error('لا يوجد حساب مسجل بهذا البريد الإلكتروني');
        }

        // في الـ Mock بنعمل PATCH للـ JSON Server
        this.http
          .patch(`${this.baseUrl}/users/${user.id}`, { password: data.newPassword })
          .subscribe();

        // حذف الـ OTP بعد الاستخدام
        this.mockOtpStore.delete(data.email);

        return { message: 'تم تغيير كلمة المرور بنجاح' };
      }),
    );
  }

  /**
   * جلب بيانات المستخدم الحالي (تستخدم في initAuth)
   * JSON Server: سنستخدم التوكن (الذي يحتوي على الـ ID) لجلب اليوزر
   */
  getCurrentUser(): Observable<IUser> {
    const token = localStorage.getItem('token');
    const userId = token?.split('-')[3] || '1';

    return this.http.get<IUser>(`${this.baseUrl}/users/${userId}`);
  }
}

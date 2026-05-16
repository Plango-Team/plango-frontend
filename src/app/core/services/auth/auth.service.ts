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
  AccountType,
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

  private normalizeUser(user: IUser): IUser {
    const accountType = user.accountType ?? 'personal';
    const displayName = user.displayName?.trim() || `${user.firstName} ${user.lastName}`.trim();

    return {
      ...user,
      accountType,
      displayName,
      organizationName:
        user.organizationName ?? (accountType === 'organization' ? displayName : undefined),
    };
  }

  private createToken(user: IUser): string {
    const payload = btoa(JSON.stringify({ id: user.id, accountType: user.accountType }));
    return `plango.${payload}`;
  }

  private decodeToken(token: string): { id: string; accountType: AccountType } | null {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;

    try {
      const decoded = JSON.parse(atob(encodedPayload)) as {
        id?: string;
        accountType?: AccountType;
      };

      if (!decoded.id || !decoded.accountType) return null;

      return {
        id: decoded.id,
        accountType: decoded.accountType,
      };
    } catch {
      return null;
    }
  }

  private buildDisplayName(user: Pick<IUser, 'firstName' | 'lastName' | 'displayName'>): string {
    return user.displayName?.trim() || `${user.firstName} ${user.lastName}`.trim();
  }

  private buildHomeRoute(user: Pick<IUser, 'accountType' | 'role'>): string {
    if (user.role === 'admin') {
      return '/admin';
    }

    return user.accountType === 'organization' ? '/organization' : '/user';
  }

  /**
   * تسجيل الدخول
   * JSON Server لا يدعم /login، لذا سنبحث عن المستخدم بالإيميل والباسورد
   */
  login(credentials: ILoginRequest): Observable<IAuthResponse> {
    return this.http.get<IUser[]>(`${this.baseUrl}/users`).pipe(
      delay(800),
      map((users) => {
        const user = users
          .map((entry) => this.normalizeUser(entry))
          .find((u) => u.email === credentials.email && u.password === credentials.password);

        if (!user) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        return {
          token: this.createToken(user),
          user,
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
    const isOrganization = userData.accountType === 'organization';
    const displayName = this.buildDisplayName({
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.displayName,
    });
    const userName =
      userData.username.trim() ||
      `${displayName.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36).slice(-4)}`;

    const newUser: Partial<IUser> = {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName,
      userName,
      phoneNumber: userData.phoneNumber,
      role: isOrganization ? 'user' : 'user',
      accountType: userData.accountType,
      bio: userData.bio,
      privateFollows: userData.privateFollows,
      organizationName: userData.organizationName,
      organizationDescription: userData.organizationDescription,
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
        const normalizedUser = this.normalizeUser(user);
        return {
          token: this.createToken(normalizedUser),
          user: normalizedUser,
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
    const session = token ? this.decodeToken(token) : null;
    const userId = session?.id || '1';

    return this.http
      .get<IUser>(`${this.baseUrl}/users/${userId}`)
      .pipe(map((user) => this.normalizeUser(user)));
  }

  updateUser(userId: string, patch: Partial<IUser>): Observable<IUser> {
    return this.http.patch<IUser>(`${this.baseUrl}/users/${userId}`, patch).pipe(
      delay(300),
      map((user) => this.normalizeUser(user)),
    );
  }

  getHomeRoute(user: Pick<IUser, 'accountType' | 'role'>): string {
    return this.buildHomeRoute(user);
  }
}

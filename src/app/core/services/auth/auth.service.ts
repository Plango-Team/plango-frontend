import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  IAuthResponse,
  IWrappedResponse,
  ISignUpResponse,
  IUser,
  ILoginRequest,
  ISignUpRequest,
  IForgotPasswordRequest,
  IVerifyOtpRequest,
  IResetPasswordRequest,
  IResendVerificationRequest,
  IMessageResponse,
} from '../../models/iuser';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly authUrl = `${this.baseUrl}/auth`;

  private normalizeUser(backendUser: any): IUser {
  // 1. تصحيح الـ Template Literals وكتابة الـ Backticks بشكل سليم تماماً
  const rawFirstName = backendUser.firstName ?? '';
  const rawLastName = backendUser.lastName ?? '';
  const fallbackName = `${rawFirstName} ${rawLastName}`.trim();

  const displayName = (
    backendUser.name ?? 
    backendUser.displayName ?? 
    (fallbackName ? fallbackName : 'مستخدم جديد')
  ).trim();

  // 2. بناء الأوبجكت ليتطابق مع الـ IUser interface الجديد بالملّي
  return {
    _id: backendUser._id ?? backendUser.id ?? '',
    name: displayName,
    email: backendUser.email ?? '',
    role: backendUser.role ?? 'user',
    accountType:
      backendUser.accountType ??
      (backendUser.role === 'org' ? 'organization' : 'personal'),
    location: backendUser.location ?? backendUser.city ?? 'Cairo',
    bio: backendUser.bio,
    username: backendUser.username ?? backendUser.userName ?? displayName.toLowerCase().replace(/\s+/g, '_'),
    isPrivate: backendUser.isPrivate ?? backendUser.privateFollows ?? false,
    provider: backendUser.provider ?? 'local',
    phone: backendUser.phone ?? backendUser.phoneNumber ?? '',
    isEmailVerified: backendUser.isEmailVerified ?? false,
    isPhoneVerified: backendUser.isPhoneVerified ?? false,
    
    passwordChangeCooldownHours: backendUser.passwordChangeCooldownHours ?? 0,
    emailChangeCooldownHours: backendUser.emailChangeCooldownHours ?? 0,
    phoneChangeCooldownHours: backendUser.phoneChangeCooldownHours ?? 0,
    
    // تأمين تحويل التواريخ بشكل سليم
    lastLoginAt: backendUser.lastLoginAt ? new Date(backendUser.lastLoginAt) : new Date(),
    createdAt: backendUser.createdAt ? new Date(backendUser.createdAt) : new Date()
  };
}

private buildHomeRoute(user: Pick<IUser, 'role'> & { accountType?: string }): string {
  if (user.role === 'admin') {
    return '/admin';
  }

  return user.role === 'org' || user.accountType === 'organization' ? '/organization' : '/user';
}

  /**
   * تسجيل الدخول باستخدام API حقيقي 
   */
  login(credentials: ILoginRequest): Observable<IAuthResponse> {
    return this.http.post<IWrappedResponse<any>>(`${this.authUrl}/login`, credentials).pipe(
      map((response) => {
        const token = response.data?.token ?? response.data?.accessToken ?? response.data?.access_token ?? '';
        if (!token || !response.data?.user) {
          throw new Error(response.message || 'Unexpected login response');
        }

        return { 
          token,
          user: this.normalizeUser(response.data.user),
          expiresIn: 3600,
        } as IAuthResponse;
      }),
    );
  }

  /**
   * إنشاء حساب جديد باستخدام API حقيقي
   */
  signUp(userData: ISignUpRequest): Observable<ISignUpResponse> {
    const payload = {
      name: userData.displayName ?? `${userData.firstName} ${userData.lastName}`.trim(),
      email: userData.email,
      password: userData.password,
      role: userData.accountType === 'organization' ? 'org' : 'user',
      username: userData.username,
      location: userData.city,
      bio: userData.bio,
      isPrivate: userData.isPrivate ?? false,
    };

    return this.http.post<ISignUpResponse>(`${this.authUrl}/register`, payload).pipe(
      map((response) => ({
        ...response,
        data: {
          user: this.normalizeUser(response.data.user),
        },
      })),
    );
  }

  /**
   * إرسال كود إعادة تعيين كلمة المرور عبر API حقيقي
   */
  forgotPassword(data: IForgotPasswordRequest): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/forgot-password`, data);
  }

  /**
   * التحقق من كود OTP عبر API حقيقي
   */
  // verifyOtp(data: IVerifyOtpRequest): Observable<IMessageResponse> {
  //   return this.http.post<IMessageResponse>(`${this.authUrl}/verify-otp`, data);
  // }

  /**
   */
  resetPassword(data: IResetPasswordRequest): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/reset-password`, data);
  }

  resetPasswordWithToken(data: { token: string; newPassword: string; confirmPassword: string }): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/reset-password/token`, data);
  }

  /**
   * التحقق من البريد الإلكتروني بعد التسجيل
   */
  verifyEmail(token: string): Observable<IMessageResponse> {
    const url = `${this.authUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return this.http.get<IMessageResponse>(url);
  }

  sendVerificationPhoneOTP(phone: string): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/phone/send-otp`, { phone });
  }

  verifyPhone(phone: string , otp:string): Observable<IMessageResponse> {
    return this.http.post<any>(`${this.authUrl}/phone/verify`, { phone ,otp});
  }

  requestResetOtp(phone: string): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/forgot-password/otp`, { phone });
  }

  resetPasswordWithOtp(data: { phone: string; otp: string; newPassword: string ; confirmPassword : string }): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/reset-password/otp`, data);
  }
  /**
   * إعادة إرسال رابط التحقق إلى البريد الإلكتروني
   */
  resendVerification(data: IResendVerificationRequest): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/resend-verification`, data);
  }

  /**
   * جلب بيانات المستخدم الحالي من API حقيقي
   */
  getCurrentUser(): Observable<IUser> {
    return this.http.get<IWrappedResponse<any>>(`${this.authUrl}/me`)
      .pipe(map(response => this.normalizeUser(response.data.user)),
        catchError((err) => {
        if (err.status === 401) {
          return this.getCurrentUserWithCredentials();
        }
        return throwError(() => err);
      }));
  }

  /**
   * جلب بيانات المستخدم الحالي باستخدام HttpOnly cookie
   */ 
  getCurrentUserWithCredentials(): Observable<IUser> {
    return this.http
      .get<IWrappedResponse<any>>(`${this.authUrl}/me`, { withCredentials: true })
      .pipe(map((response) => this.normalizeUser(response.data.user)));
  }

  changePassword(payload:any): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/change-password`, payload, { withCredentials: true });
  }

  updateUser(userId: string, patch: Partial<IUser>): Observable<IUser> {
    return this.http.patch<IUser>(`${this.baseUrl}/users/${userId}`, patch).pipe(
      map((user) => this.normalizeUser(user)),
    );
  }
  requestChangeEmail(payload: { newEmail: string; password: string }): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/email/change`, payload, { withCredentials: true });
  }

  confirmEmailChange(token:string): Observable<IMessageResponse>{
    return this.http.get<IMessageResponse>(`${this.authUrl}/email/confirm-change?token=${encodeURIComponent(token)}`, { withCredentials: true });
  }

  changeName(name: string): Observable<IMessageResponse> {
    return this.http.patch<IMessageResponse>(`${this.authUrl}/update-name`, { name }, { withCredentials: true });
  }

  requestChangePhone(newPhone: string, password: string): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/phone/change`, { newPhone, password }, { withCredentials: true });
  }

  confirmPhoneChange(otp: string): Observable<IMessageResponse> {
    return this.http.post<IMessageResponse>(`${this.authUrl}/phone/confirm-change`,{otp}, { withCredentials: true });
  }

  deleteAccount(password:string): Observable<IMessageResponse>{
    return this.http.delete<IMessageResponse>(`${this.authUrl}/delete-account`,{body : {password},withCredentials : true})
  }

  getHomeRoute(user: Pick<IUser, 'role'> & { accountType?: string }): string {
  return this.buildHomeRoute(user);
}
}

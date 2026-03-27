import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError, catchError, delay } from 'rxjs';
import { IAuthResponse, IUser } from '../../models/iuser'; // تأكد من المسار
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * محاكاة تسجيل الدخول
   * JSON Server لا يدعم /login، لذا سنبحث عن المستخدم بالإيميل والباسورد
   */
  login(credentials: any): Observable<IAuthResponse> {
    // هنجيب كل اليوزرز ونعمل فلتر إحنا في الـ Front-end
    return this.http.get<IUser[]>(`${this.baseUrl}/users`).pipe(
      delay(1000),
      map((users) => {
        // البحث يدوي لضمان تخطي مشاكل الـ URL Query
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
   * محاكاة التسجيل
   * سنقوم بعمل POST لمجموعة الـ users
   */
  signUp(userData: any): Observable<IAuthResponse> {
    return this.http.post<IUser>(`${this.baseUrl}/users`, userData).pipe(
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
   * جلب بيانات المستخدم الحالي (تستخدم في initAuth)
   * JSON Server: سنستخدم التوكن (الذي يحتوي على الـ ID) لجلب اليوزر
   */
  getCurrentUser(): Observable<IUser> {
    const token = localStorage.getItem('token');
    const userId = token?.split('-')[3] || '1'; // محاكاة استخراج الـ ID من التوكن الوهمي

    return this.http.get<IUser>(`${this.baseUrl}/users/${userId}`);
  }
}

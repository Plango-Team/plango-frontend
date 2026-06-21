import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiError, ApiErrorPayload } from '../models/api-error';
import { LanguageService } from './language.service';

type ErrorCopy = readonly [arabic: string, english: string];

const ERROR_COPY: Readonly<Record<string, ErrorCopy>> = {
  NETWORK_ERROR: [
    'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.',
    'Could not reach the server. Check your connection and try again.',
  ],
  INTERNAL_ERROR: [
    'حدث خطأ غير متوقع في الخادم. حاول مرة أخرى بعد قليل.',
    'An unexpected server error occurred. Please try again shortly.',
  ],
  VALIDATION_ERROR: ['تحقق من البيانات المدخلة وحاول مرة أخرى.', 'Check the entered data and try again.'],
  TOO_MANY_REQUESTS: [
    'تم إرسال طلبات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
    'Too many requests were sent. Please wait and try again.',
  ],
  NO_TOKEN: ['يرجى تسجيل الدخول للمتابعة.', 'Please log in to continue.'],
  INVALID_TOKEN: ['انتهت جلسة الدخول. سجّل الدخول مرة أخرى.', 'Your session expired. Please log in again.'],
  PASSWORD_CHANGED: [
    'تم تغيير كلمة المرور. سجّل الدخول مرة أخرى.',
    'Your password changed. Please log in again.',
  ],
  USER_NOT_FOUND: ['الحساب غير موجود أو غير متاح.', 'The account was not found or is unavailable.'],
  INVALID_CREDENTIALS: [
    'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'The email or password is incorrect.',
  ],
  EMAIL_NOT_VERIFIED: [
    'يرجى تفعيل البريد الإلكتروني قبل تسجيل الدخول.',
    'Please verify your email before logging in.',
  ],
  WRONG_PROVIDER: [
    'هذا الحساب يستخدم تسجيل الدخول عبر Google.',
    'This account uses Google sign-in.',
  ],
  EMAIL_TAKEN: ['البريد الإلكتروني مستخدم بالفعل.', 'This email address is already in use.'],
  PHONE_TAKEN: ['رقم الهاتف مستخدم بالفعل.', 'This phone number is already in use.'],
  INVALID_TOKEN_FORMAT: ['الرابط غير صالح.', 'The link is invalid.'],
  INVALID_ID: ['العنصر المطلوب غير موجود.', 'The requested item was not found.'],
  NOT_FOUND: ['العنصر المطلوب غير موجود.', 'The requested item was not found.'],
  FORBIDDEN: ['ليست لديك صلاحية لتنفيذ هذا الإجراء.', 'You do not have permission to perform this action.'],
  INSUFFICIENT_ROLE: ['ليست لديك الصلاحية المطلوبة.', 'You do not have the required permission.'],
  DUPLICATE_FIELD: ['هذه البيانات مستخدمة بالفعل.', 'This information is already in use.'],
  DUPLICATE_EVENT: ['هذه الفعالية موجودة بالفعل.', 'This event already exists.'],
  DUPLICATE_APPOINTMENT: [
    'لديك موعد آخر في التوقيت نفسه.',
    'You already have another appointment at this time.',
  ],
  TASK_NOT_FOUND: ['المهمة غير موجودة.', 'The task was not found.'],
  APPOINTMENT_NOT_FOUND: ['الموعد غير موجود.', 'The appointment was not found.'],
  EVENT_NOT_FOUND: ['الفعالية غير موجودة.', 'The event was not found.'],
  POST_NOT_FOUND: ['المنشور غير موجود.', 'The post was not found.'],
  INVITE_NOT_FOUND: ['الدعوة غير موجودة.', 'The invitation was not found.'],
  CHAT_ACCESS_DENIED: [
    'ليست لديك صلاحية الوصول إلى هذه المحادثة.',
    'You do not have access to this chat.',
  ],
  OTP_NOT_FOUND: ['اطلب رمز تحقق جديداً.', 'Please request a new verification code.'],
  OTP_EXPIRED: ['انتهت صلاحية رمز التحقق.', 'The verification code has expired.'],
  OTP_INVALID: ['رمز التحقق غير صحيح.', 'The verification code is incorrect.'],
  INVALID_TOKEN_RESET: [
    'رابط إعادة التعيين غير صالح أو منتهي الصلاحية.',
    'The reset link is invalid or expired.',
  ],
};

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  private readonly language = inject(LanguageService);

  normalize(error: unknown, fallback?: ErrorCopy): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (!(error instanceof HttpErrorResponse)) {
      const copy = fallback ?? ERROR_COPY['INTERNAL_ERROR'];
      return new ApiError(this.copy(copy), 0, 'CLIENT_ERROR', {}, undefined, error);
    }

    const payload = this.payload(error.error);
    const status = error.status ?? 0;
    const code = payload.code || this.codeFromStatus(status);
    const fieldErrors = Object.fromEntries(
      (payload.errors ?? []).map((item) => [
        item.field,
        this.validationMessage(item.message),
      ]),
    );
    const knownCopy = ERROR_COPY[code];
    const backendMessage = payload.message?.trim();
    const message =
      (knownCopy ? this.copy(knownCopy) : '') ||
      backendMessage ||
      (fallback ? this.copy(fallback) : this.copy(ERROR_COPY['INTERNAL_ERROR']));

    return new ApiError(
      message,
      status,
      code,
      fieldErrors,
      payload.retryAfterSeconds,
      error,
    );
  }

  message(
    error: unknown,
    arabicFallback: string,
    englishFallback: string,
  ): string {
    return this.normalize(error, [arabicFallback, englishFallback]).message;
  }

  title(error: ApiError): string {
    if (error.status === 0) {
      return this.language.text('تعذر الاتصال', 'Connection failed');
    }
    if (error.status >= 500) {
      return this.language.text('خطأ في الخادم', 'Server error');
    }
    if (error.status === 429) {
      return this.language.text('طلبات كثيرة', 'Too many requests');
    }
    return this.language.text('تعذر إكمال الطلب', 'Request failed');
  }

  isSessionError(error: ApiError): boolean {
    return ['NO_TOKEN', 'INVALID_TOKEN', 'PASSWORD_CHANGED', 'USER_NOT_FOUND'].includes(
      error.code,
    );
  }

  private copy([arabic, english]: ErrorCopy): string {
    return this.language.text(arabic, english);
  }

  private payload(value: unknown): ApiErrorPayload {
    if (value && typeof value === 'object') {
      return value as ApiErrorPayload;
    }
    if (typeof value === 'string' && value.trim()) {
      return { message: value };
    }
    return {};
  }

  private codeFromStatus(status: number): string {
    if (status === 0) return 'NETWORK_ERROR';
    if (status === 401) return 'INVALID_TOKEN';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'DUPLICATE_FIELD';
    if (status === 429) return 'TOO_MANY_REQUESTS';
    if (status >= 500) return 'INTERNAL_ERROR';
    return 'REQUEST_FAILED';
  }

  private validationMessage(message: string): string {
    const messages: Readonly<Record<string, ErrorCopy>> = {
      'Email is required': ['البريد الإلكتروني مطلوب.', 'Email is required.'],
      'Please enter a valid email': ['أدخل بريداً إلكترونياً صحيحاً.', 'Enter a valid email address.'],
      'Password is required': ['كلمة المرور مطلوبة.', 'Password is required.'],
      'Passwords do not match': ['كلمتا المرور غير متطابقتين.', 'Passwords do not match.'],
      'OTP is required': ['رمز التحقق مطلوب.', 'Verification code is required.'],
      'OTP must be 6 digits': ['رمز التحقق يجب أن يكون 6 أرقام.', 'Verification code must be 6 digits.'],
    };

    return messages[message] ? this.copy(messages[message]) : message;
  }
}

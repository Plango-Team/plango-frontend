export interface IUser {
  id: string;
  email: string;
  password: string | null;
  firstName: string;
  lastName: string;
  userName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;

  // إعدادات المستخدم الخاصة بالجدولة والذكاء الاصطناعي
  preferences: IUserPreferences;

  // إحصائيات الأداء (Productivity Tracking)
  stats?: IUserStats;

  // حالة الحساب
  status: 'active' | 'inactive' | 'suspended';
}

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';

  // الموقع الافتراضي (غالباً بيكون المنزل أو العمل) لحساب المسافات
  homeAddress?: ILocation;
  workAddress?: ILocation;

  // تفضيلات التنقل (تؤثر على خوارزمية Smart Departure)
  preferredTransport: 'car' | 'walking' | 'cycling' | 'public_transport';

  // Buffer Time: وقت إضافي قبل الموعد لضمان عدم التأخير (بالدقائق)
  defaultBufferTime: number;

  // التنبيهات
  notifications: {
    email: boolean;
    push: boolean;
    departureAlerts: boolean; // تنبيهات "حان وقت التحرك الآن"
  };
}

export interface ILocation {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string; // لتسهيل التعامل مع Google Maps API
}

export interface IUserStats {
  completedEvents: number;
  onTimePercentage: number; // نسبة الالتزام بالمواعيد
  totalSavedTime: number; // الوقت الذي وفره PlanGo للمستخدم بالدقائق
}

/**
 * الـ Response المتوقع من عملية تسجيل الدخول
 */
export interface IAuthResponse {
  token: string;
  user: IUser;
  expiresIn: number; // مدة صلاحية الـ Token
}

/**
 * طلب تسجيل الدخول
 */
export interface ILoginRequest {
  email: string;
  password: string;
}

/**
 * طلب إنشاء حساب جديد
 */
export interface ISignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  city: string;
  recurringDays: string[];
  preferences: {
    googleCalendarSync: boolean;
    notifications: boolean;
    locationTracking: boolean;
  };
}

/**
 * طلب نسيان كلمة المرور (إرسال OTP)
 */
export interface IForgotPasswordRequest {
  email: string;
}

/**
 * طلب التحقق من كود OTP
 */
export interface IVerifyOtpRequest {
  email: string;
  otp: string;
}

/**
 * طلب إعادة تعيين كلمة المرور بعد التحقق
 */
export interface IResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

/**
 * استجابة عامة للعمليات
 */
export interface IMessageResponse {
  message: string;
}

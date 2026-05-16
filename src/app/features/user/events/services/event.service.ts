import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { IEvent } from '../interfaces/Ievents';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  http = inject(HttpClient)
  isDevMode = true
  getEvents() : Observable<IEvent[]>{
    if (this.isDevMode) {
      const mockEvents: IEvent[] = [
  {
    id: 1,
    title: 'مؤتمر تصميم تجربة المستخدم 2026',
    organizer: 'Cairo UX Community',
    location: 'مركز المنارة، القاهرة',
    date: new Date('2026-04-27T18:00:00'),
    category: 'تقنية',
    priceType: 'مدفوع',
    isFeatured: true,
    isInterested: false,
    isGoing: true
  },
  {
    id: 2,
    title: 'ورشة التصوير الليلي',
    organizer: 'Light Academy',
    category: 'تصوير',
    date: new Date('2026-04-28T20:00:00'), 
    location: 'كورنيش النيل',
    priceType: 'مجاني',
    isFeatured: false,
    isInterested: false,
    isGoing: false
  },
  {
    id: 3,
    title: 'معرض الفن المعاصر',
    organizer: 'جاليري طاحونة',
    category: 'فن',
    date: new Date('2026-05-01T12:00:00'), 
    location: 'مصر الجديدة',
    priceType: 'مجاني',
    isFeatured: false,
    isInterested: false,
    isGoing: false
  },
  {
    id: 4,
    title: 'أمسية موسيقية مع فرقة كايرو كستس',
    organizer: 'ساقية الصاوي',
    category: 'موسيقى',
    date: new Date('2026-04-30T21:00:00'), // 30 أبريل 9:00 م
    location: 'الزمالك',
    priceType: 'مدفوع',
    isFeatured: false,
    isInterested: false,
    isGoing: false
  },
  {
    id: 5,
    title: 'ندوة ريادة الأعمال',
    organizer: 'GrEEK Campus',
    category: 'تقنية',
    date: new Date('2026-04-29T10:00:00'), 
    location: 'وسط البلد',
    priceType: 'مجاني',
    isFeatured: false,
    isInterested: true, 
    isGoing: false
  },
  {
    id: 6,
    title: 'نادي القراءة الشهري',
    organizer: 'مكتبة كتب خانة',
    category: 'ثقافة',
    date: new Date('2026-05-03T19:00:00'), 
    location: 'المعادي',
    priceType: 'مجاني',
    isFeatured: false,
    isInterested: false,
    isGoing: true 
  }
      ];
      return of(mockEvents).pipe(delay(500));
    }
    return this.http.get<IEvent[]>(`${environment.apiUrl}/events`);
  }
}

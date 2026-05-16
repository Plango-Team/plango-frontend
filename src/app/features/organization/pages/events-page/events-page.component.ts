import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import {
  AttendanceStatus,
  OrganizationAttendance,
  OrganizationEvent,
  OrganizationEventCategory,
} from '../../services/organization-events.service';
import { OrganizationEventsStore } from '../../stores/organization-events.store';
import { NotificationsStore } from '../../../../shared/stores/notifications.store';
import { ToastService } from '../../../../shared/services/toast.service';

type EventsFilter = 'upcoming' | 'past' | 'all';

@Component({
  selector: 'app-organization-events-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './events-page.component.html',
})
export class OrganizationEventsPageComponent {
  @ViewChild('eventModal') eventModal!: ElementRef<HTMLDialogElement>;

  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly organizationEventsStore = inject(OrganizationEventsStore);
  readonly notificationsStore = inject(NotificationsStore);
  readonly toastService = inject(ToastService);

  readonly filter = signal<EventsFilter>('upcoming');
  readonly formError = signal<string | null>(null);

  readonly newEvent = {
    title: '',
    host: '',
    date: '',
    time: '',
    place: '',
    category: 'tech' as OrganizationEventCategory,
    price: 'مجاني',
    description: '',
  };

  readonly categories: { id: OrganizationEventCategory; label: string }[] = [
    { id: 'tech', label: 'تقنية' },
    { id: 'art', label: 'فن' },
    { id: 'music', label: 'موسيقى' },
    { id: 'photo', label: 'تصوير' },
    { id: 'culture', label: 'ثقافة' },
    { id: 'sport', label: 'رياضة' },
  ];

  readonly statusOptions: AttendanceStatus[] = [
    'confirmed',
    'en_route',
    'arrived',
    'at_risk',
    'declined',
  ];

  readonly statusLabel: Record<AttendanceStatus, string> = {
    confirmed: 'مؤكد',
    en_route: 'في الطريق',
    arrived: 'وصل',
    at_risk: 'متأخر محتمل',
    declined: 'اعتذر',
  };

  readonly currentProfileId = computed(() => {
    const socialProfile = this.socialStore.myProfile();
    if (socialProfile) return socialProfile.id;
    return this.authStore.user()?.id ?? null;
  });

  readonly defaultHost = computed(
    () =>
      this.socialStore.myProfile()?.displayName ||
      this.authStore.user()?.organizationName ||
      this.authStore.user()?.displayName ||
      '',
  );

  readonly orgEvents = computed(() => {
    const profileId = this.currentProfileId();
    if (!profileId) return [];

    return this.organizationEventsStore
      .eventsForOwner(profileId)
      .sort((a, b) => this.eventTimestamp(a) - this.eventTimestamp(b));
  });

  readonly visibleEvents = computed(() => {
    const now = Date.now();

    return this.orgEvents().filter((event) => {
      const ts = this.eventTimestamp(event);

      if (this.filter() === 'upcoming') return ts >= now - 6 * 60 * 60 * 1000;
      if (this.filter() === 'past') return ts < now - 6 * 60 * 60 * 1000;
      return true;
    });
  });

  // ─── Modal Actions ─────────────────────────────────
  openCreateModal() {
    this.resetForm();
    this.eventModal.nativeElement.showModal();
  }

  closeCreateModal() {
    this.eventModal.nativeElement.close();
  }

  private resetForm() {
    this.formError.set(null);
    this.newEvent.title = '';
    this.newEvent.host = this.defaultHost();
    this.newEvent.date = '';
    this.newEvent.time = '';
    this.newEvent.place = '';
    this.newEvent.category = 'tech';
    this.newEvent.price = 'مجاني';
    this.newEvent.description = '';
  }

  createEvent() {
    this.formError.set(null);
    const host = this.newEvent.host.trim() || this.defaultHost();

    if (
      !this.newEvent.title.trim() ||
      !host ||
      !this.newEvent.date ||
      !this.newEvent.time ||
      !this.newEvent.place.trim()
    ) {
      this.formError.set(
        'يرجى تعبئة الحقول الأساسية: العنوان، المنظّم، التاريخ، الوقت، والمكان.',
      );
      this.toastService.warning('تحقق من بيانات الفعالية');
      return;
    }

    const profileId = this.currentProfileId();
    if (!profileId) {
      this.formError.set('تعذر تحديد حساب المؤسسة الحالي.');
      this.toastService.error('تعذر تحديد حساب المؤسسة الحالي');
      return;
    }

    const eventTitle = this.newEvent.title.trim();
    const eventDate = this.newEvent.date;
    const eventTime = this.newEvent.time;

    this.organizationEventsStore.createEvent({
      ownerId: profileId,
      title: eventTitle,
      host,
      date: this.newEvent.date,
      time: this.newEvent.time,
      place: this.newEvent.place.trim(),
      category: this.newEvent.category,
      price: this.newEvent.price.trim() || 'مجاني',
      description: this.newEvent.description.trim() || undefined,
    });
    this.notificationsStore.push({
      kind: 'event_published',
      title: 'تم نشر فعالية جديدة',
      body: `${eventTitle} · ${eventDate} ${eventTime}`,
      link: '/organization/events',
    });
    const ownerProfile = this.socialStore.findProfile({ id: profileId });
    const followers = this.socialStore.followersOf(profileId);
    for (const edge of followers) {
      const followerProfile = this.socialStore.findProfile({ id: edge.followerId });
      if (!ownerProfile || !followerProfile) continue;

      this.notificationsStore.push({
        ownerId: edge.followerId,
        kind: 'event_published',
        title: `New event from ${ownerProfile.displayName}`,
        body: `${eventTitle} · ${eventDate} ${eventTime}`,
        link:
          followerProfile.kind === 'org'
            ? `/organization/profile/${ownerProfile.username}`
            : `/user/profile/${ownerProfile.username}`,
      });
    }
    this.toastService.success('تم نشر الفعالية', 'يمكنك الآن متابعة الحضور وحالة الوصول.');

    this.closeCreateModal();
  }

  selectCategory(category: OrganizationEventCategory) {
    this.newEvent.category = category;
  }

  categoryLabel(category: OrganizationEventCategory): string {
    return this.categories.find((item) => item.id === category)?.label ?? category;
  }

  attendeesFor(eventId: string): OrganizationAttendance[] {
    return this.organizationEventsStore.attendancesForEvent(eventId);
  }

  attendanceStatus(attendance: OrganizationAttendance): AttendanceStatus {
    return this.organizationEventsStore.liveStatus(attendance);
  }

  updateStatus(attendanceId: string | undefined, status: AttendanceStatus) {
    if (!attendanceId) return;
    this.organizationEventsStore.updateAttendanceStatus(attendanceId, status);
  }

  attendeeName(attendeeId: string): string {
    return this.socialStore.findProfile({ id: attendeeId })?.displayName ?? attendeeId;
  }

  attendeeUsername(attendeeId: string): string | null {
    return this.socialStore.findProfile({ id: attendeeId })?.username ?? null;
  }

  eventOnTrackPercent(event: OrganizationEvent): number {
    const attendees = this.attendeesFor(event.id!);
    if (!attendees.length) return 0;

    const onTrack = attendees.filter((attendance) => {
      const status = this.attendanceStatus(attendance);
      return status === 'confirmed' || status === 'en_route' || status === 'arrived';
    }).length;

    return Math.round((onTrack / attendees.length) * 100);
  }

  private eventTimestamp(event: OrganizationEvent): number {
    const ts = new Date(`${event.date}T${event.time}:00`).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  }
}

import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { authStore } from '../../../../auth/auth.store';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { Appointment } from '../../../appointments/interfaces/IAppointment';
import { SetLocationModalComponent } from '../../../dashboard/components/set-location-modal/set-location-modal.component';
import { SocialService } from '../../../social/services/social.service';
import { MapStore } from '../../map.store';
import { AppointmentChatMessage, AppointmentChatService } from '../../services/appointment-chat.service';
import { InvitModalComponent } from '../invit-modal/invit-modal.component';

@Component({
  selector: 'app-trips',
  imports: [DatePipe, IconComponent, InvitModalComponent, SetLocationModalComponent],
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css',
})
export class TripsComponent {
  readonly mapStore = inject(MapStore);
  readonly appStore = inject(AppointmentsStore);
  private readonly auth = inject(authStore);
  readonly chatService = inject(AppointmentChatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly socialService = inject(SocialService);
  private readonly loadingOwnerIds = new Set<string>();

  readonly upcomingAppointments = computed(() => this.mapStore.sortedAppointments().slice(0, 4));
  readonly pendingInvites = computed(() => this.appStore.pendingInvites());
  readonly currentUserId = computed(() => this.auth.user()?._id ?? null);
  readonly activeChatAppointmentId = signal<string | null>(null);
  readonly chatMessages = signal<AppointmentChatMessage[]>([]);
  readonly chatDraft = signal('');
  readonly chatLoading = signal(false);
  readonly chatError = signal<string | null>(null);
  readonly ownerNames = signal<Record<string, string>>({});

  constructor() {
    this.appStore.reloadAppointmentsNow();

    effect(() => {
      const appointments = this.upcomingAppointments();

      untracked(() => {
        appointments.forEach((appointment) => this.ensureOwnerName(appointment));
      });
    });

    this.chatService.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (this.messageAppointmentId(message) !== this.activeChatAppointmentId()) return;

        this.chatMessages.update((messages) => {
          if (messages.some((item) => item._id === message._id)) return messages;
          return [...messages, message];
        });
      });

    this.chatService.errors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (this.activeChatAppointmentId()) {
          this.chatError.set(message);
        }
      });
  }

  @HostListener('window:focus')
  refreshSharedAppointments(): void {
    this.appStore.reloadAppointmentsNow();
  }

  destinationLabel(appointment: Appointment): string {
    return (
      appointment.destinationLocation?.addressName ||
      appointment.destinationLocation?.fullAddress ||
      'الموقع غير محدد'
    );
  }

  participantCount(appointment: Appointment): number {
    return appointment.participants?.filter((participant) => participant.receiverId).length ?? 0;
  }

  participantNames(appointment: Appointment): string {
    const currentUserId = this.currentUserId();
    const names = new Map<string, string>();
    const owner = this.ownerSummary(appointment);

    if (owner.id && owner.id !== currentUserId && owner.name) {
      names.set(owner.id, owner.name);
    }

    appointment.participants?.forEach((participant) => {
      const receiver = participant.receiverId;
      if (!receiver || receiver._id === currentUserId) return;
      names.set(receiver._id, receiver.name);
    });

    if (this.activeChatAppointmentId() === appointment._id) {
      this.chatMessages().forEach((message) => {
        if (typeof message.sender === 'string' || message.sender._id === currentUserId) return;
        names.set(message.sender._id, message.sender.name);
      });
    }

    return names.size ? [...names.values()].join('، ') : 'المشاركون';
  }

  canChat(appointment: Appointment): boolean {
    return this.participantCount(appointment) > 0;
  }

  isChatOpen(appointment: Appointment): boolean {
    return this.activeChatAppointmentId() === appointment._id;
  }

  toggleChat(appointment: Appointment): void {
    if (this.isChatOpen(appointment)) {
      this.activeChatAppointmentId.set(null);
      this.chatMessages.set([]);
      this.chatDraft.set('');
      this.chatError.set(null);
      return;
    }

    if (!this.canChat(appointment)) return;

    this.activeChatAppointmentId.set(appointment._id);
    this.chatMessages.set([]);
    this.chatDraft.set('');
    this.chatError.set(null);
    this.chatLoading.set(true);

    this.ensureOwnerName(appointment);
    this.chatService.join(appointment._id, this.chatToken());
    this.chatService.getMessages(appointment._id).subscribe({
      next: (messages) => {
        if (this.activeChatAppointmentId() !== appointment._id) return;
        this.chatMessages.set(messages);
        this.chatLoading.set(false);
      },
      error: (err) => {
        if (this.activeChatAppointmentId() !== appointment._id) return;
        this.chatError.set(err.error?.message || err.message || 'تعذر تحميل محادثة الموعد');
        this.chatLoading.set(false);
      },
    });
  }

  updateChatDraft(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.chatDraft.set(input.value);
  }

  sendChatMessage(event: Event): void {
    event.preventDefault();

    const appointmentId = this.activeChatAppointmentId();
    const content = this.chatDraft().trim();
    if (!appointmentId || !content) return;

    this.chatService.sendMessage(appointmentId, content, this.chatToken());
    this.chatDraft.set('');
  }

  senderName(message: AppointmentChatMessage): string {
    return typeof message.sender === 'string' ? 'مستخدم' : message.sender.name || 'مستخدم';
  }

  isMine(message: AppointmentChatMessage): boolean {
    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
    return senderId === this.currentUserId();
  }

  messageClasses(message: AppointmentChatMessage): string {
    return this.isMine(message)
      ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-3 py-2 text-brand-foreground'
      : 'mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-2 px-3 py-2 text-ink-fg';
  }

  minutesRemaining(appointment: Appointment): number {
    return Math.max(
      0,
      Math.floor((new Date(appointment.arrivalTime).getTime() - Date.now()) / 60_000),
    );
  }

  travelMinutes(appointment: Appointment): number {
    return Math.max(0, Math.round(appointment.estimatedTravelTime ?? 0));
  }

  transportLabel(mode: string): string {
    const labels: Record<string, string> = {
      driving: 'سيارة',
      walking: 'مشي',
      bicycling: 'دراجة',
      other: 'مواصلات',
    };
    return labels[mode] ?? mode;
  }

  loadRoute(appointment: Appointment): void {
    this.mapStore.loadRouteFromAppointment(appointment);
  }

  private messageAppointmentId(message: AppointmentChatMessage): string {
    return typeof message.appointment === 'string' ? message.appointment : message.appointment._id;
  }

  private chatToken(): string | null {
    return this.auth.token() || localStorage.getItem('token');
  }

  private ownerSummary(appointment: Appointment): { id: string | null; name: string | null } {
    if (typeof appointment.userId === 'string') {
      return {
        id: appointment.userId,
        name: this.ownerNames()[appointment.userId] ?? null,
      };
    }

    return {
      id: appointment.userId?._id ?? null,
      name:
        appointment.userId?.name ||
        (appointment.userId?._id ? this.ownerNames()[appointment.userId._id] : null) ||
        null,
    };
  }

  private ensureOwnerName(appointment: Appointment): void {
    const owner = this.ownerSummary(appointment);
    if (!owner.id || owner.name || owner.id === this.currentUserId() || this.loadingOwnerIds.has(owner.id)) {
      return;
    }

    this.loadingOwnerIds.add(owner.id);
    this.socialService.getProfile(owner.id).subscribe({
      next: (profile) => {
        this.ownerNames.update((names) => ({
          ...names,
          [owner.id as string]: profile.displayName,
        }));
        this.loadingOwnerIds.delete(owner.id as string);
      },
      error: () => {
        this.loadingOwnerIds.delete(owner.id as string);
      },
    });
  }
}

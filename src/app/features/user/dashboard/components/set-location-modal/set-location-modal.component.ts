import { TranslatePipe } from '@ngx-translate/core';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AcceptInvitePayload } from '../../../map/services/invit.service';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { CommonModule } from '@angular/common';
import { MapStore } from '../../../map/map.store';
import { LanguageService } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-set-location-modal',
  imports: [TranslatePipe, IconComponent, CommonModule],
  templateUrl: './set-location-modal.component.html',
  styleUrl: './set-location-modal.component.css',
})
export class SetLocationModalComponent {
  err = signal<string>('')
  appStore = inject(AppointmentsStore)
  mapStore = inject(MapStore)
  readonly language = inject(LanguageService)
  success = signal<string>('')
  transportation :'driving' | 'bicycling' | 'walking' | 'other'= 'driving'
  appID = ''
  
  get ar(): boolean {
    return this.language.isArabic();
  }

  transports: { id:'driving' | 'bicycling' | 'walking' | 'other'; icon: string; ar: string; en: string }[] = [
    { id: 'driving', icon: 'Car01Icon', ar: 'سيارة', en: 'Driving' },
    { id: 'bicycling', icon: 'Bicycle01Icon', ar: 'دراجة', en: 'Bicycling' },
    { id: 'walking', icon: 'Walking01Icon', ar: 'مشي', en: 'Walking' },
    { id: 'other', icon: 'Bus01Icon', ar: 'مواصلات', en: 'Other' },
  ];
  
  @ViewChild('setLocModal') setLocModal!: ElementRef<HTMLDialogElement>;
  open(appId:string){
    this.appID = appId;
    this.err.set('');
    this.success.set('');
    this.setLocModal.nativeElement.showModal();
  }
  close(){
    this.setLocModal.nativeElement.close();
  }
  onAcceptInvite(appointmentId: string) {
    if (!appointmentId || this.appStore.activeInviteId() === appointmentId) return;
    const userLoc = this.mapStore.userLocation()
    if (!userLoc) {
      this.err.set(
        this.language.text(
          'فعّل الموقع الحالي قبل قبول الدعوة',
          'Enable your current location before accepting the invitation.',
        ),
      );
      return;
    }
  const dataToSubmit: AcceptInvitePayload = {
    startLocation: {
      addressName: this.language.text('الموقع الحالي', 'Current location'),
      fullAddress: this.language.text('الموقع الحالي', 'Current location'),
      type: 'Point',
      coordinates: [userLoc.lng, userLoc.lat]
    },
    transportation: this.transportation 
  };

  this.appStore.acceptInvitation({
    appointmentId: appointmentId,
    payload: dataToSubmit
  });
  this.close();
}
}

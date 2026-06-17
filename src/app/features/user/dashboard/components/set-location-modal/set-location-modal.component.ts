import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AcceptInvitePayload } from '../../../map/services/invit.service';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { CommonModule } from '@angular/common';
import { MapStore } from '../../../map/map.store';

@Component({
  selector: 'app-set-location-modal',
  imports: [IconComponent, CommonModule],
  templateUrl: './set-location-modal.component.html',
  styleUrl: './set-location-modal.component.css',
})
export class SetLocationModalComponent {
  err = signal<string>('')
  appStore = inject(AppointmentsStore)
  mapStore = inject(MapStore)
  success = signal<string>('')
  transportation :'driving' | 'bicycling' | 'walking' | 'other'= 'driving'
  appID = ''
  
  ar = true;

  transports: { id:'driving' | 'bicycling' | 'walking' | 'other'; icon: string; ar: string; en: string }[] = [
    { id: 'driving', icon: 'Car01Icon', ar: 'سيارة', en: 'Driving' },
    { id: 'bicycling', icon: 'Bicycle01Icon', ar: 'دراجة', en: 'Bicycling' },
    { id: 'walking', icon: 'Walking01Icon', ar: 'مشي', en: 'Walking' },
    { id: 'other', icon: 'Bus01Icon', ar: 'مواصلات', en: 'Other' },
  ];
  
  @ViewChild('setLocModal') setLocModal!: ElementRef<HTMLDialogElement>;
  open(appId:string){
    this.appID = appId
    this.setLocModal.nativeElement.showModal();
  }
  close(){
    this.setLocModal.nativeElement.close();
  }
  onAcceptInvite(appointmentId: string) {
    const userLoc = this.mapStore.userLocation()
    if (!userLoc) {
      this.err.set('فعّل الموقع الحالي قبل قبول الدعوة');
      return;
    }
  const dataToSubmit: AcceptInvitePayload = {
    startLocation: {
      addressName: 'الموقع الحالي', 
      fullAddress: 'الموقع الحالي',
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

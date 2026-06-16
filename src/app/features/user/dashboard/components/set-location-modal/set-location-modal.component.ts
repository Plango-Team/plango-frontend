import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AcceptInvitePayload } from '../../../map/services/invit.service';
import { AppointmentsStore } from '../../../appointments/appointments.store';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocationComboboxComponent } from "../../../../../shared/components/location-combobox/location-combobox.component";
import { MapStore } from '../../../map/map.store';

@Component({
  selector: 'app-set-location-modal',
  imports: [IconComponent, FormsModule, CommonModule, LocationComboboxComponent],
  templateUrl: './set-location-modal.component.html',
  styleUrl: './set-location-modal.component.css',
})
export class SetLocationModalComponent {
  err = signal<string>('')
  appStore = inject(AppointmentsStore)
  mapStore = inject(MapStore)
  password = ''
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
  const dataToSubmit: AcceptInvitePayload = {
    startLocation: {
      addressName: 'الموقع الحالي', 
      coordinates: [userLoc.lng, userLoc.lng] 
    },
    transportation: this.transportation 
  };

  this.appStore.acceptInvitation({
    appointmentId: appointmentId,
    payload: dataToSubmit
  });
}
}

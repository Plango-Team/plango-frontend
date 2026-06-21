import { TranslatePipe } from '@ngx-translate/core';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AppointmentsStore } from '../../../appointments/appointments.store';

@Component({
  selector: 'app-delet-app-modal',
  imports: [TranslatePipe],
  templateUrl: './delet-app-modal.component.html',
  styleUrl: './delet-app-modal.component.css',
})
export class DeletAppModalComponent {
  appointmentsStore= inject(AppointmentsStore)
  appid = ''
  type = ''
  @ViewChild('deleteAppModal') deleteAppModal!: ElementRef<HTMLDialogElement>;
deleteApp = signal<boolean>(false)
  open(appointmentId:string){
    this.appid = appointmentId
    this.deleteAppModal.nativeElement.showModal();
  }
  close(){
    this.deleteAppModal.nativeElement.close();
  }
  deleteAppointment(appointmentId:string){
      this.appointmentsStore.removeAppointment(appointmentId)
  }
  deleteSeries(appointmentId:string){
      this.appointmentsStore.removeSerialAppointment(appointmentId)
  }
}

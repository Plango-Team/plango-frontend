import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, input, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { MapStore } from '../../map.store';
import { environment } from '../../../../../../environments/environment';
import { AppointmentsStore } from '../../../appointments/appointments.store';

@Component({
  selector: 'app-invit-modal',
  imports: [FormsModule, IconComponent],
  templateUrl: './invit-modal.component.html',
  styleUrl: './invit-modal.component.css',
})
export class InvitModalComponent {
  appStore = inject(AppointmentsStore)
  mapStore = inject(MapStore)
    http = inject(HttpClient)
    appId = ''
  
    searchRes : any[] = []
    showDropDown = false
  
    date=''
    time=''
  
    invitData = {
      title:'',
      location:'',
      date:new Date(),
      arrive:0,
      invitees:[
        {
           inviteeUsarname:'',
        }
      ]
    }
  
    
    @ViewChild('invitModal') invitModal!: ElementRef<HTMLDialogElement>;
    open(appId:string){
      this.appId = appId
      this.invitModal.nativeElement.showModal();
    }
    close(){
      this.invitModal.nativeElement.close();
    }
    onSubmit(){
      if(this.date && this.time){
        const fullDate = `${this.date}T${this.time}:00`;
        this.invitData.date = new Date(fullDate);
      }
        const usernamesToSend = this.invitData.invitees.map(i => i.inviteeUsarname.trim()).filter(
          username => username !== '');
          if(usernamesToSend.length > 0 && this.invitData.title.trim()){
            this.appStore.sendInvitations({
              appointmentId:this.appId,
              usernames:usernamesToSend
            });
            // this.close()
          }
    }

    addInvitee(){
      this.invitData.invitees.push({inviteeUsarname:''})
    }

    removeInvitee(index:number){
      if(this.invitData.invitees.length > 1){
        this.invitData.invitees.splice(index,1)
      }
    }

    onLocationInput(searchTerm : string){
      if(!searchTerm.trim() || searchTerm.length < 3){
        this.searchRes = []
        this.showDropDown = false
        return;
      }
      const url = `${environment.nominatimUrl}/search?format=json&q=${encodeURIComponent(searchTerm)}&accept-language=ar&limit=5&email=test-plango@gmail.com`
      this.http.get<any[]>(url).subscribe({
        next:(data) => {
          this.searchRes = data
          this.showDropDown = data.length > 0
        },
        error: (e) => {
          //error
        }
      })
    }
  
    selectLocation(loc : any){
      this.invitData.location = loc.display_name;
      this.searchRes = []
      this.showDropDown = false 
  }
} 

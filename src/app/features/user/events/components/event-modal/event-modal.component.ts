import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventsStore } from '../../events.store';
import { IEvent } from '../../interfaces/Ievents';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-event-modal',
  imports: [FormsModule, IconComponent],
  templateUrl: './event-modal.component.html',
  styleUrl: './event-modal.component.css',
})
export class EventModalComponent {
  store = inject(EventsStore)
  http = inject(HttpClient)

  searchRes : any[] = []
  showDropDown = false

  date=''
  time=''

  eventData : IEvent= {
    title:'',
    location:'',
    date:new Date(),
    category:'',
    priceType:'',
    organizer:''
  }

  categories = ['تقنية', 'فن', 'موسيقى', 'ثقافة', 'رياضة'];

  
  @ViewChild('eventtModal') eventtModal!: ElementRef<HTMLDialogElement>;
  open(){
    this.eventtModal.nativeElement.showModal();
  }
  close(){
    this.eventtModal.nativeElement.close();
  }
  onSubmit(){
    if(this.date && this.time){
      const fullDate = `${this.date}T${this.time}:00`;
      this.eventData.date = new Date(fullDate);
      if(this.eventData.title.trim()){
      this.store.addEvent({...this.eventData})
      this.eventData = {
    title:'',
    location:'',
    date:null,
    category:'',
    priceType:'',
    organizer:''
  }
  this.close()
    }
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
    this.eventData.location = loc.display_name;
    this.searchRes = []
    this.showDropDown = false
  }
}

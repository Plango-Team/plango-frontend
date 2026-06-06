import { Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { MapStore } from '../../map.store';
import { authStore } from '../../../../auth/auth.store';

@Component({
  selector: 'app-trips',
  imports: [IconComponent], 
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css',
})
export class TripsComponent {
  mapStore = inject(MapStore)
  isChatOpen = signal(false)
  newMessageText = signal('')
  authStore = inject(authStore)
  currentUser = computed(() => {
    const user = this.authStore.user();
    return user ? `${user.name}`.trim() || 'ضيف' : 'ضيف';
  });
  frindsArray = signal([
    {
      name: this.currentUser(),
      late:20,
      arrive:8,
      distance:4.2,
      isEditing : false,
      showMenu: false,
      states:'في الطريق',
      transport_mode:'car'
    },
    {
      name:'أريج حسنيين',
      late:10,
      arrive:10,
      distance:2.2,
      isEditing : false,
      showMenu: false,
      states:'في الطريق',
      transport_mode:'walk'
    },
    {
      name:'مرام عامر',
      late:0,
      arrive:0,
      distance:0,
      isEditing : false,
      showMenu: false,
      states:'وصل',
      transport_mode:'car'
    },
  ]);

  comingCount = computed(() => {
    return this.frindsArray().filter(friend => friend.states === 'في الطريق').length
  })

  toggleMenu(index: number) {
    this.frindsArray.update(friends => {
      friends[index].showMenu = !friends[index].showMenu;
      return [...friends];
    });
  }

  toggleTripMenu(index: number) {
    this.mapStore.toggleTripMenu(index)
  }

  updateFriendName(index: number, newName: string) {
  this.frindsArray.update(friends => {
    friends[index].name = newName;
    friends[index].isEditing = false;
    return [...friends]; 
  });
  }

  updateFriendState(index: number, newState: string) {
  this.frindsArray.update(friends => {
    friends.forEach((f,i) => f.showMenu = false)
    friends[index].states = newState;
    return [...friends]; 
  });
  }

  enableEdit(index:number){
    this.frindsArray.update(friends => {
      friends.forEach((f,i) => f.showMenu = false)
      friends[index].isEditing = true
      return [...friends]
    })
  }

  deleteFriend(index:number){
    this.frindsArray.update(friends => {
      friends.forEach((f,i) => f.showMenu = false)
      return friends.filter((x,i) => i !== index)})
  }

  deleteTrip(index:number){
    this.mapStore.deleteTrip(index)
  }

  sendMessage(){
    const text = this.newMessageText().trim()
    if(text){
      this.mapStore.addMessage(text)
      this.newMessageText.set('')
    }
  }

  toggelChat(){
    this.isChatOpen.update(v => !v)
  }

}

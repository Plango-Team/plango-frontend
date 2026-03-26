import { Component, HostListener } from '@angular/core';
import { IconComponent } from "../../../../shared/components/icon/icon.component";

@Component({
  selector: 'app-intro-section',
  imports: [IconComponent],
  templateUrl: './intro-section.component.html',
  styleUrl: './intro-section.component.css',
})
export class IntroSectionComponent {
  isTop = true
  
  @HostListener('window:scroll' , [])
  onWindowScroll(){
    if(window.scrollY < 100)
    {
      this.isTop = true
    }
    else{
      this.isTop = false
    }
  }

}

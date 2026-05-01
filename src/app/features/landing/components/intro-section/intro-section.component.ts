import { Component, HostListener, inject } from '@angular/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-intro-section',
  imports: [IconComponent, RouterLink],
  templateUrl: './intro-section.component.html',
  styleUrl: './intro-section.component.css',
})
export class IntroSectionComponent {
  
  public themeService = inject(ThemeService);
  isTop = true;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (window.scrollY < 100) {
      this.isTop = true;
    } else {
      this.isTop = false;
    }
  }
}

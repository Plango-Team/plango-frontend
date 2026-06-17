import { Injectable } from '@angular/core';
import Aos from 'aos';

@Injectable({
  providedIn: 'root',
})
export class AnimationService {
  initAos(options?: Aos.AosOptions) {
    Aos.init({
      duration: 700,
      once: true,
      easing: 'ease-in-out-cubic',
    });
  }
}

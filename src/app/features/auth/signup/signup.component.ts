import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  public themeService = inject(ThemeService);

  currentStep = signal(1);

  // دالة لتحديد كلاسات دوائر التقدم
  stepCircleClass(step: number): string {
    const base =
      'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 border-2 z-10 ';
    if (step < this.currentStep()) {
      return base + 'bg-primary-500 border-primary-500 text-white';
    } else if (step === this.currentStep()) {
      return (
        base +
        'bg-(--card-bg) border-primary-500 text-primary-500 scale-110 shadow-lg shadow-primary-500/20'
      );
    }
    return base + 'bg-(--card-bg) border-(--border-color) text-(--muted-fg)';
  }

  nextStep() {
    if (this.currentStep() < 3) this.currentStep.update((s) => s + 1);
  }

  prevStep() {
    if (this.currentStep() > 1) this.currentStep.update((s) => s - 1);
  }
}

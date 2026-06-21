import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { LanguageService } from './language.service';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);

  handleError(error: unknown): void {
    console.error(error);
    this.toast.error(
      this.language.text('حدث خطأ غير متوقع', 'Something went wrong'),
      this.language.text(
        'تعذر عرض هذا الجزء من الصفحة. أعد المحاولة أو حدّث الصفحة.',
        'This part of the page could not be displayed. Try again or refresh the page.',
      ),
    );
  }
}

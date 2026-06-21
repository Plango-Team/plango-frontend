import { TranslatePipe } from '@ngx-translate/core';
import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { authStore } from '../../../../auth/auth.store';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguageService } from '../../../../../core/services/language.service';
import { ApiErrorService } from '../../../../../core/services/api-error.service';

@Component({
  selector: 'app-delete-modal',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './delete-modal.component.html',
  styleUrl: './delete-modal.component.css',
})
export class DeleteModalComponent {
store = inject(authStore)
service = inject(AuthService)
  http = inject(HttpClient)
  router = inject(Router)
  readonly language = inject(LanguageService)
  private readonly apiErrors = inject(ApiErrorService)
  err = signal<string>('')
  password = ''
  success = signal<string>('')
  showPassword= signal<boolean>(false);
  count = signal<number>(3)
  
  @ViewChild('deleteModal') deleteModal!: ElementRef<HTMLDialogElement>;
  open(){
    this.deleteModal.nativeElement.showModal();
  }
  close(){
    this.deleteModal.nativeElement.close();
  }
  onSubmit(){
    this.showPassword.set(true)
  }
  deleteAccount():void{ 
    if(!this.password.trim()){
      this.err.set(
        this.language.text(
          'برجاء أدخل كلمة المرور بشكل صحيح',
          'Enter your password correctly.',
        ),
      )
      return;
    }
    this.service.deleteAccount(this.password).subscribe({
      next:(res) => {
        this.err.set('')
        this.store.logOut()
        const interval = setInterval(()=>{
          this.count.update(val=>val-1);
          if(this.count() > 0){
            this.success.set(
              this.language.text(
                'يتم حذف حسابك نهائيا، سيتم إعادة توجيهك خلال ثوانٍ.',
                'Your account is being permanently deleted. You will be redirected shortly.',
              ),
            )
          }else{
            clearInterval(interval)
            this.router.navigate(['/auth/login'])
          }
        },1000);
      },
      error: (err) => {
        this.err.set(
          this.apiErrors.message(
            err,
            'فشل حذف الحساب، يرجى التحقق من كلمة المرور.',
            'Could not delete the account. Check your password.',
          ),
        )
      }
    })
    this.close()
  }
}

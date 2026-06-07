import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { authStore } from '../../../../auth/auth.store';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-delete-modal',
  imports: [IconComponent,FormsModule],
  templateUrl: './delete-modal.component.html',
  styleUrl: './delete-modal.component.css',
})
export class DeleteModalComponent {
store = inject(authStore)
service = inject(AuthService)
  http = inject(HttpClient)
  router = inject(Router)
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
      this.err.set('برجاء أدخل كلمة المرور بشكل صحيح')
      return;
    }
    this.service.deleteAccount(this.password).subscribe({
      next:(res) => {
        this.err.set('')
        this.store.logOut()
        const interval = setInterval(()=>{
          this.count.update(val=>val-1);
          if(this.count() > 0){
            this.success.set('يتم حذف حسابك نهائيا ، سيتم إعادة توجيهك خلال ثواني')
          }else{
            clearInterval(interval)
            this.router.navigate(['/auth/login'])
          }
        },1000);
      },
      error: (err) => {
        this.err.set(err.error?.message || 'فشل حذف الحساب ، يرجي التحقق من كلمة المرور')
      }
    })
    this.close()
  }
}

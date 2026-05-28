import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// ── Custom validator: password complexity ─────────────────────────────────────
function passwordComplexity(control: AbstractControl): { [key: string]: boolean } | null {
  const val: string = control.value ?? '';
  const errors: { [key: string]: boolean } = {};
  if (!/[A-Z]/.test(val))          errors['noUppercase']  = true;
  if (!/[a-z]/.test(val))          errors['noLowercase']  = true;
  if (!/[0-9]/.test(val))          errors['noNumber']     = true;
  if (!/[^A-Za-z0-9]/.test(val))   errors['noSpecial']    = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html'
})
export class SignupComponent implements OnInit {

  form!: FormGroup;

  isLoading   = false;
  showPassword = false;

  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' | '' = '';

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(50)]],
      email:    ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(8), passwordComplexity]]
    });
  }

  // ── Getters ─────────────────────────────────────────────────────────────────
  get username() { return this.form.get('username')!; }
  get email()    { return this.form.get('email')!;    }
  get password() { return this.form.get('password')!; }

  // ── Password strength helpers ────────────────────────────────────────────────
  get strengthScore(): number {
    const v = this.password.value ?? '';
    let score = 0;
    if (/[A-Z]/.test(v))        score++;
    if (/[a-z]/.test(v))        score++;
    if (/[0-9]/.test(v))        score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return score;
  }

  get rules() {
    const v = this.password.value ?? '';
    return {
      minLen:   v.length >= 8,
      upper:    /[A-Z]/.test(v),
      lower:    /[a-z]/.test(v),
      number:   /[0-9]/.test(v),
      special:  /[^A-Za-z0-9]/.test(v)
    };
  }

  strengthBarClass(index: number): string {
    return index < this.strengthScore ? `active-${this.strengthScore}` : '';
  }

  // ── Form actions ─────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading    = true;
    this.alertMessage = '';
    this.alertType    = '';

    const payload = {
      username: this.username.value.trim(),
      email:    this.email.value.trim(),
      password: this.password.value
    };

    this.auth.register(payload).subscribe({
      next: (res) => {
        this.isLoading    = false;
        this.alertType    = 'success';
        this.alertMessage = res.message; // "Registration successful. Please log in."

        // Redirect to login after short delay
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err: Error) => {
        this.isLoading    = false;
        this.alertType    = 'error';
        this.alertMessage = err.message;
        // Do NOT redirect — user stays on signup page
      }
    });
  }

  onClear(): void {
    this.form.reset();
    this.alertMessage = '';
    this.alertType    = '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}

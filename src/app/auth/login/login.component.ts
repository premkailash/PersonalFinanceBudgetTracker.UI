import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service'

// ── Same password validator reused from signup ────────────────────────────────
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
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {

  form!: FormGroup;

  isLoading    = false;
  showPassword = false;

  alertMessage = '';
  alertType: 'success' | 'error' | 'warning' | '' = '';

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // If already logged in, skip straight to dashboard
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(8), passwordComplexity]]
    });
  }

  // ── Getters ──────────────────────────────────────────────────────────────────
  get email()    { return this.form.get('email')!;    }
  get password() { return this.form.get('password')!; }

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
      email:    this.email.value.trim(),
      password: this.password.value
    };

    this.auth.login(payload).subscribe({
      next: (res) => {
        this.isLoading    = false;
        this.alertType    = 'success';
        this.alertMessage = res.message; // "Login successful."

        // Persist session to localStorage
        this.auth.saveSession(res);

        // Redirect to dashboard after brief flash of success
        setTimeout(() => this.router.navigate(['/dashboard']), 800);
      },
      error: (err: Error) => {
        this.isLoading    = false;
        this.alertType    = 'error';
        // Surface the exact backend message:
        // "No account found with email '{email}'."
        // "Invalid password. Please try again."
        this.alertMessage = err.message;
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

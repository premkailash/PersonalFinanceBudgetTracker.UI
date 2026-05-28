# PersonalFinanceBudgetTracker.UI — Angular Frontend

Angular 17 standalone components frontend for the FinanceApp Personal Budget Tracker API.

## Stack

- **Angular 17** — standalone components, signals-ready
- **Angular Reactive Forms** — full validation with custom password-complexity validator
- **Angular Router** — lazy-loaded routes with auth guard
- **HttpClient + functional interceptor** — JWT Bearer token attached automatically
- **Design** — Dark luxury theme with DM Serif Display + DM Sans, gold accents

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   └── login.component.html
│   │   └── signup/
│   │       ├── signup.component.ts
│   │       └── signup.component.html
│   ├── dashboard/
│   │   └── dashboard.component.ts
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── models/
│   │   └── auth.models.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── environments/
│   ├── environment.ts          ← development API URL
│   └── environment.prod.ts     ← production API URL
├── styles.scss                 ← global design tokens + layout
├── index.html
└── main.ts
```

---

## Setup

### 1. Prerequisites
```bash
node >= 18
npm  >= 9
npm install -g @angular/cli@17
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API URL
Edit `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7001'   // ← your .NET backend URL
};
```

### 4. Run development server
```bash
ng serve
# Open http://localhost:4200
```

### 5. Build for production
```bash
ng build --configuration production
```

---

## Pages & Routes

| Route        | Component            | Guard      | Description                     |
|--------------|----------------------|------------|---------------------------------|
| `/`          | redirect → `/login`  | —          |                                 |
| `/login`     | `LoginComponent`     | —          | Login with email + password     |
| `/signup`    | `SignupComponent`    | —          | Registration form               |
| `/dashboard` | `DashboardComponent` | `authGuard`| Protected — requires JWT token  |
| `/**`        | redirect → `/login`  | —          |                                 |

---

## Features

### Sign Up (`/signup`)
- Username — required, max 50 chars
- Email — required, valid email, max 100 chars
- Password — min 8 chars + uppercase + lowercase + number + special char
- Live password strength indicator (4 coloured bars + rule checklist)
- Show/hide password toggle
- On success: shows "Registration successful. Please log in." → redirects to `/login` after 1.8 s
- On duplicate email: shows backend error, stays on signup page
- Clear button resets all fields and alerts

### Login (`/login`)
- Sign Up link in **top-right corner** of the form panel
- Email + Password with same validation as signup
- On success: saves `{ token, userId, role }` to localStorage, redirects to `/dashboard`
- Backend error messages surfaced verbatim:
  - "No account found with email '{email}'."
  - "Invalid password. Please try again."
- Clear button resets all fields and alerts

### Session Storage (localStorage keys)
| Key         | Value              |
|-------------|--------------------|
| `fa_token`  | JWT Bearer token   |
| `fa_userId` | Authenticated user ID |
| `fa_role`   | `User` or `Admin`  |

### JWT Interceptor
All HTTP requests automatically include `Authorization: Bearer <token>` when a token is present in localStorage.

---

## CORS Note

Ensure your .NET backend allows `http://localhost:4200` in its CORS policy:
```csharp
builder.Services.AddCors(options =>
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()));
// ...
app.UseCors("Frontend");
```

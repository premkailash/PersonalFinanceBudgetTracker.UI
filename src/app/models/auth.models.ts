// ── Request DTOs (match C# backend exactly) ─────────────────────────────────

export interface RegisterRequestDto {
    username: string;
    email: string;
    password: string;
  }
  
  export interface LoginRequestDto {
    email: string;
    password: string;
  }
  
  // ── Response DTOs ────────────────────────────────────────────────────────────
  
  export interface RegisterResponse {
    message: string;
  }
  
  export interface LoginResponse {
    message: string;
    token:   string;
    userId:  number;
    role:    string;
    userName: string;
  }
  
  // ── Stored session ───────────────────────────────────────────────────────────
  
  export interface AuthSession {
    token:  string;
    userId: number;
    role:   string;
    userName: string;
  }
  
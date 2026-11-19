export type UserRole = "admin" | "user";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: AuthError | null;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: Date;
}

export interface Asset {
  id: string;
  user_id: string;
  type: 'STOCK' | 'CRYPTO' | 'ETF' | 'BOND' | 'OTHER';
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  purchase_date: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
export type Role = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  role?: Role;
  created_at?: string;
  updated_at?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type DashboardSummary = {
  counts: Record<string, number>;
  orders_by_status: Record<string, number>;
  wallet_balances: Array<{ name: string; currency: string; balance: string }>;
  order_total_by_currency: Array<{ currency: string; total: string }>;
  latest_audit: AuditLog[];
};

export type AuditLog = {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
};

export type ImportPreview = {
  filename: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
};

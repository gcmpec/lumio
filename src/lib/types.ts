export type Rank = "Staff" | "Senior" | "Manager" | "Admin";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  rank: Rank;
}

export interface SessionData {
  sessionId: string;
  token: string;
  expiresAt: string;
}

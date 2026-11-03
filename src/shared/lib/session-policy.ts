export const SESSION_MAX_AGE = {
  admin: 8 * 3600 * 1000,
  remember: 30 * 24 * 3600 * 1000,
  default: 12 * 3600 * 1000,
} as const;

export function sessionMaxAgeMs(role: string | undefined, remember: boolean) {
  if (role === "admin") return SESSION_MAX_AGE.admin;
  return remember ? SESSION_MAX_AGE.remember : SESSION_MAX_AGE.default;
}

export function isSessionExpired(input: {
  lastActive?: number;
  issuedAt?: number;
  role?: string;
  remember: boolean;
  now?: number;
}) {
  const reference = input.lastActive ?? (input.issuedAt ?? 0) * 1000;
  if (!reference) return false;
  const now = input.now ?? Date.now();
  return now - reference > sessionMaxAgeMs(input.role, input.remember);
}

const EMAIL_SPLIT_REGEX = /[\n,;]/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAllowedEmails(): Set<string> {
  const raw = process.env.AUTH_EMAIL_ALLOWLIST ?? "";
  const items = raw
    .split(EMAIL_SPLIT_REGEX)
    .map(normalizeEmail)
    .filter(Boolean);
  return new Set(items);
}

export function isEmailAllowed(email: string) {
  const allowlist = getAllowedEmails();
  if (allowlist.size === 0) return true; // empty allowlist means open signup
  return allowlist.has(normalizeEmail(email));
}

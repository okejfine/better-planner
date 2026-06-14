const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ?? "king@hoth.com,emward123@live.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

import type { Profile } from "@/lib/types";

export function isBypassAuthEnabled() {
  return process.env.BYPASS_AUTH === "true";
}

export const BYPASS_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dev-bypass@example.com",
  display_name: "Dev User",
  avatar_color: "#6366f1",
};

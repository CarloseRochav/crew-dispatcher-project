import type { Database } from "@/lib/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

const HOME_PATHS = {
  dispatcher: "/board",
  crew: "/crew",
} as const satisfies Record<UserRole, string>;

export function homePathFor(role: UserRole) {
  return HOME_PATHS[role];
}

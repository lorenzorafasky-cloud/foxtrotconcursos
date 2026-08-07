import {
  createFrontendApiClient,
  readApiError,
  type AuthProfile
} from "@foxtrot/ui";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export const apiRequest = createFrontendApiClient(apiBaseUrl);

export type { AuthProfile };

export function hasAnyRole(user: AuthProfile | null, roles: string[]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)));
}

export { readApiError };

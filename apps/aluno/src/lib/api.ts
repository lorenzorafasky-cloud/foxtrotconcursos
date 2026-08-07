export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return response.json() as Promise<T>;
}

export type AuthProfile = {
  id: string;
  email: string;
  fullName: string;
  nickname: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  permissions: string[];
};

export function hasAnyRole(user: AuthProfile | null, roles: string[]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)));
}

async function extractErrorMessage(response: Response) {
  const fallback = response.status === 401
    ? "Sua sessao expirou. Entre novamente."
    : "Nao foi possivel concluir a acao.";
  try {
    const payload = await response.json() as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(" ");
    return payload.message ?? fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}

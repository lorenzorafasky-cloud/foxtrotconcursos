export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) throw new Error(await extractErrorMessage(response));
  return response.json() as Promise<T>;
}

async function extractErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(" ");
    return payload.message ?? "Nao foi possivel concluir a acao.";
  } catch {
    return response.status === 401 ? "Entre para continuar." : "Nao foi possivel concluir a acao.";
  }
}

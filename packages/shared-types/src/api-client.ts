export type ApiClientOptions = {
  baseUrl: string;
  accessToken?: string;
};

export class FoxtrotApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  courses() {
    return this.request("/courses");
  }

  course(slug: string) {
    return this.request(`/courses/${slug}`);
  }

  questions(params?: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    return this.request(`/questions${search.size ? `?${search}` : ""}`);
  }

  focusDashboard() {
    return this.request("/focus/dashboard");
  }

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.options.accessToken ? { authorization: `Bearer ${this.options.accessToken}` } : {}),
        ...init?.headers
      },
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`Foxtrot API ${response.status}: ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  }
}

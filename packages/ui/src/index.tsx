"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Loader2,
  Menu,
  Shield,
  Target,
  Timer,
  Trophy,
  XCircle
} from "lucide-react";

export type UserRole = "ALUNO" | "ALUNO_ILIMITADO" | "PROFESSOR" | "ADMIN_MASTER" | string;

export type AuthProfile = {
  id: string;
  email: string;
  fullName: string;
  nickname: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  roles: UserRole[];
  permissions: string[];
};

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "forbidden" | "error";

type AuthContextValue = {
  user: AuthProfile | null;
  status: AuthStatus;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permissions: string[]) => boolean;
};

const AuthSessionContext = React.createContext<AuthContextValue | null>(null);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createApiUrl(apiBaseUrl: string, path: string) {
  const base = apiBaseUrl.replace(/\/$/, "");
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  return `${base}${endpoint}`;
}

export async function readApiError(response: Response, fallback = "Nao foi possivel concluir a acao.") {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(" ");
    return payload.message ?? fallback;
  } catch {
    return response.status === 401 ? "Entre para continuar." : fallback;
  }
}

export function canAccessProfile(
  user: Pick<AuthProfile, "roles" | "permissions"> | null,
  access?: { roles?: UserRole[]; permissions?: string[] }
) {
  if (!access || ((!access.roles || access.roles.length === 0) && (!access.permissions || access.permissions.length === 0))) {
    return true;
  }
  if (!user) return false;
  const roleAllowed = !access.roles?.length || user.roles.some((role) => access.roles?.includes(role));
  const permissionAllowed =
    !access.permissions?.length || access.permissions.some((permission) => user.permissions.includes(permission));
  return roleAllowed && permissionAllowed;
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "FX";
}

export function createFrontendApiClient(apiBaseUrl: string) {
  return async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(createApiUrl(apiBaseUrl, path), {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...init?.headers
      }
    });
    if (!response.ok) throw new Error(await readApiError(response));
    return response.json() as Promise<T>;
  };
}

export function AuthSessionProvider({
  apiBaseUrl,
  allowedRoles,
  allowedPermissions,
  children
}: {
  apiBaseUrl: string;
  allowedRoles?: UserRole[];
  allowedPermissions?: string[];
  children: React.ReactNode;
}) {
  const apiRequest = React.useMemo(() => createFrontendApiClient(apiBaseUrl), [apiBaseUrl]);
  const [user, setUser] = React.useState<AuthProfile | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [error, setError] = React.useState("");

  const refresh = React.useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const profile = await apiRequest<AuthProfile>("/auth/me");
      setUser(profile);
      setStatus(canAccessProfile(profile, { roles: allowedRoles, permissions: allowedPermissions }) ? "authenticated" : "forbidden");
    } catch (err) {
      setUser(null);
      setStatus("anonymous");
      setError(err instanceof Error ? err.message : "Entre para continuar.");
    }
  }, [allowedPermissions, allowedRoles, apiRequest]);

  const logout = React.useCallback(async () => {
    try {
      await apiRequest<{ ok?: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, [apiRequest]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      refresh,
      logout,
      hasRole: (roles) => Boolean(user?.roles.some((role) => roles.includes(role))),
      hasPermission: (permissions) => Boolean(user?.permissions.some((permission) => permissions.includes(permission)))
    }),
    [error, logout, refresh, status, user]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = React.useContext(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used within AuthSessionProvider");
  return context;
}

export function SkipLink({ targetId = "conteudo-principal" }: { targetId?: string }) {
  return (
    <a
      className="sr-only z-50 rounded-md bg-foxtrot-500 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      href={`#${targetId}`}
    >
      Pular para o conteudo
    </a>
  );
}

export function AppFrame({
  children,
  contentId = "conteudo-principal",
  className
}: {
  children: React.ReactNode;
  contentId?: string;
  className?: string;
}) {
  return (
    <>
      <SkipLink targetId={contentId} />
      <div id={contentId} tabIndex={-1} className={cn("min-h-screen outline-none", className)}>
        {children}
      </div>
    </>
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-60",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        size === "icon" && "h-10 w-10 p-0",
        variant === "primary" && "bg-foxtrot-500 text-white hover:bg-foxtrot-600",
        variant === "secondary" && "bg-red-600 text-white hover:bg-red-700",
        variant === "danger" && "bg-danger text-white hover:bg-red-600",
        variant === "ghost" && "bg-transparent text-zinc-100 hover:bg-zinc-800",
        variant === "outline" && "border border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-foxtrot-500 hover:bg-zinc-900",
        className
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  children,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <Button aria-label={label} title={label} size="icon" variant="ghost" {...props}>
      {children ?? <Menu className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  const descriptionId = htmlFor ? `${htmlFor}-description` : undefined;
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-zinc-100" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {(hint || error) && (
        <p id={descriptionId} className={cn("text-xs", error ? "text-red-300" : "text-zinc-500")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-foxtrot-500 focus:ring-2 focus:ring-foxtrot-500/25 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-foxtrot-500 focus:ring-2 focus:ring-foxtrot-500/25 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-foxtrot-500 focus:ring-2 focus:ring-foxtrot-500/25 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-md border border-zinc-800 bg-zinc-950 p-5 shadow-sm", className)} {...props}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-800 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="font-display text-sm font-bold uppercase text-foxtrot-400">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-3xl font-black uppercase leading-tight text-white md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center">
      <CircleOff className="mx-auto h-8 w-8 text-zinc-500" aria-hidden />
      <h2 className="mt-3 font-display text-xl font-bold uppercase text-white">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Nao foi possivel carregar",
  description,
  action
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-100" role="alert">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <strong className="block text-white">{title}</strong>
          {description && <p className="mt-1 text-red-100/85">{description}</p>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-300">
      <Loader2 className="h-4 w-4 animate-spin text-foxtrot-400" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-800/80", className)} aria-hidden />;
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-1 text-xs font-semibold uppercase",
        tone === "neutral" && "bg-zinc-800 text-zinc-200",
        tone === "brand" && "bg-foxtrot-500/15 text-foxtrot-300",
        tone === "success" && "bg-green-500/15 text-green-300",
        tone === "warning" && "bg-amber-500/15 text-amber-300",
        tone === "danger" && "bg-red-500/15 text-red-300",
        tone === "info" && "bg-sky-500/15 text-sky-300"
      )}
    >
      {children}
    </span>
  );
}

export function DataTable({
  columns,
  rows,
  getRowKey,
  emptyLabel = "Nenhum registro encontrado."
}: {
  columns: Array<{ key: string; header: string; className?: string; render: (row: Record<string, unknown>) => React.ReactNode }>;
  rows: Array<Record<string, unknown>>;
  getRowKey: (row: Record<string, unknown>) => string;
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3 font-semibold", column.className)} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-200">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-zinc-900/70">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 align-top", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-zinc-500" colSpan={columns.length}>
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange
}: {
  items: Array<{ id: T; label: string; disabled?: boolean }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-1" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.id === value}
          className={cn(
            "h-9 shrink-0 rounded px-3 text-sm font-semibold text-zinc-300 outline-none transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-foxtrot-500 disabled:cursor-not-allowed disabled:opacity-50",
            item.id === value && "bg-foxtrot-500 text-white"
          )}
          disabled={item.disabled}
          key={item.id}
          onClick={() => onChange(item.id)}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function AppNav({
  items,
  activeHref,
  action
}: {
  items: Array<{ href: string; label: string; icon?: React.ReactNode }>;
  activeHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur" aria-label="Navegacao principal">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <BrandMark />
        <div className="hidden items-center gap-2 md:flex">
          {items.map((item) => (
            <a
              aria-current={item.href === activeHref ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500",
                item.href === activeHref && "bg-zinc-800 text-white"
              )}
              href={item.href}
              key={item.href}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
          {action}
        </div>
      </div>
    </nav>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tone = "orange"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "orange" | "red" | "zinc" | "green" | "blue";
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
      <div
        className={cn(
          "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md",
          tone === "orange" && "bg-foxtrot-500/15 text-foxtrot-400",
          tone === "red" && "bg-red-600/15 text-red-400",
          tone === "zinc" && "bg-zinc-800 text-zinc-200",
          tone === "green" && "bg-green-500/15 text-green-300",
          tone === "blue" && "bg-sky-500/15 text-sky-300"
        )}
      >
        {icon}
      </div>
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <strong className="font-display text-2xl text-white">{value}</strong>
    </section>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foxtrot-500 text-white">
        <Shield aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-xl font-bold uppercase leading-none text-white">Foxtrot</p>
        <p className="text-xs uppercase text-foxtrot-300">Concursos</p>
      </div>
    </div>
  );
}

export function OperationsStrip() {
  const items = [
    { label: "Cursos", value: "124 aulas", icon: <Target className="h-4 w-4" /> },
    { label: "Foco", value: "3h20 liquidas", icon: <Timer className="h-4 w-4" /> },
    { label: "Ranking", value: "Top 8%", icon: <Trophy className="h-4 w-4" /> }
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export const statusIcons = {
  success: CheckCircle2,
  warning: AlertCircle,
  danger: XCircle,
  loading: Loader2,
  next: ChevronRight
};

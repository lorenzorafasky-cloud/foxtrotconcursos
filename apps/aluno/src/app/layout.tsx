import "./globals.css";
import type { Metadata } from "next";
import { AppFrame, AuthSessionProvider } from "@foxtrot/ui";
import { CookieConsent } from "../components/CookieConsent";

export const metadata: Metadata = {
  title: "Foxtrot Aluno",
  description: "Portal do aluno Foxtrot Concursos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased foxtrot-scrollbar">
        <AuthSessionProvider apiBaseUrl={apiBaseUrl} allowedRoles={["ALUNO", "ALUNO_ILIMITADO", "ADMIN_MASTER"]}>
          <AppFrame>{children}</AppFrame>
          <CookieConsent />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

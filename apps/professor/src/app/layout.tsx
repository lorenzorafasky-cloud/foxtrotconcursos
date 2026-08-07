import "./globals.css";
import type { Metadata } from "next";
import { AppFrame, AuthSessionProvider } from "@foxtrot/ui";

export const metadata: Metadata = {
  applicationName: "Foxtrot Concursos",
  title: {
    default: "Foxtrot Professor | Foxtrot Concursos",
    template: "%s | Foxtrot Professor"
  },
  description: "Painel do professor Foxtrot Concursos para conteudo, questoes, simulados, duvidas, alunos e discursivas.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased foxtrot-scrollbar">
        <AuthSessionProvider apiBaseUrl={apiBaseUrl} allowedRoles={["PROFESSOR", "ADMIN_MASTER"]}>
          <AppFrame>{children}</AppFrame>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import { AppFrame, AuthSessionProvider } from "@foxtrot/ui";

export const metadata: Metadata = {
  applicationName: "Foxtrot Concursos",
  title: {
    default: "Foxtrot Admin | Foxtrot Concursos",
    template: "%s | Foxtrot Admin"
  },
  description: "Painel administrativo Foxtrot Concursos para operacao, usuarios, conteudo, pagamentos, auditoria e moderacao.",
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
        <AuthSessionProvider apiBaseUrl={apiBaseUrl} allowedRoles={["ADMIN_MASTER"]}>
          <AppFrame>{children}</AppFrame>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

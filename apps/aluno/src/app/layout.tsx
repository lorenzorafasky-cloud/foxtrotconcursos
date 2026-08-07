import "./globals.css";
import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import { AppFrame, AuthSessionProvider } from "@foxtrot/ui";
import { CookieConsent } from "../components/CookieConsent";

const fontBody = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const fontDisplay = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  applicationName: "Foxtrot Concursos",
  title: {
    default: "Foxtrot Concursos | Area do aluno",
    template: "%s | Foxtrot Concursos"
  },
  description: "Portal do aluno Foxtrot Concursos para cursos, aulas, questoes, simulados, foco, planejamento e progresso.",
  openGraph: {
    title: "Foxtrot Concursos | Area do aluno",
    description: "Estude com cursos, questoes, simulados, foco e acompanhamento de progresso.",
    siteName: "Foxtrot Concursos",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

  return (
    <html lang="pt-BR" className={`${fontBody.variable} ${fontDisplay.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased foxtrot-scrollbar">
        <AuthSessionProvider apiBaseUrl={apiBaseUrl} allowedRoles={["ALUNO", "ALUNO_CURSO_ESPECIFICO", "ALUNO_ILIMITADO", "ADMIN_MASTER"]}>
          <AppFrame>{children}</AppFrame>
          <CookieConsent />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

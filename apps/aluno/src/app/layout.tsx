import "./globals.css";
import type { Metadata } from "next";
import { CookieConsent } from "../components/CookieConsent";

export const metadata: Metadata = {
  title: "Foxtrot Aluno",
  description: "Portal do aluno Foxtrot Concursos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foxtrot Admin",
  description: "Painel administrativo Foxtrot Concursos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

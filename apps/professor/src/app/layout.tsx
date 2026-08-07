import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foxtrot Professor",
  description: "Painel do professor Foxtrot Concursos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

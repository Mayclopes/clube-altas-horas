import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clube Altas Horas",
  description: "Programa de Fidelidade da Adega Altas Horas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-black text-white min-h-screen flex flex-col">

        <div className="flex-1">
          {children}
        </div>

        <footer className="border-t border-zinc-800 p-6">

          <div className="flex justify-center gap-8 text-sm text-zinc-400">

            <Link href="/sobre">
              Sobre
            </Link>

            <Link href="/privacidade">
              Privacidade
            </Link>

            <Link href="/termos">
              Termos
            </Link>

          </div>

        </footer>

      </body>
    </html>
  );
}
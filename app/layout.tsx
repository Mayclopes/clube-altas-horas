import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {

  title: "Clube Altas Horas",

  description: "Programa de Fidelidade",

  icons: {

    icon: "/favicon.ico",

  },

};

export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {

  return (

    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >

      <body>

        {children}

      </body>

    </html>

  );

}
import type { Metadata } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";

/**
 * Archivo remplace Syne comme police d'affichage.
 *
 * Syne est une display très large et géométrique : lisible sur un titre de
 * trois mots, elle devient pénible dès qu'une phrase entière est composée
 * dedans, et elle date le produit. Archivo est un grotesque de labeur — il
 * tient à 60 px comme à 17 px, et laisse le bleu Klein porter l'identité.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ApplyBot",
    template: "%s | ApplyBot",
  },
  description: "Rechercher, préparer et suivre ses candidatures, pour tous les profils.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

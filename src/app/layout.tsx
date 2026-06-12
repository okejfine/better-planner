import type { Metadata } from "next";
import {
  Chakra_Petch,
  Pacifico,
  Quicksand,
  Space_Grotesk,
  Inter,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// ── Base app font (light mode) ──────────────────────────────────────────────
const chakraPetch = Chakra_Petch({
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const chakraPetchSerif = Chakra_Petch({
  variable: "--font-serif",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

// ── Clang mode fonts (girly) ────────────────────────────────────────────────
const pacifico = Pacifico({
  variable: "--font-clang-display",
  weight: "400",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-clang",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

// ── Alex mode fonts ─────────────────────────────────────────────────────────
const spaceGrotesk = Space_Grotesk({
  variable: "--font-alex-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-alex",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-alex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Better Planner",
  description: "Pick a wedding date, together.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Inline script: runs before paint to avoid flash of wrong theme
const antiFlashScript = `
(function(){
  var t=localStorage.getItem('bp-theme');
  var valid=['light','dark','clang','alex'];
  if(t&&valid.indexOf(t)!==-1){document.documentElement.dataset.theme=t;}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    chakraPetch.variable,
    chakraPetchSerif.variable,
    pacifico.variable,
    quicksand.variable,
    spaceGrotesk.variable,
    inter.variable,
    ibmPlexMono.variable,
  ].join(" ");

  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

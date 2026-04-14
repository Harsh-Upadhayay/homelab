import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neovara Homelab",
  description:
    "Dark minimal homepage for the Neovara homelab with architecture diagrams, security model, live routes, and runtime telemetry.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-foreground">{children}</body>
    </html>
  );
}

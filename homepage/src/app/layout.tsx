import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";

const bodyFont = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "neovara.uk | Homelab Platform",
  description:
    "Interactive architecture and live service topology for the neovara.uk homelab platform.",
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
      className={`dark h-full antialiased ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="min-h-full font-sans text-foreground">{children}</body>
    </html>
  );
}

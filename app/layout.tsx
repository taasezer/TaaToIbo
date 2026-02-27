import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "TaaToIbo — Extract Prints from Garments",
  description:
    "Upload a photo of any garment and TaaToIbo will detect, extract, and isolate the printed design using Gemini 2.5 Pro Vision AI. Download as PNG, JPG, or SVG.",
  keywords: ["print extraction", "garment", "t-shirt", "design", "AI", "Gemini", "background removal"],
  authors: [{ name: "TaaToIbo" }],
  openGraph: {
    title: "TaaToIbo — Textile Art to Isolated Object",
    description: "AI-powered print extraction from garment photos",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}

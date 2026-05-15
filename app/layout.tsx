import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { quivoClerkLocalization } from "@/lib/clerk-localization";
import { ThemeProvider } from "@/components/theme-provider";
import { StorageMigration } from "@/components/storage-migration";
import { AccentInit } from "@/components/accent-init";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quivo — AI Financial Platform",
  description: "AI-powered accounting, tax, and finance platform for consulting firms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard?view=overview"
      signUpFallbackRedirectUrl="/dashboard?view=overview"
      afterSignOutUrl="/sign-in"
      localization={quivoClerkLocalization}
    >
      <html lang="en" data-theme="dark" className={`${inter.variable} h-full antialiased`}>
        <body className={`${inter.className} min-h-full flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors`}>
          <ThemeProvider>
            <StorageMigration />
            <AccentInit />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

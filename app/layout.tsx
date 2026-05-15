import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { StorageMigration } from "@/components/storage-migration";
import "./globals.css";

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
    <ClerkProvider>
      <html lang="en" data-theme="dark" className="h-full antialiased">
        <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
          <ThemeProvider>
            <StorageMigration />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

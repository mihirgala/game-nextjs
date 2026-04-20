import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { JotaiProvider } from "@/components/providers/jotai-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";


const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "GameHub — Play, Connect, Compete",
  description:
    "A modern multiplayer gaming platform with real-time chat, friends, and game history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen bg-background font-sans antialiased ${inter.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <JotaiProvider>{children}</JotaiProvider>
          <Toaster 
            position="top-center" 
            richColors 
            expand 
            closeButton 
            duration={10000} 
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

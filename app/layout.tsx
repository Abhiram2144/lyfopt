import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/site/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LyfOpt",
  description: "AI life optimizer for clarity, focus, and better days.",
  icons: {
    icon: "/favicon/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

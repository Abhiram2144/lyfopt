import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/site/Providers";
import { getConfiguredSiteOrigin } from "@/lib/site";
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
  const siteOrigin = getConfiguredSiteOrigin();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <Providers siteOrigin={siteOrigin}>{children}</Providers>
      </body>
    </html>
  );
}

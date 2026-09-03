import type { Metadata } from "next";
import "@/app/globals.css";

import { fonts } from "@/lib/fonts";
import { getTheme, themeInitScript } from "@/lib/theme-server";

export const metadata: Metadata = {
  title: {
    default: "Meridian",
    template: "%s — Meridian",
  },
  description: "Notes on software, craft, and the shape of good work.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fonts.map((f) => f.variable).join(" ")} ${theme === "dark" ? "dark" : ""} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript() }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
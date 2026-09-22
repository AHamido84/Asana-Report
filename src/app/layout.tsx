import type { Metadata } from "next";
import "./globals.css";
import { getDashboardConfig } from "@/lib/config";
import { LocaleProvider } from "@/context/LocaleProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { getDirection } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Executive Project Dashboard",
  description: "Dynamic executive reporting dashboard powered by the Asana API",
};

// Runs before hydration to avoid a light/dark flash on first paint.
const themeInitScript = `
try {
  var theme = localStorage.getItem("dashboard.theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  var locale = localStorage.getItem("dashboard.locale");
  if (locale === "ar" || locale === "en") {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getDashboardConfig();

  return (
    <html lang={config.defaultLocale} dir={getDirection(config.defaultLocale)} data-theme={config.defaultTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-foreground antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme={config.defaultTheme}>
          <LocaleProvider defaultLocale={config.defaultLocale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

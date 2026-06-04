/* eslint-disable react-refresh/only-export-components */
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@fleetia/components/i18n";
import { useLocale } from "@/hooks/useLocale";
import { NewTabApp } from "./NewTabApp";
import "@/styles/reset.scss";

function Root(): React.ReactElement | null {
  const { locale, setLocale, isLoaded } = useLocale();
  if (!isLoaded) return null;
  return (
    <I18nProvider locale={locale}>
      <NewTabApp locale={locale} onLocaleChange={setLocale} />
    </I18nProvider>
  );
}

function initializeNewTab(): void {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container not found");
  }

  const root = createRoot(container);
  root.render(<Root />);
}

initializeNewTab();

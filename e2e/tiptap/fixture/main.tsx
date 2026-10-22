import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { ToastContainer, ToastProvider } from "@/components/toast";
import { createRoot } from "react-dom/client";
import { TiptapPlayground } from "./TiptapPlayground";
import "./styles.css";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Missing #app container");
}

i18n.load({ en: enMessages, ru: ruMessages });
i18n.activate("en");

createRoot(container).render(
  <I18nProvider i18n={i18n}>
    <ToastProvider>
      <TiptapPlayground />
      <ToastContainer />
    </ToastProvider>
  </I18nProvider>,
);

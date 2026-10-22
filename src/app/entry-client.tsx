// Must be first among app imports: `@/locales/lib` activates Lingui on eval
// so module-scope `i18n._(...)` in the App tree does not race.
import { initializeI18n } from "@/locales/lib";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import { App } from "./app.tsx";
import { registerServiceWorker } from "./register-sw.ts";
import { getRouter } from "./router.ts";
import "./styles.css";
import SnowfallComponent from "@/components/snow/Snowfall.tsx";
import { SnowVisibilityProvider } from "@/components/snow/SnowContext.tsx";

// Init internationalization
initializeI18n();

// Init service worker
registerServiceWorker();

// Create the router instance
const router = getRouter();

// Render the app
const container = document.getElementById("app") as HTMLDivElement;
const root = createRoot(container);
root.render(
  <HelmetProvider>
    <SnowVisibilityProvider>
      <SnowfallComponent />
      <App router={router} />
    </SnowVisibilityProvider>
  </HelmetProvider>,
);

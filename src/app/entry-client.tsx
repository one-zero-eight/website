import { createRoot } from "react-dom/client";
import { HelmetProvider } from "@dr.pogodin/react-helmet";
import { App } from "./app.tsx";
import { registerServiceWorker } from "./register-sw.ts";
import { getRouter } from "./router.ts";
import "./styles.css";
import SnowfallComponent from "@/components/snow/Snowfall.tsx";

// Init service worker
registerServiceWorker();

// Create the router instance
const router = getRouter();

// Render the app
const container = document.getElementById("app") as HTMLDivElement;
const root = createRoot(container);
root.render(
  <HelmetProvider>
    <SnowfallComponent />
    <App router={router} />
  </HelmetProvider>,
);

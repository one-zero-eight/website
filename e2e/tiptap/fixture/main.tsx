import { ToastContainer, ToastProvider } from "@/components/toast";
import { createRoot } from "react-dom/client";
import { TiptapPlayground } from "./TiptapPlayground";
import "./styles.css";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Missing #app container");
}

createRoot(container).render(
  <ToastProvider>
    <TiptapPlayground />
    <ToastContainer />
  </ToastProvider>,
);

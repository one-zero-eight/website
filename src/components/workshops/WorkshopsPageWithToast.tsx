import React from "react";
import { WorkshopsPage } from "./WorkshopsPage";
import { ToastProvider, ToastContainer } from "./toast";

export function WorkshopsPageWithToast() {
  return (
    <ToastProvider>
      <WorkshopsPage />
      <ToastContainer />
    </ToastProvider>
  );
}

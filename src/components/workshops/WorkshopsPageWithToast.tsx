import React from "react";
import { WorkshopsPage } from "./WorkshopsPage";
import { ToastProvider, ToastContainer } from "./toast";

/**
 * Обертка для WorkshopsPage с поддержкой toast-уведомлений
 * Используется как основная точка входа в модуль workshops
 */
export function WorkshopsPageWithToast() {
  return (
    <ToastProvider>
      <WorkshopsPage />
      <ToastContainer />
    </ToastProvider>
  );
}

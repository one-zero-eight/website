import * as React from "react";
import { useEffect, useState } from "react";

export default function OfflineNotification() {
  const [isOffline, setIsOffline] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setIsClosed(false); // Сообщение закрывается, если интернет восстановлен
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Если пользователь нажал на крестик или интернет есть — скрываем сообщение
  if (isClosed) return null;
  if (!isOffline) return null;

  return (
    <div className="fixed left-1/2 top-2 z-50 mx-auto flex -translate-x-1/2 items-center justify-between rounded-lg bg-red-600 shadow-lg">
      <p className="pl-3 text-[16px] font-medium text-white">
        No internet connection!
      </p>
      <button
        type="button"
        className="flex p-2 pr-3 text-white hover:text-gray-300"
        onClick={() => setIsClosed(true)}
      >
        <span className="icon-[material-symbols--close] text-2xl" />
      </button>
    </div>
  );
}

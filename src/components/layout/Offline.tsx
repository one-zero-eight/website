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
    <div className="rounded-field fixed top-2 left-1/2 z-50 mx-auto flex -translate-x-1/2 items-center justify-between bg-red-600 shadow-lg">
      <p className="text-base-content pl-3 text-[16px] font-medium">
        No internet connection!
      </p>
      <button
        type="button"
        className="text-base-content hover:text-base-content/50 flex p-2 pr-3"
        onClick={() => setIsClosed(true)}
      >
        <span className="icon-[material-symbols--close] text-2xl" />
      </button>
    </div>
  );
}

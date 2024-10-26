import * as React from "react";
import { useState, useEffect } from "react";

const OfflineNotification: React.FC = () => {
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
    <div className={`fixed inset-0 z-50 flex items-start justify-center`}>
      <div
        className={`flex items-center justify-between rounded-lg bg-red-600 px-6 py-3 text-white shadow-lg`}
      >
        <p className="text-sm md:text-base">No internet connection!</p>
        <button
          className="ml-4 text-lg font-bold text-white hover:text-gray-300 md:text-xl"
          onClick={() => setIsClosed(true)}
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default OfflineNotification;

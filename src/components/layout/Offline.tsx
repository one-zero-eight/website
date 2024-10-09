import React, { useState, useEffect } from 'react';

const OfflineNotification: React.FC = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    // чек статус
    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
         };

        const handleOnline = () => {
            setIsOffline(false);
            setIsClosed(false); // соо если интернет восстановлен
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // если пользователь онлайн или скрыл уведомление крестиком, ничего не выводить
    if (!isOffline || isClosed) return null;

    return (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-red-600 text-white py-3 px-6 rounded-lg shadow-lg flex items-center justify-between z-50">
            <p className="text-sm md:text-base">No Internet coonection!</p>
            <button className="ml-4 text-white text-lg md:text-xl font-bold hover:text-gray-300" onClick={() => setIsClosed(true)}>
                &times;
            </button>
        </div>
    );
};

export default OfflineNotification;

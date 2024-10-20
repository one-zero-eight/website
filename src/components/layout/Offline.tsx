import * as React from 'react';
import { useState, useEffect } from 'react';

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

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // Если пользователь нажал на крестик или интернет есть — скрываем сообщение
    if (isClosed) return null;

    return (
        <div className={`fixed left-1/2 transform -translate-x-1/2 transition-all duration-500 ease-in-out ${isOffline ? 'top-5 opacity-100' : 'top-[-100px] opacity-0'}`}>
            <div className="bg-red-600 text-white py-3 px-6 rounded-lg shadow-lg flex items-center justify-between z-50">
                <p className="text-sm md:text-base">
                    We have lost contact with you.<br /> Looks like your internet connection has lost!
                </p>
                <button className="ml-4 text-white text-lg md:text-xl font-bold hover:text-gray-300" onClick={() => setIsClosed(true)}>
                    &times;
                </button>
            </div>
        </div>
    );
};

export default OfflineNotification;

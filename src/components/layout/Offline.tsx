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
            setIsClosed(false); 
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (isClosed) return null;

    return (
        <div className={`fixed inset-0 flex items-start justify-center z-50`}>
            <div className={`bg-red-600 text-white py-3 px-6 rounded-lg shadow-lg flex items-center justify-between`}>
                <p className="text-sm md:text-base">
                    No internet connection!
                </p>
                <button className="ml-4 text-white text-lg md:text-xl font-bold hover:text-gray-300" onClick={() => setIsClosed(true)}>
                    &times;
                </button>
            </div>
        </div>
    );
};

export default OfflineNotification;

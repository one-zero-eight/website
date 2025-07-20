import React from 'react';
import { X, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activityName: string;
  time: string;
  date?: string;
  isLoading?: boolean;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activityName,
  time,
  date,
  isLoading = false
}) => {
  // Add support for closing with Escape
  useModalKeyboard(isOpen, onClose);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close modal only if click was on backdrop, not on content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="innohassle-card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold text-contrast">Cancel Enrollment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-inactive hover:text-contrast transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-contrast mb-4">
            Are you sure you want to cancel your enrollment for this training session?
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-red-500" size={16} />
              <span className="font-medium text-red-700">Important Notice</span>
            </div>
            <p className="text-sm text-red-600">
              Canceling less than 2 hours before the session may affect your ability to enroll in future sessions.
            </p>
          </div>
          
          <div className="bg-primary rounded-lg p-4 border border-secondary">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-brand-violet" />
                <span className="text-sm text-inactive">Activity</span>
              </div>
              <div className="text-contrast font-medium ml-6">{activityName}</div>
              
              {date && (
                <>
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-brand-violet" />
                    <span className="text-sm text-inactive">Date</span>
                  </div>
                  <div className="text-contrast ml-6">{date}</div>
                </>
              )}
              
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-brand-violet" />
                <span className="text-sm text-inactive">Time</span>
              </div>
              <div className="text-contrast ml-6">{time}</div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 innohassle-button-secondary px-4 py-2"
            disabled={isLoading}
          >
            Keep Enrollment
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Canceling...' : 'Yes, Cancel'}
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
          <p className="text-xs text-inactive">
            <strong>Tip:</strong> You can always re-enroll if spots are available. 
            Consider rescheduling instead of canceling if you need to change your time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
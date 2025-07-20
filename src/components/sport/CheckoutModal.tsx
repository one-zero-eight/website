import React from "react";
import { X, AlertTriangle, Clock, Calendar } from "lucide-react";
import { useModalKeyboard } from "./hooks/useModalKeyboard";

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
  isLoading = false,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="innohassle-card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold text-contrast">
              Cancel Enrollment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-inactive transition-colors hover:text-contrast"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-4 text-contrast">
            Are you sure you want to cancel your enrollment for this training
            session?
          </p>

          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="mb-2 flex items-center space-x-2">
              <AlertTriangle className="text-red-500" size={16} />
              <span className="font-medium text-red-700">Important Notice</span>
            </div>
            <p className="text-sm text-red-600">
              Canceling less than 2 hours before the session may affect your
              ability to enroll in future sessions.
            </p>
          </div>

          <div className="rounded-lg border border-secondary bg-primary p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-brand-violet" />
                <span className="text-sm text-inactive">Activity</span>
              </div>
              <div className="ml-6 font-medium text-contrast">
                {activityName}
              </div>

              {date && (
                <>
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-brand-violet" />
                    <span className="text-sm text-inactive">Date</span>
                  </div>
                  <div className="ml-6 text-contrast">{date}</div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-brand-violet" />
                <span className="text-sm text-inactive">Time</span>
              </div>
              <div className="ml-6 text-contrast">{time}</div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="innohassle-button-secondary flex-1 px-4 py-2"
            disabled={isLoading}
          >
            Keep Enrollment
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Canceling..." : "Yes, Cancel"}
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-secondary/30 p-3">
          <p className="text-xs text-inactive">
            <strong>Tip:</strong> You can always re-enroll if spots are
            available. Consider rescheduling instead of canceling if you need to
            change your time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;

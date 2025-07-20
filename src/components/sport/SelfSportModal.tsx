import React, { useState } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { studentAPI } from "./services/studentAPI";
import { useModalKeyboard } from "./hooks/useModalKeyboard";
import { SelfSportUploadResponse } from "./services/types";

interface SelfSportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: SelfSportUploadResponse) => void;
}

// Training types from API documentation
const trainingTypes = [
  { id: 1, name: "Running", max_hours: 2 },
  { id: 2, name: "Swimming", max_hours: 2 },
  { id: 3, name: "Cycling", max_hours: 2 },
  { id: 4, name: "Gym", max_hours: 2 },
  { id: 5, name: "Other", max_hours: 2 },
];

export const SelfSportModal: React.FC<SelfSportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    link: "",
    hours: 1,
    trainingType: 1, // Default to Running
    studentComment: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Add support for closing with Escape
  useModalKeyboard(isOpen, onClose);

  const resetForm = () => {
    setFormData({
      link: "",
      hours: 1,
      trainingType: 1,
      studentComment: "",
    });
    setErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isUploading) {
      handleClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.link.trim()) {
      newErrors.push(
        "Please provide a link to your activity (Strava, TrainingPeaks, etc.)",
      );
    }

    if (
      !formData.link.startsWith("http://") &&
      !formData.link.startsWith("https://")
    ) {
      newErrors.push("Link must start with http:// or https://");
    }

    if (formData.hours <= 0 || formData.hours > 10) {
      newErrors.push("Hours must be between 1 and 10");
    }

    if (!formData.trainingType) {
      newErrors.push("Please select a training type");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsUploading(true);
    try {
      const response = await studentAPI.uploadSelfSportActivity(
        formData.link,
        formData.hours,
        formData.trainingType,
        formData.studentComment || undefined,
      );

      // Success
      handleClose();
      onSuccess?.(response);
    } catch (error) {
      console.error("Error uploading self-sport activity:", error);
      setErrors(["Error uploading self-sport activity. Please try again."]);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="innohassle-card max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-secondary/50 bg-floating">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-xl font-bold text-contrast">
                Self-Sport Activity Upload
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-inactive">
                Submit your self-sport activity with a link to Strava,
                TrainingPeaks, or similar platforms.
              </p>
              <div className="rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-blue-500/5 p-3">
                <p className="text-sm font-medium text-contrast">
                  🏃 Maximum 10 hours of self-sport per semester allowed.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="ml-4 flex-shrink-0 text-inactive transition-colors duration-200 hover:text-contrast"
              disabled={isUploading}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="space-y-1 text-sm text-red-700">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start">
                    <AlertCircle
                      size={16}
                      className="mr-2 mt-0.5 flex-shrink-0"
                    />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Activity Link */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-contrast">
                Activity Link *
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  disabled={isUploading}
                  placeholder="https://www.strava.com/activities/..."
                  className="w-full rounded-lg border-2 border-secondary bg-primary p-3 pr-10 text-contrast placeholder-inactive transition-all duration-200 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:opacity-50"
                  required
                />
                <ExternalLink
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transform text-inactive"
                />
              </div>
              <p className="mt-2 text-xs text-inactive">
                Link to your activity on Strava, TrainingPeaks, or similar
                platform
              </p>
            </div>

            {/* Training Type and Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-3 block text-sm font-semibold text-contrast">
                  Training Type *
                </label>
                <select
                  value={formData.trainingType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trainingType: Number(e.target.value),
                    })
                  }
                  disabled={isUploading}
                  className="w-full rounded-lg border-2 border-secondary bg-primary p-3 text-contrast placeholder-inactive transition-all duration-200 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:opacity-50"
                  required
                >
                  {trainingTypes
                    .filter((type) => type.max_hours > 0)
                    .map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-3 block text-sm font-semibold text-contrast">
                  Hours *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: Number(e.target.value) })
                  }
                  disabled={isUploading}
                  className="w-full rounded-lg border-2 border-secondary bg-primary p-3 text-contrast placeholder-inactive transition-all duration-200 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-contrast">
                Comments (optional)
              </label>
              <textarea
                value={formData.studentComment}
                onChange={(e) =>
                  setFormData({ ...formData, studentComment: e.target.value })
                }
                rows={3}
                disabled={isUploading}
                placeholder="Additional information about your activity..."
                className="w-full resize-none rounded-lg border-2 border-secondary bg-primary p-3 text-contrast placeholder-inactive transition-all duration-200 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:opacity-50"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="innohassle-button-secondary flex-1 px-4 py-3 font-medium transition-all duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="innohassle-button-primary flex flex-1 items-center justify-center px-4 py-3 font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  "Submit Activity"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

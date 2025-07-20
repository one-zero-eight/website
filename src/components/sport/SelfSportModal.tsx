import React, { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { studentAPI } from '../services/studentAPI';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { SelfSportUploadResponse } from '../services/types';

interface SelfSportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: SelfSportUploadResponse) => void;
}

// Training types from API documentation
const trainingTypes = [
  { id: 1, name: 'Running', max_hours: 2 },
  { id: 2, name: 'Swimming', max_hours: 2 },
  { id: 3, name: 'Cycling', max_hours: 2 },
  { id: 4, name: 'Gym', max_hours: 2 },
  { id: 5, name: 'Other', max_hours: 2 },
];

export const SelfSportModal: React.FC<SelfSportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    link: '',
    hours: 1,
    trainingType: 1, // Default to Running
    studentComment: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Add support for closing with Escape
  useModalKeyboard(isOpen, onClose);

  const resetForm = () => {
    setFormData({
      link: '',
      hours: 1,
      trainingType: 1,
      studentComment: '',
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
      newErrors.push('Please provide a link to your activity (Strava, TrainingPeaks, etc.)');
    }

    if (!formData.link.startsWith('http://') && !formData.link.startsWith('https://')) {
      newErrors.push('Link must start with http:// or https://');
    }

    if (formData.hours <= 0 || formData.hours > 10) {
      newErrors.push('Hours must be between 1 and 10');
    }

    if (!formData.trainingType) {
      newErrors.push('Please select a training type');
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
        formData.studentComment || undefined
      );

      // Success
      handleClose();
      onSuccess?.(response);
    } catch (error) {
      console.error('Error uploading self-sport activity:', error);
      setErrors(['Error uploading self-sport activity. Please try again.']);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="innohassle-card bg-floating max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-secondary/50">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-contrast mb-2">
                Self-Sport Activity Upload
              </h2>
              <p className="text-inactive text-sm leading-relaxed mb-3">
                Submit your self-sport activity with a link to Strava, TrainingPeaks, or similar platforms.
              </p>
              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                <p className="text-sm text-contrast font-medium">
                  🏃 Maximum 10 hours of self-sport per semester allowed.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-inactive hover:text-contrast transition-colors duration-200 ml-4 flex-shrink-0"
              disabled={isUploading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-start">
                    <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Activity Link */}
            <div>
              <label className="block text-sm font-semibold text-contrast mb-3">
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
                  className="w-full p-3 pr-10 bg-primary border-2 border-secondary rounded-lg 
                           text-contrast placeholder-inactive
                           focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 
                           disabled:opacity-50 transition-all duration-200"
                  required
                />
                <ExternalLink size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-inactive" />
              </div>
              <p className="text-xs text-inactive mt-2">
                Link to your activity on Strava, TrainingPeaks, or similar platform
              </p>
            </div>

            {/* Training Type and Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-contrast mb-3">
                  Training Type *
                </label>
                <select
                  value={formData.trainingType}
                  onChange={(e) =>
                    setFormData({ ...formData, trainingType: Number(e.target.value) })
                  }
                  disabled={isUploading}
                  className="w-full p-3 bg-primary border-2 border-secondary rounded-lg 
                           text-contrast placeholder-inactive
                           focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 
                           disabled:opacity-50 transition-all duration-200"
                  required
                >
                  {trainingTypes.filter(type => type.max_hours > 0).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-contrast mb-3">
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
                  className="w-full p-3 bg-primary border-2 border-secondary rounded-lg 
                           text-contrast placeholder-inactive
                           focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 
                           disabled:opacity-50 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-semibold text-contrast mb-3">
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
                className="w-full p-3 bg-primary border-2 border-secondary rounded-lg 
                         text-contrast placeholder-inactive
                         focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 
                         disabled:opacity-50 transition-all duration-200 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="flex-1 innohassle-button-secondary px-4 py-3 font-medium transition-all duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 innohassle-button-primary px-4 py-3 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Submit Activity'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 
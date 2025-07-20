import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { studentAPI } from '../services/studentAPI';
import { useModalKeyboard } from '../hooks/useModalKeyboard';
import { MedicalReferenceUploadResponse } from '../services/types';

interface MedicalReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: MedicalReferenceUploadResponse) => void;
}

export const MedicalReferenceModal: React.FC<MedicalReferenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    studentComment: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Add support for closing with Escape
  useModalKeyboard(isOpen, onClose);

  const resetForm = () => {
    setFormData({
      startDate: '',
      endDate: '',
      studentComment: '',
    });
    setSelectedFile(null);
    setErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Close modal only if click was on backdrop, not on content
    // And only if not loading
    if (e.target === e.currentTarget && !isUploading) {
      handleClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(['Please select an image file (JPEG, JPG, PNG)']);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(['File size must not exceed 5MB']);
        return;
      }
      
      setSelectedFile(file);
      setErrors([]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!selectedFile) {
      newErrors.push('Please select a medical reference file');
    }

    if (!formData.startDate) {
      newErrors.push('Please specify the start date of illness');
    }

    if (!formData.endDate) {
      newErrors.push('Please specify the end date of illness');
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.push('Start date cannot be later than end date');
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
      const response = await studentAPI.uploadMedicalReference(
        selectedFile!,
        formData.startDate,
        formData.endDate,
        formData.studentComment || undefined
      );

      // Success
      handleClose();
      onSuccess?.(response);
    } catch (error) {
      console.error('Error uploading medical reference:', error);
      setErrors(['Error uploading medical reference. Please try again.']);
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
                Medical Reference Submission
              </h2>
              <p className="text-inactive text-sm leading-relaxed mb-3">
                Please submit an image of the medical reference. Specify the range of dates (illness period) and leave comments if necessary.
              </p>
              <div className="p-3 bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 rounded-lg border border-brand-violet/20">
                <p className="text-sm text-contrast font-medium">
                  ℹ️ The week missed due to illness is compensated by two sports hours.
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
            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-contrast mb-3">
                Reference *
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="w-full p-3 bg-primary border-2 border-secondary rounded-lg 
                           text-contrast placeholder-inactive
                           focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 
                           file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                           file:text-sm file:font-medium file:bg-brand-violet/10 file:text-brand-violet
                           hover:file:bg-brand-violet/20 disabled:opacity-50 transition-all duration-200"
                  required
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-inactive mt-2 bg-secondary/30 p-2 rounded">
                  Selected file: <span className="text-contrast font-medium">{selectedFile.name}</span>
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-contrast mb-3">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  disabled={isUploading}
                  className="w-full p-3 bg-primary border-2 border-secondary rounded-lg 
                           text-contrast placeholder-inactive
                           focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 
                           disabled:opacity-50 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-contrast mb-3">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
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
                placeholder="Additional information about the medical reference..."
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
                  'Submit Reference'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

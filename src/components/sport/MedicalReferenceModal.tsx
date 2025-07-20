import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { studentAPI } from "./services/studentAPI";
import { useModalKeyboard } from "./hooks/useModalKeyboard";
import { MedicalReferenceUploadResponse } from "./services/types";

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
    startDate: "",
    endDate: "",
    studentComment: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Add support for closing with Escape
  useModalKeyboard(isOpen, onClose);

  const resetForm = () => {
    setFormData({
      startDate: "",
      endDate: "",
      studentComment: "",
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
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setErrors(["Please select an image file (JPEG, JPG, PNG)"]);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(["File size must not exceed 5MB"]);
        return;
      }

      setSelectedFile(file);
      setErrors([]);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!selectedFile) {
      newErrors.push("Please select a medical reference file");
    }

    if (!formData.startDate) {
      newErrors.push("Please specify the start date of illness");
    }

    if (!formData.endDate) {
      newErrors.push("Please specify the end date of illness");
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      newErrors.push("Start date cannot be later than end date");
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
        formData.studentComment || undefined,
      );

      // Success
      handleClose();
      onSuccess?.(response);
    } catch (error) {
      console.error("Error uploading medical reference:", error);
      setErrors(["Error uploading medical reference. Please try again."]);
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
                Medical Reference Submission
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-inactive">
                Please submit an image of the medical reference. Specify the
                range of dates (illness period) and leave comments if necessary.
              </p>
              <div className="rounded-lg border border-brand-violet/20 bg-gradient-to-r from-brand-violet/10 to-brand-violet/5 p-3">
                <p className="text-sm font-medium text-contrast">
                  ℹ️ The week missed due to illness is compensated by two sports
                  hours.
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
            {/* File Upload */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-contrast">
                Reference *
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="w-full rounded-lg border-2 border-secondary bg-primary p-3 text-contrast placeholder-inactive transition-all duration-200 file:mr-4 file:rounded-md file:border-0 file:bg-brand-violet/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-violet hover:file:bg-brand-violet/20 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:opacity-50"
                  required
                />
              </div>
              {selectedFile && (
                <p className="mt-2 rounded bg-secondary/30 p-2 text-sm text-inactive">
                  Selected file:{" "}
                  <span className="font-medium text-contrast">
                    {selectedFile.name}
                  </span>
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-3 block text-sm font-semibold text-contrast">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  disabled={isUploading}
                  className="w-full rounded-lg border-2 border-secondary bg-primary p-3 text-contrast placeholder-inactive transition-all duration-200 focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 disabled:opacity-50"
                  required
                />
              </div>
              <div>
                <label className="mb-3 block text-sm font-semibold text-contrast">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
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
                placeholder="Additional information about the medical reference..."
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
                  "Submit Reference"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

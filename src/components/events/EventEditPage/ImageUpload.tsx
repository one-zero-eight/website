import clsx from "clsx";
import { EventFormErrors, EventFormState } from "../types";
import { useRef } from "react";

interface ImageUploadProps {
  form: EventFormState;
  setForm: (v: EventFormState) => void;
  handleUploadLogo: () => void;
  handleLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingLogo: boolean;
  errors: EventFormErrors;
  className?: string;
  logoPreview: string | null;
  setLogoPreview: (v: string | null) => void;
  deleteImage: () => void;
  /** True when the event already has an image on the server (show Delete only then). */
  hasUploadedImage: boolean;
}

export default function ImageUpload({
  form,
  className,
  isUploadingLogo,
  handleLogoFileChange,
  handleUploadLogo,
  deleteImage,
  logoPreview,
  hasUploadedImage,
}: ImageUploadProps) {
  const filePickRef = useRef<HTMLInputElement>(null);
  return (
    <div className={clsx(className)}>
      <div>
        <h3 className="text-base-content mb-3 text-sm font-medium">
          Upload new image
        </h3>
        <div className="space-y-3">
          {logoPreview && hasUploadedImage ? (
            <div className="flex items-center justify-center">
              <img
                src={logoPreview}
                alt="Image preview"
                className="rounded-field max-h-48 max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="bg-inh-primary border-inh-secondary rounded-field flex items-center justify-center border p-4">
              <div className="text-inh-inactive flex flex-col items-center gap-2 py-8">
                <span className="icon-[mdi--image-plus] size-12" />
                <span className="text-sm">Select a file to preview</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoFileChange}
              ref={filePickRef}
              className="text-base-content file:bg-primary hover:file:bg-primary/90 file:rounded-field w-full text-sm file:mr-4 file:border-0 file:px-4 file:py-2 file:text-white"
            />
            {hasUploadedImage && (
              <button
                type="button"
                onClick={() => {
                  deleteImage();
                  if (filePickRef.current) filePickRef.current.value = "";
                }}
                className="btn btn-error dark:btn-soft"
              >
                Delete Image
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleUploadLogo}
            disabled={!form.file || isUploadingLogo}
            className={clsx(
              "btn btn-primary w-full",
              (!form.file || isUploadingLogo) && "btn-disabled",
            )}
          >
            {isUploadingLogo ? "Uploading..." : "Upload Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

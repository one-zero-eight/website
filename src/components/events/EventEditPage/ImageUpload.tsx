import clsx from "clsx";
import { EventFormErrors, EventFormState } from "../types";

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
}

export default function ImageUpload({
  form,
  className,
  isUploadingLogo,
  setForm,
  handleLogoFileChange,
  handleUploadLogo,
  setLogoPreview,
  logoPreview,
}: ImageUploadProps) {
  return (
    <div className={clsx(className)}>
      <div>
        <h3 className="text-base-content mb-3 text-sm font-medium">
          Upload new image
        </h3>
        <div className="space-y-3">
          {logoPreview ? (
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

          <input
            type="file"
            accept="image/*"
            onChange={handleLogoFileChange}
            className="text-base-content file:bg-primary hover:file:bg-primary/90 file:rounded-field w-full text-sm file:mr-4 file:border-0 file:px-4 file:py-2 file:text-white"
          />

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

          {form.file && (
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, file: null });
                setLogoPreview(null);
              }}
              className="btn btn-ghost btn-sm w-full"
            >
              Clear selection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

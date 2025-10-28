import clsx from "clsx";

interface FormUrlInputProps {
  formUrl: string;
  error: string;
  isValidating: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onFocus: () => void;
  onPasteClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
}

export function FormUrlInput({
  formUrl,
  error,
  isValidating,
  onChange,
  onBlur,
  onFocus,
  onPasteClick,
  onKeyDown,
  onClear,
}: FormUrlInputProps) {
  return (
    <div>
      <label
        htmlFor="formUrl"
        className="text-contrast mb-2 block text-lg font-semibold"
      >
        Form URL
      </label>
      <div className="relative">
        <input
          id="formUrl"
          type="text"
          value={formUrl}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder="https://forms.yandex.ru/example"
          className={clsx(
            "bg-pagebg caret-brand-violet inset-0 h-10 w-full resize-none rounded-lg border-2 p-3 pr-12 text-base outline-hidden transition-colors dark:text-white",
            error
              ? "border-red-500 focus:border-red-500"
              : "border-brand-violet focus:border-brand-violet",
          )}
        />
        <button
          type="button"
          onClick={formUrl.trim() ? onClear : onPasteClick}
          className="text-contrast/50 hover:bg-contrast/10 hover:text-contrast absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm transition-colors"
          title={formUrl.trim() ? "Clear input" : "Paste from clipboard"}
        >
          <span
            className={clsx(
              "h-4 w-4",
              formUrl.trim()
                ? "icon-[material-symbols--close]"
                : "icon-[material-symbols--content-paste]",
            )}
          />
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {isValidating && (
        <p className="text-contrast/50 mt-1 text-sm">Validating URL...</p>
      )}
    </div>
  );
}

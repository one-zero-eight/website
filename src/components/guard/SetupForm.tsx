interface SetupFormProps {
  spreadsheetId: string;
  respondentRole: "writer" | "reader";
  error: string;
  isSubmitting: boolean;
  onSpreadsheetIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (role: "writer" | "reader") => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function SetupForm({
  spreadsheetId,
  respondentRole,
  error,
  isSubmitting,
  onSpreadsheetIdChange,
  onRoleChange,
  onBlur,
  onKeyDown,
  onClear,
  onSubmit,
}: SetupFormProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="spreadsheet_id"
          className="font-medium text-contrast/80"
        >
          Spreadsheet ID:
        </label>
        <div className="relative">
          <input
            type="text"
            id="spreadsheet_id"
            value={spreadsheetId}
            onChange={onSpreadsheetIdChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            className={`w-full rounded-lg border-2 px-4 py-3 transition-colors ${
              error
                ? "border-red-500 focus:border-red-500"
                : "border-contrast/20 focus:border-primary"
            } bg-primary/5 outline-none focus:bg-primary/10`}
          />
          {spreadsheetId && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-contrast/40 transition-colors hover:text-contrast/70"
            >
              <span className="icon-[material-symbols--close] text-xl" />
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-medium text-contrast/80">Respondent Role:</label>
        <div className="flex gap-3">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 transition-all ${
              respondentRole === "writer"
                ? "border-brand-violet bg-brand-violet/10"
                : "border-contrast/20 hover:border-contrast/40"
            }`}
          >
            <input
              type="radio"
              name="respondent_role"
              value="writer"
              checked={respondentRole === "writer"}
              onChange={() => onRoleChange("writer")}
              className="h-4 w-4 accent-brand-violet"
            />
            <span className="font-medium text-contrast/90">
              Writer (can edit)
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 transition-all ${
              respondentRole === "reader"
                ? "border-brand-violet bg-brand-violet/10"
                : "border-contrast/20 hover:border-contrast/40"
            }`}
          >
            <input
              type="radio"
              name="respondent_role"
              value="reader"
              checked={respondentRole === "reader"}
              onChange={() => onRoleChange("reader")}
              className="h-4 w-4 accent-brand-violet"
            />
            <span className="font-medium text-contrast/90">
              Reader (read-only)
            </span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={!spreadsheetId.trim() || !!error || isSubmitting}
        className="w-full rounded-lg bg-brand-violet px-4 py-3 font-medium text-white transition-all hover:bg-[#6600CC] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <span className="icon-[mdi--loading] h-5 w-5 animate-spin" />
            <span>Setting up...</span>
          </div>
        ) : (
          "Setup InNoHassle Guard Sheet"
        )}
      </button>
    </>
  );
}

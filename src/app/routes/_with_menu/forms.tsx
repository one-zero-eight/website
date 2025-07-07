import { Topbar } from "@/components/layout/Topbar.tsx";
import { useMe } from "@/api/accounts/user.ts";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Helmet } from "react-helmet-async";

export const Route = createFileRoute("/_with_menu/forms")({
  component: function FormsPage() {
    const { me } = useMe();
    const [formUrl, setFormUrl] = useState("");
    const [error, setError] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Check staff status and throw error for non-staff users
    if (!me?.innopolis_sso?.is_staff) {
      throw new Error("403 Access denied - Staff only");
    }

    const validateUrl = (rawUrl: string): string => {
      if (!rawUrl.trim()) return "";

      const normalized = rawUrl.trim().match(/^https?:\/\//)
        ? rawUrl.trim()
        : `https://${rawUrl.trim()}`;

      try {
        const urlObj = new URL(normalized);

        // Check if URL is from Yandex Forms or Google Forms
        const allowedHosts = [
          "forms.yandex.ru",
          "docs.google.com",
          "forms.gle",
        ];

        const hostname = urlObj.hostname.toLowerCase();
        const isAllowedHost = allowedHosts.some((host) =>
          hostname.includes(host),
        );

        if (!isAllowedHost) {
          return "Only Yandex Forms and Google Forms URLs are supported";
        }

        return "";
      } catch {
        return "Please enter a valid URL";
      }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormUrl(value);

      if (error) {
        setError("");
      }

      if (value.trim()) {
        setIsValidating(true);
        const validationError = validateUrl(value);
        setError(validationError);
        setIsValidating(false);
      }
    };

    const handleBlur = () => {
      if (formUrl.trim()) {
        const validationError = validateUrl(formUrl);
        setError(validationError);
      }
    };

    const handleFocus = async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && !formUrl.trim()) {
          setFormUrl(clipboardText);
          if (clipboardText.trim()) {
            setIsValidating(true);
            const validationError = validateUrl(clipboardText);
            setError(validationError);
            setIsValidating(false);
          }
        }
      } catch (_) {
        console.log("Clipboard access not available");
      }
    };

    const handlePasteClick = async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
          setFormUrl(clipboardText);
          if (error) {
            setError("");
          }
          if (clipboardText.trim()) {
            setIsValidating(true);
            const validationError = validateUrl(clipboardText);
            setError(validationError);
            setIsValidating(false);
          }
        }
      } catch (_) {
        console.log("Clipboard access not available");
      }
    };

    const handleGenerate = async () => {
      if (!formUrl.trim()) return;

      const validationError = validateUrl(formUrl);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsGenerating(true);

      // Add a delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const url = `https://innohassle.ru/forms/submit?form=${encodeURIComponent(formUrl.trim())}`;
      setGeneratedUrl(url);
      setCopied(false);
      setIsGenerating(false);
    };

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (_) {
        console.log("Failed to copy to clipboard");
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleGenerate();
      }
    };

    return (
      <>
        <Helmet>
          <title>Forms - One Zero Eight</title>
        </Helmet>

        <Topbar title="Forms" />

        <div className="flex grow flex-col gap-4 p-4">
          <div className="max-w-2xl self-center">
            <div className="mb-6 text-center">
              <p className="text-lg text-contrast/70">
                Enter a form URL to generate a link with the respondent's email
                pre-filled
              </p>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
            >
              <div>
                <label
                  htmlFor="formUrl"
                  className="mb-2 block text-lg font-semibold text-contrast"
                >
                  Form URL
                </label>
                <div className="relative">
                  <input
                    id="formUrl"
                    type="text"
                    value={formUrl}
                    onChange={handleUrlChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyPress}
                    placeholder="https://forms.yandex.ru/example"
                    className={`inset-0 h-10 w-full resize-none rounded-lg border-2 bg-pagebg p-3 pr-12 text-base caret-brand-violet outline-none transition-colors dark:text-white ${
                      error
                        ? "border-red-500 focus:border-red-500"
                        : "border-brand-violet focus:border-brand-violet"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={
                      formUrl.trim()
                        ? () => {
                            setFormUrl("");
                            setError("");
                          }
                        : handlePasteClick
                    }
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-contrast/50 transition-colors hover:bg-contrast/10 hover:text-contrast"
                    title={
                      formUrl.trim() ? "Clear input" : "Paste from clipboard"
                    }
                  >
                    <span
                      className={`h-4 w-4 ${formUrl.trim() ? "icon-[material-symbols--close]" : "icon-[material-symbols--content-paste]"}`}
                    />
                  </button>
                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                {isValidating && (
                  <p className="mt-1 text-sm text-contrast/50">
                    Validating URL...
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!formUrl.trim() || !!error || isGenerating}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-violet px-2 py-1 text-base font-normal leading-6 text-white shadow-[0px-0px-4px-#00000040] hover:bg-[#6600CC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="icon-[mdi--loading] h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="icon-[material-symbols--link-rounded] h-4 w-4" />
                    Generate Link
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-contrast/60">
              <p>
                This will create a link that automatically fills in the
                respondent's email address when they open the form.
              </p>
              <p className="mt-2">
                Only Yandex Forms and Google Forms URLs are supported.
              </p>
            </div>

            {generatedUrl && (
              <div className="mt-6 rounded-lg border border-contrast/10 bg-contrast/5 p-4">
                <h3 className="mb-2 text-sm font-medium text-contrast">
                  Generated Link
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedUrl}
                    readOnly
                    className="h-10 flex-1 rounded-lg border-2 border-contrast/20 bg-pagebg p-3 text-sm text-contrast/80 outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-violet px-3 py-1 text-sm font-normal text-white shadow-[0px-0px-4px-#00000040] transition-colors hover:bg-[#6600CC]"
                  >
                    {copied ? (
                      <>
                        <span className="icon-[material-symbols--check] h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <span className="icon-[material-symbols--content-copy] h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  },
});

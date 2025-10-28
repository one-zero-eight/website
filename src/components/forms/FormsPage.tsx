import { useState } from "react";
import {
  FormUrlInput,
  GenerateButton,
  GeneratedLink,
  FormDescription,
} from "./index.ts";

export function FormsPage() {
  const [formUrl, setFormUrl] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const validateUrl = (rawUrl: string): string => {
    if (!rawUrl.trim()) return "";

    const normalized = rawUrl.trim().match(/^https?:\/\//)
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;

    try {
      const urlObj = new URL(normalized);

      // Check if URL is from Yandex Forms
      const allowedHosts = ["forms.yandex.ru"];

      const hostname = urlObj.hostname.toLowerCase();
      const isAllowedHost = allowedHosts.some((host) =>
        hostname.includes(host),
      );

      if (!isAllowedHost) {
        return "Only Yandex Forms URLs are supported";
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

    const url = `${window.location.origin}/forms/submit?form=${encodeURIComponent(formUrl.trim())}`;
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

  const handleClear = () => {
    setFormUrl("");
    setError("");
  };

  return (
    <div className="flex grow flex-col gap-4 p-4">
      <div className="max-w-2xl self-center">
        <div className="mb-6 text-center">
          <p className="text-contrast/70 text-lg">
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
          <FormUrlInput
            formUrl={formUrl}
            error={error}
            isValidating={isValidating}
            onChange={handleUrlChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onPasteClick={handlePasteClick}
            onKeyDown={handleKeyPress}
            onClear={handleClear}
          />

          <GenerateButton
            disabled={!formUrl.trim() || !!error || isGenerating}
            isGenerating={isGenerating}
            onClick={handleGenerate}
          />
        </form>

        <FormDescription />

        {generatedUrl && (
          <GeneratedLink
            generatedUrl={generatedUrl}
            copied={copied}
            onCopy={handleCopy}
          />
        )}
      </div>
    </div>
  );
}

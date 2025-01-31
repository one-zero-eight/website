import { usePwaPrompt } from "@/app/pwa-prompt.ts";

export function PwaWidget() {
  const deferredPrompt = usePwaPrompt();

  // Don't show the widget if the browser does not support the PWA prompt
  if (!deferredPrompt) return null;

  return (
    <div className="group flex flex-row gap-4 rounded-2xl bg-primary px-4 py-4">
      <span className="icon-[material-symbols--install-mobile-outline-rounded] hidden w-12 shrink-0 text-5xl text-brand-violet sm:block" />
      <div className="flex flex-col">
        <div className="flex text-lg font-semibold text-contrast">
          <span className="icon-[material-symbols--install-mobile-outline-rounded] mr-2 shrink-0 text-3xl text-brand-violet sm:hidden" />
          <span>Install as PWA</span>
        </div>
        <div className="text-contrast/75">
          Add to home screen and use it like a native app.
        </div>
        <button
          type="button"
          onClick={() => deferredPrompt?.prompt()}
          className="flex w-fit items-center text-contrast/75 hover:underline"
        >
          <span className="icon-[material-symbols--arrow-forward] mr-1 text-brand-violet" />
          <span className="text-brand-violet">Install</span>
        </button>
      </div>
    </div>
  );
}

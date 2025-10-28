import { usePwaPrompt } from "@/app/pwa-prompt.tsx";
import { useLocalStorage } from "usehooks-ts";

export function PwaWidget() {
  const deferredPrompt = usePwaPrompt();
  const [widgetShown, setWidgetShown] = useLocalStorage("widget-pwa", true);

  // Don't show the widget if the browser does not support the PWA prompt
  if (!deferredPrompt) return null;
  // Don't show if the user has closed the widget
  if (!widgetShown) return null;

  return (
    <div className="group bg-primary flex flex-row gap-4 rounded-2xl px-4 py-4">
      <span className="icon-[material-symbols--install-mobile-outline-rounded] text-brand-violet hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex flex-col">
        <div className="text-contrast flex text-lg font-semibold">
          <span className="icon-[material-symbols--install-mobile-outline-rounded] text-brand-violet mr-2 shrink-0 text-3xl sm:hidden" />
          <span>Install as PWA</span>
        </div>
        <div className="text-contrast/75">
          Add to home screen and use it like a native app.
        </div>
        <button
          type="button"
          onClick={() => deferredPrompt?.prompt()}
          className="text-contrast/75 flex w-fit items-center hover:underline"
        >
          <span className="icon-[material-symbols--arrow-forward] text-brand-violet mr-1" />
          <span className="text-brand-violet">Install</span>
        </button>
      </div>
      <button
        type="button"
        className="text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75 -mt-4 -mr-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        onClick={() => setWidgetShown(false)}
      >
        <span className="icon-[material-symbols--close] text-xl" />
      </button>
    </div>
  );
}

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
    <div className="group bg-inh-primary rounded-box flex flex-row gap-4 px-4 py-4">
      <span className="icon-[material-symbols--install-mobile-outline-rounded] text-primary hidden w-12 shrink-0 text-5xl sm:block" />
      <div className="flex grow flex-col">
        <div className="text-base-content flex text-lg font-semibold">
          <span className="icon-[material-symbols--install-mobile-outline-rounded] text-primary mr-2 shrink-0 text-3xl sm:hidden" />
          <span>Install as PWA</span>
        </div>
        <div className="text-base-content/75">
          Add to home screen and use it like a native app.
        </div>
        <button
          type="button"
          onClick={() => deferredPrompt?.prompt()}
          className="text-base-content/75 flex w-fit items-center hover:underline"
        >
          <span className="icon-[material-symbols--arrow-forward] text-primary mr-1" />
          <span className="text-primary">Install</span>
        </button>
      </div>
      <button
        type="button"
        className="text-base-content/50 hover:bg-inh-primary-hover/50 hover:text-base-content/75 rounded-box -mt-4 -mr-4 flex h-12 w-12 shrink-0 items-center justify-center"
        onClick={() => setWidgetShown(false)}
      >
        <span className="icon-[material-symbols--close] text-xl" />
      </button>
    </div>
  );
}

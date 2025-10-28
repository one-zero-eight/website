import { mapsTypes } from "@/api/maps";
import { FloatingOverlay, FloatingPortal } from "@floating-ui/react";
import { PropsWithChildren, useCallback, useEffect, useState } from "react";
import { MapViewer } from "./MapViewer.tsx";

export function MapView({
  scene,
  highlightAreas,
  disablePopup = false,
}: {
  scene: mapsTypes.SchemaScene;
  highlightAreas: mapsTypes.SchemaArea[];
  disablePopup?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const switchFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  // Set fullscreen mode when the fullscreen state changes
  useEffect(() => {
    // requestFullscreen and exitFullscreen are not supported on iPhone Safari
    if (fullscreen) {
      document.body.requestFullscreen?.();
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    }
  }, [fullscreen]);

  // Exit fullscreen mode when the user exits fullscreen mode using the browser
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Exit fullscreen mode when the user presses the Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <FullscreenMode enable={fullscreen}>
      <div className="relative h-full w-full overflow-hidden">
        <MapViewer
          scene={scene}
          highlightAreas={highlightAreas}
          disablePopup={disablePopup}
        />
        {!disablePopup && (
          <button
            type="button"
            className="bg-primary/50 hover:bg-primary/75 absolute right-2 bottom-2 flex h-fit rounded-xl px-2 py-2"
            onClick={() => switchFullscreen()}
          >
            <span className="icon-[material-symbols--fullscreen] text-2xl" />
          </button>
        )}
      </div>
    </FullscreenMode>
  );
}

function FullscreenMode({
  children,
  enable,
}: PropsWithChildren<{ enable: boolean }>) {
  if (!enable) return <>{children}</>;

  return (
    <FloatingPortal>
      <FloatingOverlay className="z-10 bg-gray-50 dark:bg-gray-900">
        {children}
      </FloatingOverlay>
    </FloatingPortal>
  );
}

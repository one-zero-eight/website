import { customFetch } from "@/api/helpers/custom-fetch.ts";
import { mapsTypes } from "@/api/maps";
import { useToast } from "@/components/toast";
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
  const { showError } = useToast();
  const [fullscreen, setFullscreen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const switchFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  async function handleExportPdf() {
    setIsExportingPdf(true);

    try {
      const { data, error } = await customFetch.GET(
        `${import.meta.env.VITE_MAPS_API_URL}/pdf`,
        { parseAs: "blob" },
      );

      if (error || !data) {
        showError("Export failed", "Could not download maps PDF.");
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "innohassle-maps.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("Export failed", "Could not download maps PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

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
          <>
            <button
              type="button"
              className="bg-base-300/50 hover:bg-base-300/75 absolute top-2 right-2 flex h-fit items-center gap-1 rounded-xl px-2 py-2"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
            >
              {isExportingPdf ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <span className="icon-[material-symbols--description-outline] text-2xl" />
              )}
              <span className="text-sm font-medium">Export PDF</span>
            </button>
            <button
              type="button"
              className="bg-base-300/50 hover:bg-base-300/75 absolute right-2 bottom-2 flex h-fit rounded-xl px-2 py-2"
              onClick={() => switchFullscreen()}
            >
              <span className="icon-[material-symbols--fullscreen] text-2xl" />
            </button>
          </>
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
      <FloatingOverlay className="z-10">{children}</FloatingOverlay>
    </FloatingPortal>
  );
}

import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

export type ConfigLoadResult = { ok: true } | { ok: false; message: string };

export function ConfigLoadModal({
  open,
  onOpenChange,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (
    configFile: File | null,
    outputFile: File | null,
  ) => Promise<ConfigLoadResult>;
}) {
  const [configFile, setConfigFile] = useState<File | null>(null);
  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [loadPhase, setLoadPhase] = useState<"idle" | "loading" | "success">(
    "idle",
  );
  const [loadError, setLoadError] = useState("");
  /** 3 → 2 → 1 по секундам, затем 0 и закрытие; 0 = нет отсчёта. */
  const [successTick, setSuccessTick] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { context, refs } = useFloating({ open, onOpenChange });
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);
  const dismiss = useDismiss(context, {
    enabled: loadPhase !== "loading",
    outsidePressEvent: "mousedown",
  });
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const closeModalAfterSuccess = useCallback(() => {
    setSuccessTick(0);
    setLoadPhase("idle");
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setConfigFile(null);
      setOutputFile(null);
      setLoadPhase("idle");
      setLoadError("");
      setSuccessTick(0);
    }
  }, [open]);

  useEffect(() => {
    if (loadPhase !== "success") return;
    if (successTick === 0) {
      closeModalAfterSuccess();
      return;
    }
    const t = window.setTimeout(() => {
      setSuccessTick((n) => n - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [loadPhase, successTick, closeModalAfterSuccess]);

  async function handleLoadSubmit() {
    setLoadError("");
    setLoadPhase("loading");
    try {
      const result = await onLoad(configFile, outputFile);
      if (!result.ok) {
        setLoadError(result.message);
        setLoadPhase("idle");
        return;
      }
      setLoadPhase("success");
      setSuccessTick(3);
    } catch {
      setLoadError("Не удалось выполнить загрузку.");
      setLoadPhase("idle");
    }
  }

  const fileInputsDisabled = loadPhase === "loading" || loadPhase === "success";

  if (!isMounted) {
    return null;
  }

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="z-100 grid place-items-center bg-black/60 p-4"
        lockScroll
      >
        <FloatingFocusManager
          context={context}
          initialFocus={closeButtonRef}
          modal
        >
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex w-full max-w-lg flex-col"
          >
            <div className="bg-base-100 border-base-300 rounded-box overflow-hidden border shadow-xl">
              <div className="border-base-200 flex items-start justify-between gap-2 border-b px-4 py-3">
                <h4 className="text-base-content text-base font-semibold">
                  Загрузка конфигурации
                </h4>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="btn btn-ghost btn-sm btn-square -mt-0.5 -mr-1 shrink-0"
                  disabled={loadPhase === "loading"}
                  onClick={() => onOpenChange(false)}
                >
                  <span className="icon-[material-symbols--close] text-2xl" />
                </button>
              </div>
              <div className="flex flex-col gap-4 p-4">
                {loadError ? (
                  <div className="alert alert-error alert-soft text-sm">
                    {loadError}
                  </div>
                ) : null}
                <label className="form-control min-w-0 gap-1.5">
                  <span className="label-text text-base-content/70 text-xs font-medium tracking-wide uppercase">
                    Config YAML
                  </span>
                  <input
                    name="configFile"
                    type="file"
                    className="file-input file-input-bordered file-input-sm w-full max-w-full"
                    accept=".yaml,.yml"
                    disabled={fileInputsDisabled}
                    onChange={(e) => {
                      setLoadError("");
                      setConfigFile(e.target.files?.[0] || null);
                    }}
                  />
                </label>
                <label className="form-control min-w-0 gap-1.5">
                  <span className="label-text text-base-content/70 text-xs font-medium tracking-wide uppercase">
                    Output YAML{" "}
                    <span className="text-base-content/50 normal-case">
                      (необязательно)
                    </span>
                  </span>
                  <input
                    name="outputFile"
                    type="file"
                    className="file-input file-input-bordered file-input-sm w-full max-w-full"
                    accept=".yaml,.yml"
                    disabled={fileInputsDisabled}
                    onChange={(e) => {
                      setLoadError("");
                      setOutputFile(e.target.files?.[0] || null);
                    }}
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={clsx(
                      "btn btn-sm min-h-9 gap-2",
                      loadPhase === "success"
                        ? "btn-soft btn-success"
                        : "btn-primary",
                    )}
                    disabled={loadPhase === "loading"}
                    onClick={() => {
                      if (loadPhase === "success") {
                        closeModalAfterSuccess();
                        return;
                      }
                      void handleLoadSubmit();
                    }}
                  >
                    {loadPhase === "loading" ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : loadPhase === "success" ? (
                      <>
                        <span className="icon-[mdi--check] text-success shrink-0 text-lg" />
                        <span className="text-success">
                          Успешно
                          {successTick >= 1 && successTick <= 3 ? (
                            <>
                              {" "}
                              <span className="font-semibold tabular-nums">
                                {successTick}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </>
                    ) : (
                      "Загрузить"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}

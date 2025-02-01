// null - pwa prompt is not supported by this browser or platform
// BeforeInstallPromptEvent - we can trigger the prompt with the prompt() method
import { createContext, PropsWithChildren, useContext, useState } from "react";
import { useEventListener } from "usehooks-ts";

export const PwaPromptContext = createContext<any>(null);

export function PwaPromptProvider({ children }: PropsWithChildren) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEventListener("beforeinstallprompt" as any, (e) => {
    console.log(e);
    // Remember the event in global variable, so we can trigger the prompt later
    setDeferredPrompt(e);
  });

  return (
    <PwaPromptContext.Provider value={deferredPrompt}>
      {children}
    </PwaPromptContext.Provider>
  );
}

export function usePwaPrompt() {
  return useContext(PwaPromptContext);
}

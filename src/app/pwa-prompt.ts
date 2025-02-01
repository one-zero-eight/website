// null - pwa prompt is not supported by this browser or platform
// BeforeInstallPromptEvent - we can trigger the prompt with the prompt() method
let deferredPrompt: null | any = null;

window.addEventListener("beforeinstallprompt", (e) => {
  // Remember the event in global variable, so we can trigger the prompt later
  deferredPrompt = e;
  console.log(deferredPrompt);
});

export function usePwaPrompt() {
  return deferredPrompt;
}

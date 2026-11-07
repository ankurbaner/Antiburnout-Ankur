interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const initInstall = (): void => {
  const button = document.getElementById("install-app");
  if (!button) return;
  let pending: InstallPrompt | null = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    pending = event as InstallPrompt;
    button.hidden = false;
  });
  button.addEventListener("click", async () => {
    const prompt = pending;
    if (!prompt) return;
    pending = null;
    button.hidden = true;
    try { await prompt.prompt(); await prompt.userChoice; } catch { /* the browser may withdraw the prompt */ }
  });
  window.addEventListener("appinstalled", () => { pending = null; button.hidden = true; });
};

export const registerWorker = (): void => {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI), { scope: new URL("./", document.baseURI).href }).catch(() => {});
  }
};

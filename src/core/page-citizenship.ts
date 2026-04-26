import type { RendererController } from "./renderer.ts";

/**
 * Page-citizenship wrapper.
 *
 * Wraps any `RendererController` so the underlying renderer auto-pauses in
 * response to environmental signals: the container scrolling offscreen,
 * the tab being hidden, or the user setting `prefers-reduced-motion`.
 *
 * Design rationale and the "sticky reduced-motion" trade-off are documented
 * in ADR 0010. The wrapper-function shape (rather than a base class or a
 * mount option) keeps this concern composable across every renderer tier
 * without coupling the page-citizenship signals into each tier's loop.
 */
export function withPageCitizenship(
  inner: RendererController,
  container: HTMLElement,
): RendererController {
  let userPaused = inner.paused;
  let offscreen = false;
  let hidden = typeof document !== "undefined" ? document.hidden : false;

  const mql =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  let reducedMotion = mql ? mql.matches : false;

  let mounted = true;
  let lastApplied = inner.paused;

  // Apply the initial composite state in case any signal already wants pause.
  syncToInner();

  const observer =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          // Fold every entry; in practice we only observe one element, but
          // the observer API delivers an array and we trust the latest.
          for (const entry of entries) {
            offscreen = !entry.isIntersecting;
          }
          syncToInner();
        })
      : null;
  observer?.observe(container);

  const onVisibility = () => {
    hidden = document.hidden;
    syncToInner();
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  const onMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    syncToInner();
  };
  mql?.addEventListener("change", onMotionChange);

  function shouldBePaused(): boolean {
    return userPaused || offscreen || hidden || reducedMotion;
  }

  function syncToInner(): void {
    if (!mounted) return;
    const next = shouldBePaused();
    if (next === lastApplied) return;
    lastApplied = next;
    if (next) inner.pause();
    else inner.resume();
  }

  return {
    get mounted() {
      return mounted;
    },
    get paused() {
      return shouldBePaused();
    },
    pause() {
      userPaused = true;
      syncToInner();
    },
    resume() {
      // Note: this does NOT clear `reducedMotion`. If the OS preference is
      // set, resume() is a no-op until the user changes the setting and the
      // mql change handler clears it. See ADR 0010.
      userPaused = false;
      syncToInner();
    },
    setScene(next) {
      inner.setScene(next);
    },
    dispose() {
      if (!mounted) return;
      mounted = false;
      observer?.disconnect();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      mql?.removeEventListener("change", onMotionChange);
      inner.dispose();
    },
  };
}

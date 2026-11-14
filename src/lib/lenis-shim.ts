export default class Lenis {
  scroll: number = 0;
  limit: number = 0;
  velocity: number = 0;
  direction: number = 0;
  progress: number = 0;
  isSmooth: boolean = true;
  isScrolling: boolean = false;
  isStopped: boolean = false;

  constructor(_options?: Record<string, unknown>) {}

  raf(_time: number): void {}

  destroy(): void {}

  on(_event: string, _callback: (e: unknown) => void): void {}

  off(_event: string, _callback?: (e: unknown) => void): void {}

  start(): void {
    this.isStopped = false;
  }

  stop(): void {
    this.isStopped = true;
  }

  scrollTo(target: string | number | HTMLElement, options?: { immediate?: boolean; offset?: number; duration?: number }): void {
    if (typeof window === "undefined") return;

    const behavior: ScrollBehavior = options?.immediate ? ("instant" as ScrollBehavior) : "smooth";

    if (typeof target === "number") {
      const top = target + (options?.offset ?? 0);
      window.scrollTo({ top, behavior });
    } else if (typeof target === "string") {
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior });
      }
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior });
    }
  }
}

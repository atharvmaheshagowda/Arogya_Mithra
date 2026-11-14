declare module "@studio-freight/lenis" {
  export interface LenisOptions {
    duration?: number;
    easing?: (t: number) => number;
    orientation?: "vertical" | "horizontal";
    gestureOrientation?: "vertical" | "horizontal";
    smoothWheel?: boolean;
    touchMultiplier?: number;
    infinite?: boolean;
    [key: string]: any;
  }

  export interface ScrollToOptions {
    offset?: number;
    immediate?: boolean;
    duration?: number;
    easing?: (t: number) => number;
    lock?: boolean;
    onComplete?: () => void;
  }

  export default class Lenis {
    scroll: number;
    limit: number;
    velocity: number;
    direction: number;
    progress: number;
    isSmooth: boolean;
    isScrolling: boolean;
    isStopped: boolean;

    constructor(options?: LenisOptions);
    raf(time: number): void;
    destroy(): void;
    on(event: string, callback: (e: any) => void): void;
<<<<<<< HEAD
    scrollTo(target: any, options?: any): void;
=======
    off(event: string, callback?: (e: any) => void): void;
    start(): void;
    stop(): void;
    scrollTo(target: string | number | HTMLElement, options?: ScrollToOptions): void;
>>>>>>> 91d607e77116ecc8f87eacee98e56a92d12db3c1
  }
}

declare module "gsap" {
  const gsap: any;
  export default gsap;
  export const ScrollTrigger: any;
}

declare module "gsap/ScrollTrigger" {
  export const ScrollTrigger: any;
  export default ScrollTrigger;
}


declare module "@studio-freight/lenis" {
  export interface LenisOptions {
    duration?: number;
    easing?: (t: number) => number;
    orientation?: "vertical" | "horizontal";
    gestureOrientation?: "vertical" | "horizontal";
    smoothWheel?: boolean;
    [key: string]: any;
  }

  export default class Lenis {
    constructor(options?: LenisOptions);
    raf(time: number): void;
    destroy(): void;
    on(event: string, callback: (e: any) => void): void;
  }
}

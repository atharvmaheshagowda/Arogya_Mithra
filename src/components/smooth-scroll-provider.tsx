import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface SmoothScrollContextValue {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, options?: Record<string, unknown>) => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
  scrollTo: () => {},
});

export function useLenis() {
  return useContext(SmoothScrollContext);
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    // Register GSAP ScrollTrigger plugin safely
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    let lenis: Lenis | null = null;
    let tickerCallback: ((time: number) => void) | null = null;

    try {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        touchMultiplier: 1.8,
        infinite: false,
      });

      lenisRef.current = lenis;

      // Sync Lenis scroll updates with GSAP ScrollTrigger
      lenis.on("scroll", ScrollTrigger.update);

      // Drive Lenis smoothly via GSAP ticker with lagSmoothing disabled for 0 jitter
      tickerCallback = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);
    } catch (error) {
      console.warn("Smooth scroll initialization fallback to native scrolling:", error);
    }

    return () => {
      if (tickerCallback) {
        gsap.ticker.remove(tickerCallback);
      }
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Smoothly reset scroll to top on page route transition
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const scrollTo = (target: string | number | HTMLElement, options?: Record<string, unknown>) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, options);
    } else if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: "smooth" });
    } else if (typeof target === "string") {
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: "smooth" });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisRef.current, scrollTo }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

// src/components/ui/parallax-scrolling.tsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { Sparkles } from "lucide-react";

export interface ParallaxComponentProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ParallaxComponent({
  title = "Parallax",
  className = "",
}: ParallaxComponentProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const triggerElement = parallaxRef.current?.querySelector(
      "[data-parallax-layers]"
    ) as HTMLElement | null;

    let tl: gsap.core.Timeline | null = null;
    let lenis: Lenis | null = null;

    if (triggerElement) {
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "0% 0%",
          end: "100% 0%",
          scrub: 0,
        },
      });

      const layers = [
        { layer: "1", yPercent: 70 },
        { layer: "2", yPercent: 55 },
        { layer: "3", yPercent: 40 },
        { layer: "4", yPercent: 10 },
      ];

      layers.forEach((layerObj, idx) => {
        tl?.to(
          triggerElement.querySelectorAll(
            `[data-parallax-layer="${layerObj.layer}"]`
          ),
          {
            yPercent: layerObj.yPercent,
            ease: "none",
          },
          idx === 0 ? undefined : "<"
        );
      });
    }

    try {
      lenis = new Lenis();
      lenis.on("scroll", ScrollTrigger.update);
      const rafCallback = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);
    } catch (e) {
      console.warn("Lenis initialization skipped or unsupported in environment", e);
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (triggerElement) {
        gsap.killTweensOf(triggerElement);
      }
      tl?.kill();
      lenis?.destroy();
    };
  }, []);

  return (
    <div className={`parallax relative w-full overflow-hidden ${className}`} ref={parallaxRef}>
      <section className="parallax__header relative h-[100vh] w-full overflow-hidden bg-background">
        <div className="parallax__visuals relative h-full w-full">
          <div className="parallax__black-line-overflow absolute inset-x-0 top-0 h-px bg-border/40 z-10"></div>
          
          <div
            data-parallax-layers
            className="parallax__layers relative h-full w-full overflow-hidden"
          >
            {/* Layer 1: Background Landscape (High-res reliable medical science / mountain mist Unsplash) */}
            <img
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80"
              loading="eager"
              width="1600"
              height="900"
              data-parallax-layer="1"
              alt="Deep background landscape"
              className="parallax__layer-img absolute inset-0 h-full w-full object-cover opacity-60 dark:opacity-40"
            />

            {/* Layer 2: Midground Atmospheric Layer */}
            <img
              src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80"
              loading="eager"
              width="1600"
              height="900"
              data-parallax-layer="2"
              alt="Midground star and atmosphere layer"
              className="parallax__layer-img absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-50 dark:opacity-60"
            />

            {/* Layer 3: Editorial Typography Overlay */}
            <div
              data-parallax-layer="3"
              className="parallax__layer-title absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 liquid-glass px-4 py-1.5 mb-4 shadow-sm backdrop-blur-md">
                <Sparkles className="size-3.5 text-accent animate-pulse" />
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  AAROGYA MITHRA • CINEMATIC EXPERIENCE
                </span>
              </div>
              <h2 className="parallax__title font-display text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-foreground drop-shadow-sm">
                {title}
              </h2>
            </div>

            {/* Layer 4: Foreground Depth Silhouette Layer */}
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80"
              loading="eager"
              width="1600"
              height="900"
              data-parallax-layer="4"
              alt="Foreground mountain contours"
              className="parallax__layer-img absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40 dark:opacity-50"
            />
          </div>

          {/* Fade transition to the next section */}
          <div className="parallax__fade pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent z-30"></div>
        </div>
      </section>

      {/* Decorative Brand SVG / Icon Showcase Section */}
      <section className="parallax__content relative flex items-center justify-center py-20 px-4 bg-background">
        <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 160 160"
            fill="none"
            className="osmo-icon-svg text-accent animate-pulse"
          >
            <path
              d="M94.8284 53.8578C92.3086 56.3776 88 54.593 88 51.0294V0H72V59.9999C72 66.6273 66.6274 71.9999 60 71.9999H0V87.9999H51.0294C54.5931 87.9999 56.3777 92.3085 53.8579 94.8283L18.3431 130.343L29.6569 141.657L65.1717 106.142C67.684 103.63 71.9745 105.396 72 108.939V160L88.0001 160L88 99.9999C88 93.3725 93.3726 87.9999 100 87.9999H160V71.9999H108.939C105.407 71.9745 103.64 67.7091 106.12 65.1938L106.142 65.1716L141.657 29.6568L130.343 18.3432L94.8284 53.8578Z"
              fill="currentColor"
            ></path>
          </svg>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            Smooth inertia scrolling &amp; layered depth choreography engineered for modern interactive storytelling.
          </p>
        </div>
      </section>
    </div>
  );
}

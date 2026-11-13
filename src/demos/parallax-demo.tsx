// src/demos/parallax-demo.tsx
import { ParallaxComponent } from "@/components/ui/parallax-scrolling";

export default function ParallaxDemo() {
  return (
    <div className="min-h-screen bg-background">
      <ParallaxComponent title="AAROGYA MITHRA" />
      <div className="osmo-credits py-8 text-center text-xs text-muted-foreground border-t border-border/60">
        <p className="osmo-credits__p">
          Cinematic Parallax Engine with GSAP &amp; Lenis • Resource inspired by{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://www.osmo.supply/"
            className="osmo-credits__p-a text-accent hover:underline font-semibold"
          >
            Osmo
          </a>
        </p>
      </div>
    </div>
  );
}

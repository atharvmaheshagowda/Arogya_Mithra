import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { AarogyaMithraBrand } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "Workflow" },
  { href: "#context-engine", label: "Patient Context" },
  { href: "#safety", label: "Clinical Safety" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 25);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Floating Centered Pill Navbar */}
      <header
        className={cn(
          "fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl rounded-full transition-all duration-300",
          "border border-border/70 bg-card/85 dark:bg-card/90 backdrop-blur-xl shadow-md",
          scrolled ? "py-2 sm:py-2.5 shadow-lg border-border" : "py-2.5 sm:py-3",
        )}
      >
        <div className="flex items-center justify-between px-3 sm:px-5">
          {/* Brand Logo & Symbol */}
          <a
            href="#"
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full py-0.5 px-1"
            aria-label="AAROGYA MITHRA Home"
          >
            <AarogyaMithraBrand compact showSubtitle={false} />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs lg:text-sm font-medium text-muted-foreground">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="relative py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeSwitcher className="size-8 sm:size-9" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex text-xs font-semibold text-muted-foreground hover:text-foreground h-8 px-3 rounded-full"
            >
              Doctor Login
            </Button>

            <Button
              variant="teal"
              size="sm"
              onClick={() => navigate("/app")}
              rightIcon={<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />}
              className="group h-8 sm:h-9 rounded-full px-3.5 sm:px-4 text-xs font-semibold shadow-xs"
            >
              <span className="hidden xs:inline">Open </span>Workspace
            </Button>

            {/* Mobile Hamburger Trigger */}
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden grid size-8 place-items-center rounded-full text-foreground/80 hover:bg-muted/80 transition-colors"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-20 left-4 right-4 rounded-3xl border border-border/80 liquid-glass p-6 shadow-2xl backdrop-blur-2xl">
            <nav className="flex flex-col gap-2 text-sm font-medium">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="rounded-2xl px-4 py-3 text-base font-medium text-foreground/85 hover:bg-muted/60 hover:text-accent transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 pt-4 border-t border-border/80 flex flex-col gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/login");
                  }}
                  className="w-full rounded-full text-xs font-semibold py-3"
                >
                  Doctor Login
                </Button>
                <Button
                  variant="teal"
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/app");
                  }}
                  rightIcon={<ArrowRight className="size-4" />}
                  className="w-full rounded-full text-xs font-semibold py-3"
                >
                  Enter OPD Workspace
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

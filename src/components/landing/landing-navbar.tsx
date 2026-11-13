import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { AarogyaMithraBrand } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "Workflow Blueprint" },
  { href: "#context-engine", label: "Context Engine" },
  { href: "#safety", label: "Clinical Safety" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/80 bg-background/85 py-3 backdrop-blur-md shadow-xs"
          : "bg-transparent py-5",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2" aria-label="AAROGYA MITHRA Home">
          <AarogyaMithraBrand showSubtitle />
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right CTA Area */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login")}
            className="text-muted-foreground hover:text-foreground"
          >
            Doctor Login
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={() => navigate("/app")}
            rightIcon={<ArrowRight className="size-3.5" />}
          >
            Open Workspace
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border bg-background/95 px-5 py-6 backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
          <nav className="flex flex-col gap-4 text-base font-medium">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="text-foreground/80 hover:text-accent py-1"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 mt-2 border-t border-border flex flex-col gap-2.5">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/login");
                }}
              >
                Doctor Sign In
              </Button>
              <Button
                variant="teal"
                className="w-full justify-center"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/app");
                }}
                rightIcon={<ArrowRight className="size-4" />}
              >
                Launch OPD Workspace
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

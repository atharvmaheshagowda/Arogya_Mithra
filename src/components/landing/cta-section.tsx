import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 bg-[#102A43] text-white">
      {/* Background radial teal aura & dots pattern */}
      <div className="pointer-events-none absolute inset-0 surface-dots opacity-20" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-teal-500/15 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8 space-y-8">
        <div className="inline-flex items-center gap-2">
          <Badge variant="teal" size="md" className="!bg-teal-500/20 !border-teal-400/40 !text-teal-200" dot pulse>
            READY FOR LIVE CLINICAL PILOT
          </Badge>
        </div>

        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
          Spend Less Time Documenting.
          <br />
          <span className="text-teal-300 font-serif italic">More Time Caring.</span>
        </h2>

        <p className="mx-auto max-w-2xl text-base sm:text-lg text-white/75 leading-relaxed font-normal">
          Empower your outpatient department with an evidence-grounded copilot that listens to multilingual consultations, connects patient history, and safeguards medications while doctors stay in total control.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button
            variant="teal"
            size="xl"
            className="!bg-teal-500 hover:!bg-teal-400 !text-slate-950 font-bold"
            onClick={() => navigate("/app")}
            rightIcon={<ArrowRight className="size-4" />}
          >
            Enter AAROGYA MITHRA Workspace
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="!border-white/20 !bg-white/5 !text-white hover:!bg-white/10"
            onClick={() => navigate("/register")}
          >
            Configure Doctor Profile
          </Button>
        </div>

        {/* Reassurance Features */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-xs text-white/60 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-teal-400" />
            Zero identity verification needed for demo
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-teal-400" />
            100% Doctor-in-the-loop sign-off
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-teal-400" />
            Synthetic clinical test data only
          </span>
        </div>
      </div>
    </section>
  );
}

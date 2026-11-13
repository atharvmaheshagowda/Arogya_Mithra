import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
  category: "Languages & Speech" | "Clinical Governance" | "Technology & Privacy" | "EMR Integration";
}

const faqs: FaqItem[] = [
  {
    category: "Languages & Speech",
    question: "How does AAROGYA MITHRA handle mixed Kannada, Hindi, and English during real consultations?",
    answer:
      "AAROGYA MITHRA uses speech models optimized for Indian linguistic code-mixing (Hinglish and Kanglish). The model doesn't require speakers to choose one language beforehand; it captures the dialogue naturally, identifies regional colloquialisms (e.g., 'ede uri' in Kannada for burning sensation, or 'chakkar' in Hindi for dizziness), and maps them directly to standardized ICD-10 and SNOMED clinical concepts in the English SOAP note.",
  },
  {
    category: "Clinical Governance",
    question: "Does AAROGYA MITHRA ever make autonomous diagnoses or write prescriptions independently?",
    answer:
      "Never. AAROGYA MITHRA operates under a strict physician-in-the-loop architecture. Every single note, extraction, and alert is presented as a draft advisory. The attending physician must actively review, modify if necessary, and digitally authenticate every clinical record before it is finalized or transmitted to the pharmacy.",
  },
  {
    category: "Technology & Privacy",
    question: "How is patient confidentiality and health data protected under Indian and international standards?",
    answer:
      "AAROGYA MITHRA adheres to India's Digital Personal Data Protection (DPDP) Act, ABDM standards, and HIPAA guidelines. Audio streams are processed ephemerally in-memory for note generation and are never stored permanently unless explicitly opted-in for audit review. Data is encrypted in transit via TLS 1.3 and at rest with AES-256.",
  },
  {
    category: "Technology & Privacy",
    question: "What happens if our hospital OPD experiences unstable internet connectivity?",
    answer:
      "The client application is built with an offline-resilient local cache. During momentary dropouts, ambient recordings continue buffering locally in secure browser storage. Once network connectivity re-establishes, the consultation pipeline synchronizes seamlessly with zero data loss.",
  },
  {
    category: "Languages & Speech",
    question: "Can the system accurately read low-resolution photos of crumpled handwritten prescriptions?",
    answer:
      "Yes. The READ module features a specialized computer vision pipeline tailored for Indian pharmaceutical trade names and physician handwriting. Furthermore, every extracted entity features a visual confidence score; if handwriting is illegible, the system flags the parameter for mandatory doctor manual confirmation rather than guessing.",
  },
  {
    category: "EMR Integration",
    question: "How does AAROGYA MITHRA integrate into our hospital's existing EMR or OPD queue system?",
    answer:
      "AAROGYA MITHRA provides standard HL7 FHIR APIs and lightweight webhook adapters compatible with major Indian hospital information systems (HIS), including e-Hospital, MedGenome, Napier, and custom hospital databases. Notes can be directly injected into existing electronic medical records or exported as signed PDFs.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <Badge variant="teal" size="md">FREQUENTLY ASKED QUESTIONS</Badge>
          <h2 className="text-display-1 text-foreground">
            Frequently asked questions about AAROGYA MITHRA.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Everything you need to know about multilingual listening, clinical governance, privacy, and OPD integration.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all duration-200",
                  isOpen
                    ? "border-accent/40 bg-card shadow-md ring-1 ring-accent/15"
                    : "border-border/80 bg-card/60 hover:border-border",
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      {faq.category}
                    </span>
                    <h3 className="font-display text-lg font-semibold text-foreground leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-transform duration-200">
                    <ChevronDown
                      className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180 text-accent")}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border/60 px-5 pb-6 pt-3 sm:px-6 text-sm text-muted-foreground leading-relaxed animate-in fade-in-50 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

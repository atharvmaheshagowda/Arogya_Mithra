import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  Edit3,
  ExternalLink,
  FileCheck2,
  FileText,
  Info,
  Layers,
  Lock,
  Pencil,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ClinicalNodeData, WorkflowNodeStatus } from "@/lib/workflow-service";

interface WorkflowInspectorProps {
  nodeData: ClinicalNodeData | null;
  onClose: () => void;
  onEdit: (node: ClinicalNodeData) => void;
  onDelete: (nodeId: string) => void;
  onStatusChange?: (nodeId: string, status: WorkflowNodeStatus) => void;
}

export function WorkflowInspector({
  nodeData,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: WorkflowInspectorProps) {
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);

  if (!nodeData) {
    return (
      <div className="flex h-full flex-col justify-between p-5 text-center select-none">
        <div className="my-auto space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Workflow className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Node Inspector Idle
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Select any stage on the canvas to inspect data contracts, processing topology, inputs, and safety boundaries.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3 text-left text-xs space-y-2">
            <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
              Canvas Guide
            </span>
            <ul className="space-y-1.5 text-muted-foreground text-[11px]">
              <li className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-accent" />
                <span><strong>Drag:</strong> Move nodes to customize topology</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-accent" />
                <span><strong>Connect:</strong> Drag handles between nodes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-accent" />
                <span><strong>Zoom:</strong> Mouse wheel or bottom-left controls</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-4 text-[11px] text-muted-foreground">
          AAROGYA MITHRA 8-Stage Clinical Pipeline
        </div>
      </div>
    );
  }

  const {
    id,
    label,
    code,
    stage,
    category,
    actor,
    summary,
    processingType,
    inputs,
    outputs,
    copilotProcessing,
    safetyGate,
    status,
    routeLink,
    routeLabel,
  } = nodeData;

  const handleSimulateStep = () => {
    setIsSimulating(true);
    toast.info(`Simulating ${label}`, {
      description: `Testing input ingestion: [${inputs[0]}].`,
    });
    setTimeout(() => {
      setIsSimulating(false);
      toast.success(`${label} Simulation Complete`, {
        description: `Generated output artifact: [${outputs[0]}].`,
      });
    }, 1200);
  };

  const getCategoryBadgeVariant = (cat: string) => {
    switch (cat) {
      case "Trigger":
        return "navy";
      case "AI Processing":
        return "teal";
      case "Safety":
        return "warning";
      case "Review":
        return "default";
      case "Delivery":
        return "success";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto clinical-scrollbar p-5 space-y-5">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={getCategoryBadgeVariant(category)} size="sm">
              {category}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground font-semibold">
              {code}
            </span>
            <span className="text-[11px] text-muted-foreground">• Stage: {stage}</span>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {label}
          </h2>
          <p className="text-xs text-accent font-medium">Actor: {actor}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Close Inspector"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Current Stage Status
          </span>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold text-foreground">{status}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="xs"
          onClick={handleSimulateStep}
          disabled={isSimulating}
          leftIcon={<Play className={cn("size-3", isSimulating && "animate-spin")} />}
        >
          {isSimulating ? "Testing..." : "Simulate"}
        </Button>
      </div>

      {/* Description Summary */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Clinical Function &amp; Purpose
        </span>
        <p className="text-xs text-foreground/90 leading-relaxed rounded-xl border border-border bg-muted/20 p-3">
          {summary}
        </p>
      </div>

      {/* Processing Engine Details */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Cpu className="size-3.5 text-accent" />
          Processing Engine Type
        </span>
        <div className="rounded-xl border border-border/80 bg-card p-3 text-xs font-medium text-foreground leading-relaxed">
          {processingType}
        </div>
      </div>

      {/* Input Data Contracts */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Stage Inputs ({inputs.length})
        </span>
        <div className="space-y-1.5">
          {inputs.map((inp, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
              <span className="leading-relaxed">{inp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Output Artifacts */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Resulting Output Artifacts ({outputs.length})
        </span>
        <div className="space-y-1.5">
          {outputs.map((out, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs font-medium text-foreground"
            >
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{out}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Automated Copilot Processing Steps */}
      {copilotProcessing && copilotProcessing.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-accent" />
            Automated Copilot Stream
          </span>
          <div className="space-y-1.5">
            {copilotProcessing.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-foreground/90"
              >
                <span className="grid size-4 place-items-center rounded-full bg-accent/15 text-accent text-[9px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Gate Alert */}
      <div className="rounded-xl border border-warning/40 bg-warning/5 p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-warning text-xs font-bold uppercase tracking-wider">
          <ShieldAlert className="size-4" />
          <span>Clinical Safety &amp; Oversight Gate</span>
        </div>
        <p className="text-xs text-foreground/90 leading-relaxed font-medium">
          {safetyGate}
        </p>
      </div>

      {/* Quick Navigation into Application Module */}
      {routeLink && (
        <div className="pt-2">
          <Link
            to={routeLink}
            className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-semibold text-accent hover:bg-accent/15 transition-all shadow-xs"
          >
            <span>{routeLabel || "Open Associated Clinical Module"}</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Action Footer: Edit & Remove */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          leftIcon={<Pencil className="size-3.5" />}
          onClick={() => onEdit(nodeData)}
        >
          Edit Step
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="px-3"
          title="Delete Node"
          onClick={() => onDelete(id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

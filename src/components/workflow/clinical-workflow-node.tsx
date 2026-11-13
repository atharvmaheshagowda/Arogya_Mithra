import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileCheck2,
  FileSearch,
  FileText,
  HeartPulse,
  Mic,
  Network,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClinicalNodeData, WorkflowNodeCategory } from "@/lib/workflow-service";

export const ClinicalWorkflowNode = memo(function ClinicalWorkflowNode({
  data,
  selected,
}: NodeProps & { data: ClinicalNodeData }) {
  const {
    label,
    code,
    stage,
    category,
    actor,
    processingType,
    inputs,
    outputs,
    status,
    stepId,
  } = data;

  // Icon for category
  const getCategoryIcon = (cat: WorkflowNodeCategory) => {
    switch (cat) {
      case "Trigger":
        return <Zap className="size-3.5 text-amber-400" />;
      case "AI Processing":
        return <Sparkles className="size-3.5 text-teal-300" />;
      case "Safety":
        return <ShieldAlert className="size-3.5 text-amber-300" />;
      case "Review":
        return <Stethoscope className="size-3.5 text-sky-300" />;
      case "Delivery":
        return <CheckCircle2 className="size-3.5 text-emerald-300" />;
    }
  };

  // Header background based on category
  const getHeaderStyles = (cat: WorkflowNodeCategory) => {
    switch (cat) {
      case "Trigger":
        return "bg-gradient-to-r from-primary to-slate-900 text-primary-foreground border-b border-primary/40";
      case "AI Processing":
        return "bg-gradient-to-r from-teal-800 to-teal-950 text-white border-b border-teal-700/60";
      case "Safety":
        return "bg-gradient-to-r from-amber-700 to-amber-950 text-white border-b border-amber-600/60";
      case "Review":
        return "bg-gradient-to-r from-[#102A43] to-slate-900 text-white border-b border-sky-800/60";
      case "Delivery":
        return "bg-gradient-to-r from-emerald-800 to-emerald-950 text-white border-b border-emerald-700/60";
    }
  };

  // Border & Glow based on category & selection
  const getNodeBorder = (cat: WorkflowNodeCategory, isSelected?: boolean) => {
    if (isSelected) {
      return "ring-2 ring-accent border-accent shadow-xl scale-[1.02] shadow-accent/20";
    }

    switch (cat) {
      case "Trigger":
        return "border-border hover:border-primary/60 hover:shadow-md";
      case "AI Processing":
        return "border-teal-500/30 hover:border-teal-500/70 hover:shadow-teal-sm";
      case "Safety":
        return "border-amber-500/40 hover:border-amber-500 hover:shadow-warning-sm";
      case "Review":
        return "border-sky-500/30 hover:border-sky-500/70 hover:shadow-md";
      case "Delivery":
        return "border-emerald-500/40 hover:border-emerald-500 hover:shadow-md";
    }
  };

  // Status dot color
  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Operational":
      case "Synced":
      case "Delivered & Locked":
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {st}
          </span>
        );
      case "Streaming":
      case "Transcribing":
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
            <span className="size-1.5 rounded-full bg-teal-500 animate-ping" />
            {st}
          </span>
        );
      case "Gated (Hard-Stop Active)":
      case "Awaiting Physician Sign-Off":
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {st}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {st}
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        "group relative w-72 rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-200 select-none",
        getNodeBorder(category, selected),
      )}
    >
      {/* React Flow Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3.5 !bg-accent !border-2 !border-background transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3.5 !bg-accent !border-2 !border-background transition-transform hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!size-2.5 !bg-muted-foreground/60 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!size-2.5 !bg-muted-foreground/60 !border-2 !border-background"
      />

      {/* Node Header */}
      <div className={cn("rounded-t-2xl px-3.5 py-2.5", getHeaderStyles(category))}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            {getCategoryIcon(category)}
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
              {category}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider">
              {code}
            </span>
            <span className="grid size-5 place-items-center rounded-full bg-white/20 text-[10px] font-bold">
              {stepId || "•"}
            </span>
          </div>
        </div>

        <h3 className="mt-1 font-display text-sm font-bold tracking-tight text-white line-clamp-1">
          {label}
        </h3>
        <p className="text-[10px] opacity-80 line-clamp-1">{stage} • {actor}</p>
      </div>

      {/* Node Body */}
      <div className="p-3.5 space-y-2.5 text-xs">
        {/* Processing Type snippet */}
        <div className="rounded-lg bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground border border-border/40">
          <span className="font-semibold text-foreground block truncate">
            {processingType}
          </span>
        </div>

        {/* Inputs / Outputs Summary Pills */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-md bg-card border border-border p-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
              Inputs ({inputs.length})
            </span>
            <span className="truncate block font-medium text-foreground/80 mt-0.5">
              {inputs[0]}
            </span>
          </div>
          <div className="rounded-md bg-card border border-border p-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
              Outputs ({outputs.length})
            </span>
            <span className="truncate block font-medium text-foreground/80 mt-0.5">
              {outputs[0]}
            </span>
          </div>
        </div>

        {/* Footer with Status & Selection indicator */}
        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
          {getStatusBadge(status)}

          <span className="text-[10px] text-muted-foreground group-hover:text-accent font-medium transition-colors">
            {selected ? "Selected" : "Click to inspect →"}
          </span>
        </div>
      </div>
    </div>
  );
});


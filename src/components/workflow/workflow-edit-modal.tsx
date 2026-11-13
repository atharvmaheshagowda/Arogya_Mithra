import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ClinicalNodeData,
  WorkflowNodeCategory,
  WorkflowNodeStatus,
} from "@/lib/workflow-service";

interface WorkflowEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: ClinicalNodeData | null;
  onSave: (updatedData: ClinicalNodeData) => void;
}

export function WorkflowEditModal({
  isOpen,
  onClose,
  nodeData,
  onSave,
}: WorkflowEditModalProps) {
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState<WorkflowNodeCategory>("AI Processing");
  const [status, setStatus] = useState<WorkflowNodeStatus>("Operational");
  const [processingType, setProcessingType] = useState("");
  const [summary, setSummary] = useState("");
  const [inputsText, setInputsText] = useState("");
  const [outputsText, setOutputsText] = useState("");
  const [safetyGate, setSafetyGate] = useState("");

  useEffect(() => {
    if (nodeData) {
      setLabel(nodeData.label);
      setCode(nodeData.code);
      setStage(nodeData.stage);
      setCategory(nodeData.category);
      setStatus(nodeData.status);
      setProcessingType(nodeData.processingType);
      setSummary(nodeData.summary);
      setInputsText(nodeData.inputs.join("\n"));
      setOutputsText(nodeData.outputs.join("\n"));
      setSafetyGate(nodeData.safetyGate);
    }
  }, [nodeData]);

  if (!nodeData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedInputs = inputsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedOutputs = outputsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      ...nodeData,
      label,
      code,
      stage,
      category,
      status,
      processingType,
      summary,
      inputs: updatedInputs.length > 0 ? updatedInputs : nodeData.inputs,
      outputs: updatedOutputs.length > 0 ? updatedOutputs : nodeData.outputs,
      safetyGate,
    });

    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(openVal) => {
        if (!openVal) onClose();
      }}
      title={`Edit Workflow Node: ${nodeData.label}`}
      description="Modify clinical node metadata, processing engine parameters, and input/output contracts."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Node Title / Label *
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Multilingual Speech Transcription"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Short Stage Code *
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. LISTEN"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Node Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkflowNodeCategory)}
              className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <option value="Trigger">Trigger</option>
              <option value="AI Processing">AI Processing</option>
              <option value="Safety">Safety</option>
              <option value="Review">Review</option>
              <option value="Delivery">Delivery</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Stage Name
            </label>
            <Input
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g. Speech-to-Clinical"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Node Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkflowNodeStatus)}
              className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <option value="Operational">Operational</option>
              <option value="Streaming">Streaming</option>
              <option value="Transcribing">Transcribing</option>
              <option value="Processed">Processed</option>
              <option value="Synced">Synced</option>
              <option value="Gated (Hard-Stop Active)">Gated (Hard-Stop Active)</option>
              <option value="Awaiting Physician Sign-Off">Awaiting Sign-Off</option>
              <option value="Delivered & Locked">Delivered &amp; Locked</option>
              <option value="Custom Idle">Custom Idle</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground">
            Processing Engine Type
          </label>
          <Input
            value={processingType}
            onChange={(e) => setProcessingType(e.target.value)}
            placeholder="e.g. AI Processing • Dialect-Aware Whisper-Large-v3 + Indian Medical NER"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground">
            Clinical Summary &amp; Description
          </label>
          <textarea
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded-lg border border-border bg-card p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Stage Inputs (one per line)
            </label>
            <textarea
              rows={3}
              value={inputsText}
              onChange={(e) => setInputsText(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              Output Artifacts (one per line)
            </label>
            <textarea
              rows={3}
              value={outputsText}
              onChange={(e) => setOutputsText(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent leading-relaxed"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground">
            Safety Gate / Clinical Boundary
          </label>
          <textarea
            rows={2}
            value={safetyGate}
            onChange={(e) => setSafetyGate(e.target.value)}
            className="w-full rounded-lg border border-border bg-card p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent leading-relaxed"
          />
        </div>
      </form>
    </Modal>
  );
}

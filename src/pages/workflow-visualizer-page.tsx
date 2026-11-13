import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  Download,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Filter,
  HeartPulse,
  Info,
  Layers,
  Lock,
  Maximize2,
  Mic,
  Network,
  Pencil,
  Pill,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Trash2,
  Undo2,
  Upload,
  UserCheck,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  initialWorkflowNodes,
  initialWorkflowEdges,
  customNodeTemplates,
  type ClinicalNode,
  type ClinicalNodeData,
  type ClinicalNodeTemplate,
  type WorkflowNodeCategory,
  type WorkflowNodeStatus,
} from "@/lib/workflow-service";
import { ClinicalWorkflowNode } from "@/components/workflow/clinical-workflow-node";
import { WorkflowInspector } from "@/components/workflow/workflow-inspector";
import { WorkflowEditModal } from "@/components/workflow/workflow-edit-modal";
import { InteractiveWorkflowSection } from "@/components/landing/interactive-workflow-section";

// Register custom node type
const nodeTypes = {
  clinicalNode: ClinicalWorkflowNode,
};

interface HistoryState {
  nodes: ClinicalNode[];
  edges: Edge[];
}

function WorkflowCanvasInner() {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { theme } = useTheme();
  const { toast } = useToast();

  // Nodes & Edges state
  const [nodes, setNodes, onNodesChange] = useNodesState<ClinicalNode>(initialWorkflowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialWorkflowEdges);

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-3");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState<ClinicalNodeData | null>(null);

  // Add Node Dropdown / State
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // View Mode: Canvas Flow vs. Linear Stage Blueprint
  const [viewMode, setViewMode] = useState<"canvas" | "blueprint">("canvas");

  // Simulation Running State
  const [isFlowSimulating, setIsFlowSimulating] = useState(false);
  const [activeSimulationStep, setActiveSimulationStep] = useState<number | null>(null);

  // Undo / Redo History Stack
  const historyRef = useRef<HistoryState[]>([
    { nodes: initialWorkflowNodes, edges: initialWorkflowEdges },
  ]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Record state into undo stack
  const pushHistory = useCallback((newNodes: ClinicalNode[], newEdges: Edge[]) => {
    const curIndex = historyIndexRef.current;
    const newHistory = historyRef.current.slice(0, curIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    // Limit stack size to 25
    if (newHistory.length > 25) newHistory.shift();

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      toast.info("Workflow Action Undone");
    }
  }, [setNodes, setEdges, toast]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      toast.info("Workflow Action Redone");
    }
  }, [setNodes, setEdges, toast]);

  // Connect Nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const updated = addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#0D9488", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#0D9488" },
          },
          eds,
        );
        pushHistory(nodes, updated);
        return updated;
      });
      toast.success("Nodes Connected", {
        description: `Linked ${connection.source} → ${connection.target}.`,
      });
    },
    [nodes, pushHistory, setEdges, toast],
  );

  // Node Click Selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Selected Node Data
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    const found = nodes.find((n) => n.id === selectedNodeId);
    return found ? (found.data as ClinicalNodeData) : null;
  }, [nodes, selectedNodeId]);

  // Open Edit Modal
  const handleOpenEdit = useCallback((data: ClinicalNodeData) => {
    setNodeToEdit(data);
    setIsEditModalOpen(true);
  }, []);

  // Save Node Edit
  const handleSaveNodeEdit = useCallback(
    (updatedData: ClinicalNodeData) => {
      setNodes((nds) => {
        const next = nds.map((node) => {
          if (node.id === updatedData.id) {
            return {
              ...node,
              data: updatedData,
            };
          }
          return node;
        });
        pushHistory(next, edges);
        return next;
      });
      toast.success("Node Updated", {
        description: `Modified parameters for '${updatedData.label}'.`,
      });
    },
    [edges, pushHistory, setNodes, toast],
  );

  // Delete Node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const nextNodes = nds.filter((n) => n.id !== nodeId);
        const nextEdges = edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );
        setEdges(nextEdges);
        pushHistory(nextNodes, nextEdges);
        return nextNodes;
      });
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      toast.info("Node Removed", {
        description: `Deleted node ${nodeId} and all connected edges.`,
      });
    },
    [edges, pushHistory, selectedNodeId, setEdges, setNodes, toast],
  );

  // Add Custom Node from Template
  const handleAddTemplateNode = useCallback(
    (template: ClinicalNodeTemplate) => {
      const newId = `node-custom-${Date.now().toString().slice(-4)}`;
      const position = {
        x: 600 + (nodes.length % 4) * 80,
        y: 280 + (nodes.length % 3) * 60,
      };

      const newNode: ClinicalNode = {
        id: newId,
        type: "clinicalNode",
        position,
        data: {
          ...template,
          id: newId,
          stepId: nodes.length + 1,
          isCustom: true,
        },
      };

      const nextNodes = [...nodes, newNode];
      setNodes(nextNodes);
      setSelectedNodeId(newId);
      setIsAddMenuOpen(false);
      pushHistory(nextNodes, edges);

      toast.success("Custom Step Added", {
        description: `Added '${template.label}' to canvas. Drag to connect.`,
      });
    },
    [edges, nodes, pushHistory, setNodes, toast],
  );

  // Reset to default canonical topology
  const handleResetWorkflow = useCallback(() => {
    setNodes(initialWorkflowNodes);
    setEdges(initialWorkflowEdges);
    setSelectedNodeId("node-3");
    pushHistory(initialWorkflowNodes, initialWorkflowEdges);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 600 });
    }, 100);
    toast.info("Workflow Reset", {
      description: "Restored canonical 8-stage clinical pipeline.",
    });
  }, [fitView, pushHistory, setEdges, setNodes, toast]);

  // Export Workflow JSON
  const handleExportJSON = useCallback(() => {
    const exportPayload = {
      project: "AAROGYA MITHRA / COLOSSUS 3.0",
      version: "3.0.0",
      type: "Clinical Workflow DAG Specification",
      exportedAt: new Date().toISOString(),
      nodesCount: nodes.length,
      edgesCount: edges.length,
      nodes,
      edges,
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);

    // Trigger download
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aarogya-mithra-clinical-workflow-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also copy to clipboard
    navigator.clipboard?.writeText(jsonString);

    toast.success("Workflow Exported", {
      description: "JSON specification downloaded and copied to clipboard.",
    });
  }, [edges, nodes, toast]);

  // Simulate Sequential Flow
  const handleSimulatePipelineFlow = useCallback(() => {
    if (isFlowSimulating) return;
    setIsFlowSimulating(true);

    const orderedNodeIds = [
      "node-1",
      "node-2",
      "node-3",
      "node-4",
      "node-5",
      "node-6",
      "node-7",
      "node-8",
    ];

    let currentIdx = 0;
    setActiveSimulationStep(1);
    setSelectedNodeId(orderedNodeIds[0]);

    const interval = setInterval(() => {
      currentIdx += 1;
      if (currentIdx < orderedNodeIds.length) {
        const nextId = orderedNodeIds[currentIdx];
        setSelectedNodeId(nextId);
        setActiveSimulationStep(currentIdx + 1);
      } else {
        clearInterval(interval);
        setIsFlowSimulating(false);
        setActiveSimulationStep(null);
        toast.success("Pipeline Simulation Complete", {
          description: "All 8 clinical stages successfully simulated.",
        });
      }
    }, 1200);
  }, [isFlowSimulating, toast]);

  // Initial fit view on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 800 });
    }, 200);
    return () => clearTimeout(timer);
  }, [fitView]);

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] space-y-4">
      {/* ====================================================================
          TOP BANNER: BRANDING, STATS, & CONTROLS
          ==================================================================== */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow">INTELLIGENCE Module • Clinical Workflow Visualizer</span>
            <Badge variant="teal" size="sm" dot>
              Interactive Flow DAG
            </Badge>
            <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
            <span className="text-xs text-muted-foreground">
              @xyflow/react Engine
            </span>
          </div>
          <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            AAROGYA MITHRA Clinical Workflow Orchestration
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Visual topology connecting ambient consultation capture, multilingual transcription, document OCR, medication safety, and physician sign-off.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all",
                viewMode === "canvas"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Interactive Canvas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("blueprint")}
              className={cn(
                "rounded-lg px-2.5 py-1 font-semibold transition-all",
                viewMode === "blueprint"
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Blueprint Guide
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Undo workflow action"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label="Redo workflow action"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="size-4" />
            </button>
          </div>

          {/* Fit View */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fitView({ padding: 0.2, duration: 600 })}
            leftIcon={<Maximize2 className="size-3.5" />}
            title="Fit to Screen"
            aria-label="Fit workflow to screen"
          >
            Fit View
          </Button>

          {/* Simulate Flow Button */}
          <Button
            variant={isFlowSimulating ? "teal" : "outline"}
            size="sm"
            onClick={handleSimulatePipelineFlow}
            disabled={isFlowSimulating}
            leftIcon={<Play className={cn("size-3.5", isFlowSimulating && "animate-spin text-amber-500")} />}
            aria-label="Simulate end-to-end clinical data flow"
          >
            {isFlowSimulating
              ? `Simulating Stage 0${activeSimulationStep}...`
              : "Simulate Pipeline Flow"}
          </Button>

          {/* Add Custom Node Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              leftIcon={<Plus className="size-3.5" />}
              aria-label="Add custom workflow node"
            >
              Add Node
            </Button>

            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl z-50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                  Select Custom Stage Template
                </span>
                {customNodeTemplates.map((template, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddTemplateNode(template)}
                    className="w-full rounded-lg p-2 text-left hover:bg-muted transition-colors flex items-start gap-2 text-xs"
                  >
                    <Plus className="size-3.5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground block">
                        {template.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {template.category} • {template.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export JSON */}
          <Button
            variant="teal"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<FileDown className="size-3.5" />}
          >
            Export JSON
          </Button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleResetWorkflow}
            aria-label="Reset workflow to canonical defaults"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Reset Workflow"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      {/* ====================================================================
          MANDATORY TRANSPARENCY DISCLAIMER BANNER
          ==================================================================== */}
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-accent shrink-0" />
          <span>
            <strong>Architecture Visualization Mode:</strong> This canvas visualizes the target 8-stage clinical copilot orchestration topology. In this demonstration prototype, node interactions illustrate data contracts; external cloud GPU clusters and hospital PACS are simulated.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" size="sm">
            8 Pipeline Nodes
          </Badge>
          <Badge variant="outline" size="sm">
            8 Active Edges
          </Badge>
          <Badge variant="teal" size="sm">
            Human-in-the-Loop Gated
          </Badge>
        </div>
      </div>

      {/* ====================================================================
          MAIN VIEW CONTAINER: CANVAS vs. BLUEPRINT GUIDE
          ==================================================================== */}
      {viewMode === "blueprint" ? (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-6 clinical-scrollbar">
          <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Sequential Clinical Stage Blueprint (Linear Guide)
              </h2>
              <p className="text-xs text-muted-foreground">
                Step-by-step breakdown of data transformations, inputs, and safety verification boundaries.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewMode("canvas")}>
              Switch to Interactive Node Canvas
            </Button>
          </div>
          <InteractiveWorkflowSection />
        </div>
      ) : (
        <div className="relative flex-1 rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="flex h-full">
            {/* Left Canvas: ReactFlow */}
            <div className="flex-1 h-full relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.8}
                defaultEdgeOptions={{
                  type: "smoothstep",
                  animated: true,
                }}
                className="bg-muted/10"
              >
                {/* Background Grid Pattern */}
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={18}
                  size={1.2}
                  color={theme === "dark" ? "#334155" : "#cbd5e1"}
                />

                {/* Built-in Controls */}
                <Controls
                  showInteractive={true}
                  className="!rounded-xl !border !border-border !bg-card !shadow-md !overflow-hidden"
                />

                {/* Canvas MiniMap */}
                <MiniMap
                  nodeColor={(node) => {
                    const cat = (node.data as ClinicalNodeData)?.category;
                    switch (cat) {
                      case "Trigger":
                        return "#102A43";
                      case "AI Processing":
                        return "#0D9488";
                      case "Safety":
                        return "#F59E0B";
                      case "Review":
                        return "#0284c7";
                      case "Delivery":
                        return "#16A34A";
                      default:
                        return "#94a3b8";
                    }
                  }}
                  nodeStrokeWidth={3}
                  zoomable
                  pannable
                  className="!rounded-xl !border !border-border !bg-card/90 !shadow-lg"
                />

                {/* Floating Canvas Quick Legend */}
                <Panel position="top-left" className="m-3">
                  <div className="rounded-xl border border-border/80 bg-card/90 backdrop-blur-md p-2.5 shadow-md text-[11px] space-y-1.5 select-none">
                    <span className="font-bold text-foreground block text-[10px] uppercase tracking-wider">
                      Topology Legend
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Trigger</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-teal-600" />
                        <span className="text-muted-foreground">AI Processing</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">Safety Gate</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-sky-600" />
                        <span className="text-muted-foreground">Doctor Review</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-emerald-600" />
                        <span className="text-muted-foreground">Delivery</span>
                      </div>
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>

            {/* Right: Additional Information Panel / Inspector */}
            <div className="w-80 lg:w-96 border-l border-border bg-card h-full shrink-0 shadow-sm">
              <WorkflowInspector
                nodeData={selectedNodeData}
                onClose={() => setSelectedNodeId(null)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteNode}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <WorkflowEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        nodeData={nodeToEdit}
        onSave={handleSaveNodeEdit}
      />
    </div>
  );
}

export function WorkflowVisualizerPage() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}

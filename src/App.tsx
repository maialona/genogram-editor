import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { SymbolLibrary } from "./components/SymbolLibrary";
import { Canvas } from "./components/Canvas/Canvas";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { PropertyPanel } from "./components/PropertyPanel";
import { AiChatbox } from "./components/AiChatbox";
import { AiEdgeGlow } from "./components/AiEdgeGlow/AiEdgeGlow";
import { ToastHost } from "./components/ToastHost";
import { useDocumentStore } from "./store/documentStore";
import { useAiGenerationStore } from "./store/aiGenerationStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";
import "./components/AiEdgeGlow/AiEdgeGlow.css";

function App() {
  const hydrate = useDocumentStore((s) => s.hydrate);
  const generationPhase = useAiGenerationStore((s) => s.phase);
  const isGenerating =
    generationPhase === "analyzing" ||
    generationPhase === "structuring" ||
    generationPhase === "linking" ||
    generationPhase === "revealing";

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useKeyboardShortcuts();

  return (
    <div
      className={`app-shell${isGenerating ? " is-ai-generating" : ""}`}
      aria-busy={isGenerating}
    >
      <main className="app-canvas-area" aria-label="家系圖畫布">
        <Canvas />
      </main>

      {/* Spline-style floating chrome — does not reserve layout space */}
      <div className="app-float-layer">
        <Toolbar />
        <CanvasToolbar />
        <SymbolLibrary />
        <PropertyPanel />
        <AiChatbox />
      </div>

      <ToastHost />
      <AiEdgeGlow active={isGenerating} />
    </div>
  );
}

export default App;

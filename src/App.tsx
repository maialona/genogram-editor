import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { SymbolLibrary } from "./components/SymbolLibrary";
import { Canvas } from "./components/Canvas/Canvas";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { PropertyPanel } from "./components/PropertyPanel";
import { ToastHost } from "./components/ToastHost";
import { useDocumentStore } from "./store/documentStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import "./App.css";

function App() {
  const hydrate = useDocumentStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useKeyboardShortcuts();

  return (
    <div className="app-shell">
      <main className="app-canvas-area" aria-label="家系圖畫布">
        <Canvas />
      </main>

      {/* Spline-style floating chrome — does not reserve layout space */}
      <div className="app-float-layer">
        <Toolbar />
        <CanvasToolbar />
        <SymbolLibrary />
        <PropertyPanel />
      </div>

      <ToastHost />
    </div>
  );
}

export default App;

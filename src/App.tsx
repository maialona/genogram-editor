import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { SymbolLibrary } from "./components/SymbolLibrary";
import { Canvas } from "./components/Canvas/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";
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
      <Toolbar />
      <div className="app-main">
        <SymbolLibrary />
        <main className="app-canvas-area">
          <Canvas />
        </main>
        <PropertyPanel />
      </div>
    </div>
  );
}

export default App;

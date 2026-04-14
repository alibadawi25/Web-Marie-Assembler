import { Link } from "react-router-dom";
import CodeEditor from "./components/CodeEditor";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-icon">M</span>
          <span className="app-brand-name"><em>MARIE</em> Assembler</span>
        </div>
        <nav className="app-nav">
          <Link to="/tutorial" className="app-nav-link">Tutorial</Link>
        </nav>
      </header>
      <main className="app-body">
        <CodeEditor />
      </main>
    </div>
  );
}

export default App;

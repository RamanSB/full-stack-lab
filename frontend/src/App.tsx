import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SSEPage from "./pages/SSEPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            Backend Concepts Demo
          </Link>
        </div>
      </header>

      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sse" element={<SSEPage />} />
        </Routes>
      </main>
    </div>
  );
}
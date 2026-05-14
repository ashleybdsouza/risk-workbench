import { Routes, Route, useLocation } from "react-router-dom";
import RiskWorkbench from "./pages/RiskWorkbench";

function App() {
  return (
    <Routes>
      <Route path="/" element={<RiskWorkbench />} />
    </Routes>
  );
}

export default App;
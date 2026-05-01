import { Navigate } from "react-router-dom";

// Setup foi substituído por /cadastro (sistema multi-empresa)
export default function Setup() {
  return <Navigate to="/cadastro" replace />;
}

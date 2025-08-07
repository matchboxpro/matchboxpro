import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPWA } from "./utils/pwa";

// Initialize PWA features
initPWA();

createRoot(document.getElementById("root")!).render(<App />);

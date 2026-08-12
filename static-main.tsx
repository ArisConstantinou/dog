import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LeoApp from "./app/LeoApp";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><LeoApp /></StrictMode>);

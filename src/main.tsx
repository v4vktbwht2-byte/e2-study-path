import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./shared/styles/index.css";

const rootElement = document.querySelector<HTMLDivElement>("#root");

if (!rootElement) {
  throw new Error("アプリの表示先が見つかりません。");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

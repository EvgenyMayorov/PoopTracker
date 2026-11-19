import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Принудительно фиксируем светлую тему: удаляем сохранённую тему и класс dark
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("poop_theme");
  } catch {
    /* ignore */
  }
  document.documentElement.classList.remove("dark");
  document.body.classList.remove("dark");
  document.documentElement.style.colorScheme = "light";
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

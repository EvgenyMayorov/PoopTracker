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

// Явная, надёжная регистрация Service Worker (включает GitHub Pages).
// Используем относительный путь, который корректно разрешается по любому `base`.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("[SW] navigator.serviceWorker не поддерживается");
    return;
  }

  const swPath = "./custom-sw.js";

  const register = () =>
    navigator.serviceWorker
      .register(swPath, { scope: "./" })
      .then((registration) => {
        console.log("[SW] Зарегистрирован:", registration.scope);
        // Принудительно активируем обновлённый SW, если он ждёт
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      })
      .catch((err) => {
        console.error("[SW] Ошибка регистрации:", err);
      });

  // Регистрируем сразу и при загрузке страницы, чтобы SW точно активировался
  register();
  window.addEventListener("load", () => register());
}

if (typeof window !== "undefined") {
  if (document.readyState === "complete") {
    registerServiceWorker();
  } else {
    window.addEventListener("load", registerServiceWorker);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

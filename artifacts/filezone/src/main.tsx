import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global fetch interceptor to support separate frontend/backend deployment domains (e.g. Vercel + Render)
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const apiBase = apiUrl.replace(/\/+$/, "");
    const rewrite = (urlStr: string) => {
      if (urlStr.startsWith("/api")) {
        return apiBase + urlStr.slice(4);
      }
      const origin = window.location.origin;
      if (urlStr.startsWith(origin + "/api")) {
        return apiBase + urlStr.slice(origin.length + 4);
      }
      return urlStr;
    };

    if (typeof input === "string") {
      input = rewrite(input);
    } else if (input instanceof URL) {
      input = new URL(rewrite(input.toString()));
    } else if (input && typeof input === "object" && "url" in input) {
      const req = input as Request;
      input = new Request(rewrite(req.url), req);
    }
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);

"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";

export default function Providers({ children }) {
  useEffect(() => {
    const blockScrollOnNumber = (e) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.type === "number") {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", blockScrollOnNumber, { passive: false });
    return () => window.removeEventListener("wheel", blockScrollOnNumber);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}

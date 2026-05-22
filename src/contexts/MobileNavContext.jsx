"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { usePathname } from "next/navigation";

const MobileNavContext = createContext(null);

export function MobileNavProvider({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <MobileNavContext.Provider value={{ open, setOpen, toggle, close }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return ctx;
}

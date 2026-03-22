"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface SidebarContextType {
  width: number;
  setWidth: (w: number) => void;
  collapsed: boolean;
  toggle: () => void;
}

const MIN_WIDTH = 64;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 240;
const COLLAPSE_THRESHOLD = 100;

const SidebarContext = createContext<SidebarContextType>({
  width: DEFAULT_WIDTH,
  setWidth: () => undefined,
  collapsed: false,
  toggle: () => undefined,
});

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH, COLLAPSE_THRESHOLD };

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidthState] = useState(DEFAULT_WIDTH);

  const collapsed = width <= COLLAPSE_THRESHOLD;

  const setWidth = useCallback((w: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
    setWidthState(clamped);
  }, []);

  const toggle = useCallback(() => {
    setWidthState((prev) => (prev <= COLLAPSE_THRESHOLD ? DEFAULT_WIDTH : MIN_WIDTH));
  }, []);

  return (
    <SidebarContext.Provider value={{ width, setWidth, collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextType {
  return useContext(SidebarContext);
}

import { useContext } from "react";
import { SettingsContext } from "@/contexts/SettingsContext";

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("SettingsProvider is missing");
  return ctx;
}

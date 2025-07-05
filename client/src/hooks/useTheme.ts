import { useSettings } from "./useSettings";
import { Theme } from "@/contexts/SettingsContext";

export function useTheme() {
  const { settings, updateSettings } = useSettings();

  const setTheme = (theme: Theme) => {
    updateSettings({ theme });
  };

  return { theme: settings.theme, setTheme };
}

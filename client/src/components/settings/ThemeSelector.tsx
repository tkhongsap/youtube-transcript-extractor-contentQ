import { useTheme } from "@/hooks/useTheme";

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium">Theme</h2>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="border rounded p-2"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
};

export default ThemeSelector;

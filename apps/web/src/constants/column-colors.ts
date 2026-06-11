const columnColors = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#64748b", label: "Slate" },
];

export const DEFAULT_COLUMN_COLORS: Record<string, string> = {
  "to-do": "#64748b",
  "in-progress": "#3b82f6",
  "in-review": "#8b5cf6",
  done: "#22c55e",
};

export default columnColors;

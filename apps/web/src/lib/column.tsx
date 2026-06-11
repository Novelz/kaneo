import { CheckCircle2, Circle } from "lucide-react";
import { DEFAULT_COLUMN_COLORS } from "@/constants/column-colors";
import columnIcons, {
  DEFAULT_COLUMN_ICON_NAMES,
} from "@/constants/column-icons";

export const resolveColumnColor = (
  slug: string,
  color?: string | null,
): string | null => color ?? DEFAULT_COLUMN_COLORS[slug] ?? null;

export const getColumnIcon = (
  columnId: string,
  isFinal?: boolean,
  iconName?: string | null,
  color?: string | null,
) => {
  const resolvedIconName =
    iconName ||
    DEFAULT_COLUMN_ICON_NAMES[
      columnId as keyof typeof DEFAULT_COLUMN_ICON_NAMES
    ];
  const Icon =
    resolvedIconName &&
    columnIcons[resolvedIconName as keyof typeof columnIcons];

  const resolvedColor = color ?? DEFAULT_COLUMN_COLORS[columnId] ?? null;
  const style = resolvedColor ? { color: resolvedColor } : undefined;
  const className = resolvedColor ? "w-4 h-4" : "w-4 h-4 text-muted-foreground";

  if (Icon) {
    return <Icon className={className} style={style} />;
  }

  return isFinal ? (
    <CheckCircle2 className={className} style={style} />
  ) : (
    <Circle className={className} style={style} />
  );
};

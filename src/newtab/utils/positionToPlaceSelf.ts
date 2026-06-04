const POSITION_MAP: Record<string, string> = {
  "top-left": "start start",
  "top-center": "start center",
  "top-right": "start end",
  "center-left": "center start",
  "center-center": "center center",
  "center-right": "center end",
  "bottom-left": "end start",
  "bottom-center": "end center",
  "bottom-right": "end end"
};

export function positionToPlaceSelf(position?: string): string {
  return POSITION_MAP[position ?? "center-center"] ?? "center center";
}

export type Placement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type GridSettings = {
  columns: number;
  horizontalColumns?: number;
  rows: number;
  gap: string;
  cardGap?: string;
  masonryColumns?: number;
  position: Placement;
  margin?: { top: number; bottom: number; left: number; right: number };
  background: {
    color: string;
    border: string;
    text: string;
    gridImage?: string;
  };
  icon: {
    color: string;
    border: string;
    text: string;
    borderRadius?: number;
    iconRadius?: number;
    width?: number;
    height?: number;
  };
  heading?: {
    titleColor: string;
    titleBackgroundColor?: string;
    titleSize?: number;
    subtitleColor: string;
    subtitleSize?: number;
    borderEnabled: boolean;
    borderWidth: number;
    borderColor: string;
    subtitleHoverColor: string;
    borderRadius?: number;
  };
  folder?: {
    color: string;
    accent: string;
    accentText: string;
    text: string;
    border: string;
  };
};

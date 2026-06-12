export type ElementType = 'text' | 'image' | 'icon' | 'shape' | 'chart';
export type TextBgStyle = 'none' | 'solid' | 'glass' | 'gradient';
export type TextEffect = 'none' | 'shadow' | 'neon' | 'outline' | 'text-gradient' | 'glitch';
export type CanvasFormat = '1:1' | '9:16' | '16:9' | '3:1';
export type AppMode = 'image' | 'video';
export type TransitionType = 'fade' | 'slide-left' | 'zoom-in' | 'blur' | 'camera-open' | 'camera-close' | 'blocks';
export type RightPanelTab = 'inspector' | 'layers';

export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line';
export type ChartType = 'candlestick' | 'bar' | 'line';

export interface ChartDataPoint {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EditorElement {
  id: string;
  name: string;
  type: ElementType;
  content: string;
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  bgStyle?: TextBgStyle;
  textEffect?: TextEffect;
  zIndex: number;

  // Layer Management Controls
  isHidden?: boolean;
  isLocked?: boolean;

  // Multi-selection & Grouping Support
  groupId?: string;

  // Advanced Visual FX Filters
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  hueRotate?: number;
  opacity?: number;
  mixBlendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'lighten';

  // Vector Shape Properties
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  height?: number; // Needed for shapes & resizes

  // Financial Chart Properties
  chartType?: ChartType;
  chartData?: ChartDataPoint[];
  chartColor?: string;
}

export interface Template {
  name: string;
  format: CanvasFormat;
  background?: string;
  elements: EditorElement[];
}

export interface VideoSettings {
  frameDuration: number;
  transitionDuration: number;
  effect: TransitionType;
}

export interface HistoryState {
  elements: EditorElement[];
  canvasBg: string;
  format: CanvasFormat;
}

export interface GridSettings {
  snapToGrid: boolean;
  gridSize: number;
}

export interface ActiveGuides {
  x: number | null;
  y: number | null;
}

export type VideoClipType = 'video' | 'image' | 'text';

export interface VideoClip {
  id: string;
  type: VideoClipType;
  url: string;
  name: string;
  duration: number; // total duration of clip in seconds
  startTrim: number; // offset start time in seconds
  endTrim: number; // offset end time in seconds
  volume: number; // 0 to 200 (for video original audio)
  
  // same visual effects as photo editing
  brightness: number; // default 100
  contrast: number; // default 100
  saturate: number; // default 100
  blur: number; // default 0
  grayscale: number; // default 0
  sepia: number; // default 0
  hueRotate: number; // default 0
  opacity: number; // default 100
  scale: number; // default 100 (zoom/size of clip)
  x: number;
  y: number;
  width: number;
  height: number;

  // enhancements
  improveSound: boolean;
  improveImage: boolean;

  // transition following this clip (transition to the next clip)
  transitionType: 'none' | 'fade' | 'slide-left' | 'zoom-in' | 'blur' | 'camera-open' | 'camera-close' | 'blocks';
  transitionDuration: number; // in milliseconds, default 500

  // Canvas style multi-track positioning
  placementMode?: 'sequence' | 'overlay';
  timelineStart?: number;

  // Speed adjustments & time remapping curves
  speedMode?: 'constant' | 'curve';
  constantSpeed?: number; // e.g. 0.25 to 4.0
  speedCurvePreset?: 'none' | 'bullet' | 'montage' | 'hero' | 'jump' | 'custom';
  curvePoints?: number[]; // exactly 5 values representing speed multiplier at [0%, 25%, 50%, 75%, 100%]

  // Kinetic animated text overlays support
  textContent?: string;
  textColor?: string;
  textFontSize?: number;
  textFontFamily?: string;
  textEffect?: 'none' | 'shadow' | 'neon' | 'glitch' | 'typing' | 'fade-zoom' | 'bounce';
  fitMode?: 'cover' | 'contain' | 'fill';
}

export interface AudioTrack {
  id: string;
  url: string;
  name: string;
  volume: number; // 0 to 200
  startTrim: number; // in seconds
  duration: number; // in seconds
  timelineStart: number; // start offset on timeline in seconds
}


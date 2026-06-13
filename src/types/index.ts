export type ElementType = 'text' | 'image' | 'icon' | 'shape' | 'chart';
export type TextBgStyle = 'none' | 'solid' | 'glass' | 'gradient';
export type TextEffect = 'none' | 'shadow' | 'neon' | 'outline' | 'text-gradient' | 'glitch';
export type CanvasFormat = '1:1' | '9:16' | '16:9' | '3:1';
export type AppMode = 'image' | 'video' | 'selection';
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

export interface HslChannel {
  hue: number;        // -100 to 100
  saturation: number; // -100 to 100
  lightness: number;  // -100 to 100
}

export interface ColorWheelPoint {
  x: number;          // -1 to 1
  y: number;          // -1 to 1
  l: number;          // -100 to 100
}

export interface KeyframePoint {
  time: number;
  value: any;
}

export type VideoClipType = 'video' | 'image' | 'text' | 'effect' | 'adjustment';

export interface VideoClip {
  id: string;
  type: VideoClipType;
  url: string;
  proxyUrl?: string; // New field
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
  objectPositionX?: number; // 0 to 100
  objectPositionY?: number; // 0 to 100
  zoomEffect?: 'none' | 'zoom-in' | 'zoom-out';
  effectPreset?: string; // id from VIDEO_EFFECTS library

  // CapCut Properties
  rotation?: number; // default 0
  uniformScale?: boolean; // default true
  mixBlendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn' | 'difference' | 'darken' | 'lighten';
  
  stabilizationEnabled?: boolean;
  stabilizationMode?: 'basic' | 'advanced' | 'ai';
  stabilizationIntensity?: number;
  stabilizationSmoothness?: number;
  stabilizationCrop?: boolean;

  preservePitch?: boolean;
  slowMoInterpolation?: 'blending' | 'optical' | 'ai';

  animationInType?: string;
  animationInDuration?: number;
  animationOutType?: string;
  animationOutDuration?: number;
  animationComboType?: string;
  animationComboDuration?: number;

  autoAdjustEnabled?: boolean;
  colorMatchEnabled?: boolean;
  colorCorrectionEnabled?: boolean;

  temperature?: number;
  tint?: number;
  exposure?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  sharpness?: number;
  clarity?: number;
  vignette?: number;

  lutName?: string;
  lutIntensity?: number;
  skinProtection?: boolean;

  hslSettings?: Record<string, HslChannel>;
  curvesPoints?: Record<string, [number, number][]>;
  colorWheels?: {
    shadows: ColorWheelPoint;
    midtones: ColorWheelPoint;
    highlights: ColorWheelPoint;
    global: ColorWheelPoint;
  };
  maskType?: 'none' | 'circle' | 'rectangle' | 'linear' | 'brush';
  maskSettings?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    feather: number;
  };
  keyframes?: Record<string, KeyframePoint[]>;
  enabled?: boolean;
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


import { create } from 'zustand';
import type { 
  EditorElement, CanvasFormat, AppMode, 
  RightPanelTab, VideoSettings, Template, HistoryState, 
  GridSettings, ActiveGuides, ShapeType, ChartType,
  VideoClip, AudioTrack
} from '../types';

// ==========================================
// CONSTANTS & PRESETS
// ==========================================
export const PREMIUM_BACKGROUNDS = [
  { name: 'Dark Void', css: 'linear-gradient(to bottom right, #000000, #0a0a0a)' },
  { name: 'Emerald Aurora', css: 'radial-gradient(ellipse at top, #064e3b, transparent), radial-gradient(ellipse at bottom, #022c22, transparent), #000000' },
  { name: 'Corporate Deep Blue', css: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)' },
  { name: 'Neon Cyber', css: 'linear-gradient(45deg, #000000 0%, #064e3b 50%, #000000 100%)' },
  { name: 'Gold Reserve', css: 'radial-gradient(circle at center, #451a03 0%, #000000 100%)' },
];

export const ICONS = [
  { name: 'Instagram', val: '📸' }, 
  { name: 'Facebook', val: '📘' }, 
  { name: 'Apple', val: '🍎' },
  { name: 'Bitcoin', val: '₿' }, 
  { name: 'Oro', val: '🥇' }, 
  { name: 'USD', val: '💵' },
  { name: 'Trading', val: '📈' }, 
  { name: 'Alerta', val: '🚨' }, 
  { name: 'Lock', val: '🔒' }
];

export const PRESET_TEMPLATES: Template[] = [
  {
    name: 'Alerta Cripto (9:16)',
    format: '9:16',
    background: PREMIUM_BACKGROUNDS[1].css,
    elements: [
      { id: 't1', name: 'Título Principal', type: 'text', content: 'ALERTA VIP', x: 50, y: 150, fontSize: 80, fontFamily: "'Bebas Neue', sans-serif", color: '#10b981', bgStyle: 'none', textEffect: 'neon', zIndex: 100 },
      { id: 'i1', name: 'Icono Alerta', type: 'icon', content: '🚨', x: 200, y: 350, fontSize: 120, zIndex: 101 },
      { id: 't2', name: 'Subtítulo', type: 'text', content: 'NUEVO SETUP\nDISPONIBLE', x: 50, y: 550, fontSize: 40, fontFamily: "'Montserrat', sans-serif", color: '#ffffff', bgStyle: 'glass', textEffect: 'none', zIndex: 102 }
    ]
  }
];

export const CANVAS_DIMENSIONS: Record<CanvasFormat, { w: number, h: number, css: string }> = {
  '1:1': { w: 1080, h: 1080, css: 'aspect-square max-w-[500px] w-full' },
  '9:16': { w: 1080, h: 1920, css: 'aspect-[9/16] max-h-[800px] h-full' },
  '16:9': { w: 1920, h: 1080, css: 'aspect-video max-w-[800px] w-full' },
  '3:1': { w: 1500, h: 500, css: 'aspect-[3/1] max-w-[900px] w-full' },
};

// ==========================================
// STORE INTERFACE
// ==========================================
interface EditorStore {
  // Application Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Editor Properties
  format: CanvasFormat;
  canvasBg: string;
  elements: EditorElement[];
  selectedIds: string[];
  rightPanelTab: RightPanelTab;
  savedTemplates: Template[];

  // Editor Actions
  setFormat: (format: CanvasFormat) => void;
  setCanvasBg: (bg: string) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  
  // History Undo / Redo buffers
  past: HistoryState[];
  future: HistoryState[];
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Selection Actions
  selectElement: (id: string, isMultiSelect?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Element Actions
  addElement: (type: 'text' | 'image' | 'icon', content?: string) => void;
  updateElement: (id: string, changes: Partial<EditorElement>) => void;
  updateElements: (ids: string[], changes: Partial<EditorElement> | ((el: EditorElement) => Partial<EditorElement>)) => void;
  deleteSelected: () => void;
  
  // Grouping Actions
  groupSelected: () => void;
  ungroupSelected: () => void;

  // Clipboard & Duplicate Actions
  clipboard: EditorElement[];
  copySelected: () => void;
  paste: () => void;
  duplicateSelected: () => void;

  // Layer ordering actions (Z-Index)
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;

  // Templates Management (Persistent)
  loadTemplate: (template: Template) => void;
  saveCurrentDesign: () => void;

  // Shapes & Charts Actions
  addShapeElement: (shapeType: ShapeType) => void;
  addChartElement: (chartType: ChartType) => void;

  // Branding Kit State & Actions
  brandingKit: {
    colors: string[];
    logos: string[];
  };
  updateBrandingColors: (colors: string[]) => void;
  addBrandingLogo: (logo: string) => void;
  deleteBrandingLogo: (index: number) => void;

  // Grid & Smart Guides
  gridSettings: GridSettings;
  activeGuides: ActiveGuides;
  setGridSettings: (settings: Partial<GridSettings>) => void;
  setActiveGuides: (guides: ActiveGuides) => void;

  // Video Composer Properties & Actions
  videoFrames: string[];
  isPlaying: boolean;
  currentFrame: number;
  videoSettings: VideoSettings;
  setVideoFrames: (frames: string[] | ((prev: string[]) => string[])) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentFrame: (frame: number | ((prev: number) => number)) => void;
  setVideoSettings: (settings: Partial<VideoSettings>) => void;

  // CapCut Video Timeline state & actions
  videoClips: VideoClip[];
  audioTracks: AudioTrack[];
  selectedClipId: string | null;
  selectedAudioId: string | null;
  playbackTime: number;
  savedVideoTemplates: { name: string; clips: VideoClip[]; audio: AudioTrack[]; format: CanvasFormat; masterAmbientVolume?: number; masterMusicVolume?: number }[];

  setVideoClips: (clips: VideoClip[] | ((prev: VideoClip[]) => VideoClip[])) => void;
  setAudioTracks: (tracks: AudioTrack[] | ((prev: AudioTrack[]) => AudioTrack[])) => void;
  setSelectedClipId: (id: string | null) => void;
  setSelectedAudioId: (id: string | null) => void;
  setPlaybackTime: (time: number | ((prev: number) => number)) => void;

  masterAmbientVolume: number;
  masterMusicVolume: number;
  setMasterAmbientVolume: (volume: number) => void;
  setMasterMusicVolume: (volume: number) => void;

  addVideoClip: (clip: Omit<VideoClip, 'id' | 'brightness' | 'contrast' | 'saturate' | 'blur' | 'grayscale' | 'sepia' | 'hueRotate' | 'opacity' | 'scale' | 'x' | 'y' | 'width' | 'height' | 'improveSound' | 'improveImage' | 'transitionType' | 'transitionDuration'> & Partial<Pick<VideoClip, 'x' | 'y' | 'width' | 'height'>>) => void;
  updateClip: (id: string, updates: Partial<VideoClip>) => void;
  deleteClip: (id: string) => void;
  reorderClips: (startIndex: number, endIndex: number) => void;
  applyEffectsToAllClips: (clipId: string) => void;

  addAudioTrack: (track: Omit<AudioTrack, 'id'>) => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  deleteAudioTrack: (id: string) => void;

  saveVideoTemplate: (name: string) => void;
  loadVideoTemplate: (template: { name: string; clips: VideoClip[]; audio: AudioTrack[]; format: CanvasFormat; masterAmbientVolume?: number; masterMusicVolume?: number }) => void;
  deleteVideoTemplate: (index: number) => void;


  // Gemini AI Properties
  apiKey: string;
  isGenerating: boolean;
  setApiKey: (key: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;

  // Vision Pro Effects Engine (Visual Nodal Editor) state
  nodesList: { id: string; type: string; label: string; x: number; y: number; value: number }[];
  nodeConnections: { fromId: string; fromPin: string; toId: string; toPin: string }[];
  setNodesList: (nodes: { id: string; type: string; label: string; x: number; y: number; value: number }[] | ((prev: { id: string; type: string; label: string; x: number; y: number; value: number }[]) => { id: string; type: string; label: string; x: number; y: number; value: number }[])) => void;
  setNodeConnections: (connections: { fromId: string; fromPin: string; toId: string; toPin: string }[] | ((prev: { fromId: string; fromPin: string; toId: string; toPin: string }[]) => { fromId: string; fromPin: string; toId: string; toPin: string }[])) => void;
}

// ==========================================
// ZUSTAND IMPLEMENTATION
// ==========================================
export const useEditorStore = create<EditorStore>((set, get) => {
  // Load templates from localStorage if available
  const initialSavedTemplates = (() => {
    try {
      const saved = localStorage.getItem('structura_pro_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const initialSavedVideoTemplates = (() => {
    try {
      const saved = localStorage.getItem('structura_pro_video_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const initialApiKey = (() => {
    try {
      return localStorage.getItem('structura_pro_api_key') || '';
    } catch {
      return '';
    }
  })();

  const initialBrandingKit = (() => {
    try {
      const saved = localStorage.getItem('structura_pro_branding_kit');
      return saved ? JSON.parse(saved) : {
        colors: ['#000000', '#10b981', '#ffffff', '#ef4444', '#3b82f6'],
        logos: []
      };
    } catch {
      return {
        colors: ['#000000', '#10b981', '#ffffff', '#ef4444', '#3b82f6'],
        logos: []
      };
    }
  })();

  return {
    // Mode State
    mode: 'image',
    setMode: (mode) => set({ mode }),

    // Branding Kit State
    brandingKit: initialBrandingKit,
    
    updateBrandingColors: (colors) => {
      const current = get().brandingKit;
      const updated = { ...current, colors };
      set({ brandingKit: updated });
      try { localStorage.setItem('structura_pro_branding_kit', JSON.stringify(updated)); } catch {}
    },
    
    addBrandingLogo: (logo) => {
      const current = get().brandingKit;
      const updated = { ...current, logos: [...current.logos, logo] };
      set({ brandingKit: updated });
      try { localStorage.setItem('structura_pro_branding_kit', JSON.stringify(updated)); } catch {}
    },
    
    deleteBrandingLogo: (index) => {
      const current = get().brandingKit;
      const updated = { ...current, logos: current.logos.filter((_, i) => i !== index) };
      set({ brandingKit: updated });
      try { localStorage.setItem('structura_pro_branding_kit', JSON.stringify(updated)); } catch {}
    },

    // Editor Canvas States
    format: '9:16',
    canvasBg: PREMIUM_BACKGROUNDS[0].css,
    elements: [],
    selectedIds: [],
    rightPanelTab: 'inspector',
    savedTemplates: initialSavedTemplates,

    setFormat: (format) => {
      get().saveHistory();
      set({ format });
    },
    setCanvasBg: (canvasBg) => {
      get().saveHistory();
      set({ canvasBg });
    },
    setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),

    // History (Undo / Redo) States
    past: [],
    future: [],

    saveHistory: () => {
      const { elements, canvasBg, format, past } = get();
      const snapshot: HistoryState = {
        elements: JSON.parse(JSON.stringify(elements)),
        canvasBg,
        format,
      };

      // Skip duplicates
      const last = past[past.length - 1];
      if (
        last &&
        JSON.stringify(last.elements) === JSON.stringify(snapshot.elements) &&
        last.canvasBg === snapshot.canvasBg &&
        last.format === snapshot.format
      ) {
        return;
      }

      set({
        past: [...past, snapshot].slice(-50),
        future: [],
      });
    },

    undo: () => {
      const { past, future, elements, canvasBg, format } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      const currentSnapshot: HistoryState = {
        elements: JSON.parse(JSON.stringify(elements)),
        canvasBg,
        format,
      };

      set({
        elements: previous.elements,
        canvasBg: previous.canvasBg,
        format: previous.format,
        past: newPast,
        future: [currentSnapshot, ...future],
        selectedIds: [], // Clear selection
      });
    },

    redo: () => {
      const { past, future, elements, canvasBg, format } = get();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);
      const currentSnapshot: HistoryState = {
        elements: JSON.parse(JSON.stringify(elements)),
        canvasBg,
        format,
      };

      set({
        elements: next.elements,
        canvasBg: next.canvasBg,
        format: next.format,
        past: [...past, currentSnapshot],
        future: newFuture,
        selectedIds: [], // Clear selection
      });
    },

    // Selection Logic
    selectElement: (id, isMultiSelect) => {
      const { elements, selectedIds } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      // Group elements search
      const groupIds = el.groupId
        ? elements.filter((e) => e.groupId === el.groupId).map((e) => e.id)
        : [id];

      if (isMultiSelect) {
        const allAlreadySelected = groupIds.every((gid) => selectedIds.includes(gid));
        if (allAlreadySelected) {
          // Deselect them
          set({ selectedIds: selectedIds.filter((sid) => !groupIds.includes(sid)) });
        } else {
          // Select them
          set({ selectedIds: Array.from(new Set([...selectedIds, ...groupIds])) });
        }
      } else {
        // Simple select
        set({ selectedIds: groupIds });
      }
    },

    clearSelection: () => set({ selectedIds: [] }),
    selectAll: () => {
      const { elements } = get();
      // Select all unlocked and visible elements
      const targetIds = elements.filter((e) => !e.isLocked && !e.isHidden).map((e) => e.id);
      set({ selectedIds: targetIds });
    },

    // Element Manipulation Actions
    addElement: (type, content = '') => {
      const { elements } = get();
      get().saveHistory();

      // Z-Index calculations
      const base = type === 'image' ? 10 : 100;
      const sameTypeElements = elements.filter((e) =>
        type === 'image' ? e.zIndex < 100 : e.zIndex >= 100
      );
      const nextZ = sameTypeElements.length > 0
        ? Math.max(...sameTypeElements.map((e) => e.zIndex)) + 1
        : base;

      let newEl: EditorElement;
      const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (type === 'text') {
        newEl = {
          id,
          name: `Texto ${elements.length + 1}`,
          type: 'text',
          content: content || 'DOBLE CLICK PARA EDITAR',
          x: 50,
          y: 50,
          fontSize: 60,
          fontFamily: "'Montserrat', sans-serif",
          color: '#ffffff',
          bgStyle: 'none',
          textEffect: 'shadow',
          opacity: 100,
          mixBlendMode: 'normal',
          isHidden: false,
          isLocked: false,
          zIndex: nextZ,
        };
      } else if (type === 'icon') {
        newEl = {
          id,
          name: `Icono ${content}`,
          type: 'icon',
          content: content || '⭐',
          x: 100,
          y: 100,
          fontSize: 100,
          isHidden: false,
          isLocked: false,
          zIndex: nextZ,
        };
      } else {
        // Image
        newEl = {
          id,
          name: `Imagen`,
          type: 'image',
          content: content || '',
          x: 0,
          y: 0,
          width: 600,
          brightness: 100,
          contrast: 100,
          saturate: 100,
          blur: 0,
          grayscale: 0,
          sepia: 0,
          hueRotate: 0,
          opacity: 100,
          mixBlendMode: 'normal',
          isHidden: false,
          isLocked: false,
          zIndex: nextZ,
        };
      }

      set({
        elements: [...elements, newEl],
        selectedIds: [newEl.id],
      });
    },

    addShapeElement: (shapeType) => {
      const { elements, brandingKit } = get();
      get().saveHistory();

      const sameType = elements.filter(e => e.type === 'shape');
      const nextZ = sameType.length > 0 ? Math.max(...sameType.map(e => e.zIndex)) + 1 : 20;

      const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const color = brandingKit.colors[1] || '#10b981';

      let newEl: EditorElement = {
        id,
        name: `Forma: ${shapeType}`,
        type: 'shape',
        content: shapeType === 'arrow' ? '➔' : shapeType === 'line' ? '—' : '',
        x: 100,
        y: 100,
        width: shapeType === 'line' ? 300 : 150,
        height: shapeType === 'line' ? 10 : shapeType === 'circle' ? 150 : 100,
        shapeType,
        fillColor: shapeType === 'line' ? 'transparent' : color,
        strokeColor: shapeType === 'line' ? color : '#ffffff',
        strokeWidth: shapeType === 'line' ? 4 : 2,
        zIndex: nextZ,
        isHidden: false,
        isLocked: false
      };

      set({
        elements: [...elements, newEl],
        selectedIds: [newEl.id]
      });
    },

    addChartElement: (chartType) => {
      const { elements, brandingKit } = get();
      get().saveHistory();

      const sameType = elements.filter(e => e.type === 'chart');
      const nextZ = sameType.length > 0 ? Math.max(...sameType.map(e => e.zIndex)) + 1 : 30;

      const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const defaultChartData = [
        { label: 'Lunes', open: 100, high: 120, low: 90, close: 110, volume: 5000 },
        { label: 'Martes', open: 110, high: 130, low: 105, close: 125, volume: 6000 },
        { label: 'Miércoles', open: 125, high: 128, low: 115, close: 118, volume: 4000 },
        { label: 'Jueves', open: 118, high: 140, low: 110, close: 135, volume: 8000 },
        { label: 'Viernes', open: 135, high: 150, low: 130, close: 145, volume: 7500 }
      ];

      const newEl: EditorElement = {
        id,
        name: `Gráfico ${chartType === 'candlestick' ? 'Velas' : 'Barras'}`,
        type: 'chart',
        content: '',
        x: 80,
        y: 120,
        width: 450,
        height: 250,
        chartType,
        chartColor: brandingKit.colors[1] || '#10b981',
        chartData: defaultChartData,
        zIndex: nextZ,
        isHidden: false,
        isLocked: false
      };

      set({
        elements: [...elements, newEl],
        selectedIds: [newEl.id]
      });
    },

    updateElement: (id, changes) => {
      const { elements } = get();
      set({
        elements: elements.map((el) => (el.id === id ? { ...el, ...changes } : el)),
      });
    },

    updateElements: (ids, changes) => {
      const { elements } = get();
      set({
        elements: elements.map((el) => {
          if (ids.includes(el.id)) {
            const updates = typeof changes === 'function' ? changes(el) : changes;
            return { ...el, ...updates };
          }
          return el;
        }),
      });
    },

    deleteSelected: () => {
      const { elements, selectedIds } = get();
      if (selectedIds.length === 0) return;

      get().saveHistory();
      set({
        elements: elements.filter((el) => !selectedIds.includes(el.id)),
        selectedIds: [],
      });
    },

    // Group / Ungroup
    groupSelected: () => {
      const { selectedIds, elements } = get();
      if (selectedIds.length < 2) return;

      get().saveHistory();
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      set({
        elements: elements.map((el) =>
          selectedIds.includes(el.id) ? { ...el, groupId } : el
        ),
      });
    },

    ungroupSelected: () => {
      const { selectedIds, elements } = get();
      if (selectedIds.length === 0) return;

      // Extract unique group IDs present in selected items
      const targetGroupIds = new Set(
        elements
          .filter((el) => selectedIds.includes(el.id) && el.groupId)
          .map((el) => el.groupId)
      );

      if (targetGroupIds.size === 0) return;

      get().saveHistory();
      set({
        elements: elements.map((el) => {
          if (el.groupId && targetGroupIds.has(el.groupId)) {
            const { groupId, ...rest } = el;
            return rest as EditorElement;
          }
          return el;
        }),
      });
    },

    // Clipboard & Duplicate System
    clipboard: [],
    
    copySelected: () => {
      const { selectedIds, elements } = get();
      if (selectedIds.length === 0) return;

      const items = elements.filter((el) => selectedIds.includes(el.id));
      set({ clipboard: JSON.parse(JSON.stringify(items)) });
    },

    paste: () => {
      const { clipboard, elements } = get();
      if (clipboard.length === 0) return;

      get().saveHistory();
      const groupMapping: Record<string, string> = {};

      const newElements = clipboard.map((el) => {
        const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let groupId = el.groupId;
        if (el.groupId) {
          if (!groupMapping[el.groupId]) {
            groupMapping[el.groupId] = `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          }
          groupId = groupMapping[el.groupId];
        }

        return {
          ...el,
          id,
          name: `${el.name} (Copia)`,
          x: el.x + 20,
          y: el.y + 20,
          groupId,
          zIndex: el.zIndex + 1,
          isHidden: false,
          isLocked: false,
        };
      });

      set({
        elements: [...elements, ...newElements],
        selectedIds: newElements.map((e) => e.id),
      });
    },

    duplicateSelected: () => {
      const { selectedIds, elements } = get();
      if (selectedIds.length === 0) return;

      get().saveHistory();
      const groupMapping: Record<string, string> = {};
      const targets = elements.filter((el) => selectedIds.includes(el.id));

      const duplicated = targets.map((el) => {
        const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let groupId = el.groupId;
        if (el.groupId) {
          if (!groupMapping[el.groupId]) {
            groupMapping[el.groupId] = `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          }
          groupId = groupMapping[el.groupId];
        }

        return {
          ...el,
          id,
          name: `${el.name} (Copia)`,
          x: el.x + 20,
          y: el.y + 20,
          groupId,
          zIndex: el.zIndex + 1,
          isHidden: false,
          isLocked: false,
        };
      });

      set({
        elements: [...elements, ...duplicated],
        selectedIds: duplicated.map((e) => e.id),
      });
    },

    // Layer ordering (Z-Index management)
    bringToFront: (id) => {
      const { elements } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const groupMembers = el.groupId 
        ? elements.filter((e) => e.groupId === el.groupId)
        : [el];
      const memberIds = groupMembers.map((m) => m.id);

      get().saveHistory();
      const maxZ = Math.max(...elements.map((e) => e.zIndex), 100);
      
      set({
        elements: elements.map((e) =>
          memberIds.includes(e.id) ? { ...e, zIndex: maxZ + 1 } : e
        ),
      });
    },

    sendToBack: (id) => {
      const { elements } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const groupMembers = el.groupId 
        ? elements.filter((e) => e.groupId === el.groupId)
        : [el];
      const memberIds = groupMembers.map((m) => m.id);

      get().saveHistory();
      const minZ = Math.min(...elements.map((e) => e.zIndex), 10);

      set({
        elements: elements.map((e) =>
          memberIds.includes(e.id) ? { ...e, zIndex: Math.max(1, minZ - 1) } : e
        ),
      });
    },

    moveLayerUp: (id) => {
      const { elements } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const groupMembers = el.groupId 
        ? elements.filter((e) => e.groupId === el.groupId)
        : [el];
      const memberIds = groupMembers.map((m) => m.id);

      get().saveHistory();
      set({
        elements: elements.map((e) =>
          memberIds.includes(e.id) ? { ...e, zIndex: e.zIndex + 1 } : e
        ),
      });
    },

    moveLayerDown: (id) => {
      const { elements } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const groupMembers = el.groupId 
        ? elements.filter((e) => e.groupId === el.groupId)
        : [el];
      const memberIds = groupMembers.map((m) => m.id);

      get().saveHistory();
      set({
        elements: elements.map((e) =>
          memberIds.includes(e.id) ? { ...e, zIndex: Math.max(1, e.zIndex - 1) } : e
        ),
      });
    },

    toggleVisibility: (id) => {
      const { elements } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const groupMembers = el.groupId 
        ? elements.filter((e) => e.groupId === el.groupId)
        : [el];
      const memberIds = groupMembers.map((m) => m.id);

      set({
        elements: elements.map((e) =>
          memberIds.includes(e.id) ? { ...e, isHidden: !e.isHidden } : e
        ),
      });
    },

    toggleLock: (id) => {
      const { elements } = get();
      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const groupMembers = el.groupId 
        ? elements.filter((e) => e.groupId === el.groupId)
        : [el];
      const memberIds = groupMembers.map((m) => m.id);

      set({
        elements: elements.map((e) =>
          memberIds.includes(e.id) ? { ...e, isLocked: !e.isLocked } : e
        ),
      });
    },

    // Persistent Design/Template Management
    loadTemplate: (template) => {
      get().saveHistory();
      
      const clonedElements = JSON.parse(JSON.stringify(template.elements)).map((el: EditorElement) => ({
        ...el,
        id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isHidden: false,
        isLocked: false,
      }));

      set({
        format: template.format,
        canvasBg: template.background || PREMIUM_BACKGROUNDS[0].css,
        elements: clonedElements,
        selectedIds: [],
      });
    },

    saveCurrentDesign: () => {
      const { elements, format, canvasBg, savedTemplates } = get();
      if (elements.length === 0) {
        alert('El lienzo está vacío.');
        return;
      }

      const newTemplate: Template = {
        name: `Proyecto Guardado ${savedTemplates.length + 1}`,
        format,
        background: canvasBg,
        elements: JSON.parse(JSON.stringify(elements)),
      };

      const updatedTemplates = [...savedTemplates, newTemplate];
      set({ savedTemplates: updatedTemplates });

      try {
        localStorage.setItem('structura_pro_projects', JSON.stringify(updatedTemplates));
        alert('Proyecto guardado de forma persistente.');
      } catch (e) {
        alert('Error al guardar de forma persistente. Límite de localStorage superado.');
      }
    },

    // Grid snapping & smart alignment states
    gridSettings: {
      snapToGrid: false,
      gridSize: 10,
    },
    activeGuides: {
      x: null,
      y: null,
    },
    setGridSettings: (settings) => 
      set((state) => ({ gridSettings: { ...state.gridSettings, ...settings } })),
    setActiveGuides: (activeGuides) => set({ activeGuides }),

    // Video Engine States
    videoFrames: [],
    isPlaying: false,
    currentFrame: 0,
    videoSettings: {
      frameDuration: 2000,
      transitionDuration: 800,
      effect: 'fade',
    },

    setVideoFrames: (frames) => {
      if (typeof frames === 'function') {
        set((state) => ({ videoFrames: frames(state.videoFrames) }));
      } else {
        set({ videoFrames: frames });
      }
    },
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentFrame: (currentFrame) => {
      if (typeof currentFrame === 'function') {
        set((state) => ({ currentFrame: currentFrame(state.currentFrame) }));
      } else {
        set({ currentFrame });
      }
    },
    setVideoSettings: (settings) =>
      set((state) => ({ videoSettings: { ...state.videoSettings, ...settings } })),

    // CapCut Video Timeline Initial States
    videoClips: [],
    audioTracks: [],
    selectedClipId: null,
    selectedAudioId: null,
    playbackTime: 0,
    savedVideoTemplates: initialSavedVideoTemplates,

    setVideoClips: (clips) => {
      if (typeof clips === 'function') {
        set((state) => ({ videoClips: clips(state.videoClips) }));
      } else {
        set({ videoClips: clips });
      }
    },
    setAudioTracks: (tracks) => {
      if (typeof tracks === 'function') {
        set((state) => ({ audioTracks: tracks(state.audioTracks) }));
      } else {
        set({ audioTracks: tracks });
      }
    },
    setSelectedClipId: (selectedClipId) => set({ selectedClipId, selectedAudioId: null }),
    setSelectedAudioId: (selectedAudioId) => set({ selectedAudioId, selectedClipId: null }),
    setPlaybackTime: (time) => {
      if (typeof time === 'function') {
        set((state) => ({ playbackTime: time(state.playbackTime) }));
      } else {
        set({ playbackTime: time });
      }
    },

    masterAmbientVolume: 100,
    masterMusicVolume: 100,
    setMasterAmbientVolume: (masterAmbientVolume) => set({ masterAmbientVolume }),
    setMasterMusicVolume: (masterMusicVolume) => set({ masterMusicVolume }),

    addVideoClip: (clip) => {
      const id = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const format = get().format;
      const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
      
      const isOverlay = clip.placementMode === 'overlay';
      const width = clip.width !== undefined ? clip.width : (isOverlay ? Math.min(400, dims.w) : dims.w);
      const height = clip.height !== undefined ? clip.height : (isOverlay ? Math.min(400, dims.h) : dims.h);
      const x = clip.x !== undefined ? clip.x : (isOverlay ? Math.round((dims.w - width) / 2) : 0);
      const y = clip.y !== undefined ? clip.y : (isOverlay ? Math.round((dims.h - height) / 2) : 0);
      const timelineStart = isOverlay ? (clip.timelineStart !== undefined ? clip.timelineStart : get().playbackTime) : 0;

      const newClip: VideoClip = {
        ...clip,
        id,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        opacity: 100,
        scale: 100,
        x,
        y,
        width,
        height,
        improveSound: false,
        improveImage: false,
        transitionType: 'none',
        transitionDuration: 500,
        placementMode: clip.placementMode || 'sequence',
        timelineStart: Number(timelineStart.toFixed(2)),
        speedMode: 'constant',
        constantSpeed: 1.0,
        speedCurvePreset: 'none',
        curvePoints: [1.0, 1.0, 1.0, 1.0, 1.0],
      };
      set((state) => ({
        videoClips: [...state.videoClips, newClip],
        selectedClipId: id,
      }));
    },

    updateClip: (id, updates) => {
      set((state) => ({
        videoClips: state.videoClips.map((clip) =>
          clip.id === id ? { ...clip, ...updates } : clip
        ),
      }));
    },

    deleteClip: (id) => {
      set((state) => {
        const filteredClips = state.videoClips.filter((clip) => clip.id !== id);
        return {
          videoClips: filteredClips,
          selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
        };
      });
    },

    reorderClips: (startIndex, endIndex) => {
      set((state) => {
        const result = Array.from(state.videoClips);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { videoClips: result };
      });
    },

    addAudioTrack: (track) => {
      const id = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newTrack: AudioTrack = {
        ...track,
        id,
      };
      set((state) => ({
        audioTracks: [...state.audioTracks, newTrack],
        selectedAudioId: id,
      }));
    },

    updateAudioTrack: (id, updates) => {
      set((state) => ({
        audioTracks: state.audioTracks.map((track) =>
          track.id === id ? { ...track, ...updates } : track
        ),
      }));
    },

    deleteAudioTrack: (id) => {
      set((state) => {
        const filteredTracks = state.audioTracks.filter((track) => track.id !== id);
        return {
          audioTracks: filteredTracks,
          selectedAudioId: state.selectedAudioId === id ? null : state.selectedAudioId,
        };
      });
    },

    applyEffectsToAllClips: (clipId) => {
      const { videoClips } = get();
      const target = videoClips.find(c => c.id === clipId);
      if (!target) return;
      set({
        videoClips: videoClips.map(c => ({
          ...c,
          brightness: target.brightness,
          contrast: target.contrast,
          saturate: target.saturate,
          blur: target.blur,
          grayscale: target.grayscale,
          sepia: target.sepia,
          hueRotate: target.hueRotate,
          opacity: target.opacity,
          scale: target.scale,
          improveSound: target.improveSound,
          improveImage: target.improveImage
        }))
      });
    },

    saveVideoTemplate: (name) => {
      const { videoClips, audioTracks, format, masterAmbientVolume, masterMusicVolume, savedVideoTemplates } = get();
      const newTemplate = {
        name: name || `Plantilla de Video ${savedVideoTemplates.length + 1}`,
        clips: JSON.parse(JSON.stringify(videoClips)),
        audio: JSON.parse(JSON.stringify(audioTracks)),
        format,
        masterAmbientVolume,
        masterMusicVolume,
      };
      const updated = [...savedVideoTemplates, newTemplate];
      set({ savedVideoTemplates: updated });
      try {
        localStorage.setItem('structura_pro_video_templates', JSON.stringify(updated));
      } catch (e) {
        alert('Error al guardar la plantilla de video: almacenamiento local lleno.');
      }
    },

    loadVideoTemplate: (template) => {
      set({
        videoClips: JSON.parse(JSON.stringify(template.clips)),
        audioTracks: JSON.parse(JSON.stringify(template.audio)),
        format: template.format,
        masterAmbientVolume: template.masterAmbientVolume !== undefined ? template.masterAmbientVolume : 100,
        masterMusicVolume: template.masterMusicVolume !== undefined ? template.masterMusicVolume : 100,
        selectedClipId: null,
        selectedAudioId: null,
        playbackTime: 0,
        isPlaying: false,
      });
    },

    deleteVideoTemplate: (index) => {
      const { savedVideoTemplates } = get();
      const updated = savedVideoTemplates.filter((_, i) => i !== index);
      set({ savedVideoTemplates: updated });
      try {
        localStorage.setItem('structura_pro_video_templates', JSON.stringify(updated));
      } catch (e) {}
    },

    // Gemini AI States
    apiKey: initialApiKey,
    isGenerating: false,
    setApiKey: (apiKey) => {
      set({ apiKey });
      try {
        localStorage.setItem('structura_pro_api_key', apiKey);
      } catch {}
    },
    setIsGenerating: (isGenerating) => set({ isGenerating }),

    // Visual Effect Node Graph States
    nodesList: [
      { id: 'input', type: 'input', label: 'Entrada Multimedia', x: 40, y: 150, value: 100 },
      { id: 'saturate', type: 'filter', label: 'Saturación Color', x: 260, y: 50, value: 120 },
      { id: 'bloom', type: 'filter', label: 'Bloom Shaders', x: 260, y: 220, value: 50 },
      { id: 'glow', type: 'filter', label: 'Resplandor Glow', x: 480, y: 140, value: 40 },
      { id: 'output', type: 'output', label: 'Salida de Video', x: 700, y: 150, value: 100 }
    ],
    nodeConnections: [
      { fromId: 'input', fromPin: 'out', toId: 'saturate', toPin: 'in' },
      { fromId: 'saturate', fromPin: 'out', toId: 'glow', toPin: 'in' },
      { fromId: 'glow', fromPin: 'out', toId: 'output', toPin: 'in' }
    ],
    setNodesList: (nodes) => {
      if (typeof nodes === 'function') {
        set((state) => ({ nodesList: nodes(state.nodesList) }));
      } else {
        set({ nodesList: nodes });
      }
    },
    setNodeConnections: (connections) => {
      if (typeof connections === 'function') {
        set((state) => ({ nodeConnections: connections(state.nodeConnections) }));
      } else {
        set({ nodeConnections: connections });
      }
    },
  };
});

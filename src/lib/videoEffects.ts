/**
 * Video Effects Library — Editor Marketing
 * 
 * Defines all built-in visual effects that can be applied to video/image clips.
 * Effects are implemented as CSS animations injected into the canvas overlay.
 * 
 * Each effect has:
 *  - id: unique identifier
 *  - name: display name in Spanish
 *  - category: grouping category
 *  - emoji: visual icon for the preset card
 *  - cssClass: Tailwind/CSS class applied to the clip wrapper
 *  - overlayStyle: optional inline style for the overlay div
 *  - description: short description
 */

export interface VideoEffect {
  id: string;
  name: string;
  category: EffectCategory;
  emoji: string;
  description: string;
  // CSS animation to inject as a keyframe string
  keyframes?: string;
  // CSS class name for the clip element
  cssAnimation?: string;
  // Additional overlay element config
  overlay?: {
    style: React.CSSProperties;
    blendMode?: string;
  };
}

export type EffectCategory =
  | 'Tendencias'
  | 'Clásico'
  | 'Movimiento'
  | 'Luz y Destello'
  | 'Retro'
  | 'Glitch'
  | '3D'
  | 'Superposición'
  | 'Cámara';

export const EFFECT_CATEGORIES: EffectCategory[] = [
  'Tendencias',
  'Clásico',
  'Movimiento',
  'Luz y Destello',
  'Retro',
  'Glitch',
  '3D',
  'Superposición',
  'Cámara',
];

// ============================================================
// EFFECT DEFINITIONS
// ============================================================
export const VIDEO_EFFECTS: VideoEffect[] = [

  // ── TENDENCIAS ──────────────────────────────────────────
  {
    id: 'zoom-pulse',
    name: 'Zoom Pulsante',
    category: 'Tendencias',
    emoji: '🔍',
    description: 'Zoom rítmico que pulsa al ritmo de la música',
    cssAnimation: 'effect-zoom-pulse',
    keyframes: `
      @keyframes effect-zoom-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      .effect-zoom-pulse { animation: effect-zoom-pulse 0.6s ease-in-out infinite; }
    `,
  },
  {
    id: 'shake',
    name: 'Vibración',
    category: 'Tendencias',
    emoji: '📳',
    description: 'Temblor vibrante horizontal',
    cssAnimation: 'effect-shake',
    keyframes: `
      @keyframes effect-shake {
        0%, 100% { transform: translateX(0); }
        15% { transform: translateX(-8px) rotate(-1deg); }
        30% { transform: translateX(8px) rotate(1deg); }
        45% { transform: translateX(-6px); }
        60% { transform: translateX(6px); }
        75% { transform: translateX(-3px); }
      }
      .effect-shake { animation: effect-shake 0.5s ease-in-out infinite; }
    `,
  },
  {
    id: 'flash',
    name: 'Flash',
    category: 'Tendencias',
    emoji: '⚡',
    description: 'Destellos de luz intermitentes',
    cssAnimation: 'effect-flash',
    keyframes: `
      @keyframes effect-flash {
        0%, 90%, 100% { filter: brightness(1); }
        92%, 98% { filter: brightness(2.5) saturate(0.5); }
      }
      .effect-flash { animation: effect-flash 1.2s ease-in-out infinite; }
    `,
  },
  {
    id: 'glitter',
    name: 'Glitter',
    category: 'Tendencias',
    emoji: '✨',
    description: 'Brillo de partículas relucientes',
    cssAnimation: 'effect-glitter',
    overlay: {
      style: {
        background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 30%), radial-gradient(circle at 80% 70%, rgba(255,220,100,0.3) 0%, transparent 25%), radial-gradient(circle at 50% 50%, rgba(200,150,255,0.2) 0%, transparent 40%)',
        animation: 'effect-glitter-overlay 1.5s linear infinite',
      },
      blendMode: 'screen',
    },
    keyframes: `
      @keyframes effect-glitter-overlay {
        0% { opacity: 0; transform: scale(0.95) rotate(0deg); }
        30% { opacity: 1; }
        60% { opacity: 0.5; transform: scale(1.05) rotate(180deg); }
        100% { opacity: 0; transform: scale(0.95) rotate(360deg); }
      }
    `,
  },
  {
    id: 'heart-beat',
    name: 'Latido',
    category: 'Tendencias',
    emoji: '❤️',
    description: 'Latido de corazón, pulsación doble',
    cssAnimation: 'effect-heartbeat',
    keyframes: `
      @keyframes effect-heartbeat {
        0%, 100% { transform: scale(1); }
        14% { transform: scale(1.07); }
        28% { transform: scale(1); }
        42% { transform: scale(1.05); }
        70% { transform: scale(1); }
      }
      .effect-heartbeat { animation: effect-heartbeat 1s ease-in-out infinite; }
    `,
  },

  // ── CLÁSICO ──────────────────────────────────────────────
  {
    id: 'fade-in',
    name: 'Aparición',
    category: 'Clásico',
    emoji: '🌅',
    description: 'Fundido de entrada suave',
    cssAnimation: 'effect-fade-in',
    keyframes: `
      @keyframes effect-fade-in {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      .effect-fade-in { animation: effect-fade-in 1.5s ease-out forwards; }
    `,
  },
  {
    id: 'vignette',
    name: 'Viñeta',
    category: 'Clásico',
    emoji: '⭕',
    description: 'Oscurecimiento de los bordes cinematográfico',
    overlay: {
      style: {
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)',
      },
    },
  },
  {
    id: 'film-grain',
    name: 'Grano de Película',
    category: 'Clásico',
    emoji: '🎞️',
    description: 'Textura de grano analógico',
    cssAnimation: 'effect-grain',
    keyframes: `
      @keyframes effect-grain {
        0%, 100% { filter: url(#grain-filter) contrast(1); }
        50% { filter: url(#grain-filter) contrast(1.05); }
      }
      .effect-grain { animation: effect-grain 0.1s steps(1) infinite; }
    `,
    overlay: {
      style: {
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
        backgroundSize: '150px 150px',
        opacity: '0.4',
        animation: 'effect-grain-move 0.08s steps(2) infinite',
      },
    },
  },
  {
    id: 'mirror-h',
    name: 'Espejo H',
    category: 'Clásico',
    emoji: '🪞',
    description: 'Efecto espejo horizontal',
    cssAnimation: 'effect-mirror-h',
    keyframes: `
      .effect-mirror-h { transform: scaleX(-1); }
    `,
  },

  // ── MOVIMIENTO ───────────────────────────────────────────
  {
    id: 'focus-zoom',
    name: 'Enfoque Zoom',
    category: 'Movimiento',
    emoji: '🎯',
    description: 'Zoom al centro con desenfoque de fondo en los bordes',
    cssAnimation: 'effect-focus-zoom',
    keyframes: `
      @keyframes effect-focus-zoom {
        0% { transform: scale(1.0); }
        100% { transform: scale(1.28); }
      }
      .effect-focus-zoom { animation: effect-focus-zoom 4s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }
    `,
    overlay: {
      style: {
        background: 'radial-gradient(circle, transparent 25%, rgba(0,0,0,0.4) 80%)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        maskImage: 'radial-gradient(circle, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 80%)',
      }
    }
  },
  {
    id: 'zoom-in-anim',
    name: 'Zoom Entrada',
    category: 'Movimiento',
    emoji: '🔎',
    description: 'Zoom progresivo hacia adentro',
    cssAnimation: 'effect-zoom-in-anim',
    keyframes: `
      @keyframes effect-zoom-in-anim {
        0% { transform: scale(1); }
        100% { transform: scale(1.25); }
      }
      .effect-zoom-in-anim { animation: effect-zoom-in-anim 5s ease-in forwards; }
    `,
  },
  {
    id: 'zoom-out-anim',
    name: 'Zoom Salida',
    category: 'Movimiento',
    emoji: '🔍',
    description: 'Zoom alejándose hacia afuera',
    cssAnimation: 'effect-zoom-out-anim',
    keyframes: `
      @keyframes effect-zoom-out-anim {
        0% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }
      .effect-zoom-out-anim { animation: effect-zoom-out-anim 5s ease-out forwards; }
    `,
  },
  {
    id: 'pan-left',
    name: 'Paneo Izquierda',
    category: 'Movimiento',
    emoji: '⬅️',
    description: 'Movimiento de cámara hacia la izquierda',
    cssAnimation: 'effect-pan-left',
    keyframes: `
      @keyframes effect-pan-left {
        0% { transform: translateX(5%) scale(1.1); }
        100% { transform: translateX(-5%) scale(1.1); }
      }
      .effect-pan-left { animation: effect-pan-left 6s linear forwards; }
    `,
  },
  {
    id: 'pan-right',
    name: 'Paneo Derecha',
    category: 'Movimiento',
    emoji: '➡️',
    description: 'Movimiento de cámara hacia la derecha',
    cssAnimation: 'effect-pan-right',
    keyframes: `
      @keyframes effect-pan-right {
        0% { transform: translateX(-5%) scale(1.1); }
        100% { transform: translateX(5%) scale(1.1); }
      }
      .effect-pan-right { animation: effect-pan-right 6s linear forwards; }
    `,
  },
  {
    id: 'rotate-slow',
    name: 'Rotación Suave',
    category: 'Movimiento',
    emoji: '🌀',
    description: 'Rotación continua lenta',
    cssAnimation: 'effect-rotate-slow',
    keyframes: `
      @keyframes effect-rotate-slow {
        0% { transform: rotate(0deg) scale(1.15); }
        100% { transform: rotate(360deg) scale(1.15); }
      }
      .effect-rotate-slow { animation: effect-rotate-slow 8s linear infinite; }
    `,
  },
  {
    id: 'bounce',
    name: 'Rebote',
    category: 'Movimiento',
    emoji: '🏀',
    description: 'Rebote elástico vertical',
    cssAnimation: 'effect-bounce',
    keyframes: `
      @keyframes effect-bounce {
        0%, 100% { transform: translateY(0); animation-timing-function: ease-in; }
        50% { transform: translateY(-12px); animation-timing-function: ease-out; }
      }
      .effect-bounce { animation: effect-bounce 0.7s ease-in-out infinite; }
    `,
  },

  // ── LUZ Y DESTELLO ───────────────────────────────────────
  {
    id: 'lens-flare',
    name: 'Destello de Lente',
    category: 'Luz y Destello',
    emoji: '🌟',
    description: 'Destello de lente cinematográfico',
    overlay: {
      style: {
        background: 'radial-gradient(circle at 75% 25%, rgba(255,255,255,0.8) 0%, rgba(255,220,100,0.4) 5%, transparent 30%), radial-gradient(ellipse at 60% 40%, rgba(100,180,255,0.3) 0%, transparent 25%)',
        animation: 'effect-lens-flare 2s ease-in-out infinite alternate',
      },
      blendMode: 'screen',
    },
    keyframes: `
      @keyframes effect-lens-flare {
        0% { opacity: 0.6; transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1.1); }
      }
    `,
  },
  {
    id: 'strobe',
    name: 'Estrobo',
    category: 'Luz y Destello',
    emoji: '💡',
    description: 'Luz estroboscópica rítmica',
    overlay: {
      style: {
        background: 'white',
        animation: 'effect-strobe 0.15s steps(1) infinite',
      },
    },
    keyframes: `
      @keyframes effect-strobe {
        0%, 49% { opacity: 0; }
        50%, 100% { opacity: 0.25; }
      }
    `,
  },
  {
    id: 'neon-glow',
    name: 'Brillo Neón',
    category: 'Luz y Destello',
    emoji: '🌈',
    description: 'Resplandor de neón vibrante',
    cssAnimation: 'effect-neon',
    keyframes: `
      @keyframes effect-neon {
        0%, 100% { filter: brightness(1) drop-shadow(0 0 8px rgba(0,255,200,0.6)) drop-shadow(0 0 20px rgba(0,150,255,0.4)); }
        50% { filter: brightness(1.2) drop-shadow(0 0 15px rgba(255,0,200,0.8)) drop-shadow(0 0 30px rgba(100,0,255,0.5)); }
      }
      .effect-neon { animation: effect-neon 1.5s ease-in-out infinite; }
    `,
  },
  {
    id: 'sunrise',
    name: 'Amanecer',
    category: 'Luz y Destello',
    emoji: '🌄',
    description: 'Luz cálida de amanecer progresiva',
    overlay: {
      style: {
        background: 'linear-gradient(to top, rgba(255,120,0,0.3) 0%, rgba(255,200,50,0.1) 40%, transparent 70%)',
        animation: 'effect-sunrise 4s ease-in-out infinite alternate',
      },
      blendMode: 'screen',
    },
    keyframes: `
      @keyframes effect-sunrise {
        0% { opacity: 0.4; }
        100% { opacity: 0.9; }
      }
    `,
  },

  // ── RETRO ────────────────────────────────────────────────
  {
    id: 'vhs',
    name: 'VHS Retro',
    category: 'Retro',
    emoji: '📼',
    description: 'Degradación de cinta VHS analógica',
    cssAnimation: 'effect-vhs',
    overlay: {
      style: {
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        backgroundSize: '100% 4px',
        animation: 'effect-vhs-scan 8s linear infinite',
      },
    },
    keyframes: `
      @keyframes effect-vhs-scan {
        0% { background-position: 0 0; }
        100% { background-position: 0 100%; }
      }
      @keyframes effect-vhs {
        0%, 100% { filter: saturate(0.8) contrast(1.1) hue-rotate(0deg); }
        30% { filter: saturate(0.6) contrast(1.2) hue-rotate(5deg); }
        60% { filter: saturate(1) contrast(0.9) hue-rotate(-3deg); }
      }
      .effect-vhs { animation: effect-vhs 3s steps(3) infinite; }
    `,
  },
  {
    id: 'scanlines',
    name: 'Líneas de TV',
    category: 'Retro',
    emoji: '📺',
    description: 'Líneas de barrido de televisor antiguo',
    overlay: {
      style: {
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)',
        backgroundSize: '100% 3px',
      },
    },
  },
  {
    id: 'old-film',
    name: 'Película Antigua',
    category: 'Retro',
    emoji: '🎬',
    description: 'Look de película muda en blanco y negro',
    cssAnimation: 'effect-old-film',
    keyframes: `
      @keyframes effect-old-film {
        0% { filter: sepia(0.8) contrast(1.3) brightness(0.9) grayscale(0.5); }
        33% { filter: sepia(1) contrast(1.5) brightness(1.1) grayscale(0.7); }
        66% { filter: sepia(0.6) contrast(1.2) brightness(0.8) grayscale(0.4); }
        100% { filter: sepia(0.8) contrast(1.3) brightness(0.9) grayscale(0.5); }
      }
      .effect-old-film { animation: effect-old-film 0.5s steps(3) infinite; }
    `,
  },
  {
    id: 'duotone',
    name: 'Duotono',
    category: 'Retro',
    emoji: '🎨',
    description: 'Efecto de dos tonos de color superpuestos',
    overlay: {
      style: {
        background: 'linear-gradient(135deg, rgba(100,0,200,0.4) 0%, rgba(255,100,0,0.3) 100%)',
        animation: 'effect-duotone-shift 3s ease-in-out infinite alternate',
      },
      blendMode: 'multiply',
    },
    keyframes: `
      @keyframes effect-duotone-shift {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(40deg); }
      }
    `,
  },

  // ── GLITCH ───────────────────────────────────────────────
  {
    id: 'glitch',
    name: 'Glitch Ciber',
    category: 'Glitch',
    emoji: '💀',
    description: 'Aberración cromática y distorsión digital',
    cssAnimation: 'effect-glitch',
    keyframes: `
      @keyframes effect-glitch {
        0%, 85%, 100% { transform: translate(0); filter: none; clip-path: none; }
        86% { transform: translate(-3px, 1px); filter: hue-rotate(90deg) saturate(3); clip-path: polygon(0 10%, 100% 10%, 100% 40%, 0 40%); }
        88% { transform: translate(3px, -1px); filter: hue-rotate(-90deg); clip-path: polygon(0 60%, 100% 60%, 100% 75%, 0 75%); }
        90% { transform: translate(-2px, 2px); filter: hue-rotate(180deg) brightness(1.5); clip-path: none; }
        92% { transform: translate(0); filter: none; }
      }
      .effect-glitch { animation: effect-glitch 2s steps(1) infinite; }
    `,
  },
  {
    id: 'rgb-split',
    name: 'RGB Split',
    category: 'Glitch',
    emoji: '🔀',
    description: 'Separación de canales RGB estilo digital',
    cssAnimation: 'effect-rgb',
    keyframes: `
      @keyframes effect-rgb {
        0%, 90%, 100% { text-shadow: none; filter: none; }
        91% { filter: drop-shadow(-4px 0 0 rgba(255,0,0,0.7)) drop-shadow(4px 0 0 rgba(0,0,255,0.7)); }
        93% { filter: drop-shadow(-2px 0 0 rgba(255,0,0,0.5)) drop-shadow(6px 0 0 rgba(0,255,0,0.5)); }
        95% { filter: drop-shadow(0 0 0 rgba(255,0,0,0)); }
      }
      .effect-rgb { animation: effect-rgb 1.5s steps(1) infinite; }
    `,
  },
  {
    id: 'digital-noise',
    name: 'Ruido Digital',
    category: 'Glitch',
    emoji: '📡',
    description: 'Interferencia digital con pixelado',
    cssAnimation: 'effect-digital-noise',
    keyframes: `
      @keyframes effect-digital-noise {
        0% { filter: contrast(1) brightness(1); }
        10% { filter: contrast(2) brightness(1.5) saturate(0); }
        20% { filter: contrast(1) brightness(0.8); }
        30% { filter: contrast(3) brightness(1.2) hue-rotate(90deg); }
        40%, 100% { filter: contrast(1) brightness(1); }
      }
      .effect-digital-noise { animation: effect-digital-noise 0.3s steps(4) infinite; }
    `,
  },

  // ── 3D ───────────────────────────────────────────────────
  {
    id: 'flip-3d',
    name: 'Volteo 3D',
    category: '3D',
    emoji: '🔄',
    description: 'Volteo en perspectiva 3D continuo',
    cssAnimation: 'effect-flip3d',
    keyframes: `
      @keyframes effect-flip3d {
        0% { transform: perspective(600px) rotateY(0deg); }
        100% { transform: perspective(600px) rotateY(360deg); }
      }
      .effect-flip3d { animation: effect-flip3d 3s linear infinite; transform-style: preserve-3d; }
    `,
  },
  {
    id: 'tilt-3d',
    name: 'Inclinación 3D',
    category: '3D',
    emoji: '📐',
    description: 'Inclinación en perspectiva oscilante',
    cssAnimation: 'effect-tilt3d',
    keyframes: `
      @keyframes effect-tilt3d {
        0%, 100% { transform: perspective(500px) rotateX(0deg) rotateY(0deg); }
        25% { transform: perspective(500px) rotateX(8deg) rotateY(8deg); }
        75% { transform: perspective(500px) rotateX(-8deg) rotateY(-8deg); }
      }
      .effect-tilt3d { animation: effect-tilt3d 2s ease-in-out infinite; transform-style: preserve-3d; }
    `,
  },

  // ── SUPERPOSICIÓN ─────────────────────────────────────────
  {
    id: 'bokeh',
    name: 'Bokeh',
    category: 'Superposición',
    emoji: '🔆',
    description: 'Desenfoque artístico de fondo (simulado)',
    cssAnimation: 'effect-bokeh',
    keyframes: `
      @keyframes effect-bokeh {
        0%, 100% { filter: blur(0px) brightness(1); }
        50% { filter: blur(2px) brightness(1.1); }
      }
      .effect-bokeh { animation: effect-bokeh 3s ease-in-out infinite; }
    `,
  },
  {
    id: 'color-burn',
    name: 'Quemado de Color',
    category: 'Superposición',
    emoji: '🔥',
    description: 'Quemado de luz dramático en los bordes',
    overlay: {
      style: {
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,80,0,0.5) 100%)',
        animation: 'effect-burn 2s ease-in-out infinite alternate',
      },
      blendMode: 'overlay',
    },
    keyframes: `
      @keyframes effect-burn {
        0% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `,
  },
  {
    id: 'cold-filter',
    name: 'Filtro Frío',
    category: 'Superposición',
    emoji: '❄️',
    description: 'Tonalidad azul fría cinematográfica',
    overlay: {
      style: {
        background: 'rgba(30, 100, 200, 0.2)',
      },
      blendMode: 'multiply',
    },
  },
  {
    id: 'warm-filter',
    name: 'Filtro Cálido',
    category: 'Superposición',
    emoji: '🌅',
    description: 'Tonalidad naranja cálida dorada',
    overlay: {
      style: {
        background: 'rgba(255, 140, 30, 0.2)',
      },
      blendMode: 'multiply',
    },
  },
  {
    id: 'dramatic-bw',
    name: 'Dramático B&N',
    category: 'Superposición',
    emoji: '🎭',
    description: 'Blanco y negro de alto contraste dramático',
    cssAnimation: 'effect-bw-drama',
    keyframes: `
      .effect-bw-drama { filter: grayscale(1) contrast(1.5) brightness(0.9); }
    `,
  },

  // ── CÁMARA ───────────────────────────────────────────────
  {
    id: 'handheld',
    name: 'Cámara en Mano',
    category: 'Cámara',
    emoji: '🎥',
    description: 'Movimiento orgánico de cámara en mano',
    cssAnimation: 'effect-handheld',
    keyframes: `
      @keyframes effect-handheld {
        0%   { transform: translate(0, 0) rotate(0deg); }
        20%  { transform: translate(2px, -1px) rotate(0.3deg); }
        40%  { transform: translate(-1px, 2px) rotate(-0.2deg); }
        60%  { transform: translate(2px, 1px) rotate(0.2deg); }
        80%  { transform: translate(-2px, -1px) rotate(-0.3deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      .effect-handheld { animation: effect-handheld 1.8s ease-in-out infinite; }
    `,
  },
  {
    id: 'rack-focus',
    name: 'Rack Focus',
    category: 'Cámara',
    emoji: '🔭',
    description: 'Enfoque progresivo cinematográfico',
    cssAnimation: 'effect-rack-focus',
    keyframes: `
      @keyframes effect-rack-focus {
        0% { filter: blur(4px) brightness(0.9); }
        40%, 60% { filter: blur(0px) brightness(1); }
        100% { filter: blur(3px) brightness(0.9); }
      }
      .effect-rack-focus { animation: effect-rack-focus 3s ease-in-out infinite; }
    `,
  },
  {
    id: 'exposure-burst',
    name: 'Explosión de Luz',
    category: 'Cámara',
    emoji: '💥',
    description: 'Sobreexposición explosiva de luz blanca',
    cssAnimation: 'effect-exposure-burst',
    keyframes: `
      @keyframes effect-exposure-burst {
        0%, 85%, 100% { filter: brightness(1); }
        87% { filter: brightness(4) saturate(0.3); }
        90% { filter: brightness(1.5); }
      }
      .effect-exposure-burst { animation: effect-exposure-burst 2s ease-in-out infinite; }
    `,
  },
];

// ── HELPER: get effects by category ──────────────────────
export function getEffectsByCategory(category: EffectCategory): VideoEffect[] {
  return VIDEO_EFFECTS.filter(e => e.category === category);
}

// ── HELPER: get effect by id ──────────────────────────────
export function getEffectById(id: string): VideoEffect | undefined {
  return VIDEO_EFFECTS.find(e => e.id === id);
}

// ── HELPER: inject all keyframes into <style> tag ─────────
export function injectEffectKeyframes(): void {
  const styleId = 'video-effects-keyframes';
  if (document.getElementById(styleId)) return;

  const allKeyframes = VIDEO_EFFECTS
    .filter(e => e.keyframes)
    .map(e => e.keyframes!)
    .join('\n');

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = allKeyframes;
  document.head.appendChild(style);
}

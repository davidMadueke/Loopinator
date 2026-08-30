"use client";

/* Ported from cult-ui (https://www.cult-ui.com/docs/components/dynamic-island).
   Three deviations from the upstream registry file:
   - `setSize` only guards against re-entering the current size. Upstream also blocks
     returning to `previousSize`, which deadlocks any two-state toggle.
   - Presets accept a `height` so a caller can size an island independently of the
     built-in aspect ratios, and `DynamicIslandProvider` takes a `presets` override.
   - The squircle `clipPath` is dropped; it references SVG defs this app doesn't ship,
     and a dangling url() reference hides the element in Chrome. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { motion, useWillChange, type HTMLMotionProps } from "motion/react";

import { cn } from "@loopinator/ui/lib/utils";

const stiffness = 400;
const damping = 30;
const MAX_HEIGHT_MOBILE_ULTRA = 400;
const MAX_HEIGHT_MOBILE_MASSIVE = 700;

const SIZE_PRESETS = {
  RESET: "reset",
  EMPTY: "empty",
  DEFAULT: "default",
  COMPACT: "compact",
  COMPACT_LONG: "compactLong",
  LARGE: "large",
  LONG: "long",
  MINIMAL_LEADING: "minimalLeading",
  MINIMAL_TRAILING: "minimalTrailing",
  COMPACT_MEDIUM: "compactMedium",
  MEDIUM: "medium",
  TALL: "tall",
  ULTRA: "ultra",
  MASSIVE: "massive",
} as const;

type SizePresets = (typeof SIZE_PRESETS)[keyof typeof SIZE_PRESETS];

type Preset = {
  width: number;
  height?: number;
  aspectRatio?: number;
  borderRadius: number;
};

const DynamicIslandSizePresets: Record<SizePresets, Preset> = {
  [SIZE_PRESETS.RESET]: { width: 150, aspectRatio: 1, borderRadius: 20 },
  [SIZE_PRESETS.EMPTY]: { width: 0, aspectRatio: 0, borderRadius: 0 },
  [SIZE_PRESETS.DEFAULT]: { width: 150, aspectRatio: 44 / 150, borderRadius: 46 },
  [SIZE_PRESETS.MINIMAL_LEADING]: { width: 52.33, aspectRatio: 44 / 52.33, borderRadius: 22 },
  [SIZE_PRESETS.MINIMAL_TRAILING]: { width: 52.33, aspectRatio: 44 / 52.33, borderRadius: 22 },
  [SIZE_PRESETS.COMPACT]: { width: 235, aspectRatio: 44 / 235, borderRadius: 46 },
  [SIZE_PRESETS.COMPACT_LONG]: { width: 300, aspectRatio: 44 / 235, borderRadius: 46 },
  [SIZE_PRESETS.COMPACT_MEDIUM]: { width: 351, aspectRatio: 64 / 371, borderRadius: 44 },
  [SIZE_PRESETS.LONG]: { width: 371, aspectRatio: 84 / 371, borderRadius: 42 },
  [SIZE_PRESETS.MEDIUM]: { width: 371, aspectRatio: 210 / 371, borderRadius: 22 },
  [SIZE_PRESETS.LARGE]: { width: 371, aspectRatio: 84 / 371, borderRadius: 42 },
  [SIZE_PRESETS.TALL]: { width: 371, aspectRatio: 210 / 371, borderRadius: 42 },
  [SIZE_PRESETS.ULTRA]: { width: 630, aspectRatio: 630 / 800, borderRadius: 42 },
  [SIZE_PRESETS.MASSIVE]: { width: 891, height: 1900, aspectRatio: 891 / 891, borderRadius: 42 },
};

type BlobStateType = {
  size: SizePresets;
  previousSize: SizePresets | undefined;
  animationQueue: Array<{ size: SizePresets; delay: number }>;
  isAnimating: boolean;
};

type BlobAction =
  | { type: "SET_SIZE"; newSize: SizePresets }
  | { type: "INITIALIZE"; firstState: SizePresets }
  | { type: "SCHEDULE_ANIMATION"; animationSteps: Array<{ size: SizePresets; delay: number }> }
  | { type: "ANIMATION_END" };

type BlobContextType = {
  state: BlobStateType;
  dispatch: Dispatch<BlobAction>;
  setSize: (size: SizePresets) => void;
  scheduleAnimation: (animationSteps: Array<{ size: SizePresets; delay: number }>) => void;
  presets: Record<SizePresets, Preset>;
};

const BlobContext = createContext<BlobContextType | undefined>(undefined);

function blobReducer(state: BlobStateType, action: BlobAction): BlobStateType {
  switch (action.type) {
    case "SET_SIZE":
      return { ...state, size: action.newSize, previousSize: state.size, isAnimating: false };
    case "SCHEDULE_ANIMATION":
      return {
        ...state,
        animationQueue: action.animationSteps,
        isAnimating: action.animationSteps.length > 0,
      };
    case "INITIALIZE":
      return {
        ...state,
        size: action.firstState,
        previousSize: SIZE_PRESETS.EMPTY,
        isAnimating: false,
      };
    case "ANIMATION_END":
      return { ...state, isAnimating: false };
    default:
      return state;
  }
}

type DynamicIslandProviderProps = {
  children: ReactNode;
  initialSize?: SizePresets;
  initialAnimation?: Array<{ size: SizePresets; delay: number }>;
  presets?: Partial<Record<SizePresets, Preset>>;
};

function DynamicIslandProvider({
  children,
  initialSize = SIZE_PRESETS.DEFAULT,
  initialAnimation = [],
  presets,
}: DynamicIslandProviderProps) {
  const [state, dispatch] = useReducer(blobReducer, {
    size: initialSize,
    previousSize: SIZE_PRESETS.EMPTY,
    animationQueue: initialAnimation,
    isAnimating: initialAnimation.length > 0,
  });

  useEffect(() => {
    const processQueue = async () => {
      for (const step of state.animationQueue) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
        dispatch({ type: "SET_SIZE", newSize: step.size });
      }
      dispatch({ type: "ANIMATION_END" });
    };

    if (state.animationQueue.length > 0) {
      processQueue();
    }
  }, [state.animationQueue]);

  const setSize = useCallback(
    (newSize: SizePresets) => {
      if (newSize !== state.size) {
        dispatch({ type: "SET_SIZE", newSize });
      }
    },
    [state.size],
  );

  const scheduleAnimation = useCallback(
    (animationSteps: Array<{ size: SizePresets; delay: number }>) => {
      dispatch({ type: "SCHEDULE_ANIMATION", animationSteps });
    },
    [],
  );

  const resolvedPresets = useMemo(
    () => ({ ...DynamicIslandSizePresets, ...presets }),
    [presets],
  );

  const contextValue = useMemo(
    () => ({ state, dispatch, setSize, scheduleAnimation, presets: resolvedPresets }),
    [state, setSize, scheduleAnimation, resolvedPresets],
  );

  return <BlobContext.Provider value={contextValue}>{children}</BlobContext.Provider>;
}

function useDynamicIslandSize() {
  const context = useContext(BlobContext);
  if (!context) {
    throw new Error("useDynamicIslandSize must be used within a DynamicIslandProvider");
  }
  return context;
}

function useScheduledAnimations(animations: Array<{ size: SizePresets; delay: number }>) {
  const { scheduleAnimation } = useDynamicIslandSize();
  const animationsRef = useRef(animations);

  useEffect(() => {
    scheduleAnimation(animationsRef.current);
  }, [scheduleAnimation]);
}

type ScreenSize = "mobile" | "tablet" | "desktop";

function calculateDimensions(size: SizePresets, screenSize: ScreenSize, preset: Preset) {
  if (screenSize === "mobile" && size === SIZE_PRESETS.MASSIVE) {
    return { width: "350px", height: MAX_HEIGHT_MOBILE_MASSIVE };
  }

  if (screenSize === "mobile" && size === SIZE_PRESETS.ULTRA) {
    return { width: "350px", height: MAX_HEIGHT_MOBILE_ULTRA };
  }

  return {
    width: `${preset.width}px`,
    height: preset.height ?? (preset.aspectRatio ?? 0) * preset.width,
  };
}

function DynamicIslandContainer({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("z-10 flex h-full w-full items-center justify-center bg-transparent", className)}>
      {children}
    </div>
  );
}

type DynamicIslandProps = {
  children: ReactNode;
  id: string;
  className?: string;
  containerClassName?: string;
  /* Off when the island has to be a direct child of a layout the caller controls. */
  withContainer?: boolean;
} & Omit<HTMLMotionProps<"div">, "children" | "id" | "className">;

function DynamicIsland({
  children,
  id,
  className,
  containerClassName,
  withContainer = true,
  ...props
}: DynamicIslandProps) {
  const { state, presets } = useDynamicIslandSize();
  const willChange = useWillChange();
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 640) {
        setScreenSize("mobile");
      } else if (window.innerWidth <= 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentSize = presets[state.size];
  const dimensions = calculateDimensions(state.size, screenSize, currentSize);

  const island = (
    <motion.div
      id={id}
      className={cn(
        "h-0 w-0 shrink-0 items-center justify-center overflow-hidden border border-border bg-card text-center text-card-foreground",
        withContainer && "mx-auto",
        className,
      )}
      animate={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: currentSize.borderRadius,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
      {...props}
    >
      {children}
    </motion.div>
  );

  if (!withContainer) {
    return island;
  }

  return <DynamicIslandContainer className={containerClassName}>{island}</DynamicIslandContainer>;
}

type MotionSlotProps = {
  className?: string;
  children?: ReactNode;
};

function DynamicContainer({ className, children }: MotionSlotProps) {
  const willChange = useWillChange();
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;

  const unchanged = size === previousSize;

  return (
    <motion.div
      initial={{ opacity: unchanged ? 1 : 0, scale: unchanged ? 1 : 0.9, y: unchanged ? 0 : 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness, damping, duration: unchanged ? 0.8 : 0.5 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95, y: 20 }}
      style={{ willChange }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function DynamicDiv({ className, children }: MotionSlotProps) {
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;
  const willChange = useWillChange();

  return (
    <motion.div
      initial={{ opacity: size === previousSize ? 1 : 0, scale: size === previousSize ? 1 : 0.9 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.9 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 0 }}
      style={{ willChange }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function DynamicTitle({ className, children }: MotionSlotProps) {
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;
  const willChange = useWillChange();

  return (
    <motion.h3
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.9 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
    >
      {children}
    </motion.h3>
  );
}

function DynamicDescription({ className, children }: MotionSlotProps) {
  const { state } = useDynamicIslandSize();
  const { size, previousSize } = state;
  const willChange = useWillChange();

  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: size === previousSize ? 0 : 1,
        scale: size === previousSize ? 0.9 : 1,
        transition: { type: "spring", stiffness, damping },
      }}
      style={{ willChange }}
    >
      {children}
    </motion.p>
  );
}

export {
  BlobContext,
  damping,
  DynamicContainer,
  DynamicDescription,
  DynamicDiv,
  DynamicIsland,
  DynamicIslandContainer,
  DynamicIslandProvider,
  DynamicIslandSizePresets,
  DynamicTitle,
  SIZE_PRESETS,
  stiffness,
  useDynamicIslandSize,
  useScheduledAnimations,
};
export type { Preset, SizePresets };

import { motion, Transition } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";

type GoalixTextProps = {
  showText: boolean;
  // Use "|" to mark where the football (the "O") sits, e.g. "G|ALIX".
  text?: string;
  delay?: number;
  className?: string;
  direction?: "top" | "bottom";
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  // Width of the centered gap the ball shows through.
  gap?: string;
};

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
};

const GoalixText: React.FC<GoalixTextProps> = ({
  showText,
  text = "G|ALIX",
  delay = 200,
  className = "",
  direction = "top",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  gap = "clamp(70px, 12vw, 180px)",
}) => {
  const [leftText, rightText] = useMemo(() => {
    const parts = text.split("|");
    return parts.length === 2 ? parts : [text, ""];
  }, [text]);

  const leftEls = useMemo(() => leftText.split(""), [leftText]);
  const rightEls = useMemo(() => rightText.split(""), [rightText]);
  const total = leftEls.length + rightEls.length;

  const ref = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (showText && !shouldAnimate) setShouldAnimate(true);
    else if (!showText) setShouldAnimate(false);
  }, [showText, shouldAnimate]);

  const defaultFrom = useMemo(
    () => ({
      filter: "blur(10px)",
      opacity: 0,
      y: direction === "top" ? -50 : 50,
    }),
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      { filter: "blur(5px)", opacity: 0.5, y: direction === "top" ? 5 : -5 },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  if (!showText) return null;

  // Renders one letter group, animating each char. `offset` keeps the
  // blur-in stagger continuous across the gap (left group then right group).
  const renderGroup = (els: string[], offset: number) => (
    <p
      className={`text-7xl font-weight-700 md:text-8xl tracking-wider gaming-text ${className} flex m-0`}
    >
      {els.map((segment, i) => {
        const index = offset + i;
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        const spanTransition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
        };
        (spanTransition as any).ease = easing;

        const isAccent = segment === "X"; // accent the trailing X in Goalix
        const textColor = isAccent ? "text-red-700" : "text-white";

        return (
          <motion.span
            key={index}
            initial={fromSnapshot}
            animate={shouldAnimate ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === total - 1 ? onAnimationComplete : undefined
            }
            style={{
              display: "inline-block",
              willChange: "transform, filter, opacity",
            }}
            className={textColor}
          >
            {segment === " " ? " " : segment}
          </motion.span>
        );
      })}
    </p>
  );

  return (
    // Grid centers the MIDDLE (gap) column at the viewport center so the
    // football — the "O" — lines up in the word regardless of how many
    // letters sit on each side.
    <div
      ref={ref}
      className="absolute inset-0 z-50 grid items-center pointer-events-none"
      style={{ gridTemplateColumns: "1fr auto 1fr" }}
    >
      <div className="justify-self-end flex">{renderGroup(leftEls, 0)}</div>
      <div aria-hidden style={{ width: gap }} />
      <div className="justify-self-start flex">
        {renderGroup(rightEls, leftEls.length)}
      </div>
    </div>
  );
};

export default GoalixText;

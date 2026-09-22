interface IslamicPatternProps {
  color?: string;
  opacity?: number;
  className?: string;
  /** Unique ID for the SVG pattern element. Required when multiple instances exist on the same page. */
  patternId?: string;
  /** "detailed" adds a center dot and corner ticks to the 8-point star tile. "default" (footer/design-preview) is unchanged. */
  variant?: "default" | "detailed";
}

/**
 * Lightweight inline SVG eight-point star (khatam) line pattern.
 * Purely decorative — hidden from assistive technology.
 */
export function IslamicPattern({
  color = "currentColor",
  opacity = 0.08,
  className,
  patternId = "khatam",
  variant = "default",
}: IslamicPatternProps) {
  const isDetailed = variant === "detailed";
  const tile = isDetailed ? 56 : 60;
  const rectPos = isDetailed ? 14 : 15;
  const rectSize = isDetailed ? 28 : 30;
  const center = rectPos + rectSize / 2;

  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{ pointerEvents: "none", opacity }}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={tile}
          height={tile}
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke={color} strokeWidth="1">
            {/* Central 8-point star: square + rotated square */}
            <rect x={rectPos} y={rectPos} width={rectSize} height={rectSize} />
            <rect
              x={rectPos}
              y={rectPos}
              width={rectSize}
              height={rectSize}
              transform={`rotate(45 ${center} ${center})`}
            />
            {isDetailed && (
              <>
                <circle cx={center} cy={center} r="5" />
                <path
                  d={`M0 0 L8 8 M${tile} 0 L${tile - 8} 8 M0 ${tile} L8 ${tile - 8} M${tile} ${tile} L${tile - 8} ${tile - 8}`}
                />
              </>
            )}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { colors } from "@/constants/theme";

export function VectorSuit({
  suit = "spade",
  size = 28,
  color = colors.green
}: {
  suit?: "spade" | "heart" | "diamond" | "club";
  size?: number;
  color?: string;
}) {
  const common = { fill: color };
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {suit === "spade" ? (
        <Path {...common} d="M32 5c-9.8 12.7-20 19.7-20 31.2 0 7.2 5.3 12.4 12 12.4 3.1 0 5.7-1.1 7.5-3.1-.6 5.7-2.9 9.6-7.3 13.5h15.6c-4.4-3.9-6.7-7.8-7.3-13.5 1.8 2 4.4 3.1 7.5 3.1 6.7 0 12-5.2 12-12.4C52 24.7 41.8 17.7 32 5Z" />
      ) : null}
      {suit === "heart" ? (
        <Path {...common} d="M32 55S9 40.8 9 23.8C9 14.5 15.1 9 22.4 9c4.7 0 8 2.5 9.6 5.8C33.6 11.5 36.9 9 41.6 9 48.9 9 55 14.5 55 23.8 55 40.8 32 55 32 55Z" />
      ) : null}
      {suit === "diamond" ? (
        <Path {...common} d="M32 4 54 32 32 60 10 32 32 4Z" />
      ) : null}
      {suit === "club" ? (
        <Path {...common} d="M25.2 29.8A11.5 11.5 0 1 1 32 17.7a11.5 11.5 0 1 1 6.8 12.1 11.5 11.5 0 1 1-7.1 12.9c-.5 6.5-2.8 11-7.5 15.3h15.6c-4.7-4.3-7-8.8-7.5-15.3a11.5 11.5 0 1 1-7.1-12.9Z" />
      ) : null}
    </Svg>
  );
}

export function VectorChip({ size = 64, labelColor = colors.navyInk }: { size?: number; labelColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="chipGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffe27c" />
          <Stop offset="1" stopColor={colors.gold} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="46" fill="url(#chipGold)" stroke={colors.navyInk} strokeWidth="4" />
      <G fill={colors.navyInk}>
        <Rect x="47" y="2" width="6" height="18" rx="3" />
        <Rect x="47" y="80" width="6" height="18" rx="3" />
        <Rect x="2" y="47" width="18" height="6" rx="3" />
        <Rect x="80" y="47" width="18" height="6" rx="3" />
        <Rect x="16" y="16" width="7" height="17" rx="3.5" transform="rotate(-45 19.5 24.5)" />
        <Rect x="77" y="67" width="7" height="17" rx="3.5" transform="rotate(-45 80.5 75.5)" />
        <Rect x="67" y="16" width="17" height="7" rx="3.5" transform="rotate(45 75.5 19.5)" />
        <Rect x="16" y="77" width="17" height="7" rx="3.5" transform="rotate(45 24.5 80.5)" />
      </G>
      <Circle cx="50" cy="50" r="28" fill={colors.gold} stroke={colors.navyInk} strokeWidth="4" />
      <SvgText x="50" y="61" fontSize="30" fontWeight="900" fill={labelColor} textAnchor="middle">
        QU
      </SvgText>
    </Svg>
  );
}

export function VectorCardFan({ width = 104, height = 92 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 108">
      <G transform="rotate(-12 45 56)">
        <Rect x="14" y="13" width="54" height="78" rx="10" fill={colors.text} stroke={colors.gold} strokeWidth="4" />
        <Path fill={colors.navyInk} d="M26 29h10l8 45h-9l-1-7h-7l-1 7h-8l8-45Zm2 31h5l-2.5-18L28 60Z" />
        <Path fill={colors.navyInk} d="M46 50c-6-8-12-12-12-19 0-4 3-7 7-7 2 0 4 1 5 3 1-2 3-3 5-3 4 0 7 3 7 7 0 7-6 11-12 19Z" />
      </G>
      <G transform="rotate(13 77 55)">
        <Rect x="51" y="12" width="54" height="78" rx="10" fill={colors.text} stroke={colors.green} strokeWidth="4" />
        <Path fill={colors.navyInk} d="M63 30h9v16l10-16h10L80 48l13 25H83l-9-18-2 3v15h-9V30Z" />
        <Path fill={colors.gold} d="M82 26 99 49 82 72 65 49 82 26Z" />
      </G>
    </Svg>
  );
}

export function VectorPerforation({ height = 104 }: { height?: number }) {
  return (
    <Svg width="14" height={height} viewBox={`0 0 14 ${height}`}>
      {Array.from({ length: 8 }).map((_, index) => (
        <Circle key={index} cx="7" cy={10 + index * ((height - 20) / 7)} r="3.2" fill={colors.background} />
      ))}
    </Svg>
  );
}

// Functional icon glyphs below — hand-drawn to match the suit/chip motifs above rather than
// pulled from a generic icon font, for the buttons users see most often (tab bar, dashboard).

export function VectorTicketMark({ size = 24, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
        d="M8 20c3 0 5 2.5 5 6s-2 6-5 6v10a4 4 0 0 0 4 4h40a4 4 0 0 0 4-4V32c-3 0-5-2.5-5-6s2-6 5-6V10a4 4 0 0 0-4-4H12a4 4 0 0 0-4 4v10Z"
      />
      <Path stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray="1 7" d="M32 12v40" />
    </Svg>
  );
}

export function VectorChipOutline({ size = 24, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="4" />
      <Circle cx="32" cy="32" r="14" fill="none" stroke={color} strokeWidth="3.5" />
      <G fill={color}>
        <Rect x="29" y="3" width="6" height="10" rx="3" />
        <Rect x="29" y="51" width="6" height="10" rx="3" />
        <Rect x="3" y="29" width="10" height="6" rx="3" />
        <Rect x="51" y="29" width="10" height="6" rx="3" />
      </G>
    </Svg>
  );
}

export function VectorPlayersMark({ size = 24, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path fill={color} opacity={0.5} d="M21 29a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Zm0 6c-8.7 0-17 4.3-17 11.4V52h27v-5.6c0-3.8-1.8-6.8-4.6-9A24 24 0 0 0 21 35Z" />
      <Path fill={color} d="M41.5 27a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Zm0 6c-1.8 0-3.6.2-5.4.7 3.6 2.8 5.4 6.5 5.4 10.5V50h19v-6.4C60.5 36.4 51.9 33 41.5 33Z" />
    </Svg>
  );
}

type TabMarkProps = {
  size?: number;
  color?: string;
  filled?: boolean;
};

export function VectorEventsTabMark({
  size = 28,
  color = colors.text,
  filled = false
}: TabMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {filled ? (
        <>
          <Rect x="7" y="15" width="50" height="44" rx="10" fill={color} />
          <Path d="M7 28h50" stroke={colors.ink} strokeWidth="4.5" />
          <Circle cx="21.5" cy="39.5" r="3.5" fill={colors.ink} />
          <Circle cx="42.5" cy="39.5" r="3.5" fill={colors.ink} />
          <Circle cx="21.5" cy="51.5" r="3.5" fill={colors.ink} />
          <Circle cx="42.5" cy="51.5" r="3.5" fill={colors.ink} />
        </>
      ) : (
        <>
          <Rect x="7" y="15" width="50" height="44" rx="10" stroke={color} strokeWidth="4.5" />
          <Path d="M7 28h50M20 8v13M44 8v13" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <Circle cx="21.5" cy="39.5" r="3.5" fill={color} />
          <Circle cx="42.5" cy="39.5" r="3.5" fill={color} />
          <Circle cx="21.5" cy="51.5" r="3.5" fill={color} />
          <Circle cx="42.5" cy="51.5" r="3.5" fill={color} />
        </>
      )}
    </Svg>
  );
}

export function VectorHomeTabMark({
  size = 28,
  color = colors.text,
  filled = false
}: TabMarkProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Path
          d="M5.8 29.8 27.9 9.5a6 6 0 0 1 8.2 0l22.1 20.3a4.5 4.5 0 0 1-3.1 7.8H53V53a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6V37.6H8.9a4.5 4.5 0 0 1-3.1-7.8Z"
          fill={color}
        />
        <Rect x="24.5" y="47" width="15" height="6" rx="3" fill={colors.ink} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M5.5 31 28 10.5a5.8 5.8 0 0 1 8 0L58.5 31M11 35v18a5.5 5.5 0 0 0 5.5 5.5h31A5.5 5.5 0 0 0 53 53V35M24 58.5V45a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v13.5"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VectorProfileTabMark({
  size = 28,
  color = colors.text,
  filled = false
}: TabMarkProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle cx="32" cy="18" r="12" fill={color} />
        <Path
          d="M6.5 55.2C8.4 41 18 33.5 32 33.5S55.6 41 57.5 55.2c.3 2-1.2 3.3-3.1 3.3H9.6c-1.9 0-3.4-1.3-3.1-3.3Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="18" r="11" stroke={color} strokeWidth="5" />
      <Path
        d="M8 55.5C9.8 42 18.5 35 32 35s22.2 7 24 20.5c.2 1.6-.9 2.5-2.5 2.5h-43C8.9 58 7.8 57.1 8 55.5Z"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VectorDealMark({ size = 30, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="8" y="6" width="34" height="46" rx="6" fill="none" stroke={color} strokeWidth="4" />
      <Circle cx="46" cy="46" r="15" fill={color} />
      <Path stroke={colors.ink} strokeWidth="4" strokeLinecap="round" d="M46 39v14M39 46h14" />
    </Svg>
  );
}

export function VectorCoinStackMark({ size = 28, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="10" y="40" width="44" height="14" rx="7" fill="none" stroke={color} strokeWidth="4" />
      <Rect x="10" y="25" width="44" height="14" rx="7" fill="none" stroke={color} strokeWidth="4" />
      <Rect x="10" y="10" width="44" height="14" rx="7" fill="none" stroke={color} strokeWidth="4" />
    </Svg>
  );
}

export function VectorSeatMark({ size = 28, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 8v30a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V8M14 44l-4 14M50 44l4 14M22 44h20"
      />
    </Svg>
  );
}

export function VectorStudyMark({ size = 28, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M32 14c-6-4-14-6-22-6v38c8 0 16 2 22 6 6-4 14-6 22-6V8c-8 0-16 2-22 6Z"
      />
      <Path stroke={color} strokeWidth={4} strokeLinecap="round" d="M32 14v38" />
    </Svg>
  );
}

export function VectorBellMark({ size = 21, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path fill={color} d="M32 6c-3 0-5.5 2.3-5.9 5.3C18.6 13.6 14 20.7 14 29v12l-6 8h48l-6-8V29c0-8.3-4.6-15.4-12.1-17.7C37.5 8.3 35 6 32 6Z" />
      <Path fill={color} d="M25 53a7 7 0 0 0 14 0Z" />
    </Svg>
  );
}

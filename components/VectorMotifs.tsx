import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
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
      <Path fill={labelColor} d="M30 39h8v16c0 3 1.5 4.7 4 4.7s4-1.7 4-4.7V39h8v16.2c0 8-4.8 12.2-12 12.2s-12-4.2-12-12.2V39Zm28 0h8v20h11v8H58V39Z" />
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

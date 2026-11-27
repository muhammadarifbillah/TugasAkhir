import { useId } from "react";
import { cn } from "@/lib/utils";

const MARK_TOP =
  "M 0,26.8 A 26.8,26.8 0 0 1 26.8,0 L 102.1,0 A 2.5,2.5 0 0 1 104.6,2.5 L 104.6,12.6 A 19.2,19.2 0 0 1 85.4,31.8 L 17,31.8 A 21,21 0 0 0 0,40.47 Z";
const MARK_BOTTOM =
  "M 26.8,39 L 80.3,39 A 2.5,2.5 0 0 1 82.8,41.5 L 82.8,51.6 A 16.7,16.7 0 0 1 66.1,68.3 L 40.2,68.3 A 10.9,10.9 0 0 0 29.3,79.2 L 29.3,81.6 A 18.4,18.4 0 0 1 10.9,100 L 2.5,100 A 2.5,2.5 0 0 1 0,97.5 L 0,65.8 A 26.8,26.8 0 0 1 26.8,39 Z";
// "USE" outlined from the mono lockup export (Inter Bold), scaled so its cap height matches the 100-unit mark.
const WORD =
  "M90.609 242.042Q68.138 242.042 51.466 233.827Q34.794 225.612 25.552 210.812Q16.31 196.013 16.31 176.32L16.31 59.495L53.157 59.495L53.157 173.3Q53.157 189.006 63.366 199.214Q73.575 209.423 90.609 209.423Q107.523 209.423 117.731 199.214Q127.94 189.006 127.94 173.3L127.94 59.495L164.908 59.495L164.908 176.32Q164.908 196.013 155.545 210.812Q146.183 225.612 129.51 233.827Q112.838 242.042 90.609 242.042ZM256.068 242.163Q223.57 242.163 204.179 227.243Q184.789 212.322 184.064 183.69L219.945 183.69Q220.912 197.342 230.879 204.167Q240.846 210.993 255.706 210.993Q270.445 210.993 279.445 204.651Q288.446 198.308 288.446 188.039Q288.446 178.737 280.291 173.783Q272.136 168.83 257.397 165.206L237.584 160.252Q214.75 154.695 201.823 142.795Q188.897 130.895 188.897 111.323Q188.897 95.014 197.655 82.812Q206.414 70.61 221.697 63.844Q236.98 57.079 256.551 57.079Q276.485 57.079 291.345 63.905Q306.205 70.731 314.541 82.872Q322.877 95.014 323.119 110.84L287.479 110.84Q286.513 99.967 278.237 94.047Q269.961 88.127 256.189 88.127Q242.054 88.127 234.382 93.987Q226.711 99.846 226.711 108.907Q226.711 118.935 235.349 123.888Q243.987 128.841 255.464 131.62L271.774 135.607Q286.875 139.11 299.077 145.694Q311.279 152.279 318.407 162.729Q325.535 173.179 325.535 188.281Q325.535 212.805 307.232 227.484Q288.929 242.163 256.068 242.163ZM344.811 239.505L344.811 59.495L465.261 59.495L465.261 90.06L381.659 90.06L381.659 133.553L458.979 133.553L458.979 163.635L381.659 163.635L381.659 208.94L465.503 208.94L465.503 239.505Z";

const TOP_STOPS: Array<[number, string]> = [
  [0, "#04A2FB"],
  [0.2, "#0099FC"],
  [0.37, "#008BFE"],
  [0.54, "#0075FE"],
  [0.7, "#0364FE"],
  [0.87, "#0B5AFD"],
  [1, "#0E58FD"],
];
const BOTTOM_STOPS: Array<[number, string]> = [
  [0.1, "#0A4EFD"],
  [0.22, "#075BFD"],
  [0.33, "#026EFC"],
  [0.53, "#1864FD"],
  [0.66, "#4352FC"],
  [0.79, "#724BFE"],
  [0.9, "#8448FC"],
];

/** FUSE lockup: gradient F mark (mono under .dark via .fuse-mark) and "USE" in currentColor. */
export function FuseLockup({ label, className, markOnly }: { label: string; className?: string; markOnly?: boolean }) {
  const id = useId();
  const top = `${id}-top`;
  const bottom = `${id}-bottom`;
  return (
    <svg role="img" aria-label={label} viewBox={markOnly ? "0 -2 106 104" : "0 -2 365 104"} fill="none" className={cn("fuse-lockup", className)}>
      <defs>
        <linearGradient id={top} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="104.6" y2="40">
          {TOP_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient id={bottom} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="82.8" y2="39">
          {BOTTOM_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path className="fuse-mark" d={MARK_TOP} fill={`url(#${top})`} />
      <path className="fuse-mark" d={MARK_BOTTOM} fill={`url(#${bottom})`} />
      {!markOnly && (
        <path
          className="fuse-word"
          fill="currentColor"
          transform="translate(105.539 -33.096) scale(0.55556)"
          d={WORD}
        />
      )}
    </svg>
  );
}

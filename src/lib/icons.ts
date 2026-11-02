/*
 * One icon set for the whole site: Solar by 480 Design (CC BY 4.0), read from
 * @iconify-json/solar at build time, so no icon library ships to the browser.
 * Use <Icon> in markup; use iconSvg() only where a script needs the markup as a string.
 * Brand logos (GitHub, LinkedIn, Spotify, Astro) are not icons and stay as their own marks.
 */
import { icons } from "@iconify-json/solar";

// Kit names: the icons the kit uses, so pages pick from one short list.
export const ALIASES = {
  check: "check",
  x: "close",
  dot: "record",
  "chevron-right": "alt-arrow-right",
  "chevron-left": "alt-arrow-left",
  "chevron-down": "alt-arrow-down",
  "arrow-right": "arrow-right",
  "arrow-left": "arrow-left",
  "arrow-up-right": "arrow-right-up",
  chart: "chart",
  "trending-up": "graph-up",
  pen: "pen",
  shield: "shield-check",
  pin: "map-point",
  search: "magnifier",
  eye: "eye",
  repeat: "repeat",
  calendar: "calendar",
  phone: "phone",
  message: "chat-round-dots",
  code: "code",
  layers: "layers",
  mail: "letter",
  rss: "feed",
  menu: "hamburger-menu",
  sun: "sun",
  moon: "moon",
  share: "share",
  link: "link",
  copy: "copy",
  quote: "chat-round-quote",
} as const;

/** A kit name above, or any Solar name from https://icon-sets.iconify.design/solar/ */
export type IconName = keyof typeof ALIASES | (string & {});
export type IconVariant = "linear" | "bold" | "outline" | "broken" | "line-duotone" | "bold-duotone";

export function getIcon(name: IconName, variant: IconVariant = "linear") {
  const base = (ALIASES as Record<string, string>)[name] ?? name;
  const key = `${base}-${variant}`;
  const icon = icons.icons[key];
  if (!icon) throw new Error(`Icon "${name}" (${key}) is not in the Solar set`);
  return { body: icon.body, width: icon.width ?? icons.width ?? 24, height: icon.height ?? icons.height ?? 24 };
}

/** The icon as an SVG string, for scripts that set innerHTML. */
export function iconSvg(name: IconName, className = "", variant: IconVariant = "linear") {
  const { body, width, height } = getIcon(name, variant);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="icon ${className}" aria-hidden="true">${body}</svg>`;
}

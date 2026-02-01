import { type ClassValue } from "clsx";

// Default colors matching app/globals.css base layer
// This serves as a fallback when computed styles aren't available (e.g. server-side)
const DEFAULT_THEME = {
    primary: [15, 159, 214], // --primary: 199 89% 48% -> converted approx to RGB
    // HSL(199, 89%, 48%) -> RGB(13, 149, 230) - wait, let me recalculate accurately in the function or use these approximations
    // Let's use the exact HSL strings and convert them

    // --primary: 199 89% 48%
    primaryHsl: "199 89% 48%",

    // --foreground: 222 47% 11%
    foregroundHsl: "222 47% 11%",

    // --muted-foreground: 215 16% 47%
    mutedForegroundHsl: "215 16% 47%",

    // --destructive: 0 84.2% 60.2%
    destructiveHsl: "0 84.2% 60.2%",

    // --background: 210 40% 98%
    backgroundHsl: "210 40% 98%",

    // --border: 214.3 31.8% 91.4%
    borderHsl: "214.3 31.8% 91.4%",
};

export interface PDFThemeColors {
    primary: [number, number, number];
    headerBg: [number, number, number]; // Using primary for header bg usually, or dark
    text: [number, number, number];
    muted: [number, number, number];
    destructive: [number, number, number];
    background: [number, number, number];
    border: [number, number, number];
}

/**
 * Converts an HSL color string (e.g., "199 89% 48%") to an RGB tuple.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (0 <= h && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (60 <= h && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (120 <= h && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (180 <= h && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (240 <= h && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (300 <= h && h < 360) {
        r = c;
        g = 0;
        b = x;
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
    ];
}

function parseHslString(hsl: string): [number, number, number] {
    try {
        // Handle "199 89% 48%" or "199 89% 48%" with or without commas
        const parts = hsl.trim().split(/[\s,]+/);
        if (parts.length >= 3) {
            const h = parseFloat(parts[0]);
            const s = parseFloat(parts[1].replace('%', ''));
            const l = parseFloat(parts[2].replace('%', ''));
            return hslToRgb(h, s, l);
        }
    } catch (e) {
        console.error("Failed to parse HSL string:", hsl, e);
    }
    return [0, 0, 0]; // Fallback black
}

export function getThemeColors(): PDFThemeColors {
    // Check if we are in a browser environment
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

    let primaryHsl = DEFAULT_THEME.primaryHsl;
    let foregroundHsl = DEFAULT_THEME.foregroundHsl;
    let mutedForegroundHsl = DEFAULT_THEME.mutedForegroundHsl;
    let destructiveHsl = DEFAULT_THEME.destructiveHsl;
    let backgroundHsl = DEFAULT_THEME.backgroundHsl;
    let borderHsl = DEFAULT_THEME.borderHsl;

    // Try to get actual computed styles if in browser
    if (isBrowser) {
        try {
            const styles = getComputedStyle(document.documentElement);
            // Note: Tailwind vars are usually stored without hsl(), just the values "H S% L%"
            const getVar = (name: string) => {
                const val = styles.getPropertyValue(name).trim();
                return val || null;
            };

            primaryHsl = getVar("--primary") || primaryHsl;
            foregroundHsl = getVar("--foreground") || foregroundHsl;
            mutedForegroundHsl = getVar("--muted-foreground") || mutedForegroundHsl;
            destructiveHsl = getVar("--destructive") || destructiveHsl;
            backgroundHsl = getVar("--background") || backgroundHsl;
            borderHsl = getVar("--border") || borderHsl;
        } catch (e) {
            console.warn("Could not retrieve computed theme colors, using defaults", e);
        }
    }

    const primary = parseHslString(primaryHsl);
    const text = parseHslString(foregroundHsl);
    const muted = parseHslString(mutedForegroundHsl);
    const destructive = parseHslString(destructiveHsl);
    const background = parseHslString(backgroundHsl);
    const border = parseHslString(borderHsl);

    // For header background, we use the primary color to keep it branded
    const headerBg = primary;

    return {
        primary,
        headerBg, // Before it was hardcoded gray-900, now matching primary theme or could be specific
        text,
        muted,
        destructive,
        background,
        border,
    };
}

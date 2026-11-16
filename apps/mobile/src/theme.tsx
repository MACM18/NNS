import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { MD3DarkTheme, MD3LightTheme, PaperProvider, type MD3Theme } from "react-native-paper";

export type ThemeMode = "system" | "light" | "dark";
export type Palette = {
  ink: string; muted: string; blue: string; bright: string; pale: string; paper: string; card: string;
  line: string; good: string; warn: string; yellow: string; yellowInk: string; input: string;
  raised: string; errorBg: string; errorLine: string; successBg: string; successLine: string;
};

export const paletteByMode: Record<Exclude<ThemeMode, "system">, Palette> = {
  light: {
    ink: "#2e2a23", muted: "#776f61", blue: "#31594d", bright: "#b26745", pale: "#e9eee4",
    paper: "#f4efe5", card: "#fffaf1", line: "#ddd4c4", good: "#3e7558", warn: "#a2473a",
    yellow: "#f5e5bd", yellowInk: "#806021", input: "#fffdf8", raised: "#f8f2e7",
    errorBg: "#fbefea", errorLine: "#e6c7ba", successBg: "#e8f1e8", successLine: "#c9ddcb",
  },
  dark: {
    ink: "#f3ead9", muted: "#b9ad99", blue: "#a9c8ad", bright: "#e5a17d", pale: "#303b34",
    paper: "#191d1a", card: "#222823", line: "#3b433c", good: "#9bc6a0", warn: "#efa18f",
    yellow: "#4c4027", yellowInk: "#e4c77e", input: "#1d231f", raised: "#2b322c",
    errorBg: "#392824", errorLine: "#704b40", successBg: "#26352a", successLine: "#405f47",
  },
};

const APPEARANCE_KEY = "nns-mobile-appearance-v1";
type AppearanceState = { themeMode: ThemeMode; resolvedMode: "light" | "dark"; palette: Palette; setThemeMode: (mode: ThemeMode) => void };
const AppearanceContext = createContext<AppearanceState | null>(null);

function paperTheme(palette: Palette, dark: boolean): MD3Theme {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.blue,
      onPrimary: dark ? "#172019" : "#fffaf1",
      primaryContainer: palette.pale,
      onPrimaryContainer: palette.ink,
      secondary: palette.bright,
      onSecondary: dark ? "#201710" : "#fffaf1",
      secondaryContainer: palette.raised,
      onSecondaryContainer: palette.ink,
      background: palette.paper,
      onBackground: palette.ink,
      surface: palette.card,
      onSurface: palette.ink,
      surfaceVariant: palette.raised,
      onSurfaceVariant: palette.muted,
      outline: palette.line,
      outlineVariant: palette.line,
      error: palette.warn,
      onError: "#fffaf1",
    },
  };
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);
  const resolvedMode = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  const palette = paletteByMode[resolvedMode];
  const theme = useMemo(() => paperTheme(palette, resolvedMode === "dark"), [palette, resolvedMode]);

  useEffect(() => {
    void SecureStore.getItemAsync(APPEARANCE_KEY).then((saved) => {
      if (saved === "system" || saved === "light" || saved === "dark") setThemeMode(saved);
    }).catch(() => undefined).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) void SecureStore.setItemAsync(APPEARANCE_KEY, themeMode).catch(() => undefined);
  }, [loaded, themeMode]);

  const value = useMemo(() => ({ themeMode, resolvedMode, palette, setThemeMode }), [themeMode, resolvedMode, palette]);
  return <AppearanceContext.Provider value={value}><PaperProvider theme={theme}>{children}</PaperProvider></AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("AppearanceProvider is missing from the app layout");
  return value;
}

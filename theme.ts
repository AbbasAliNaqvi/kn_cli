import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { createContext, useContext } from 'react';

// Light Theme - User's preferred color combination
export const lightTheme = {
  ...MD3LightTheme,
  name: 'light',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4c7c80ff', // Main Teal
    secondary: '#0D47A1', // Deep Blue
    tertiary: '#2E7D32', // Forest Green
    background: '#FAFAFA', // Light Gray Background
    surface: '#FFFFFF', // White Surface
    card: '#FFFFFF', // White Cards
    disabled: '#BDBDBD', // Light Gray for Disabled Elements
    text: '#212121', // Dark Text
    subtext: '#757575', // Gray Subtext
    accent: '#F5F5F5', // Light Accent
    tabBackground1: '#FFFFFF',
    tabBackground2: '#F8F9FA',
    low: '#E8F5E8', // Light Green for Low Priority
    medium: '#FFF3E0', // Light Orange for Medium Priority
    high: '#FFEBEE', // Light Red for High Priority
    critical: '#FFCDD2', // Critical Red
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#212121',
    onSurfaceVariant: '#757575',
    camera:'#4c7c80ff',
  },
  spacing: {
    padding: 16,
    margin: 12,
    radius: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
};

// Dark Theme - User's preferred color combination
export const darkTheme = {
  ...MD3DarkTheme,
  name: 'dark',
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#ffb259ff', // Brighter Orange for Dark Mode
    secondary: '#42A5F5', // Lighter Blue for Dark Mode
    tertiary: '#66BB6A', // Lighter Green for Dark Mode
    background: '#121212', // Dark Background
    surface: '#1E1E1E', // Dark Surface
    card: '#2D2D2D', // Dark Cards
    disabled: '#424242', // Dark Gray for Disabled Elements
    text: '#FFFFFF', // White Text
    subtext: '#B0B0B0', // Light Gray Subtext
    accent: '#2A2A2A', // Dark Accent
    tabBackground1: '#1E1E1E',
    tabBackground2: '#2D2D2D',
    low: '#1B5E20', // Dark Green for Low Priority
    medium: '#E65100', // Dark Orange for Medium Priority
    high: '#C62828', // Dark Red for High Priority
    critical: '#B71C1C', // Critical Dark Red
    onPrimary: '#000000',
    onSecondary: '#000000',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#B0B0B0',
    camera: '#ffb259ff',
  },
  spacing: {
    padding: 16,
    margin: 12,
    radius: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
};

export type CustomTheme = typeof lightTheme;

export const ThemeContext = createContext<{
  theme: CustomTheme;
  toggleTheme: () => void;
  isDark: boolean;
}>({
  theme: lightTheme,
  toggleTheme: () => {},
  isDark: false,
});

export const useThemeContext = () => useContext(ThemeContext);

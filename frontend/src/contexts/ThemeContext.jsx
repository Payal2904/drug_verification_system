import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  theme: 'light',
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
};

// Action types
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  TOGGLE_HIGH_CONTRAST: 'TOGGLE_HIGH_CONTRAST',
  TOGGLE_REDUCED_MOTION: 'TOGGLE_REDUCED_MOTION',
  RESET_THEME: 'RESET_THEME',
};

// Reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };

    case THEME_ACTIONS.SET_FONT_SIZE:
      return {
        ...state,
        fontSize: action.payload,
      };

    case THEME_ACTIONS.TOGGLE_HIGH_CONTRAST:
      return {
        ...state,
        highContrast: !state.highContrast,
      };

    case THEME_ACTIONS.TOGGLE_REDUCED_MOTION:
      return {
        ...state,
        reducedMotion: !state.reducedMotion,
      };

    case THEME_ACTIONS.RESET_THEME:
      return initialState;

    default:
      return state;
  }
};

// Create context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load theme preferences from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedFontSize = localStorage.getItem('fontSize');
    const savedHighContrast = localStorage.getItem('highContrast') === 'true';
    const savedReducedMotion = localStorage.getItem('reducedMotion') === 'true';

    // Check system preferences
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (savedTheme) {
      dispatch({ type: THEME_ACTIONS.SET_THEME, payload: savedTheme });
    } else if (systemPrefersDark) {
      dispatch({ type: THEME_ACTIONS.SET_THEME, payload: 'dark' });
    }

    if (savedFontSize) {
      dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: savedFontSize });
    }

    if (savedHighContrast) {
      dispatch({ type: THEME_ACTIONS.TOGGLE_HIGH_CONTRAST });
    }

    if (savedReducedMotion || systemPrefersReducedMotion) {
      dispatch({ type: THEME_ACTIONS.TOGGLE_REDUCED_MOTION });
    }
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme class
    root.classList.remove('light', 'dark');
    root.classList.add(state.theme);

    // Apply font size class
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${state.fontSize}`);

    // Apply high contrast
    if (state.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (state.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Store preferences
    localStorage.setItem('theme', state.theme);
    localStorage.setItem('fontSize', state.fontSize);
    localStorage.setItem('highContrast', state.highContrast.toString());
    localStorage.setItem('reducedMotion', state.reducedMotion.toString());
  }, [state]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        dispatch({
          type: THEME_ACTIONS.SET_THEME,
          payload: e.matches ? 'dark' : 'light',
        });
      }
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Theme actions
  const setTheme = (theme) => {
    dispatch({ type: THEME_ACTIONS.SET_THEME, payload: theme });
  };

  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const setFontSize = (fontSize) => {
    dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: fontSize });
  };

  const toggleHighContrast = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_HIGH_CONTRAST });
  };

  const toggleReducedMotion = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_REDUCED_MOTION });
  };

  const resetTheme = () => {
    localStorage.removeItem('theme');
    localStorage.removeItem('fontSize');
    localStorage.removeItem('highContrast');
    localStorage.removeItem('reducedMotion');
    dispatch({ type: THEME_ACTIONS.RESET_THEME });
  };

  // Get current theme colors
  const getThemeColors = () => {
    const isDark = state.theme === 'dark';

    return {
      primary: isDark ? '#60a5fa' : '#2563eb',
      secondary: isDark ? '#94a3b8' : '#475569',
      background: isDark ? '#0f172a' : '#ffffff',
      surface: isDark ? '#1e293b' : '#f8fafc',
      text: isDark ? '#f1f5f9' : '#1e293b',
      textSecondary: isDark ? '#cbd5e1' : '#64748b',
      border: isDark ? '#334155' : '#e2e8f0',
      success: isDark ? '#34d399' : '#10b981',
      warning: isDark ? '#fbbf24' : '#f59e0b',
      error: isDark ? '#f87171' : '#ef4444',
    };
  };

  // Check if dark mode is active
  const isDarkMode = () => state.theme === 'dark';

  // Check if high contrast is active
  const isHighContrast = () => state.highContrast;

  // Check if reduced motion is active
  const isReducedMotion = () => state.reducedMotion;

  const value = {
    // State
    theme: state.theme,
    fontSize: state.fontSize,
    highContrast: state.highContrast,
    reducedMotion: state.reducedMotion,

    // Actions
    setTheme,
    toggleTheme,
    setFontSize,
    toggleHighContrast,
    toggleReducedMotion,
    resetTheme,

    // Utility functions
    getThemeColors,
    isDarkMode,
    isHighContrast,
    isReducedMotion,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export default ThemeContext;

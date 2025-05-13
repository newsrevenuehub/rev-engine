import { revEngineTheme } from 'styles/themes';

// These are shared by Button and IconButton for consistent styling.

export const buttonColors = {
  error: {
    active: { bg: '#8c162c', fg: '' },
    disabled: { bg: '#e86f85', fg: '#f9f9f9' },
    hover: { bg: '#a01a32', fg: '' },
    normal: { bg: revEngineTheme.basePalette.secondary.error, fg: revEngineTheme.basePalette.greyscale.white }
  },
  information: {
    // We don't have active or disabled colors yet.
    active: { bg: '', fg: '' },
    disabled: { bg: revEngineTheme.basePalette.primary.engineBlue, fg: revEngineTheme.basePalette.greyscale.white },
    hover: { bg: '#7eb3d1', fg: '' },
    normal: { bg: revEngineTheme.basePalette.primary.engineBlue, fg: revEngineTheme.basePalette.greyscale.white }
  },
  primaryDark: {
    active: { bg: revEngineTheme.basePalette.indigo[-10], fg: '' },
    disabled: { bg: revEngineTheme.basePalette.purple[-80], fg: '#f9f9f9' },
    hover: { bg: revEngineTheme.basePalette.indigo[-60], fg: '' },
    normal: { bg: revEngineTheme.basePalette.primary.purple, fg: revEngineTheme.basePalette.greyscale.white }
  },
  primaryLight: {
    active: { bg: '#edff14', fg: '' },
    disabled: { bg: revEngineTheme.basePalette.chartreuse['-50'], fg: revEngineTheme.basePalette.greyscale['70'] },
    hover: { bg: revEngineTheme.basePalette.chartreuse['-50'], fg: '' },
    normal: { bg: revEngineTheme.basePalette.primary.chartreuse, fg: revEngineTheme.basePalette.greyscale.black }
  },
  secondary: {
    active: { bg: revEngineTheme.basePalette.greyscale['70'], fg: '' },
    disabled: { bg: '#f9f9f9', fg: revEngineTheme.basePalette.greyscale['30'] },
    hover: { bg: revEngineTheme.basePalette.greyscale['30'], fg: '' },
    normal: { bg: revEngineTheme.basePalette.greyscale['10'], fg: revEngineTheme.basePalette.greyscale.black }
  },
  text: {
    active: { bg: 'rgba(40, 40, 40, 0.06)', fg: revEngineTheme.basePalette.primary.indigo },
    disabled: { bg: 'transparent', fg: revEngineTheme.basePalette.greyscale['30'] },
    hover: { bg: 'transparent', fg: revEngineTheme.basePalette.greyscale.black },
    normal: { bg: 'transparent', fg: revEngineTheme.basePalette.greyscale['70'] }
  }
};

export const buttonSizes = {
  small: {
    height: '32px',
    padding: '8px 16px'
  },
  medium: {
    height: '36px',
    padding: '10px 16px'
  },
  large: {
    height: '40px',
    padding: '12px 16px'
  },
  extraLarge: {
    height: '48px',
    padding: '16px'
  }
};

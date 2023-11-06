import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  // Needed to avoid problems with how we use spaces in component displayNames.
  // See https://github.com/storybookjs/storybook/issues/18074
  typescript: { reactDocgen: 'react-docgen' }
};
export default config;

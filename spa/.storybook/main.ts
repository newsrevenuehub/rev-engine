import type { StorybookConfig } from '@storybook/react-vite';
import turbosnap from 'vite-plugin-turbosnap';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],
  staticDirs: ['../public'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  async viteFinal(config, { configType }) {
    // See https://github.com/IanVS/vite-plugin-turbosnap

    return mergeConfig(config, {
      plugins:
        configType === 'PRODUCTION'
          ? [
              turbosnap({
                // This should be the base path of your storybook.  In
                // monorepos, you may only need process.cwd().
                rootDir: config.root ?? process.cwd()
              })
            ]
          : []
    });
  },
  // Needed to avoid problems with how we use spaces in component displayNames.
  // See https://github.com/storybookjs/storybook/issues/18074
  typescript: { reactDocgen: 'react-docgen' }
};
export default config;

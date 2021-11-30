const HtmlWebpackPlugin = require('html-webpack-plugin');
const { addPlugins } = require('@craco/craco');
const { TEST_HUB_GA_V3_ID } = require('./testSettings');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        type: 'javascript/auto',
        test: /\.mjs$/,
        include: /node_modules/
      });
      if (process.env.NODE_ENV === 'test') {
        console.log('got here');
        const htmlLoader = new HtmlWebpackPlugin({
          title: 'Test Template',
          template: 'public/test_index.html',
          HUB_V3_GOOGLE_ANALYTICS_ID: TEST_HUB_GA_V3_ID
        });
        addPlugins(webpackConfig, [[htmlLoader, 'append']]);
      }
      return webpackConfig;
    }
  }
};

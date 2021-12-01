const webpack = require('webpack');

module.exports = (config) => {
  config.set({
    frameworks: ['mocha', 'chai', 'webpack'],
    files: [
      'lib/test/karma/loader.js',
    ],
    preprocessors: {
      'lib/test/karma/loader.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
      resolve: {
        fallback: {
          fs: false,
          http: false,
          https: false,
          crypto: require.resolve('crypto-browserify'),
          buffer: require.resolve('buffer/'),
          assert: require.resolve('assert-browserify'),
          stream: require.resolve('stream-browserify'),
          path: require.resolve('path-browserify'),
          url: require.resolve('url/'),
        },
      },
      plugins: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ],
    },
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadless', 'FirefoxHeadless'],
    singleRun: false,
    concurrency: Infinity,
    plugins: [
      require('karma-mocha'),
      require('karma-mocha-reporter'),
      require('karma-chai'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-webpack'),
    ],
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless'],
      },
    },
  });
};

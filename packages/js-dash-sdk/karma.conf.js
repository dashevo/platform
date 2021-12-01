/* eslint-disable import/no-extraneous-dependencies */
const webpack = require('webpack');
const dotenvResult = require('dotenv-safe').config();

const webpackBaseConfig = require("./webpack.base.config");

if (dotenvResult.error) {
  throw dotenvResult.error;
}

module.exports = (config) => {
  config.set({
    frameworks: ['mocha', 'chai', 'webpack'],
    files: [
      'src/**/*.spec.ts',
      'src/test/karma/bootstrap.ts',
      'tests/functional/sdk.js',
    ],
    preprocessors: {
      'src/**/*.spec.ts': ['webpack'],
      'src/test/karma/bootstrap.ts': ['webpack'],
      'tests/functional/sdk.js': ['webpack'],
    },
    webpack: {
      ...webpackBaseConfig,
      mode: 'development',
      plugins: [
        ...webpackBaseConfig.plugins,
        new webpack.EnvironmentPlugin(
          dotenvResult.parsed,
        ),
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
    browserNoActivityTimeout: 7 * 60 * 1000, // 30000 default
    browserDisconnectTimeout: 3 * 2000, // 2000 default
    pingTimeout: 3 * 5000, // 5000 default
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

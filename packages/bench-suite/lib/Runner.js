const Mocha = require('mocha');

const setupContext = require('./setupContext');

const MetricsCollector = require('./metrics/MetricsCollector');

const BENCHMARKS = require('./benchmarks');

class Runner {
  /**
   * @type {Mocha}
   */
  #mocha;

  /**
   * @type {Object}
   */
  #options;

  /**
   * @type {MetricsCollector}
   */
  #metricsCollector;

  /**
   * @type {AbstractBenchmark[]}
   */
  #benchmarks = [];

  /**
   * @param {Object} options
   * @param {string} options.driveLogPath
   * @param {boolean} [options.verbose=false]
   */
  constructor(options = {}) {
    this.#options = options;

    this.#mocha = new Mocha({
      reporter: options.verbose ? 'spec' : 'nyan',
      timeout: 650000,
      bail: true,
    });

    this.#metricsCollector = new MetricsCollector(options.driveLogPath);
  }

  /**
   * @param {string} filePath
   */
  loadBenchmarks(filePath) {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    const benchmarks = require(filePath);

    for (const benchmarkConfig of benchmarks) {
      const BenchmarkClass = BENCHMARKS[benchmarkConfig.type];

      if (!BenchmarkClass) {
        throw new Error(`Invalid benchmark type ${benchmarkConfig.type}`);
      }

      const benchmark = new BenchmarkClass(benchmarkConfig, this.#metricsCollector);

      this.#mocha.suite.addSuite(
        benchmark.createMochaTestSuite(this.#mocha.suite.ctx),
      );

      this.#benchmarks.push(benchmark);
    }
  }

  /**
   * Run benchmarks
   */
  run() {
    setupContext(this.#mocha, this.#benchmarks, this.#options);

    this.#mocha.run(async (failures) => {
      if (failures) {
        process.exitCode = 1;

        return;
      }

      // Print metrics
      this.#benchmarks.forEach((benchmark) => {
        this.#metricsCollector.addMatches(benchmark.getMetricMatches());
      });

      await this.#metricsCollector.collect();

      this.#benchmarks.forEach((benchmark) => {
        benchmark.printMetrics();
      });
    });
  }
}

module.exports = Runner;

var Util = require('../util');

/** Launches all substrategies and emits prioritized connected transports.
 *
 * @param {Array} strategies
 */
function BestConnectedEverStrategy(strategies) {
  this.strategies = strategies;
}
var prototype = BestConnectedEverStrategy.prototype;

prototype.isSupported = function() {
  return Util.any(this.strategies, Util.method("isSupported"));
};

prototype.connect = function(minPriority, callback) {
  return connect(this.strategies, minPriority, function(i, runners) {
    return function(error, handshake) {
      runners[i].error = error;
      if (error) {
        if (allRunnersFailed(runners)) {
          callback(true);
        }
        return;
      }
      Util.apply(runners, function(runner) {
        runner.forceMinPriority(handshake.transport.priority);
      });
      callback(null, handshake);
    };
  });
};

/** Connects to all strategies in parallel.
 *
 * Callback builder should be a function that takes two arguments: index
 * and a list of runners. It should return another function that will be
 * passed to the substrategy with given index. Runners can be aborted using
 * abortRunner(s) functions from this class.
 *
 * @param  {Array} strategies
 * @param  {Function} callbackBuilder
 * @return {Object} strategy runner
 */
function connect(strategies, minPriority, callbackBuilder) {
  var runners = Util.map(strategies, function(strategy, i, _, rs) {
    return strategy.connect(minPriority, callbackBuilder(i, rs));
  });
  return {
    abort: function() {
      Util.apply(runners, abortRunner);
    },
    forceMinPriority: function(p) {
      Util.apply(runners, function(runner) {
        runner.forceMinPriority(p);
      });
    }
  };
}

function allRunnersFailed(runners) {
  return Util.all(runners, function(runner) {
    return Boolean(runner.error);
  });
}

function abortRunner(runner) {
  if (!runner.error && !runner.aborted) {
    runner.abort();
    runner.aborted = true;
  }
}

module.exports = BestConnectedEverStrategy;

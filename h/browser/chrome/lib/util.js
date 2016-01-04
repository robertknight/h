/**
 * Converts an async Chrome API into a function
 * which returns a promise.
 */
function promisify(fn) {
  return function () {
    var args = [].slice.call(arguments);
    var result = new Promise(function (resolve, reject) {
      fn.apply(this, args.concat(function (result) {
        if (chrome.extension.lastError) {
          reject(chrome.extension.lastError);
        } else {
          resolve(result);
        }
      }));
    });
    return result;
  };
}

module.exports = {
  promisify: promisify,
};

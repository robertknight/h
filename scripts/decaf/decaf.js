#!/usr/bin/env node

// A script to assist with CoffeeScript -> JS
// conversion

var decaffeinate = require('decaffeinate');
var fs = require('fs');
var path = require('path');
var typescriptFormatter = require('typescript-formatter');

var inFile = process.argv[2];

function reformat(js) {
  return typescriptFormatter
    .processString(inFile, js, {
      baseDir: __dirname,
      tsfmt: true,
    })
    .then(function (result) {
      return result.dest;
    });
}

function toResultOrError(promise) {
  return promise.then(function (result) {
    return { result: result };
  }).catch(function (err) {
    return { error: err };
  });
}

function convertFile(inFile, outFile) {
  console.log('Converting', inFile);

  var js;

  try {
    js = decaffeinate.convert(
      fs.readFileSync(inFile).toString('utf8')
    );
  } catch (err) {
    return Promise.reject(err);
  }

  return reformat(js).then(function (result) {
    fs.writeFileSync(outFile, result);
  });
}

var conversions = [];
process.argv.slice(2).forEach(function (filePath) {
  var inFile = path.resolve(filePath);
  var outFile = inFile.replace(/\.coffee$/, '.js');
  conversions.push(toResultOrError(convertFile(inFile, outFile)).then(function (result) {
    result.fileName = inFile;
    return result;
  }));
});

Promise.all(conversions).then(function (results) {
  var ok = 0;
  var failed = 0;
  results.forEach(function (result) {
    if (result.error) {
      console.log('Error converting %s', result.fileName, result.error);
      ++failed;
    } else {
      console.log('Converted %s', result.fileName);
      ++ok;
    }
  });
  console.log('Converted %d files, failed to convert %d files', ok, failed);
}).catch(function (err) {
  console.log('Conversion error:', err);
});

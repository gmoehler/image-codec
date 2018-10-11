const fs = require('fs');
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir);

const encoder = require("./lib/encoder")

const folder = "images";

// const method = "runLengthEncode";  // 23%
// const method = "diffEncode";       // 39%
const method = "combinedEncode";      // 7%

readDirAsync(folder).then(files => {
  return files.map(f => folder + '/' + f)
    .filter(filename => filename.split('.').pop() === "png");
}).then(filesWithPath => {
  // console.log(filesWithPath);
  return Promise.all(filesWithPath.map(f => encoder.readImage(f, method )))
}).then(c => {
  const sumFrame = c.reduce((sum, obj) => sum + obj.frames, 0);
  const sumOrigBytes = c.reduce((sum, obj) => sum + obj.origBytes, 0);
  const sumEncodedBytes = c.reduce((sum, obj) => sum + obj.encodedBytes, 0);

  console.log("-------------------");
  console.log(`Frames: ${sumFrame}`);
  console.log(`Original bytes: ${sumOrigBytes}`);
  console.log(`encoded bytes: ${sumEncodedBytes}`);
  console.log(`Compressed to: ${Math.round(sumEncodedBytes / sumOrigBytes * 100)}%`);

});

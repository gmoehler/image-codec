const fs = require('fs');
const png = require('pngjs').PNG;
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir);

function rgb(data, idx) {
  return {r: data[idx], g: data[idx+1], b: data[idx+2]};
}

function rgb_eq(rgb1, rgb2) {
  return JSON.stringify(rgb1) === JSON.stringify(rgb2);
}

function runLengthEncode(data, width, height) {

  let byteCnt = 0;

  for (let w = 0; w < width; w++) {

    prev_rgb = rgb(data, 0);
    byteCnt += 4;
    let sameCnt = 1;

    for (let h = 1; h < height; h++) {

      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);

      if (rgb_eq(this_rgb, prev_rgb)) {
        sameCnt++;
      } else {
        byteCnt += 4;
        prev_rgb = this_rgb;
        sameCnt = 1;
      }
    }
    byteCnt += 4;
  }
  return byteCnt;
}

async function _readImage(imageFile) {

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(imageFile)) {
      return reject(new Error("File does not exist."));
    }

    const stream = fs.createReadStream(imageFile);
    stream.on("error", (err) => {
      return reject(err);
    })
    const pipe = stream.pipe(new png({filterType: 4}));
    pipe.on("error", (err) => {
      return reject(err);
    })

    pipe.on('parsed', function () {
      console.log(`${imageFile}: ${this.width} x ${this.height} px`);
      
      const frames = this.width;
      const origBytes = this.width * this.height * 3;
      const encodedBytes = runLengthEncode(this.data, this.width, this.height);
      
      console.log(`Bytes: ${origBytes}, ${Math.round(encodedBytes / origBytes * 100)}%`);

      return resolve({frames, origBytes, encodedBytes});
    });
  })
};

const folder = "images";

readDirAsync(folder).then(files => {
  return filesWithPath = files.map(f => folder + '/' + f);
}).then(filesWithPath => {
  console.log(filesWithPath);
  return Promise.all(filesWithPath.map(f => _readImage(f)))
}).then(c => {
  const sumFrame = c.reduce((sum, obj) => sum + obj.frames, 0);
  const sumOrigBytes = c.reduce((sum, obj) => sum + obj.origBytes, 0);
  const sumEncodedBytes = c.reduce((sum, obj) => sum + obj.encodedBytes, 0);

  console.log("-------------------");
  console.log(`Frames: ${sumFrame}`);
  console.log(`Original bytes: ${sumOrigBytes}`);
  console.log(`encoded bytes: ${sumEncodedBytes}`);
  console.log(`Faktor: ${Math.round(sumEncodedBytes / sumOrigBytes * 100)}%`);

});

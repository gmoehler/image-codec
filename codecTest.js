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

function black() {
  return {r: 0, g: 0, b:0};
}

function rgb_isblack(rgb) {
  return rgb_eq(rgb, black());
}

function rgb_print(rgb) {
  console.log(`${r} ${g} ${b}`);
}

function analyseImage(data, width, height) {
  // 17% comprimation 
  // 22% when final black ignored
  // 24% when initial and trailing black frames ignored
  let bytes = 0;

  // scan for black
  const nonBlackFrames = [];
  for (let w = 0; w < width; w++) {
    for (let h = 0; h < height; h++) {
      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);
      if (!rgb_isblack(this_rgb)) {
        nonBlackFrames.push(w);
        break;
      }
    }
  }
  const firstFrame = nonBlackFrames.length ? nonBlackFrames.shift() : 0;
  const lastFrame = nonBlackFrames.length ? nonBlackFrames.pop() : width-1;
  // const numFrames = lastFrame-firstFrame+1;
  // console.log({firstFrame, lastFrame, numFrames});
  return {firstFrame, lastFrame};
}

function runLengthEncode(data, width, height, firstFrame, lastFrame, ) {
  // 17% comprimation 
  // 22% when final black ignored
  // 24% when initial and trailing black frames ignored
  let bytes = 0;

  const numFrames = lastFrame-firstFrame+1;
  // console.log({firstFrame, lastFrame, numFrames});

  for (let w = firstFrame; w < lastFrame+1; w++) {

    prev_rgb = rgb(data, 0);
    let sameCnt = 1;

    for (let h = 1; h < height; h++) {

      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);

      if (rgb_eq(this_rgb, prev_rgb)) {
        sameCnt++;
      } else {
        bytes += 4;
        prev_rgb = this_rgb;
        sameCnt = 1;
      }
    }
    bytes += 4; // at least the last one will be printed
  }
  return {bytes, frames: numFrames};
}

function diffEncode(data, width, height, firstFrame, lastFrame) {
// 37% comprimation
// 39% if initial and final black frames ignored

  let bytes = 0;
  let prev_frame = [];

  const numFrames = lastFrame-firstFrame+1;
  // console.log({firstFrame, lastFrame, numFrames});

  for (let w = firstFrame; w < lastFrame+1; w++) {
    for (let h = 0; h < height; h++) {

      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);

      if (w>0 && rgb_eq(prev_frame[h], this_rgb)) {
        bytes +=1;
      } else {
        bytes +=3;
      }

      prev_frame[h] = this_rgb;
    }
  }
  return {bytes, frames: numFrames};
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

      const params = analyseImage(this.data, this.width, this.height);
      
      const metrics = runLengthEncode(this.data, this.width, this.height, params.firstFrame, params.lastFrame);
      // const metrics = diffEncode(this.data, this.width, this.height, params.firstFrame, params.lastFrame);

      const origFrames = this.width;
      const frames = metrics.frames;
      const origBytes = frames * this.height * 3;
      const encodedBytes = metrics.bytes;

      console.log(`Frames: ${frames}/${origFrames} Bytes: ${origBytes}, ${Math.round(encodedBytes / origBytes * 100)}%`);

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

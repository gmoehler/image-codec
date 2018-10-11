const fs = require('fs');
const png = require('pngjs').PNG;
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir);

function rgb(data, idx) {
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    bytes: 3
  };
}

function rgb_eq(rgb1, rgb2) {
  return rgb1 && rgb2 && JSON.stringify(rgb1) === JSON.stringify(rgb2);
}

function black() {
  return {r: 0, g: 0, b: 0, bytes: 3};
}

function rgb_isblack(rgb) {
  return rgb_eq(rgb, black());
}

function same() {
  return {r: -1, g: -1, b: -1, bytes: 1};
}

function rgb_issame(px) {
  return rgb_eq(px, same());
}

function rgb_print(px, prefix) {
  if (!px) {
    console.log(`${prefix}: null`);
  } else if (rgb_issame(px)) {
    console.log(`${prefix}: same`);
  } else {
    console.log(`${prefix}: ${px.r} ${px.g} ${px.b} bytes:${px.bytes}`);
  }
}

function rgb_diff(rgb_ref, rgb_cur) {
  if (rgb_eq(rgb_ref, rgb_cur)) {
    return same();
  }
  return rgb_cur;
}

function analyseImage(data, width, height) {

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
  const firstFrame = nonBlackFrames.length
    ? nonBlackFrames.shift()
    : 0;
  const lastFrame = nonBlackFrames.length
    ? nonBlackFrames.pop()
    : width - 1;
  // const numFrames = lastFrame-firstFrame+1; console.log({firstFrame, lastFrame,
  // numFrames});
  return {firstFrame, lastFrame};
}

function runLengthEncode(data, width, height, firstFrame, lastFrame,) {
  // 23% comprimation when initial and trailing
  // black frames ignored
  let bytes = 0;

  const numFrames = lastFrame - firstFrame + 1;
  // console.log({firstFrame, lastFrame, numFrames});

  for (let w = firstFrame; w < lastFrame + 1; w++) {
    const idx0 = (w) << 2;
    prev_rgb = rgb(data, idx0);
    let sameCnt = 1;

    for (let h = 1; h < height; h++) {

      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);

      // console.log(`${w},${h}`);
      // rgb_print(prev_rgb, ` prev`);
      // rgb_print(this_rgb, ` this`);
      if (rgb_eq(this_rgb, prev_rgb)) {
        sameCnt++;
      } else {
        // rgb_print(prev_rgb, `${w},${h}: ${sameCnt}x`);
        bytes += 4;
        // console.log(`-> ${bytes} bytes`);
        prev_rgb = this_rgb;
        sameCnt = 1;
      }
    }

    // at least the last one will be printed
    // rgb_print(prev_rgb, `${w},${height - 1}: ${sameCnt}x`);
    bytes += 4;
    // console.log(`-> ${bytes} bytes`);
  }
  return {bytes, frames: numFrames};
}

function diffEncode(data, width, height, firstFrame, lastFrame) {
  // 37% comprimation 39% if initial and final black frames ignored

  let bytes = 0;
  let prev_frame = [];

  const numFrames = lastFrame - firstFrame + 1;
  // console.log({firstFrame, lastFrame, numFrames});

  for (let w = firstFrame; w < lastFrame + 1; w++) {
    for (let h = 0; h < height; h++) {

      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);
      // rgb_print(this_rgb, `${w},${h}: this`);
      const diff = w > 0
        ? rgb_diff(prev_frame[h], this_rgb)
        : this_rgb;
      bytes += diff.bytes;
      // rgb_print(diff, `${w},${h}: diff`);
      // console.log(`-> ${bytes}`)

      prev_frame[h] = this_rgb;
    }
  }
  return {bytes, frames: numFrames};
}

function combinedEncode(data, width, height, firstFrame, lastFrame) {
  // % comprimation % if initial and final black frames ignored

  let bytes = 0;
  let prev_frame = new Array(height);

  const numFrames = lastFrame - firstFrame + 1;
  // console.log({firstFrame, lastFrame, numFrames});

  for (let w = firstFrame; w < lastFrame + 1; w++) {
    let prev_diff = null;
    let sameCnt = 0;
    for (let h = 0; h < height; h++) {

      const idx = (width * h + w) << 2;
      this_rgb = rgb(data, idx);
      // rgb_print(this_rgb, `${w},${h}: this`);
      // if (w>0) rgb_print(prev_frame[h], `${w},${h}: prev_frame[h]`);
      // rgb_print(prev_diff, `${w},${h}: prev_diff`);

      //diff encode
      const diff = w > 0
        ? rgb_diff(prev_frame[h], this_rgb)
        : this_rgb;
      // rgb_print(diff, `${w},${h}: diff`);

      // runlength encode
      if (rgb_eq(prev_diff, diff)) {
        sameCnt++;
        if (h==height-1){
          // output diff with count
          // rgb_print(diff, `${w},${h}: last line output `);
          if (rgb_issame(diff)) {
            bytes++; // one byte for same
          } else {
            bytes += diff.bytes + 1;
          }
        }
      } else if (h > 0) {
        // output diff with count
        // rgb_print(prev_diff, `${w},${h}: output `);
        if (rgb_issame(prev_diff)) {
          bytes++; // one byte for same
        } else {
          bytes += prev_diff.bytes + 1;
        }
      }
      // console.log(`-> ${bytes}`)

      prev_diff = diff;

      prev_frame[h] = this_rgb;
    }
  }
  return {bytes, frames: numFrames};
}

async function _readImageAndEncode(imageFile, encodingMethod) {

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

      let metrics;
      if (encodingMethod === "runLengthEncode") {
        metrics = runLengthEncode(this.data, this.width, this.height, params.firstFrame, params.lastFrame);
      } else if (encodingMethod === "diffEncode") {
        metrics = diffEncode(this.data, this.width, this.height, params.firstFrame, params.lastFrame);
      } else {
        metrics = combinedEncode(this.data, this.width, this.height, params.firstFrame, params.lastFrame);
      }

      const origFrames = this.width;
      const frames = metrics.frames;
      const origBytes = frames * this.height * 3;
      const encodedBytes = metrics.bytes;

      console.log(`Frames: ${frames}/${origFrames}, Bytes: ${encodedBytes}/${origBytes}, ${Math.round(encodedBytes / origBytes * 100)}%`);

      return resolve({frames, origBytes, encodedBytes});
    });
  })
};

module.exports = {
  readImageAndEncode: _readImageAndEncode
}
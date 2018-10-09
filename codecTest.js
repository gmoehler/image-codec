const fs = require('fs');
const png = require('pngjs').PNG;
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir);


function runLengthEncode(data, width, height) {

  let byteCnt = 0;
  let prevFrame = [];

  for (let w = 0; w < width; w++) {
    // console.log(`frame: ${w}`);

    let prev_r = data[0];
    let prev_g = data[1];
    let prev_b = data[2];

    byteCnt += 4;
    let sameCnt = 1;

    for (let h = 1; h < height; h++) {
      const idx = (width * h + w) << 2;

      // console.log(` ${h}: ${data[idx]} ${data[idx+1]}
      // ${data[idx+2]}`);

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const pidx = 3 * h;

      if (r === prev_r && g === prev_g && b === prev_b) {
        sameCnt++;
      } else {
        byteCnt += 4;
        //console.log(`${sameCnt}x: ${prev_r} ${prev_g} ${prev_b}`);
        prev_r = r;
        prev_g = g;
        prev_b = b;
        sameCnt = 1;
      }

    }
    byteCnt += 4;

    //console.log(`${sameCnt}x: ${prev_r} ${prev_g} ${prev_b}`);
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

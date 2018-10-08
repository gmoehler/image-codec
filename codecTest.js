const fs = require('fs');
const png = require('pngjs').PNG;
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir); 

async function _readImage(imageFile) {
	
    return new Promise((resolve,reject) => {
      if (!fs.existsSync(imageFile)) {
        return reject(new Error("File does not exist."));
      }
      
      const stream = fs.createReadStream(imageFile);
      stream.on("error", (err) => {
        return reject(err);
      })
      const pipe = stream.pipe(new png({ filterType: 4 }));
      pipe.on("error", (err) => {
        return reject(err);
      })
  
      pipe.on('parsed', function() {
        console.log(`Read image ${imageFile} with ${this.width} frames and ${this.height} px` );
  
		let origByteCnt = 0;
		let byteCnt = 0;
		let lineCnt = 0;
		let prevFrame = [];
		const ww = this.width;
		
  
        for (let w = 0; w < ww; w++) {
          // console.log(`frame: ${w}`);
          
          
          let prev_r = this.data[0];
          let prev_g = this.data[1];
          let prev_b = this.data[2];
          lineCnt++;
          byteCnt+= 4;
          let sameCnt = 1;
  
          for (let h = 1; h < this.height; h++) {
            	const idx = (this.width * h + w) << 2;
            	origByteCnt+= 3;
                //console.log(` ${h}: ${this.data[idx]} ${this.data[idx+1]} ${this.data[idx+2]}`);
            
            const r = this.data[idx];
            const g = this.data[idx+1];
            const b = this.data[idx+2];
            
            const pidx = 3 * h;
            /*
            if (w>0 && r === prevFrame[pidx] &&
            	 g === prevFrame[pidx+1] &&
             	b === prevFrame[pidx+2]) {
             	
             }*/
            
            if (r === prev_r && g === prev_g && b === prev_b) {
            	sameCnt++;
            } else {
            	byteCnt+= 4;
            	//console.log(`${sameCnt}x: ${prev_r} ${prev_g} ${prev_b}`);
            	prev_r = r;
            	prev_g = g;
            	prev_b = b;
            	sameCnt = 1;
  	  	}
  
          }
          byteCnt+= 4;

          //console.log(`${sameCnt}x: ${prev_r} ${prev_g} ${prev_b}`);
        }
        console.log(`Original bytes: ${origByteCnt}`);
        console.log(`Bytes: ${byteCnt}`);
        console.log(`Faktor: ${Math.round(byteCnt/origByteCnt*100)}%`);
        return resolve({
        	origByteCnt: origByteCnt,
        	byteCnt: byteCnt,
        	lineCnt: lineCnt
		});
      });
    })
  };
  
 const folder = "images";

 readDirAsync(folder)
 .then(files => {
 	return filesWithPath = files.map(f => folder + '/' + f);
  })
  .then(filesWithPath => {
		console.log(filesWithPath);
		return Promise.all(
			filesWithPath.map(f => _readImage(f))
			)
	})
	.then(c => {
		const sumOrig = c.reduce ((sum, obj) =>
			sum + obj.origByteCnt, 0)
		const sum = c.reduce ((sum, obj) =>
			sum + obj.byteCnt, 0);
		const FrameSum = c.reduce ((sum, obj) =>
			sum + obj.lineCnt, 0)
		
		console.log(`Lines: ${FrameSum}`);
		console.log(`Original bytes: ${sumOrig}`);
        console.log(`Bytes: ${sum}`);
        console.log(`Faktor: ${Math.round(sum/sumOrig*100)}%`);

	});



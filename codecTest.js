const fs = require('fs');
const png = require('pngjs').PNG;

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
  
  
        for (let w = 0; w < this.width; w++) {
          // console.log(`frame: ${w}`);
  
          for (let h = 0; h < this.height; h++) {
            let idx = (this.width * h + w) << 2;
  
            console.log(`${h}: ${this.data[idx]} ${this.data[idx+1]} ${this.data[idx+2]}`);
            //client.sendCmd(
            //  [h, w, 0, this.data[idx], this.data[idx+1], this.data[idx+2] ],
            //  false);
            
          }
        }

        return resolve();
      });
    })
  };
  
  
_readImage("images/raustropf.png") 
	.then(() => {
        console.log("end.")
    });
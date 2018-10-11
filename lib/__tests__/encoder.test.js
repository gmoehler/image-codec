"use strict"

const fs = require('fs');
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir);

const encoder = require("../encoder")

describe("encoding tests", () => {
    
    function doEncode(methodName) {
        const folder = "./test";

        return readDirAsync(folder).then(files => {
            return files
                .map(f => folder + '/' + f)
                .filter(filename => filename.split('.').pop() === "png");
        }).then(filesWithPath => {
            console.log(filesWithPath);
            return Promise.all(filesWithPath.map(f => encoder.readImage(f,methodName)))
        }).then(c => {
            const sumOrigBytes = c.reduce((sum, obj) => sum + obj.origBytes, 0);
            const sumEncodedBytes = c.reduce((sum, obj) => sum + obj.encodedBytes, 0);
            const percent = Math.round(sumEncodedBytes / sumOrigBytes * 100);
            return percent;
        });
    }

    test("encode with runLengthEncode", () => {

        return doEncode( "runLengthEncode")
            .then((percent) => expect(percent).toEqual(67));

    });
    test("encode with diffEncode", () => {

        return doEncode( "diffEncode")
            .then((percent) => expect(percent).toEqual(67));

    });
    test("encode with combinedEncode", () => {

        return doEncode( "combinedEncode")
            .then((percent) => expect(percent).toEqual(38));

    });
});
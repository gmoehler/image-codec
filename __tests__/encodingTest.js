"use strict"

const prg = require("../encodingTest");

beforeEach(() => {
    jest.resetModules();
});

test("run encoding", () => {

    const folder = ".";

    readDirAsync(folder).then(files => {
        return filesWithPath = files
            .map(f => folder + '/' + f)
            .filter(filename => filename.split('.').pop() === "png");
    }).then(filesWithPath => {
        console.log(filesWithPath);
        return Promise.all(filesWithPath.map(f => _readImage(f)))
    }).then(c => {
        const sumFrame = c.reduce((sum, obj) => sum + obj.frames, 0);
        const sumOrigBytes = c.reduce((sum, obj) => sum + obj.origBytes, 0);
        const sumEncodedBytes = c.reduce((sum, obj) => sum + obj.encodedBytes, 0);
        const factor = Math.round(sumEncodedBytes / sumOrigBytes * 100);
        expect(factor).toEqual(7);
    });

});

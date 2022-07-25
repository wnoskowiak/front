const readline = require("readline");
const stream = require("stream");
const fs = require("fs");

module.exports = {
    getActiveName,
    searchStream
  };

function getActiveName(SETTINGS) {
var curr = SETTINGS.CONFIG.active;
for (const w in SETTINGS.PROXIES) {
    if (SETTINGS.PROXIES[w] === curr) {
    curr = w;
    break;
    }
}
return curr
}

const searchStream = (filename, text) => {
return new Promise((resolve) => {
    const inStream = fs.createReadStream(filename);
    const outStream = new stream();
    const rl = readline.createInterface(inStream, outStream);
    const result = [];
    const regEx = new RegExp(text, "i");
    rl.on("line", function(line) {
    if (line && line.search(regEx) >= 0) {
        result.push(line);
    }
    });
    rl.on("close", function() {
    resolve(result);
    });
});
};
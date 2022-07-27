const fs = require("fs");

module.exports = {
    getMocks,
    updateMocks
};

function getMocks() {
    SETTINGS["mocks"] = JSON.parse(
        fs.readFileSync(`${SETTINGS.dir}${SETTINGS.FILEPATHS.mockListFile}`)
    );
}

function updateMocks(url, file) {
    SETTINGS.mocks[url] = { file: file, active: true };
    fs.writeFileSync(
        `${__dirname}${SETTINGS.FILEPATHS.mockListFile}`,
        JSON.stringify(SETTINGS.mocks)
    );
    getMocks();
}

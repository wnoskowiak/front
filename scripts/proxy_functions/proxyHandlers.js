const crypto = require("crypto");
const readLastLines = require("read-last-lines");
const fs = require("fs");
const helper = require(`./helperFunctions.js`)

module.exports = {
  handleConfigEdit,
  handleConfigGet,
  handleEditMocksUrl,
  handleGetHistory,
  handleGetMocksUrl,
  handleSetMocksUrl
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

function handleSetMocksUrl(parsedBody, req, res) {
    
    function checkPath(str) {
      return /^[a-zA-Z0-9_.-/]*$/.test(str);
    }
  
    function checkData(data) {
      if (data["url"] === undefined) {
        return false;
      }
      if (!checkPath(data["url"])) {
        return false;
      }
      return true;
    }
  
    function failFunction() {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ response: "coś-nie-wyszło" }));
    }
  
    if (!parsedBody) {
      failFunction();
      return;
    }

    if (!req.method === "POST" || !checkData(parsedBody)) {
      failFunction();
      return;
    }

    fileName =
      crypto
        .createHash("sha1")
        .update(parsedBody["url"])
        .digest("hex") + ".json";
    fs.promises
      .writeFile(
        `${__dirname}/${SETTINGS.FILEPATHS.mockFilesPath}/${fileName}`,
        JSON.stringify(parsedBody["content"])
      )
      .then(() => {
        updateMocks(parsedBody["url"], fileName);
      })
      .then(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ response: "OK" }));
      })
      .catch((error) => {
        console.log(error);
        failFunction();
      });
  }
  
  function handleGetHistory(parsedBody, req, res) {

    async function gu(lines) {
      if (lines >= 0) {
        return readLastLines.read(
          `${__dirname}${SETTINGS.FILEPATHS.requestHistory}`,
          lines
        );
      }
      return await fs.promises.readFile(
        `${__dirname}${SETTINGS.FILEPATHS.requestHistory}`,
        "utf8"
      );
    }

    if (parsedBody.id) {
      helper.searchStream(
        `${__dirname}${SETTINGS.FILEPATHS.requestHistory}`,
        parsedBody.id
      ).then((dat) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          "[" +
          dat
            .join()
            .slice(0, -1)
            .replace(/,,/g, ",") +
          "]"
        );
      });
      console.log(`przeszukanie historii`);
      return;
    }
  
    const lines = parsedBody
      ? Number.isInteger(parsedBody.records)
        ? parsedBody.records
        : parsedBody.records === "all"
          ? -1
          : 20
      : 20;
    gu(lines).then((dat) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("[" + dat.slice(0, -2) + "]");
    });
    console.log(`odczyt historii`);
  }
  
  function handleConfigEdit(parsedBody, req, res) {

    function checkAim(aim) {
      if (!(aim === "DEFAULT") && !(SETTINGS.PROXIES[aim] === undefined)) {
        return true;
      }
      return false;
    }

    if (!parsedBody) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end();
      return;
    }
    if (!checkAim(parsedBody["aim"])) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end();
      return;
    }
    SETTINGS.CONFIG.active = SETTINGS.PROXIES[parsedBody.aim];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end();
  }
  
  function handleConfigGet(parsedBody, req, res) {

    function readAims() {
      curr = helper.getActiveName(SETTINGS)
      ava = SETTINGS.PROXIES;
      delete ava.DEFAULT;
      data = {
        current: curr,
        available: ava,
      };
      return data;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(readAims()));
  }
  
  function handleGetMocksUrl(parsedBody, req, res) {
    getMocks();
    result = {};
    Object.keys(SETTINGS.mocks).map(function (key, inx) {
      result[key] = SETTINGS.mocks[key].active;
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  }
  
  function handleEditMocksUrl(parsedBody, req, res) {
    function failFunction() {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ response: "coś-nie-wyszło" }));
    }
  
    if (!parsedBody) {
      failFunction();
      return;
    }
    if (!parsedBody.visibility) {
      failFunction();
      return;
    }
    getMocks();
    for (const endp of Object.keys(SETTINGS.mocks)) {
      if (!(parsedBody.visibility[endp] === undefined)) {
        SETTINGS.mocks[endp].active = !!parsedBody.visibility[endp];
      }
    }
    fs.writeFileSync(
      `${__dirname}${SETTINGS.FILEPATHS.mockListFile}`,
      JSON.stringify(SETTINGS.mocks)
    );
    getMocks();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("OK");
  }
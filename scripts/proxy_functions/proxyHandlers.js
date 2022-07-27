const crypto = require("crypto");
const readLastLines = require("read-last-lines");
const fs = require("fs");
const helper = require(`./helperFunctions.js`)
const setEdit = require("./settingsEdit.js")

module.exports = {
  handleConfigEdit,
  handleConfigGet,
  handleEditMocksUrl,
  handleGetHistory,
  handleGetMocksUrl,
  handleSetMocksUrl
};

function handleSetMocksUrl(SETTINGS, parsedBody, req, res, setEd) {

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
      `${SETTINGS.dir}/${SETTINGS.FILEPATHS.mockFilesPath}/${fileName}`,
      JSON.stringify(parsedBody["content"])
    )
    .then(() => {
      setEd.updateMocks(parsedBody["url"], fileName);
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

function handleGetHistory(SETTINGS, parsedBody, req, res, setEd) {

  async function gu(lines) {
    if (lines >= 0) {
      return readLastLines.read(
        `${SETTINGS.dir}${SETTINGS.FILEPATHS.requestHistory}`,
        lines
      );
    }
    return await fs.promises.readFile(
      `${SETTINGS.dir}${SETTINGS.FILEPATHS.requestHistory}`,
      "utf8"
    );
  }

  if (parsedBody.id) {
    helper.searchStream(
      `${SETTINGS.dir}${SETTINGS.FILEPATHS.requestHistory}`,
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
    ? typeof (parsedBody.recors) === "string" 
      ? parsedBody.records === "all" 
        ? -1 
        : parseInt(parsedBody.records) 
          ? parseInt(parsedBody.records)
          : 20
      : Number.isInteger(parsedBody.records) 
        ? parsedBody.records 
        : 20 
    : 20

  gu(lines).then((dat) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("[" + dat.slice(0, -2) + "]");
  });
  console.log(`odczyt historii`);
}

function handleConfigEdit(SETTINGS, parsedBody, req, res, setEd) {

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

function handleConfigGet(SETTINGS, parsedBody, req, res, setEd) {

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

function handleGetMocksUrl(SETTINGS, parsedBody, req, res, setEd) {
  setEd.getMocks();
  result = {};
  Object.keys(SETTINGS.mocks).map(function (key, inx) {
    result[key] = SETTINGS.mocks[key].active;
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}

function handleEditMocksUrl(SETTINGS, parsedBody, req, res, setEd) {
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
  setEd.getMocks();
  for (const endp of Object.keys(SETTINGS.mocks)) {
    if (!(parsedBody.visibility[endp] === undefined)) {
      SETTINGS.mocks[endp].active = !!parsedBody.visibility[endp];
    }
  }
  fs.writeFileSync(
    `${SETTINGS.dir}${SETTINGS.FILEPATHS.mockListFile}`,
    JSON.stringify(SETTINGS.mocks)
  );
  setEd.getMocks();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end("OK");
}
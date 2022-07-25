/* eslint-disable getlabel/getlabel */
const http = require("http");
const url = require("url");
const httpProxy = require("http-proxy");
const colors = require("colors"); // eslint-disable-line
const jsonColoriser = require("./json-coloriser");
const fs = require("fs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const readLastLines = require("read-last-lines");
const readline = require("readline");
const stream = require("stream");

const SETTINGS = JSON.parse(
  fs.readFileSync("scripts/config/default/config.json", { encoding: "utf8" })
);

if (process.env.CONFIG_PATH) {
  try {
    const setts = JSON.parse(
      fs.readFileSync(`${process.env.CONFIG_PATH}`, { encoding: "utf8" })
    );
    Object.keys(setts).map((key1) => {
      try {
        Object.keys(setts[key1]).map((key2) => {
          SETTINGS[key1][key2] = setts[key1][key2];
        });
      } catch {}
    });
  } catch {}
}

function mapActiveProxyName(proxy = SETTINGS.PROXIES.DEFAULT) {
  if (proxy === SETTINGS.PROXIES.URANUS) {
    return "URANUS";
  }

  if (proxy === SETTINGS.PROXIES.C4) {
    return "IFDC4.DEVEL";
  }

  return proxy;
}

function getMocks() {
  SETTINGS["mocks"] = JSON.parse(
    fs.readFileSync(`${__dirname}${SETTINGS.FILEPATHS.mockListFile}`)
  );
}

if (process.env.TECH_PORT) {
  SETTINGS.CONFIG.technicalPort = process.env.TECH_PORT;
}

if (process.env.PROXY_PORT) {
  SETTINGS.CONFIG.port = process.env.PROXY_PORT;
}

if (process.env.PROXY_APP_PORT) {
  SETTINGS.CONFIG.appPort = process.env.PROXY_APP_PORT;
}

if (process.env.PROXY_LOCAL !== undefined) {
  SETTINGS.CONFIG.seeLocal = !!process.env.PROXY_LOCAL;
}

SETTINGS.PROXIES.DEFAULT = Object.keys(SETTINGS.PROXIES)[0];

SETTINGS.CONFIG["active"] =
  SETTINGS.PROXIES[(process.env.PROXY_TARGET || "").toUpperCase()] ||
  SETTINGS.PROXIES.DEFAULT;

SETTINGS["reserved"] = Object.keys(SETTINGS.RESERVED_ENDPOINTS).map((key) => {
  return (
    SETTINGS.CONFIG.serveTechnical.slice(0, -1) +
    SETTINGS.RESERVED_ENDPOINTS[key]
  );
});

getMocks();

SETTINGS.activeName = mapActiveProxyName(SETTINGS.CONFIG.active);

/* -------------------------------------------------------------------------- */

function delimiterFunc() {
  console.log(
    "********************************************************************************"
      .white
  );
}
/* handlowanie mocków*/

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

function handleMocks(parsedUrl, res, req) {
  for (const key of Object.keys(SETTINGS.mocks)) {
    if (!parsedUrl.pathname.endsWith(key) || !SETTINGS.mocks[key].active) {
      continue;
    }

    console.log(`Serwuję odpowiedź z cache: ${parsedUrl.pathname}`);
    fs.promises
      .readFile(`${__dirname}/proxy-mocks/${SETTINGS.mocks[key].file}`, "utf8")
      .then((data) => {
        res["resBod"] = {
          isJSON: true,
          content: JSON.parse(data),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
      })
      .catch((err) => {
        console.log(err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end();
      });
    break;
  }
}

/* funkcje obsługujące zarezerwowane endpointy */

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
  if (parsedBody.id) {
    searchStream(
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
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(readAims()));
}

function handleAvailableMocks(parsedBody, req, res) {
  getMocks();
  result = {};
  Object.keys(SETTINGS.mocks).map(function(key, inx) {
    result[key] = SETTINGS.mocks[key].active;
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}

function handleEditMockVisibility(parsedBody, req, res) {
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

/* mapa endpoint: funkcja */

SETTINGS["reservedHandlerMap"] = {};

SETTINGS.reservedHandlerMap[
  SETTINGS.RESERVED_ENDPOINTS.setMocksUrl
] = handleSetMocksUrl;
SETTINGS.reservedHandlerMap[
  SETTINGS.RESERVED_ENDPOINTS.getHistory
] = handleGetHistory;
SETTINGS.reservedHandlerMap[
  SETTINGS.RESERVED_ENDPOINTS.configGet
] = handleConfigGet;
SETTINGS.reservedHandlerMap[
  SETTINGS.RESERVED_ENDPOINTS.configEdit
] = handleConfigEdit;
SETTINGS.reservedHandlerMap[
  SETTINGS.RESERVED_ENDPOINTS.getMocksUrl
] = handleAvailableMocks;
SETTINGS.reservedHandlerMap[
  SETTINGS.RESERVED_ENDPOINTS.editMocksUrl
] = handleEditMockVisibility;

currentMarks = {};

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

function getAvailableMocks() {
  getMocks();
  res = {};
  Object.keys(SETTINGS.mocks).map(function(key, inx) {
    res[key] = SETTINGS.mocks[key].active;
  });
}

function readAims() {
  var curr = SETTINGS.CONFIG.active;
  for (const w in SETTINGS.PROXIES) {
    if (SETTINGS.PROXIES[w] === curr) {
      curr = w;
      break;
    }
  }

  ava = SETTINGS.PROXIES;
  delete ava.DEFAULT;
  data = {
    current: curr,
    available: ava,
  };
  return data;
}

function addToHistory(mark) {
  block = JSON.stringify(currentMarks[mark]) + ",\n";
  fs.appendFile(
    `${__dirname}${SETTINGS.FILEPATHS.requestHistory}`,
    block,
    function(err) {
      if (err) throw err;
    }
  );
}

function checkIfDone(mark) {
  if (currentMarks[mark].gotReq && currentMarks[mark].gotRes) {
    delete currentMarks[mark].gotReq;
    delete currentMarks[mark].gotRes;
    if (
      !(currentMarks[mark]["reply"] === undefined) &&
      !(currentMarks[mark]["request"] === undefined)
    ) {
      addToHistory(mark);
    }
    delete currentMarks[mark];
  }
}

function updateMocks(url, file) {
  SETTINGS.mocks[url] = { file: file, active: true };
  fs.writeFileSync(
    `${__dirname}${SETTINGS.FILEPATHS.mockListFile}`,
    JSON.stringify(SETTINGS.mocks)
  );
  getMocks();
}

function checkAim(aim) {
  if (!(aim === "DEFAULT") && !(SETTINGS.PROXIES[aim] === undefined)) {
    return true;
  }
  return false;
}

console.log(`
 _____    _____     ____   __   __ __     __
|  __ \\  |  __ \\   / __ \\  \\ \\ / / \\ \\   / /
| |__) | | |__) | | |  | |  \\ V /   \\ \\_/ / 
|  ___/  |  _  /  | |  | |   > <     \\   /  
| |      | | \\ \\  | |__| |  / . \\     | |   
|_|      |_|  \\_\\  \\____/  /_/ \\_\\    |_|  
`);

var proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  secure: false,
  ws: true,
});

console.log(
  "Uruchamiam proxy celujące w backend:",
  SETTINGS.CONFIG.active.bgCyan,
  `(${SETTINGS.activeName})`
);

// if (!process.env.PROXY_PORT) {
// 	console.log(
// 		'Psst! Możesz ustawić port, na którym będzie nasłuchiwać proxy przy pomocy zmiennej PROXY_PORT, np.'
// 			.blue,
// 		'\nPROXY_PORT=3456 yarn proxy\n'.green,
// 	);
// }

// if (!process.env.PROXY_TARGET) {
// 	console.log(
// 		'Psst! Możesz ustawić endpoint proxy przy pomocy zmiennej PROXY_TARGET'.blue,
// 		'\nPROXY_TARGET=marek yarn run proxy'.green,
// 	);
// 	console.log(
// 		`Dostępne backendy:\n${Object.keys(PROXIES)
// 			.map((p) => `${p} (${PROXIES[p]})`)
// 			.join(' ')}\n`,
// 	);
// }

// if (!process.env.PROXY_APP_PORT) {
// 	console.log(
// 		'Psst! Możesz ustawić źródłową aplikcję, która będzie serwowana przez proxy przy pomocy zmiennej PROXY_APP_PORT'
// 			.blue,
// 		'\nPROXY_APP_PORT=3001 yarn run proxy\n'.green,
// 	);
// }

// if (!process.env.PROXY_LOCAL) {
// 	console.log(
// 		'Psst! Możesz zobaczyć lokalne requesty prze ustawienie zmiennej PROXY_LOCAL'.blue,
// 		'\nPROXY_LOCAL=true yarn run proxy\n'.green,
// 	);
// }

proxy.on("error", function(err, req, res) {
  if (res && !res.writeHead && !res.end) {
    res.writeHead(502, {
      "Content-Type": "text/plain",
    });
    res.end(`Something went wrong. \nErrorStack -> \n${err.stack}`);
  } else {
    console.error(`Proxy error: ${err}`);
  }
});

proxy.on("proxyReq", function(proxyReq, req, res, options) {
  // Preflight request
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      `http://localhost:${SETTINGS.CONFIG.appPort}`
    );
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Credentials"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.writeHead(200);
    res.end();
  }
});

proxy.on("proxyRes", function(proxyRes, req, res) {
  // ignore local sockjs requests from logging
  if (req.url.startsWith("/sockjs-node/")) return;

  // Preflight request - print na console, fyi only
  if (req.method === "OPTIONS") {
    console.log(`OPTIONS CALL -> ${req.url}`.yellow);
  }

  if (req.method === "POST") {
    let resBody = [];
    proxyRes
      .on("error", (err) => {
        delimiterFunc();
        console.error(err);
        delimiterFunc();
      })
      .on("data", (chunk) => {
        resBody.push(chunk);
      })
      .on("end", () => {
        resBody = Buffer.concat(resBody).toString();
        let parsedBody = null;

        delimiterFunc();
        if (resBody) {
          try {
            parsedBody = JSON.parse(resBody, null, 2);
          } catch (e) {
            console.log("Response is not JSON:\n", resBody);
            res["resBod"] = { isJSON: false, content: resBody };
          }
        }

        if (parsedBody) {
          console.log(
            `Response for: ` +
              req.url.magenta +
              `\nDate: ` +
              new Date().toString().cyan
          );
          console.log(jsonColoriser.getColoredString(parsedBody));
          res["resBod"] = { isJSON: true, content: parsedBody };
        }

        delimiterFunc();
      });
  }
});

var server = http.createServer(function(req, res) {
  var parsedUrl = url.parse(req.url, true);

  let reqBody = [];

  var toTech =
    (server.address().address === "127.0.0.1"
      ? req.headers.referer ===
        `http://localhost:${server.address().port}${
          SETTINGS.CONFIG.serveTechnical
        }`
      : false) ||
    req.headers.referer ===
      `http://${server.address().address}:${server.address().port}${
        SETTINGS.CONFIG.serveTechnical
      }` ||
    parsedUrl.path === SETTINGS.CONFIG.serveTechnical;

  res["mark"] = uuidv4();
  req["mark"] = res["mark"];
  currentMarks[req.mark] = { gotReq: false, gotRes: false, id: res.mark };

  req
    .on("error", (err) => {
      delimiterFunc();
      console.error(err);
      delimiterFunc();
    })
    .on("data", (chunk) => {
      reqBody.push(chunk);
    })
    .on("end", () => {
      reqBody = Buffer.concat(reqBody).toString();
      let parsedBody = null;

      if (reqBody) {
        try {
          parsedBody = JSON.parse(reqBody);
        } catch (e) {
          console.error(e);
          parsedBody = null;
        }
      }

      var item = {
        from: req.connection.remoteAddress,
        url: parsedUrl.pathname,
        date: new Date().toString(),
      };

      printMessage =
        "Request from: " +
        req.connection.remoteAddress.cyan +
        "\nURL: " +
        parsedUrl.pathname.magenta +
        "\nDate: " +
        new Date().toString().cyan;

      if (parsedBody) {
        printMessage +=
          "\nRequest:" + "\n" + jsonColoriser.getColoredString(parsedBody);
        item["body"] = parsedBody;
      }

      if (parsedBody || SETTINGS.CONFIG.seeLocal) {
        delimiterFunc();
        console.log(printMessage);
        delimiterFunc();
      }

      currentMarks[req.mark]["request"] = item;

      if (
        SETTINGS.reservedHandlerMap[
          parsedUrl.path.replace(SETTINGS.CONFIG.serveTechnical, "/")
        ] &&
        toTech
      ) {
        SETTINGS.reservedHandlerMap[
          parsedUrl.path.replace(SETTINGS.CONFIG.serveTechnical, "/")
        ](parsedBody, req, res);
      }

      if (SETTINGS.CONFIG.mocksEnabled) {
        handleMocks(parsedUrl, res, req);
      }

      currentMarks[req.mark].gotReq = true;
      checkIfDone(req.mark);
    });

  res.on("finish", () => {
    try {
      currentMarks[res.mark]["reply"] = {};
      currentMarks[res.mark]["reply"]["date"] = new Date().toString();
      currentMarks[res.mark]["reply"]["status"] = res.statusCode;
      try {
        currentMarks[res.mark]["reply"]["body"] = res["resBod"];
      } catch {}
      currentMarks[res.mark].gotRes = true;
      checkIfDone(res.mark);
    } catch {}
  });

  const reserved = SETTINGS.reserved
    .concat(SETTINGS.CONFIG.mocksEnabled ? Object.keys(SETTINGS.mocks) : [])
    .some((path) => parsedUrl.pathname === path);

  if (reserved) {
    return;
  }

  if (toTech) {
    return proxy.web(req, res, {
      target: `http://localhost:${SETTINGS.CONFIG.technicalPort}`,
    });
  }

  if (req.url.startsWith("/static/config/")) {
    const target = SETTINGS.CONFIG.active.replace(/api$/, "");
    return proxy.web(req, res, { target });
  }

  const isPathToApi = SETTINGS.CONFIG.paths.some((apiPath) =>
    parsedUrl.pathname.startsWith(apiPath)
  );
  if (isPathToApi) {
    delimiterFunc();
    console.log(
      "Proxied request final URL:",
      SETTINGS.CONFIG.active.cyan + parsedUrl.pathname.cyan
    );
    return proxy.web(req, res, { target: SETTINGS.CONFIG.active });
  } else {
    if (SETTINGS.CONFIG.seeLocal) {
      console.log("Local request".cyan);
    }

    return proxy.web(req, res, {
      target: `http://localhost:${SETTINGS.CONFIG.appPort}`,
    });
  }
});

server.on("upgrade", function(req, socket, head) {
  proxy.ws(req, socket, head, {
    target: `ws://localhost:${SETTINGS.CONFIG.appPort}`,
  });
});

server.listen(SETTINGS.CONFIG.port, "localhost", function() {
  const addr = server.address();
  console.log(
    "Adres aplikacji (webpacka):",
    `http://localhost:${SETTINGS.CONFIG.appPort}`.cyan
  );
  console.log(
    "Proxy nasłuchuje na:",
    `http://${addr.address}:${addr.port} ${addr.address === "127.0.0.1" &&
      `(http://c4.localhost:${addr.port})`.black.bgYellow}`.cyan
  );
});

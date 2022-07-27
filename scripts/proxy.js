/* eslint-disable getlabel/getlabel */
const http = require("http");
const url = require("url");
const httpProxy = require("http-proxy");
const colors = require("colors"); // eslint-disable-line
const jsonColoriser = require("./json-coloriser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const helper = require(`./proxy_functions/helperFunctions.js`)

const setter = require("./proxy_functions/makeSettings.js");

const SETTINGS = setter.makeSettings(__dirname)

/* -------------------------------------------------------------------------- */

function delimiterFunc() {
  console.log(
    "********************************************************************************"
      .white
  );
}

function getMocks() {
  SETTINGS["mocks"] = JSON.parse(
      fs.readFileSync(`${SETTINGS.dir}${SETTINGS.FILEPATHS.mockListFile}`)
  );
}

function updateMocks(url, file) {
  SETTINGS.mocks[url] = { file: file, active: true };
  fs.writeFileSync(
      `${SETTINGS.dir}${SETTINGS.FILEPATHS.mockListFile}`,
      JSON.stringify(SETTINGS.mocks)
  );
  getMocks();
}

/* -------------------------------------------------------------------------- */

function handleMocks(parsedUrl, res, req) {
  for (const key of Object.keys(SETTINGS.mocks)) {
    if (!parsedUrl.pathname.endsWith(key) || !SETTINGS.mocks[key].active) {
      continue;
    }

    console.log(`Serwuję odpowiedź z cache: ${parsedUrl.pathname}`);
    fs.promises
      .readFile(`${SETTINGS.dir}/proxy-mocks/${SETTINGS.mocks[key].file}`, "utf8")
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

currentMarks = {};

function addToHistory(mark) {
  block = JSON.stringify(currentMarks[mark]) + ",\n";
  fs.appendFile(
    `${SETTINGS.dir}${SETTINGS.FILEPATHS.requestHistory}`,
    block,
    function (err) {
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
  `(${helper.getActiveName(SETTINGS)})`
);

proxy.on("error", function (err, req, res) {
  if (res && !res.writeHead && !res.end) {
    res.writeHead(502, {
      "Content-Type": "text/plain",
    });
    res.end(`Something went wrong. \nErrorStack -> \n${err.stack}`);
  } else {
    console.error(`Proxy error: ${err}`);
  }
});

proxy.on("proxyReq", function (proxyReq, req, res, options) {
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

proxy.on("proxyRes", function (proxyRes, req, res) {
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

var server = http.createServer(function (req, res) {
  var parsedUrl = url.parse(req.url, true);

  let reqBody = [];

  var toTech =
    (server.address().address === "127.0.0.1"
      ? req.headers.referer ===
      `http://localhost:${server.address().port}${SETTINGS.CONFIG.serveTechnical
      }`
      : false) ||
    req.headers.referer ===
    `http://${server.address().address}:${server.address().port}${SETTINGS.CONFIG.serveTechnical
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
        ](SETTINGS, parsedBody, req, res, {"getMocks": getMocks, "updateMocks": updateMocks});
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
      } catch { }
      currentMarks[res.mark].gotRes = true;
      checkIfDone(res.mark);
    } catch { }
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
    const target = SETTINGS.PROXIES[SETTINGS.CONFIG.active].replace(/api$/, "");
    return proxy.web(req, res, { target });
  }

  const isPathToApi = SETTINGS.CONFIG.paths.some((apiPath) =>
    parsedUrl.pathname.startsWith(apiPath)
  );
  if (isPathToApi) {
    delimiterFunc();
    console.log(
      "Proxied request final URL:",
      SETTINGS.PROXIES[SETTINGS.CONFIG.active].cyan + parsedUrl.pathname.cyan
    );
    return proxy.web(req, res, { target: SETTINGS.PROXIES[SETTINGS.CONFIG.active] });
  } else {
    if (SETTINGS.CONFIG.seeLocal) {
      console.log("Local request".cyan);
    }

    return proxy.web(req, res, {
      target: `http://localhost:${SETTINGS.CONFIG.appPort}`,
    });
  }
});

server.on("upgrade", function (req, socket, head) {
  proxy.ws(req, socket, head, {
    target: `ws://localhost:${SETTINGS.CONFIG.appPort}`,
  });
});

server.listen(SETTINGS.CONFIG.port, "localhost", function () {
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

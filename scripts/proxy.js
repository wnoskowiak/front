/* eslint-disable getlabel/getlabel */
const http = require('http');
const url = require('url');
const httpProxy = require('http-proxy');
const colors = require('colors'); // eslint-disable-line
const jsonColoriser = require('./json-coloriser');
const fs = require("fs");
const crypto = require('crypto')

const PROXIES = {
	URANUS: 'http://uranus.devel.softax.local:6605/',
	C4: 'http://127.0.0.1:5000',
};

PROXIES.DEFAULT = PROXIES.C4;

const SETTINGS = {
	// port for proxy
	port: process.env.PROXY_PORT || 3025,
	// port for React application (localhost)
	appPort: process.env.PROXY_APP_PORT || 3000,
	// which proxy from PROXIES structure should be active
	target: process.env.PROXY_TARGET,
	// log requests made to React app
	seeLocal: !!process.env.PROXY_LOCAL,

	// urls prefixed with these will be proxied
	paths: ['/api/', '/set_mocks/', '/history/', '/change_aim/', '/aims/'],
	// derived from .target
	active: PROXIES[(process.env.PROXY_TARGET || '').toUpperCase()] || PROXIES.DEFAULT,

	configGet: '/aims/',

	configEdit: '/change_aim/',

	requestHistory: '/history/history.json',

	setMocksUrl: '/set_mocks/',

	getHistory: '/history/',

	mockFilesPath: '/proxy-mocks/',

	mockListFile: '/proxy-mocks/mocks/mocks.json',

	// use mocks from /scripts/proxy-mocks
	mocksEnabled: true,

	mocks: []
};

var currentMarks = {}

function getMocks() {
	SETTINGS.mocks = JSON.parse(fs.readFileSync(`${__dirname}${SETTINGS.mockListFile}`))
}

getMocks()

SETTINGS.activeName = mapActiveProxyName(SETTINGS.active);

function mapActiveProxyName(proxy = PROXIES.DEFAULT) {
	if (proxy === PROXIES.URANUS) {
		return 'URANUS';
	}

	if (proxy === PROXIES.C4) {
		return 'IFDC4.DEVEL';
	}

	return proxy;
}

/* -------------------------------------------------------------------------- */

function delimiterFunc() {
	console.log(
		'********************************************************************************'.white,
	);
}

function readHistory() {
	data = fs.readFileSync(`${__dirname}${SETTINGS.requestHistory}`, 'utf8')
	return "[" + data.slice(0, -1) + "]"
}

function readAims() {
	data = PROXIES
	return data
}

function addToHistory(mark) {
	block = JSON.stringify(currentMarks[mark]) + ','
	fs.appendFile(`${__dirname}${SETTINGS.requestHistory}`, block, function (err) {
		if (err) throw err
	})
}

function checkIfDone(mark) {
	if (currentMarks[mark].gotReq && currentMarks[mark].gotRes) {
		delete currentMarks[mark].gotReq
		delete currentMarks[mark].gotRes
		if (!(currentMarks[mark]["reply"] === undefined) && !(currentMarks[mark]["request"] === undefined)) {
			addToHistory(mark)
		}
		delete currentMarks[mark]
	}
}

function updateMocks(url, file) {
	SETTINGS.mocks[url] = file
	fs.writeFileSync(`${__dirname}${SETTINGS.mockListFile}`, JSON.stringify(SETTINGS.mocks),)
	getMocks()
}

function checkPath(str) {
	return /^[a-zA-Z0-9_.-/]*$/.test(str)
}

function checkData(data) {
	if (data["url"] === undefined) {
		return false
	}
	if (!checkPath(data["url"])) {
		return false
	}
	return true
}

function checkAim(aim) {
	if (!(aim==='DEFAULT') && !(PROXIES[aim] === undefined)) {
		return true
	}
	return false
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

console.log('Uruchamiam proxy celujące w backend:', SETTINGS.active.bgCyan, `(${SETTINGS.activeName})`);

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

proxy.on('error', function (err, req, res) {
	if (res && !res.writeHead && !res.end) {
		res.writeHead(502, {
			'Content-Type': 'text/plain',
		});
		res.end(`Something went wrong. \nErrorStack -> \n${err.stack}`);
	} else {
		console.error(`Proxy error: ${err}`);
	}
});

proxy.on('proxyReq', function (proxyReq, req, res, options) {
	// Preflight request
	if (req.method === 'OPTIONS') {
		res.setHeader('Access-Control-Allow-Origin', `http://localhost:${SETTINGS.appPort}`);
		res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Credentials',
		);
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		res.writeHead(200);
		res.end();
	}
});

proxy.on('proxyRes', function (proxyRes, req, res) {
	// ignore local sockjs requests from logging
	if (req.url.startsWith('/sockjs-node/')) return;

	// Preflight request - print na console, fyi only
	if (req.method === 'OPTIONS') {
		console.log(`OPTIONS CALL -> ${req.url}`.yellow);
	}

	if (req.method === 'POST') {
		let resBody = [];
		proxyRes
			.on('error', (err) => {
				delimiterFunc();
				console.error(err);
				delimiterFunc();
			})
			.on('data', (chunk) => {
				resBody.push(chunk);
			})
			.on('end', () => {
				resBody = Buffer.concat(resBody).toString();
				let parsedBody = null;

				delimiterFunc();
				if (resBody) {
					try {
						parsedBody = JSON.parse(resBody, null, 2);
					} catch (e) {
						console.log('Response is not JSON:\n', resBody);
						res['resBod'] = { "isJSON": false, "content": resBody }
					}
				}

				if (parsedBody) {
					console.log(`Response for: ` + req.url.magenta + `\nDate: ` + new Date().toString().cyan);
					console.log(jsonColoriser.getColoredString(parsedBody));
					res['resBod'] = { "isJSON": true, "content": parsedBody }
				}

				delimiterFunc();
			});
	}
});

var server = http.createServer(function (req, res) {

	var parsedUrl = url.parse(req.url, true);

	let reqBody = [];

	res['markOfSatan'] = crypto.createHash('sha1').update(Date.now().toString()).digest('hex')
	req['markOfSatan'] = res['markOfSatan']
	currentMarks[req.markOfSatan] = { gotReq: false, gotRes: false }

	req
		.on('error', (err) => {
			delimiterFunc();
			console.error(err);
			delimiterFunc();
		})
		.on('data', (chunk) => {
			reqBody.push(chunk);
		})
		.on('end', () => {
			reqBody = Buffer.concat(reqBody).toString();
			let parsedBody = null;

			if (reqBody) {
				try {
					parsedBody = JSON.parse(reqBody);
				} catch (e) {
					console.error(e);
					console.log(reqBody);
					parsedBody = null
				}
			}

			var item = {
				"from": req.connection.remoteAddress,
				"url": parsedUrl.pathname,
				"date": new Date().toString()
			}

			printMessage = 'Request from: ' +
				req.connection.remoteAddress.cyan +
				'\nURL: ' +
				parsedUrl.pathname.magenta +
				'\nDate: ' +
				new Date().toString().cyan


			if (parsedBody) {
				printMessage += '\nRequest:' + '\n' + jsonColoriser.getColoredString(parsedBody)
				item['body'] = parsedBody
				currentMarks[req.markOfSatan]["request"] = item
				delimiterFunc();
				console.log(printMessage);
				delimiterFunc();
				if (parsedUrl.path.endsWith(SETTINGS.setMocksUrl)) {
					try {
						if (req.method === 'POST' && checkData(parsedBody)) {
							fileName = crypto.createHash('sha1').update(parsedBody['url']).digest('hex') + ".json";
							fs.writeFile(`${__dirname}/${SETTINGS.mockFilesPath}/${fileName}`, JSON.stringify(parsedBody['content']), (err) => {
								if (err) {
									throw err;
								}
							}
							)
							updateMocks(parsedBody['url'], fileName)
							res.writeHead(200, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ "response": "OK" }));
						}
						else { throw e }
					}
					catch {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ "response": "coś-nie-wyszło" }));
					}

				}
				if (parsedUrl.path.endsWith(SETTINGS.configEdit)) {
					console.log(parsedBody)
					if (checkAim(parsedBody['aim'])){
						PROXIES.DEFAULT = parsedBody.aim
						res.writeHead(200, { 'Content-Type': 'application/json' });
					}
					else {
						res.writeHead(400, { 'Content-Type': 'application/json' });
					}
					res.end()
				}
			}
			else {
				if (SETTINGS.seeLocal) {
					currentMarks[req.markOfSatan]["request"] = item
					delimiterFunc();
					console.log(printMessage);
					delimiterFunc();
				}
			}
			currentMarks[req.markOfSatan].gotReq = true
			checkIfDone(req.markOfSatan)
		});


	res.on('finish', () => {
		try {
			currentMarks[res.markOfSatan]["reply"] = {}
			currentMarks[res.markOfSatan]["reply"]["date"] = new Date().toString()
			currentMarks[res.markOfSatan]["reply"]["status"] = res.statusCode
			try { currentMarks[res.markOfSatan]["reply"]["body"] = res['resBod'] }
			catch { }
			currentMarks[res.markOfSatan].gotRes = true
			checkIfDone(res.markOfSatan)
		}
		catch { }
	})

	// TODO jeden potencjalny problem -- to loguje informację o proxy PRZED informacją o requeście
	if (SETTINGS.mocksEnabled) {
		// obsługa serwowania mocków z plików
		for (const key of Object.keys(SETTINGS.mocks)) {
			mock = {
				url: key,
				file: SETTINGS.mocks[key]
			}
			if (!req.url.endsWith(mock.url)) {
				continue;
			}

			try {
				const data = fs.readFileSync(`${__dirname}/proxy-mocks/${mock.file}`);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res["resBod"] = {
					"isJSON": true,
					"content": JSON.parse(data)
				}
				res.end(data);
				console.log(`Serwuję odpowiedź z cache: ${req.url}`);

				return;

			} catch (err) {
				// pass
			}
		}
	}

	if (req.url.endsWith(SETTINGS.configGet)) {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(readAims()));
		console.log(`pobrano dostępne cele`);
	}

	if (req.url.endsWith(SETTINGS.getHistory)) {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(readHistory());
		console.log(`odczyt historii`);
	}

	// proxy dla bezpośredniego serwowania statycznych plików na IAN-ie
	if (req.url.startsWith('/static/config/')) {
		const target = SETTINGS.active.replace(/api$/, '');
		return proxy.web(req, res, { target });
	}

	const isPathToApi = SETTINGS.paths.some(apiPath => parsedUrl.pathname.startsWith(apiPath));
	if (isPathToApi) {
		if (!(parsedUrl.pathname.startsWith(SETTINGS.setMocksUrl)) && !(parsedUrl.pathname.startsWith(SETTINGS.getHistory))
		 && !(parsedUrl.pathname.startsWith(SETTINGS.configGet))&& !(parsedUrl.pathname.startsWith(SETTINGS.configEdit))) {
			delimiterFunc();
			console.log('Proxied request final URL:', SETTINGS.active.cyan + parsedUrl.pathname.cyan);
			return proxy.web(req, res, { target: SETTINGS.active });
		}
	} else {
		if (SETTINGS.seeLocal) {
			console.log('Local request'.cyan);
		}

		return proxy.web(req, res, {
			target: `http://localhost:${SETTINGS.appPort}`,
		});
	}


});

server.on('upgrade', function (req, socket, head) {
	proxy.ws(req, socket, head, {
		target: `ws://localhost:${SETTINGS.appPort}`,
	});
});

server.listen(SETTINGS.port, 'localhost', function () {
	const addr = server.address();
	console.log('Adres aplikacji (webpacka):', `http://localhost:${SETTINGS.appPort}`.cyan);
	console.log(
		'Proxy nasłuchuje na:',
		`http://${addr.address}:${addr.port} ${addr.address === '127.0.0.1' && `(http://c4.localhost:${addr.port})`.black.bgYellow
			}`.cyan,
	);
});

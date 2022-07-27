const fs = require("fs");

module.exports = {
    makeSettings
};

function makeSettings(dir) {

    function loadCustomSettings() {
        try {
            const setts = JSON.parse(
                fs.readFileSync(`${process.env.CONFIG_PATH}`, { encoding: "utf8" })
            );
            Object.keys(setts).map((key1) => {
                try {
                    Object.keys(setts[key1]).map((key2) => {
                        if (SETTINGS[key1][key2] !== undefined) {
                            SETTINGS[key1][key2] = setts[key1][key2];
                        }
                    });
                } catch { }
            });
        } catch { }
    }

    envMap = {
        "TECH_PORT": "technicalPort",
        "PROXY_PORT": "port",
        "PROXY_APP_PORT": "appPort",
        "PROXY_LOCAL": "seeLocal"
    }

    const SETTINGS = JSON.parse(
        fs.readFileSync(`${dir}/config/default/config.json`, { encoding: "utf8" })
    );

    SETTINGS["dir"] = dir

    if (process.env.CONFIG_PATH) {
        loadCustomSettings()
    }

    Object.keys(envMap).map((key) => {
        if (process.env[key] !== undefined) {
            SETTINGS.CONFIG[envMap[key]] = process.env[key]
        }
    })

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

    SETTINGS["mocks"] = JSON.parse(
        fs.readFileSync(`${dir}${SETTINGS.FILEPATHS.mockListFile}`)
    );

    const handlers = require(`${dir}/proxy_functions/proxyHandlers.js`);

    SETTINGS["reservedHandlerMap"] = {};

    Object.keys(SETTINGS.RESERVED_ENDPOINTS).map((key) => {
        SETTINGS.reservedHandlerMap[SETTINGS.RESERVED_ENDPOINTS[key]] = handlers["handle" + key.charAt(0).toUpperCase() + key.slice(1)]
    })

    return SETTINGS
}

/* eslint-disable react-hooks/rules-of-hooks */

const chalk = require("chalk"); // using 2.4.2

const colors = {
  num: "#B4CDA7",
  str: "#CD9077",
  bool: "#579BD5",
  regex: "red",
  undef: "red",
  null: "#579BD5",
  attr: "#9BDBFE",
  quot: "#D6B87C",
  punc: "#D3D3D3",
  brack: "#D3D3D3",
};
const level = {
  show: false,
  char: ".",
  color: "red",
  spaces: 2,
  start: 0,
};
const params = {
  colored: true,
  async: false,
  lintable: false,
};

// json-stringify-safe@5.0.1 https://www.npmjs.com/package/json-stringify-safe
function stringify(obj, replacer, spaces, cycleReplacer) {
  return JSON.stringify(obj, getSerialize(replacer, cycleReplacer), spaces);
}

function getSerialize(replacer, cycleReplacer) {
  var stack = [],
    keys = [];

  if (cycleReplacer == null)
    cycleReplacer = function (key, value) {
      if (stack[0] === value) return "[Circular ~]";
      return (
        "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]"
      );
    };

  return function (key, value) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this);
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
      if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
    } else stack.push(value);

    return replacer == null ? value : replacer.call(this, key, value);
  };
}

// jsome@2.5.0 https://www.npmjs.com/package/jsome
function generatorConstructor() {
  var jsomeRef;

  function getType(value) {
    var map = {
      "[object Number]": "num",
      "[object String]": "str",
      "[object Boolean]": "bool",
      "[object RegExp]": "regex",
      "[object Function]": "func",
      null: "null",
      undefined: "undef",
    };

    return map[toString.call(value)] || map["" + value];
  }

  function repeat(str, times) {
    return Array(times ? times + 1 : 0).join(str);
  }

  function cleanObject(obj) {
    var lastKey = "";
    for (var key in obj) {
      (getType(obj[key]) === "func" && delete obj[key]) || (lastKey = key);
    }
    return lastKey;
  }

  function cleanArray(arr) {
    return arr.filter(function (item) {
      return getType(item) !== "func";
    });
  }

  function generateLevel(level) {
    var levelStr = repeat(" ", jsomeRef.level.spaces),
      opts = jsomeRef.level;

    if (jsomeRef.level.show && levelStr.length) {
      levelStr = levelStr.replace(" ", useColorProvider(opts.char, opts.color));
    }

    return repeat(levelStr, level);
  }

  function hasChild(obj) {
    for (var key in obj) {
      if (isArray(obj[key]) || isObject(obj[key])) return true;
    }
  }

  function isArray(arr) {
    return toString.call(arr).match(/^\[object Array\]$/);
  }

  function isObject(obj) {
    return toString.call(obj).match(/^\[object Object\]$/);
  }

  function colorify(value, level) {
    var color = jsomeRef.colors[getType(value)];
    return (
      generateLevel(level) +
      (getType(value) === "str" ? colorifySpec('"', "quot") : "") +
      useColorProvider("" + value, color) +
      (getType(value) === "str" ? colorifySpec('"', "quot") : "")
    );
  }

  function colorifySpec(char, type, level) {
    var quote =
      jsomeRef.params.lintable && type === "attr"
        ? colorifySpec('"', "quot", 0)
        : "";
    return (
      generateLevel(level) +
      quote +
      useColorProvider("" + char, jsomeRef.colors[type]) +
      quote
    );
  }

  function useColorProvider(str, color) {
    if (jsomeRef.params.colored) {
      if (isArray(color)) {
        if (color.length) {
          return useColorProvider(chalk[color[0]](str), color.slice(1));
        } else {
          return str;
        }
      } else {
        if (color.startsWith("#")) {
          return chalk.hex(color)(str);
        }

        return chalk[color](str);
      }
    }

    return str;
  }

  return {
    gen: function (json, level, isChild) {
      var colored = [];
      level = level || 0;

      if (isObject(json)) {
        var lastKey = cleanObject(json);
        colored.push(colorifySpec("{", "brack", isChild ? 0 : level));
        level += 1;

        for (const key in json) {
          const result =
            colorifySpec(key, "attr", level) +
            colorifySpec(": ", "punc") +
            this.gen(json[key], level, true) +
            (key !== lastKey ? colorifySpec(",", "punc") : "");
          colored.push(result);
        }

        level -= 1;
        colored.push(colorifySpec("}", "brack", level));
      } else if (isArray(json)) {
        json = cleanArray(json);

        if (hasChild(json)) {
          const result = json.map(
            function (item) {
              return this.gen(item, level + 1);
            }.bind(this)
          );

          colored.push(colorifySpec("[", "brack", isChild ? 0 : level));
          colored.push(result.join(colorifySpec(", ", "punc") + "\n"));
          colored.push(colorifySpec("]", "brack", level));
        } else {
          var coloredArray = colorifySpec("[", "brack", isChild ? 0 : level);
          for (const key in json) {
            coloredArray +=
              colorify(json[key]) +
              (json.length - 1 > key ? colorifySpec(", ", "punc") : "");
          }
          colored.push(coloredArray + colorifySpec("]", "brack"));
        }
      } else {
        return generateLevel(isChild ? 0 : level) + colorify(json);
      }

      return colored.join("\n");
    },
    setJsomeRef: function (jsome) {
      jsomeRef = jsome;
      return this;
    },
  };
}

const generator = generatorConstructor();

module.exports = (function () {
  function jsome(json, callBack) {
    return jsome.parse(stringify(json), callBack);
  }

  jsome.colors = colors;
  jsome.level = level;
  jsome.params = params;

  generator.setJsomeRef(jsome);

  jsome.parse = function (jsonString, callBack) {
    var json = JSON.parse(jsonString);

    if (!jsome.params.async) {
      var output = generator.gen(json, jsome.level.start);
      if (Array.isArray(output)) {
        console.log.apply(console, output);
      } else {
        console.log(output);
      }
    } else {
      setTimeout(function () {
        console.log(generator.gen(json, jsome.level.start));
        callBack && callBack();
      });
    }

    return json;
  };

  jsome.getColoredString = function (jsonString, callBack) {
    var json = JSON.parse(stringify(jsonString));
    if (!jsome.params.async) {
      var output = generator.gen(json, jsome.level.start);
      return output;
    } else {
      setTimeout(function () {
        var output = generator.gen(json, jsome.level.start);
        callBack && callBack(output);
      });
    }
  };

  return jsome;
})();

// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        this
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"eGA2g":[function(require,module,exports) {
var _utils = require("./utils");
module.exports = async function(nodecg) {
    (0, _utils.storeNodeCG)(nodecg);
    const obs = require("986de127e0a6eba0");
    const obsu = new obs.OBSUtility(nodecg);
    return {
        obs: obsu
    };
};

},{"./utils":"8mEuU","986de127e0a6eba0":"8eYsy"}],"8mEuU":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "storeNodeCG", ()=>storeNodeCG);
parcelHelpers.export(exports, "getNodeCG", ()=>getNodeCG);
parcelHelpers.export(exports, "prefixName", ()=>prefixName);
parcelHelpers.export(exports, "Replicant", ()=>Replicant);
let nodecg;
function storeNodeCG(ncg) {
    nodecg = ncg;
}
function getNodeCG() {
    return nodecg;
}
function prefixName(prefix, name) {
    return prefix ? `${prefix}:${name}` : name;
}
function Replicant(name, args = {}) {
    return nodecg.Replicant(name, args);
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"9VN6q"}],"9VN6q":[function(require,module,exports) {
exports.interopDefault = function(a) {
    return a && a.__esModule ? a : {
        default: a
    };
};
exports.defineInteropFlag = function(a) {
    Object.defineProperty(a, "__esModule", {
        value: true
    });
};
exports.exportAll = function(source, dest) {
    Object.keys(source).forEach(function(key) {
        if (key === "default" || key === "__esModule" || dest.hasOwnProperty(key)) return;
        Object.defineProperty(dest, key, {
            enumerable: true,
            get: function() {
                return source[key];
            }
        });
    });
    return dest;
};
exports.export = function(dest, destName, get) {
    Object.defineProperty(dest, destName, {
        enumerable: true,
        get: get
    });
};

},{}],"8eYsy":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "NamespaceReplicant", ()=>NamespaceReplicant);
parcelHelpers.export(exports, "OBSUtility", ()=>OBSUtility);
var _objectSpread = require("@swc/helpers/_/_object_spread");
var _utils = require("./utils");
var _obsWebsocketJs = require("obs-websocket-js");
var _obsWebsocketJsDefault = parcelHelpers.interopDefault(_obsWebsocketJs);
var _path = require("path");
var _getCurrentLine = require("get-current-line");
var _getCurrentLineDefault = parcelHelpers.interopDefault(_getCurrentLine);
var _listeners = require("../common/listeners");
var $parcel$__dirname = require("a2f29e67e3d0030b").resolve(__dirname, "../src/extension");
function buildSchemaPath(schemaName) {
    return _path.resolve($parcel$__dirname, "../../schemas", `${encodeURIComponent(schemaName)}.json`);
}
function NamespaceReplicant(namespace, name, args = {}) {
    return (0, _utils.Replicant)((0, _utils.prefixName)(namespace, name), (0, _objectSpread._)({
        schemaPath: buildSchemaPath(name)
    }, args));
}
const usedNamespaces = new Set();
class OBSUtility extends (0, _obsWebsocketJsDefault.default) {
    _connectionListeners() {
        this.replicants.obsStatus.once("change", (newVal)=>{
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.connection === "connected" || newVal.connection === "connecting")) {
                this.replicants.obsStatus.value.connection = "connecting";
                this._connectToOBS().then().catch(()=>{
                    this.replicants.obsStatus.value.connection = "error";
                });
            }
        });
        this.nodecg.listenFor("DEBUG:callOBS", async (data, ack)=>{
            if (!data.name || !data.args) return this.ackError(ack, "No name or args", undefined);
            this.log.info("Called", data.name, "with", data.args);
            try {
                const res = await this.call(data.name, data.args);
                if (ack && !ack.handled) ack(undefined, res);
                this.log.info("Result:", res);
            } catch (err) {
                this.ackError(ack, `Error calling ${data.name}`, err);
            }
        });
        (0, _listeners.listenTo)("connect", (params, ack)=>{
            this._ignoreConnectionClosedEvents = false;
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = null;
            this.replicants.login.value = (0, _objectSpread._)({}, this.replicants.login.value, params);
            this._connectToOBS().then(()=>{
                if (ack && !ack.handled) ack();
            }).catch((err)=>{
                this.replicants.obsStatus.value.connection = "error";
                this.ackError(ack, `Failed to connect`, err);
            });
        }, this.namespace);
        (0, _listeners.listenTo)("disconnect", (_, ack)=>{
            this._ignoreConnectionClosedEvents = true;
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = null;
            this.replicants.obsStatus.value.connection = "disconnected";
            this.disconnect();
            this.log.info("Operator-requested disconnect.");
            if (ack && !ack.handled) ack();
        }, this.namespace);
        this.on("ConnectionClosed", this._reconnectToOBS);
        this.on("error", (e)=>{
            this.ackError(undefined, "", e);
            this._reconnectToOBS();
        });
        setInterval(()=>{
            var _this_socket, _this_socket1;
            if (this.replicants.obsStatus.value.connection === "connected" && ((_this_socket = this.socket) === null || _this_socket === void 0 ? void 0 : _this_socket.readyState) !== ((_this_socket1 = this.socket) === null || _this_socket1 === void 0 ? void 0 : _this_socket1.OPEN)) {
                this.log.warn("Thought we were connected, but the automatic poll detected we were not. Correcting.");
                clearInterval(this._reconnectInterval);
                this._reconnectInterval = null;
                this._reconnectToOBS();
            }
        }, 1000);
    }
    _connectToOBS() {
        const login = this.replicants.login.value;
        const status = this.replicants.obsStatus.value;
        if (status.connection === "connected") throw new Error("Attempted to connect to OBS while already connected!");
        status.connection = "connecting";
        return this.connect(login.ip, login.password).then(()=>{
            this.log.info("Connected");
            clearInterval(this._reconnectInterval);
            this._reconnectInterval = null;
            status.connection = "connected";
            // this.call("SetStudioModeEnabled", { studioModeEnabled: true });
            return this._fullUpdate();
        });
    }
    _reconnectToOBS() {
        if (this._reconnectInterval) return;
        const status = this.replicants.obsStatus.value;
        if (this._ignoreConnectionClosedEvents) {
            status.connection = "disconnected";
            return;
        }
        status.connection = "connecting";
        this.log.warn("Connection closed, will attempt to reconnect every 5 seconds.");
        // Retry, ignoring errors
        this._reconnectInterval = setInterval(()=>this._connectToOBS().catch(()=>{}), 5000);
    }
    _replicantListeners() {
        this.on("SceneListChanged", ({ scenes })=>this._updateSceneList(scenes));
        this.on("CurrentPreviewSceneChanged", (name)=>this._updateSceneItems(this.replicants.previewScene, name.sceneName));
        this.on("CurrentProgramSceneChanged", (name)=>this._updateSceneItems(this.replicants.programScene, name.sceneName));
        // Clear or set preview on studio mode set or unset
        this.on("StudioModeStateChanged", ({ studioModeEnabled })=>{
            this.replicants.obsStatus.value.studioMode = studioModeEnabled;
            if (!studioModeEnabled) this.replicants.previewScene.value = null;
            else this.call("GetCurrentPreviewScene").then(({ currentPreviewSceneName })=>this._updateSceneItems(this.replicants.previewScene, currentPreviewSceneName));
        });
        this.on("RecordStateChanged", ({ outputActive })=>this.replicants.obsStatus.value.recording = outputActive);
        this.on("StreamStateChanged", ({ outputActive })=>this.replicants.obsStatus.value.streaming = outputActive);
    }
    _fullUpdate() {
        return Promise.all([
            this._updateScenes().then((res)=>Promise.all([
                    this._updateSceneItems(this.replicants.previewScene, res.currentPreviewSceneName),
                    this._updateSceneItems(this.replicants.programScene, res.currentProgramSceneName)
                ])).catch((err)=>this.ackError(undefined, "Error updating scenes list:", err)),
            this._updateStatus()
        ]);
    }
    _updateScenes() {
        return this.call("GetSceneList").then((res)=>{
            // Response type is not detailed enough, so assert type here
            this._updateSceneList(res.scenes);
            return res;
        });
    }
    _updateSceneList(scenes) {
        this.replicants.sceneList.value = scenes.map((s)=>s.sceneName);
        return scenes;
    }
    _updateSceneItems(replicant, sceneName) {
        if (!sceneName) replicant.value = null;
        else this.call("GetSceneItemList", {
            sceneName: sceneName
        }).then((items)=>{
            replicant.value = {
                name: sceneName,
                sources: items.sceneItems
            };
            return items;
        }).catch((err)=>this.ackError(undefined, `Error updating ${replicant.name} scene:`, err));
    }
    _updateStatus() {
        return Promise.all([
            this._tryCallOBS("GetStudioModeEnabled").then(({ studioModeEnabled })=>this.replicants.obsStatus.value.studioMode = studioModeEnabled),
            this._tryCallOBS("GetRecordStatus").then(({ outputActive })=>this.replicants.obsStatus.value.recording = outputActive),
            this._tryCallOBS("GetStreamStatus").then(({ outputActive })=>this.replicants.obsStatus.value.streaming = outputActive)
        ]);
    }
    async _tryCallOBS(requestType, requestData, ack, errMsg, catchF) {
        return this.call(requestType, requestData).then((res)=>{
            if (ack && !ack.handled) ack();
            return res;
        }).catch((err)=>{
            if (catchF) catchF(err);
            this.ackError(ack, errMsg ? errMsg : `Error calling ${requestType}`, err);
            throw err;
        });
    }
    ackError(ack, errmsg, err) {
        const line = (0, _getCurrentLineDefault.default)({
            frames: 2
        });
        this.log.error(`[${line.file}:${line.line}:${line.char}]`, errmsg, err);
        if (ack && !ack.handled) ack(err);
    }
    _transitionListeners() {
        (0, _listeners.listenTo)("transition", async (args, ack)=>{
            args = args ? args : {};
            // Mark that we're starting to transition. Resets to false after SwitchScenes.
            this.replicants.obsStatus.value.transitioning = true;
            // Call hook
            if (this.hooks.preTransition !== undefined) {
                const res = await this.hooks.preTransition(this, args);
                if (res) args = res;
            }
            // Set transition and duration
            if (args.transitionName) this._tryCallOBS("SetCurrentSceneTransition", {
                "transitionName": args.transitionName
            }, ack, "Error setting transition");
            if (args.transitionDuration) this._tryCallOBS("SetCurrentSceneTransitionDuration", {
                transitionDuration: args.transitionDuration
            }, ack, "Error setting transiton duration");
            // Trigger transition, needs different calls outside studio mode
            if (this.replicants.obsStatus.value.studioMode) {
                if (args.sceneName) this._tryCallOBS("SetCurrentPreviewScene", {
                    "sceneName": args.sceneName
                }, ack, "Error setting preview scene for transition:");
                this._tryCallOBS("TriggerStudioModeTransition", undefined, ack, "Error transitioning", (e)=>this.replicants.obsStatus.value.transitioning = false);
            } else if (!args.sceneName) this.ackError(ack, "Error: Cannot transition", undefined);
            else this._tryCallOBS("SetCurrentProgramScene", {
                "sceneName": args.sceneName
            }, ack, "Error transitioning", (e)=>this.replicants.obsStatus.value.transitioning = false);
        }, this.namespace);
        (0, _listeners.listenTo)("preview", async (args, ack)=>{
            if (!this.replicants.obsStatus.value.studioMode) this.ackError(ack, "Cannot preview when not in studio mode", undefined);
            this._tryCallOBS("SetCurrentPreviewScene", {
                "sceneName": args.sceneName
            }, ack, "Error setting preview scene for transition:");
        }, this.namespace);
        this.on("SceneTransitionStarted", ({ transitionName })=>{
            const pre = this.replicants.previewScene.value;
            const pro = this.replicants.programScene.value;
            this.replicants.obsStatus.value.transitioning = true;
            (0, _listeners.sendTo)("transitioning", {
                transitionName: transitionName,
                fromScene: pro ? pro.name : undefined,
                toScene: pre ? pre.name : undefined
            });
        });
        this.on("SceneTransitionEnded", ()=>this.replicants.obsStatus.value.transitioning = false);
        // SceneTransitionEnded doesn't trigger if user cancelled transition, so cya
        this.on("CurrentProgramSceneChanged", ()=>{
            if (this.replicants.obsStatus.value.transitioning) this.replicants.obsStatus.value.transitioning = false;
        });
    }
    _interactionListeners() {
        (0, _listeners.listenTo)("moveItem", ({ sceneName, sceneItemId, transform })=>{
            this.call("SetSceneItemTransform", {
                sceneName: sceneName,
                sceneItemId: sceneItemId,
                sceneItemTransform: transform
            });
        });
    }
    constructor(nodecg, opts = {}){
        super();
        this._ignoreConnectionClosedEvents = false;
        this._reconnectInterval = null;
        this.nodecg = nodecg;
        let namespace = opts.namespace || "";
        if (usedNamespaces.has(namespace)) throw new Error(`Namespace "${namespace}" has already been used. Please choose a different namespace.`);
        usedNamespaces.add(namespace);
        this.namespace = namespace;
        const namespacesReplicant = (0, _utils.Replicant)("namespaces", {
            persistent: false
        });
        namespacesReplicant.value.push(namespace);
        this.replicants = {
            login: NamespaceReplicant(namespace, "login"),
            programScene: NamespaceReplicant(namespace, "programScene", {
                persistent: false
            }),
            previewScene: NamespaceReplicant(namespace, "previewScene", {
                persistent: false
            }),
            sceneList: NamespaceReplicant(namespace, "sceneList", {
                persistent: false
            }),
            obsStatus: NamespaceReplicant(namespace, "obsStatus")
        };
        this.log = new nodecg.Logger((0, _utils.prefixName)(nodecg.bundleName, namespace));
        this.hooks = opts.hooks || {};
        this._connectionListeners();
        this._replicantListeners();
        this._transitionListeners();
        this._interactionListeners();
    }
}

},{"@swc/helpers/_/_object_spread":"3fvE7","a2f29e67e3d0030b":"path","./utils":"8mEuU","obs-websocket-js":"obs-websocket-js","path":"path","get-current-line":"get-current-line","../common/listeners":"ik2HY","@parcel/transformer-js/src/esmodule-helpers.js":"9VN6q"}],"3fvE7":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "_object_spread", ()=>_object_spread);
parcelHelpers.export(exports, "_", ()=>_object_spread);
var _definePropertyJs = require("./_define_property.js");
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
            return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
        ownKeys.forEach(function(key) {
            (0, _definePropertyJs._define_property)(target, key, source[key]);
        });
    }
    return target;
}

},{"./_define_property.js":"bdMCd","@parcel/transformer-js/src/esmodule-helpers.js":"9VN6q"}],"bdMCd":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "_define_property", ()=>_define_property);
parcelHelpers.export(exports, "_", ()=>_define_property);
function _define_property(obj, key, value) {
    if (key in obj) Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
    });
    else obj[key] = value;
    return obj;
}

},{"@parcel/transformer-js/src/esmodule-helpers.js":"9VN6q"}],"ik2HY":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "sendError", ()=>sendError);
parcelHelpers.export(exports, "sendSuccess", ()=>sendSuccess);
parcelHelpers.export(exports, "listenTo", ()=>listenTo);
parcelHelpers.export(exports, "sendToF", ()=>sendToF);
parcelHelpers.export(exports, "sendTo", ()=>sendTo);
var _utils = require("../extension/utils");
var ncg;
try {
    ncg = nodecg;
} catch (e) {
    ncg = (0, _utils.getNodeCG)();
}
function sendError(ack, msg) {
    if (ack && !ack.handled) ack(new Error(msg));
}
function sendSuccess(ack, value) {
    if (ack && !ack.handled) ack(null, value);
}
function listenTo(name, listener, prefix) {
    const prename = prefix ? `${prefix}:${name}` : name;
    ncg.listenFor(prename, (data, ack)=>{
        console.debug("Calling", prename, "with", data);
        listener(data, ack);
    });
}
function sendToF(name, data, prefix) {
    const prename = prefix ? `${prefix}:${name}` : name;
    return ()=>{
        console.debug("Sending", prename, "with", data);
        return ncg.sendMessage(prename, data);
    };
}
function sendTo(name, data, prefix) {
    return sendToF(name, data, prefix)();
}

},{"../extension/utils":"8mEuU","@parcel/transformer-js/src/esmodule-helpers.js":"9VN6q"}]},["eGA2g"], "eGA2g", "parcelRequirebbfa")

//# sourceMappingURL=index.js.map

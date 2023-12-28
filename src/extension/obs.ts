import { Configschema, PreviewScene, ProgramScene, SceneList, StudioMode, Transitioning, Websocket, Namespaces, ObsSource, Stats } from "types/schemas";
import { Replicant, prefixName } from "./utils";
import OBSWebSocket, { OBSRequestTypes } from 'obs-websocket-js';
import NodeCG from "@nodecg/types";
import * as path from "path";

import { listenTo, sendTo } from "../common/listeners";
import { ListenerTypes } from "common/listenerTypes";


function buildSchemaPath(schemaName: string) {
    return path.resolve(__dirname, '../../schemas', `${encodeURIComponent(schemaName)}.json`);
}

export function NamespaceReplicant<T>(namespace: string | undefined, name: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    return Replicant<T>(prefixName(namespace, name), { schemaPath: buildSchemaPath(name), ...args });
}

type PreTransitionProps = ListenerTypes["transition"];
export interface Hooks {
    preTransition(obs: OBSUtility, opts: PreTransitionProps):
        PreTransitionProps | void | Promise<PreTransitionProps> | Promise<void>
}

const usedNamespaces = new Set();

export class OBSUtility extends OBSWebSocket {
    nodecg: NodeCG.ServerAPI<Configschema>;
    namespace: string;
    hooks: Partial<Hooks>;
    replicants: {
        websocket: NodeCG.ServerReplicantWithSchemaDefault<Websocket>;
        programScene: NodeCG.ServerReplicantWithSchemaDefault<ProgramScene>;
        previewScene: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene>;
        sceneList: NodeCG.ServerReplicantWithSchemaDefault<SceneList>;
        transitioning: NodeCG.ServerReplicantWithSchemaDefault<Transitioning>;
        studioMode: NodeCG.ServerReplicantWithSchemaDefault<StudioMode>;
        stats: NodeCG.ServerReplicantWithSchemaDefault<Stats>;
    };
    log: NodeCG.Logger;

    private _ignoreConnectionClosedEvents = false;
    private _reconnectInterval: NodeJS.Timeout | null = null;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, opts: { namespace?: string; hooks?: Partial<Hooks> } = {}) {
        super();
        this.nodecg = nodecg;
        let namespace = opts.namespace || '';

        if (usedNamespaces.has(namespace)) {
            throw new Error(`Namespace "${namespace}" has already been used. Please choose a different namespace.`);
        }

        usedNamespaces.add(namespace);
        this.namespace = namespace;
        const namespacesReplicant = Replicant<Namespaces>('namespaces', { persistent: false });
        namespacesReplicant.value.push(namespace);

        this.replicants = {
            websocket: NamespaceReplicant<Websocket>(namespace, "websocket"),
            programScene: NamespaceReplicant<ProgramScene>(namespace, "programScene"),
            previewScene: NamespaceReplicant<PreviewScene>(namespace, "previewScene"),
            sceneList: NamespaceReplicant<SceneList>(namespace, "sceneList"),
            transitioning: NamespaceReplicant<Transitioning>(namespace, "transitioning"),
            studioMode: NamespaceReplicant<StudioMode>(namespace, "studioMode"),
            stats: NamespaceReplicant<Stats>(namespace, "stats")
        };
        this.log = new nodecg.Logger(prefixName(nodecg.bundleName, namespace));;
        this.hooks = opts.hooks || {};

        this._connectionListeners();
        this._replicantListeners();
        this._transitionListeners();
    }


    private _connectionListeners() {
        this.replicants.websocket.once('change', newVal => {
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.status === 'connected' || newVal.status === 'connecting')) {
                this.replicants.websocket.value.status = 'connecting';
                this._connectToOBS().then().catch(() => {
                    this.replicants.websocket.value.status = 'error';
                });
            }
        });

        this.nodecg.listenFor("DEBUG:callOBS", async (data, ack) => {
            if (!data.name || !data.args) return;
            this.log.info("Called", data.name, "with", data.args);
            try {
                const res = await this.call(data.name, data.args);
                if (ack && !ack.handled) ack(undefined, res);
                this.log.info("Result:", res);
            } catch (err) {
                this.ackError(ack, `Error calling ${data.name}`, err);
            }
        })

        listenTo("connect", (params, ack) => {
            this._ignoreConnectionClosedEvents = false;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            this.replicants.websocket.value = { ...this.replicants.websocket.value, ...params };

            this._connectToOBS().then(() => {
                if (ack && !ack.handled) ack();
            }).catch(err => {
                this.replicants.websocket.value.status = 'error';
                this.ackError(ack, `Failed to connect`, err);
            });
        }, this.namespace);

        listenTo("disconnect", (_, ack) => {
            this._ignoreConnectionClosedEvents = true;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            this.replicants.websocket.value.status = 'disconnected';
            this.disconnect();
            this.log.info('Operator-requested disconnect.');

            if (ack && !ack.handled) ack();
        }, this.namespace);

        this.on("ConnectionClosed", this._reconnectToOBS);

        (this as any).on("error", (e: Error) => {
            this.log.error(e);
            this._reconnectToOBS();
        });

        setInterval(() => {
            if (this.replicants.websocket.value?.status === 'connected' && this.socket?.readyState !== this.socket?.OPEN) {
                this.log.warn('Thought we were connected, but the automatic poll detected we were not. Correcting.');
                clearInterval(this._reconnectInterval!);
                this._reconnectInterval = null;
                this._reconnectToOBS();
            }
        }, 1000);
    }


    private _connectToOBS() {
        const websocketConfig = this.replicants.websocket;
        if (websocketConfig.value.status === 'connected') {
            throw new Error('Attempted to connect to OBS while already connected!');
        }

        websocketConfig.value.status = 'connecting';

        return this.connect(websocketConfig.value.ip, websocketConfig.value.password).then(() => {
            this.log.info('Connected');
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;
            websocketConfig.value.status = 'connected';
            this.call("SetStudioModeEnabled", { studioModeEnabled: true });
            return this._fullUpdate();
        });
    }

    private _reconnectToOBS() {
        if (this._reconnectInterval) return;

        const websocketConfig = this.replicants.websocket;
        if (this._ignoreConnectionClosedEvents) {
            websocketConfig.value.status = 'disconnected';
            return;
        }

        websocketConfig.value.status = 'connecting';
        this.log.warn('Connection closed, will attempt to reconnect every 5 seconds.');
        // Retry, ignoring errors
        this._reconnectInterval = setInterval(() => this._connectToOBS().catch(() => { }), 5000);
    }


    private _replicantListeners() {
        this.on("SceneListChanged", ({ scenes }) => this._updateSceneList(scenes as { sceneName: string }[]));
        this.on("CurrentPreviewSceneChanged", (name) => this._updateSceneItems(this.replicants.previewScene, name.sceneName));
        this.on("CurrentProgramSceneChanged", (name) => this._updateSceneItems(this.replicants.programScene, name.sceneName));
        // Clear or set preview on studio mode set or unset
        this.on("StudioModeStateChanged", ({ studioModeEnabled }) => {
            this.replicants.studioMode.value = studioModeEnabled;
            if (!studioModeEnabled) this.replicants.previewScene.value = null;
            else this.call("GetCurrentPreviewScene")
                .then(({ currentPreviewSceneName }) => this._updateSceneItems(this.replicants.previewScene, currentPreviewSceneName));
        });

        this.on("RecordStateChanged", ({ outputActive }) => this.replicants.stats.value.recording = outputActive);
        this.on("StreamStateChanged", ({ outputActive }) => this.replicants.stats.value.streaming = outputActive);
    }

    private _fullUpdate() {
        return Promise.all([
            this._updateScenes().then(
                (res) => Promise.all([
                    this._updateSceneItems(this.replicants.previewScene, res.currentPreviewSceneName),
                    this._updateSceneItems(this.replicants.programScene, res.currentProgramSceneName)
                ])
            ).catch(err => this.log.error('Error updating scenes list:', err)),
            this._updateStudioMode(),
            this._updateStats()
        ]);
    }

    private _updateScenes() {
        return this.call('GetSceneList').then(res => {
            // Response type is not detailed enough, so assert type here
            this._updateSceneList(res.scenes as { sceneName: string }[]);
            return res;
        })
    }

    private _updateSceneList(scenes: { sceneName: string }[]) {
        this.replicants.sceneList.value = scenes.map(s => s.sceneName);
        return scenes;
    }

    private _updateStudioMode() {
        return this.call('GetStudioModeEnabled').then(res => {
            this.replicants.studioMode.value = res.studioModeEnabled;
        }).catch(err => this.log.error('Error getting studio mode status:', err));
    }

    private _updateSceneItems(replicant: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene>, sceneName: string) {
        this.call("GetSceneItemList", { sceneName: sceneName }).then(items => {
            replicant.value = {
                name: sceneName,
                sources: items.sceneItems as unknown as ObsSource[]
            }
            return items;
        }).catch(err => this.log.error(`Error updating ${replicant.name} scene:`, err));
    }

    private _updateStats() {
        this.call("GetRecordStatus").then(({ outputActive }) => this.replicants.stats.value.recording = outputActive);
        this.call("GetStreamStatus").then(({ outputActive }) => this.replicants.stats.value.streaming = outputActive);
    }


    private async _tryCallOBS<Type extends keyof OBSRequestTypes>(requestType: Type, requestData?: OBSRequestTypes[Type], ack?: NodeCG.Acknowledgement, errMsg?: string, catchF?: (e: any) => {}) {
        try {
            const res = await this.call(requestType, requestData);
            if (ack && !ack.handled) ack();
            return res;
        } catch (err) {
            if (catchF) catchF(err);
            this.ackError(ack, errMsg ? errMsg : `Error calling ${requestType}`, err);
            return undefined;
        }
    }

    private ackError(ack: NodeCG.Acknowledgement | undefined, errmsg: string, err: any) {
        this.log.error(errmsg, err);
        if (ack && !ack.handled) ack(err);
    }

    private _transitionListeners() {
        listenTo("transition", async (args, ack) => {
            args = args ? args : {};
            // Mark that we're starting to transition. Resets to false after SwitchScenes.
            this.replicants.transitioning.value = true;

            // Call hook
            if (this.hooks.preTransition !== undefined) {
                const res = await this.hooks.preTransition(this, args);
                if (res) args = res;
            }

            // Set transition and duration
            if (args.transitionName) this._tryCallOBS("SetCurrentSceneTransition",
                { "transitionName": args.transitionName }, ack, "Error setting transition"
            );

            if (args.transitionDuration) this._tryCallOBS("SetCurrentSceneTransitionDuration",
                { transitionDuration: args.transitionDuration }, ack, "Error setting transiton duration"
            );

            // Trigger transition, needs different calls outside studio mode
            if (this.replicants.studioMode.value) {
                if (args.sceneName) {
                    this._tryCallOBS('SetCurrentPreviewScene', { 'sceneName': args.sceneName },
                        ack, 'Error setting preview scene for transition:')
                }

                this._tryCallOBS("TriggerStudioModeTransition", undefined, ack, "Error transitioning",
                    (e) => this.replicants.transitioning.value = false);
            } else {
                if (!args.sceneName) this.ackError(ack, "Error: Cannot transition", undefined);
                else this._tryCallOBS("SetCurrentProgramScene", { 'sceneName': args.sceneName }, ack, "Error transitioning",
                    (e) => this.replicants.transitioning.value = false);
            }
        }, this.namespace);

        listenTo("preview", async (args, ack) => {
            if (!this.replicants.studioMode) this.ackError(ack, "Cannot preview when not in studio mode", undefined);

            this._tryCallOBS('SetCurrentPreviewScene', { 'sceneName': args.sceneName },
                ack, 'Error setting preview scene for transition:')
        }, this.namespace);


        this.on("SceneTransitionStarted", ({ transitionName }) => {
            const pre = this.replicants.previewScene.value;
            const pro = this.replicants.programScene.value;

            this.replicants.transitioning.value = true;
            sendTo("transitioning", {
                transitionName: transitionName,
                fromScene: pro ? pro.name : undefined,
                toScene: pre ? pre.name : undefined
            })
        })

        this.on("SceneTransitionEnded", () => this.replicants.transitioning.value = false);
        // SceneTransitionEnded doesn't trigger if user cancelled transition, so cya
        this.on("CurrentProgramSceneChanged", () => {
            if (this.replicants.transitioning.value) {
                this.replicants.transitioning.value = false;
            }
        })
    }
}
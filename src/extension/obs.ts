import { Configschema, PreviewScene, ProgramScene, SceneList, StudioMode, Transitioning, Websocket, Namespaces, ObsSource } from "types/schemas";
import { Replicant, prefixName } from "./utils";
import OBSWebSocket from 'obs-websocket-js';
import NodeCG from "@nodecg/types";
import * as path from "path";

import { listenTo } from "../common/listeners";


function buildSchemaPath(schemaName: string) {
    return path.resolve(__dirname, '../schemas', `${encodeURIComponent(schemaName)}.json`);
}

export function NamespaceReplicant<T>(namespace: string | undefined, name: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    return Replicant<T>(prefixName(namespace, name), { schemaPath: buildSchemaPath(name), ...args });
}


interface TransitionOptions {
    'with-transition': {
        name: string;
        duration?: number;
    }
}

export interface Hooks {
    preTransition(transitionOpts: TransitionOptions):
        TransitionOptions | void | Promise<TransitionOptions> | Promise<void>
}

const usedNamespaces = new Set();

export class OBSUtility extends OBSWebSocket {
    namespace: string;
    hooks: Partial<Hooks>;
    replicants: {
        websocket: NodeCG.ServerReplicantWithSchemaDefault<Websocket>;
        programScene: NodeCG.ServerReplicantWithSchemaDefault<ProgramScene>;
        previewScene: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene>;
        sceneList: NodeCG.ServerReplicantWithSchemaDefault<SceneList>;
        transitioning: NodeCG.ServerReplicantWithSchemaDefault<Transitioning>;
        studioMode: NodeCG.ServerReplicantWithSchemaDefault<StudioMode>;
    };
    log: NodeCG.Logger;

    private _ignoreConnectionClosedEvents = false;
    private _reconnectInterval: NodeJS.Timeout | null = null;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>, opts: { namespace?: string; hooks?: Partial<Hooks> } = {}) {
        super();
        let namespace = opts.namespace || '';

        if (usedNamespaces.has(namespace)) {
            throw new Error(`Namespace "${namespace}" has already been used. Please choose a different namespace.`);
        }

        usedNamespaces.add(namespace);
        this.namespace = namespace;
        const namespacesReplicant = Replicant<Namespaces>('namespaces', { persistent: false });
        namespacesReplicant.value.push(namespace);

        const websocketConfig = NamespaceReplicant<Websocket>(namespace, "websocket");
        const programScene = NamespaceReplicant<ProgramScene>(namespace, "programScene");
        const previewScene = NamespaceReplicant<PreviewScene>(namespace, "previewScene");
        const sceneList = NamespaceReplicant<SceneList>(namespace, "sceneList");
        const transitioning = NamespaceReplicant<Transitioning>(namespace, "transitioning");
        const studioMode = NamespaceReplicant<StudioMode>(namespace, "studioMode");
        const log = new nodecg.Logger(prefixName(nodecg.bundleName, namespace));

        this.replicants = {
            websocket: websocketConfig,
            programScene,
            previewScene,
            sceneList,
            transitioning,
            studioMode
        };
        this.log = log;
        this.hooks = opts.hooks || {};

        this.connectionListeners();
        this._replicantListeners();
        this._transitionListeners();
    }


    private connectionListeners() {
        this.replicants.websocket.once('change', newVal => {
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.status === 'connected' || newVal.status === 'connecting')) {
                this.replicants.websocket.value.status = 'connecting';
                this._connectToOBS().then().catch(() => {
                    this.replicants.websocket.value.status = 'error';
                });
            }
        });

        listenTo("connect", (params, ack) => {
            this._ignoreConnectionClosedEvents = false;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            this.replicants.websocket.value = { ...this.replicants.websocket.value, ...params };

            this._connectToOBS().then(() => {
                if (ack && !ack.handled) ack();
            }).catch(err => {
                this.replicants.websocket.value.status = 'error';
                this.log.error('Failed to connect:', err);

                if (ack && !ack.handled) ack(err);
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
        this.on("SceneListChanged", (res) => this._updateSceneList(res.scenes as { sceneName: string }[]));
        this.on("CurrentPreviewSceneChanged", (name) => this._updateSceneItems(this.replicants.previewScene, name.sceneName));
        this.on("CurrentProgramSceneChanged", (name) => this._updateSceneItems(this.replicants.programScene, name.sceneName));
    }

    private _fullUpdate() {
        return Promise.all([
            this._updateScenes().then(
                (res) => Promise.all([
                    this._updateSceneItems(this.replicants.previewScene, res.currentPreviewSceneName),
                    this._updateSceneItems(this.replicants.programScene, res.currentProgramSceneName)
                ])
            ).catch(err => this.log.error('Error updating scenes list:', err)),
            this._updateStudioMode()
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
            this.log.info(replicant.name, replicant.value);
            return items;
        }).catch(err => this.log.error(`Error updating ${replicant.name} scene:`, err));
    }


    private _transitionListeners() { }
}
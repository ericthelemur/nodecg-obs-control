import { ListenerTypes } from 'common/listenerTypes';
import getCurrentLine from 'get-current-line';
import OBSWebSocket, { OBSRequestTypes } from 'obs-websocket-js';
import * as path from 'path';
import {
    Configschema, Login, Namespaces, ObsScene, ObsSource, ObsStatus, PreviewScene, ProgramScene,
    SceneList
} from 'types/schemas';

import NodeCG from '@nodecg/types';

import { listenTo, sendTo } from '../common/listeners';
import { prefixName, Replicant } from './utils';

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
        login: NodeCG.ServerReplicantWithSchemaDefault<Login>;
        programScene: NodeCG.ServerReplicantWithSchemaDefault<ProgramScene>;
        previewScene: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene>;
        sceneList: NodeCG.ServerReplicantWithSchemaDefault<SceneList>;
        obsStatus: NodeCG.ServerReplicantWithSchemaDefault<ObsStatus>;
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
            login: NamespaceReplicant<Login>(namespace, "login"),
            programScene: NamespaceReplicant<ProgramScene>(namespace, "programScene", { persistent: false }),
            previewScene: NamespaceReplicant<PreviewScene>(namespace, "previewScene", { persistent: false }),
            sceneList: NamespaceReplicant<SceneList>(namespace, "sceneList", { persistent: false }),
            obsStatus: NamespaceReplicant<ObsStatus>(namespace, "obsStatus")
        };
        this.log = new nodecg.Logger(prefixName(nodecg.bundleName, namespace));
        this.hooks = opts.hooks || {};

        this._connectionListeners();
        this._replicantListeners();
        this._transitionListeners();
        this._interactionListeners();
    }


    private _connectionListeners() {
        this.replicants.obsStatus.once('change', newVal => {
            // If we were connected last time, try connecting again now.
            if (newVal && (newVal.connection === 'connected' || newVal.connection === 'connecting')) {
                this.replicants.obsStatus.value.connection = 'connecting';
                this._connectToOBS().then().catch(() => {
                    this.replicants.obsStatus.value.connection = 'error';
                });
            }
        });

        this.nodecg.listenFor("DEBUG:callOBS", async (data, ack) => {
            if (!data.name || !data.args) return this.ackError(ack, "No name or args", undefined);
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

            this.replicants.login.value = { ...this.replicants.login.value, ...params };

            this._connectToOBS().then(() => {
                if (ack && !ack.handled) ack();
            }).catch(err => {
                this.replicants.obsStatus.value.connection = 'error';
                this.ackError(ack, `Failed to connect`, err);
            });
        }, this.namespace);

        listenTo("disconnect", (_, ack) => {
            this._ignoreConnectionClosedEvents = true;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            this.replicants.obsStatus.value.connection = 'disconnected';
            this.disconnect();
            this.log.info('Operator-requested disconnect.');

            if (ack && !ack.handled) ack();
        }, this.namespace);

        this.on("ConnectionClosed", this._reconnectToOBS);

        (this as any).on("error", (e: Error) => {
            this.ackError(undefined, "", e);
            this._reconnectToOBS();
        });

        setInterval(() => {
            if (this.replicants.obsStatus.value.connection === 'connected' && this.socket?.readyState !== this.socket?.OPEN) {
                this.log.warn('Thought we were connected, but the automatic poll detected we were not. Correcting.');
                clearInterval(this._reconnectInterval!);
                this._reconnectInterval = null;
                this._reconnectToOBS();
            }
        }, 1000);
    }


    private _connectToOBS() {
        const login = this.replicants.login.value;
        const status = this.replicants.obsStatus.value;
        if (status.connection === 'connected') {
            throw new Error('Attempted to connect to OBS while already connected!');
        }

        status.connection = 'connecting';

        return this.connect(login.ip, login.password).then(() => {
            this.log.info('Connected');
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;
            status.connection = 'connected';
            // this.call("SetStudioModeEnabled", { studioModeEnabled: true });
            return this._fullUpdate();
        });
    }

    private _reconnectToOBS() {
        if (this._reconnectInterval) return;

        const status = this.replicants.obsStatus.value;
        if (this._ignoreConnectionClosedEvents) {
            status.connection = 'disconnected';
            return;
        }

        status.connection = 'connecting';
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
            this.replicants.obsStatus.value.studioMode = studioModeEnabled;
            if (!studioModeEnabled) this.replicants.previewScene.value = null;
            else this.call("GetCurrentPreviewScene")
                .then(({ currentPreviewSceneName }) => this._updateSceneItems(this.replicants.previewScene, currentPreviewSceneName));
        });

        this.on("RecordStateChanged", ({ outputActive }) => this.replicants.obsStatus.value.recording = outputActive);
        this.on("StreamStateChanged", ({ outputActive }) => this.replicants.obsStatus.value.streaming = outputActive);
    }

    private _fullUpdate() {
        return Promise.all([
            this._updateScenes().then(
                (res) => Promise.all([
                    this._updateSceneItems(this.replicants.previewScene, res.currentPreviewSceneName),
                    this._updateSceneItems(this.replicants.programScene, res.currentProgramSceneName)
                ])
            ).catch(err => this.ackError(undefined, 'Error updating scenes list:', err)),
            this._updateStatus()
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
        Promise.all(scenes.map(s =>
            this.call("GetSceneItemList", { sceneName: s.sceneName })
                .then((d) => ({ name: s.sceneName, sources: d.sceneItems } as unknown as ObsScene))
        )).then(r =>
            this.replicants.sceneList.value = r
        ).catch((err) => this.ackError(undefined, "Error updating scene list", err));
        return scenes;
    }

    private _updateSceneItems(replicant: NodeCG.ServerReplicantWithSchemaDefault<PreviewScene>, sceneName: string) {
        if (!sceneName) replicant.value = null;
        else {
            this.call("GetSceneItemList", { sceneName: sceneName }).then(items => {
                replicant.value = {
                    name: sceneName,
                    sources: items.sceneItems as unknown as ObsSource[]
                }
                return items;
            }).catch(err => this.ackError(undefined, `Error updating ${replicant.name} scene:`, err));
        }
    }

    private _updateStatus() {
        return Promise.all([
            this._tryCallOBS('GetStudioModeEnabled').then(({ studioModeEnabled }) => this.replicants.obsStatus.value.studioMode = studioModeEnabled),
            this._tryCallOBS('GetRecordStatus').then(({ outputActive }) => this.replicants.obsStatus.value.recording = outputActive),
            this._tryCallOBS('GetStreamStatus').then(({ outputActive }) => this.replicants.obsStatus.value.streaming = outputActive)
        ]);
    }


    private async _tryCallOBS<Type extends keyof OBSRequestTypes>(requestType: Type, requestData?: OBSRequestTypes[Type], ack?: NodeCG.Acknowledgement, errMsg?: string, catchF?: (e: any) => {}) {
        return this.call(requestType, requestData).then((res) => {
            if (ack && !ack.handled) ack();
            return res;
        }).catch((err) => {
            if (catchF) catchF(err);
            this.ackError(ack, errMsg ? errMsg : `Error calling ${requestType}`, err);
            throw err;
        })
    }

    private ackError(ack: NodeCG.Acknowledgement | undefined, errmsg: string, err: any) {
        const line = getCurrentLine({ frames: 2 });
        this.log.error(`[${line.file}:${line.line}:${line.char}]`, errmsg, err);
        if (ack && !ack.handled) ack(err);
    }

    private _transitionListeners() {
        listenTo("transition", async (args, ack) => {
            args = args ? args : {};
            // Mark that we're starting to transition. Resets to false after SwitchScenes.
            this.replicants.obsStatus.value.transitioning = true;

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
            if (this.replicants.obsStatus.value.studioMode) {
                if (args.sceneName) {
                    this._tryCallOBS('SetCurrentPreviewScene', { 'sceneName': args.sceneName },
                        ack, 'Error setting preview scene for transition:')
                }

                this._tryCallOBS("TriggerStudioModeTransition", undefined, ack, "Error transitioning",
                    (e) => this.replicants.obsStatus.value.transitioning = false);
            } else {
                if (!args.sceneName) this.ackError(ack, "Error: Cannot transition", undefined);
                else this._tryCallOBS("SetCurrentProgramScene", { 'sceneName': args.sceneName }, ack, "Error transitioning",
                    (e) => this.replicants.obsStatus.value.transitioning = false);
            }
        }, this.namespace);

        listenTo("preview", async (args, ack) => {
            if (!this.replicants.obsStatus.value.studioMode) this.ackError(ack, "Cannot preview when not in studio mode", undefined);

            this._tryCallOBS('SetCurrentPreviewScene', { 'sceneName': args.sceneName },
                ack, 'Error setting preview scene for transition:')
        }, this.namespace);

        this.replicants.programScene.on("change", (newVal, oldVal) => {
            sendTo("transitioning", {
                transitionName: "",
                fromScene: oldVal?.name,
                toScene: newVal?.name
            })
        })

        // this.on("SceneTransitionStarted", ({ transitionName }) => {
        //     const pre = this.replicants.previewScene.value;
        //     const pro = this.replicants.programScene.value;

        //     const from = pro ? pro : null;
        //     const to = pro ? pre : ;
        //     console.log("Transitioning", from, to, transitionName);


        //     this.replicants.obsStatus.value.transitioning = true;
        //     sendTo("transitioning", {
        //         transitionName: transitionName,
        //         fromScene: from?.name,
        //         toScene: to?.name
        //     })
        // })

        this.on("SceneTransitionEnded", () => this.replicants.obsStatus.value.transitioning = false);
        // SceneTransitionEnded doesn't trigger if user cancelled transition, so cya
        this.on("CurrentProgramSceneChanged", () => {
            if (this.replicants.obsStatus.value.transitioning) {
                this.replicants.obsStatus.value.transitioning = false;
            }
        })
    }

    private _interactionListeners() {
        listenTo("moveItem", ({ sceneName, sceneItemId, transform }) => {
            this.call("SetSceneItemTransform", { sceneName: sceneName, sceneItemId: sceneItemId, sceneItemTransform: transform as any });
        })
    }
}
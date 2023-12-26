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

        // Expose convenient references to the Replicants.
        // This isn't strictly necessary. The same effect could be achieved by just
        // declaring the same Replicant again, but some folks might like
        // to just work with the references that we return here.
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

        websocketConfig.once('change', newVal => {
            // If we were connected last time, try connecting again now.
            if (newVal.status === 'connected' || newVal.status === 'connecting') {
                websocketConfig.value.status = 'connecting';
                this._connectToOBS().then().catch(() => {
                    websocketConfig.value.status = 'error';
                });
            }
        });

        listenTo("connect", (params, ack) => {
            this._ignoreConnectionClosedEvents = false;
            clearInterval(this._reconnectInterval!);
            this._reconnectInterval = null;

            websocketConfig.value = { ...websocketConfig.value, ...params };

            this._connectToOBS().then(() => {
                if (ack && !ack.handled) ack();
            }).catch(err => {
                websocketConfig.value.status = 'error';
                log.error('Failed to connect:', err);

                if (ack && !ack.handled) ack(err);
            });
        }, namespace);
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

    private _fullUpdate() {
        return Promise.all([
            this._updateScenes(),
            this._updateStudioMode()
        ]);
    }

    private _updateScenes() {
        return this.call('GetSceneList').then(res => {
            this.log.info("Calling gsl", res);
            this.replicants.sceneList.value = res.scenes.map(scene => scene.name as string);

            const pre = res.currentPreviewSceneName;
            this.replicants.previewScene.value = {
                name: pre,
                sources: res.scenes.find(s => s.name === pre) as unknown as ObsSource[]
            }

            const pro = res.currentProgramSceneName;
            this.replicants.programScene.value = {
                name: pro,
                sources: res.scenes.find(s => s.name === pro) as unknown as ObsSource[]
            }
            return res;
        }).catch(err => {
            this.log.error('Error updating scenes:', err);
        });
    }

    private _updateStudioMode() {
        return this.call('GetStudioModeEnabled').then(res => {
            this.replicants.studioMode.value = res.studioModeEnabled;
        }).catch(err => {
            this.log.error('Error getting studio mode status:', err);
        });
    }
}
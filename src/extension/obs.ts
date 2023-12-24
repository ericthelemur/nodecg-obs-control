import { Configschema, PreviewScene, ProgramScene, SceneList, StudioMode, Transitioning, Websocket, Namespaces } from "types/schemas";
import { Replicant, getNodeCG } from "./utils";
import OBSWebSocket, { OBSResponseTypes, OBSEventTypes } from 'obs-websocket-js';
import NodeCG from "@nodecg/types";

const nodecg = getNodeCG();

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
    private _connected: boolean;


    constructor(nodecg: NodeCG.ServerAPI<Configschema>, opts: { namespace?: string; hooks?: Partial<Hooks> } = {}) {
        super();
        let namespace = opts.namespace || 'obs';
        this._connected = false;

        if (usedNamespaces.has(namespace)) {
            throw new Error(`Namespace "${namespace}" has already been used. Please choose a different namespace.`);
        }

        usedNamespaces.add(namespace);
        this.namespace = namespace;
        const namespacesReplicant = Replicant<Namespaces>('_obs:namespaces', { persistent: false });
        namespacesReplicant.value.push(namespace);

        const websocketConfig = Replicant<Websocket>(`${namespace}:websocket`);
        const programScene = Replicant<ProgramScene>(`${namespace}:programScene`);
        const previewScene = Replicant<PreviewScene>(`${namespace}:previewScene`);
        const sceneList = Replicant<SceneList>(`${namespace}:sceneList`);
        const transitioning = Replicant<Transitioning>(`${namespace}:transitioning`);
        const studioMode = Replicant<StudioMode>(`${namespace}:studioMode`);
        const log = new nodecg.Logger(`${nodecg.bundleName}:${namespace}`);

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
    }
import type NodeCG from '@nodecg/types';
import type { Configschema } from '../types/schemas';

let nodecg: NodeCG.ServerAPI<Configschema>;

export function storeNodeCG(ncg: NodeCG.ServerAPI<Configschema>) {
    nodecg = ncg;
}

export function getNodeCG(): NodeCG.ServerAPI<Configschema> {
    return nodecg;
}

export function Replicant<T>(name: string, args: NodeCG.Replicant.OptionsNoDefault = {}) {
    return nodecg.Replicant<T>(name, args) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}
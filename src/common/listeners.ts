import NodeCG from "@nodecg/types";
import { ListenerTypes } from "./listenerTypes";
import { getNodeCG } from "../extension/utils";
import { NodeCGAPIClient } from "@nodecg/types/client/api/api.client";

var ncg: NodeCGAPIClient | NodeCG.ServerAPI;
declare var nodecg: NodeCGAPIClient;
try {
    ncg = nodecg;
} catch {
    ncg = getNodeCG();
}

type Listener<T> = (data: T, ack: NodeCG.Acknowledgement | undefined) => void;

export function sendError(ack: NodeCG.Acknowledgement | undefined, msg: string) {
    if (ack && !ack.handled) ack(new Error(msg));
}

export function sendSuccess<T>(ack: NodeCG.Acknowledgement | undefined, value: T) {
    if (ack && !ack.handled) ack(null, value);
}

export function listenTo<T extends keyof ListenerTypes>(name: T, listener: Listener<ListenerTypes[T]>, prefix: string | undefined = undefined) {
    const prename = prefix ? `${prefix}:${name}` : name;
    ncg.listenFor(prename, (data, ack) => {
        console.debug("Calling", prename, "with", data);
        listener(data, ack);
    })
}


export function sendToF<T extends keyof ListenerTypes>(name: T, data: ListenerTypes[T], prefix: string | undefined = undefined) {
    const prename = prefix ? `${prefix}:${name}` : name;
    return () => {
        console.debug("Sending", prename, "with", data);
        return ncg.sendMessage(prename, data);
    }
}

export function sendTo<T extends keyof ListenerTypes>(name: T, data: ListenerTypes[T], prefix: string | undefined = undefined) {
    return sendToF(name, data, prefix)();
}

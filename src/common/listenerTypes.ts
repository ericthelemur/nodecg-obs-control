import type { ObsTransform } from 'types/schemas';

export type ListenerTypes = {
    connect: {
        ip: string,
        password: string
    },
    disconnect: {},
    transition: {
        sceneName?: string;
        transitionName?: string;
        transitionDuration?: number;
    },
    transitioning: {
        transitionName: string;
        fromScene?: string;
        toScene?: string;
    },
    preview: {
        sceneName: string;
    },
    moveItem: {
        sceneName: string;
        sceneItemId: number;
        transform: Partial<ObsTransform>
    }
}
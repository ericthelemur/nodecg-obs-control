/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type SceneList = ObsScene[];

export interface ObsScene {
	name: string;
	sources: ObsSource[];
}
export interface ObsSource {
	inputKind: null | string;
	isGroup: boolean | null;
	sceneItemBlendMode:
		| 'OBS_BLEND_NORMAL'
		| 'OBS_BLEND_ADDITIVE'
		| 'OBS_BLEND_SUBTRACT'
		| 'OBS_BLEND_SCREEN'
		| 'OBS_BLEND_MULTIPLY'
		| 'OBS_BLEND_LIGHTEN'
		| 'OBS_BLEND_DARKEN';
	sceneItemEnabled: boolean;
	sceneItemId: number;
	sceneItemIndex: number;
	sceneItemLocked: boolean;
	sceneItemTransform: ObsTransform;
	sourceName: string;
	sourceType: string;
	[k: string]: unknown;
}
export interface ObsTransform {
	positionX: number;
	positionY: number;
	width: number;
	height: number;
	sourceHeight: number;
	sourceWidth: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	alignment: number;
	boundsType:
		| 'OBS_BOUNDS_NONE'
		| 'OBS_BOUNDS_STRETCH'
		| 'OBS_BOUNDS_SCALE_INNER'
		| 'OBS_BOUNDS_SCALE_OUTER'
		| 'OBS_BOUNDS_SCALE_TO_WIDTH'
		| 'OBS_BOUNDS_SCALE_TO_HEIGHT'
		| 'OBS_BOUNDS_MAX_ONLY';
	boundsAlignment: number;
	boundsWidth: number;
	boundsHeight: number;
	cropLeft: number;
	cropRight: number;
	cropTop: number;
	cropBottom: number;
	[k: string]: unknown;
}

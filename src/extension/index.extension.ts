import type NodeCG from '@nodecg/types';
import { storeNodeCG } from './utils';

module.exports = function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
};

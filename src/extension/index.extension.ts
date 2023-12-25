import type NodeCG from '@nodecg/types';
import { storeNodeCG } from './utils';

module.exports = async function (nodecg: NodeCG.ServerAPI) {
	storeNodeCG(nodecg);
	const obs = require("./obs");
	const obsu = new obs.OBSUtility(nodecg);

	return { obs: obsu }
};

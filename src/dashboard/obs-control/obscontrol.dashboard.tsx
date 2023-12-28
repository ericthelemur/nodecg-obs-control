import '../uwcs-bootstrap.css';
import "./obscontrol.scss"

import { FormEvent, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useReplicant } from "use-nodecg";
import { Status, Websocket } from "../../types/schemas/websocket";
import { sendTo } from "../../common/listeners";
import { PreviewScene, ProgramScene, SceneList, StudioMode, Transitioning } from 'types/schemas';


function Status({ status }: { status: Status }) {
	switch (status) {
		case "connected": return <span className="badge text-bg-success">Connected</span>
		case "connecting": return <span className="badge text-bg-info">Connecting</span>
		case "disconnected": return <span className="badge text-bg-danger">Disconnected</span>
		case "error": return <span className="badge text-bg-danger">Error</span>
	}
}


function ConnectForm({ websocket }: { websocket: Websocket }) {
	const urlElem = useRef<HTMLInputElement>(null);
	const pwElem = useRef<HTMLInputElement>(null);

	function connect(e: FormEvent) {
		e.preventDefault();
		nodecg.log.info('Attempting to connect', urlElem.current?.value, pwElem.current?.value);
		(sendTo("connect", {
			ip: urlElem.current!.value,
			password: pwElem.current!.value
		}) as unknown as Promise<void>
		).then(() => nodecg.log.info('successfully connected to obs'))
			.catch((err: any) => nodecg.log.error('failed to connect to obs:', err));
	}

	return (
		<Form onSubmit={connect} className="m-3 vstack gap-3">
			<FloatingLabel className="flex-grow-1" controlId="url" label="OBS URL">
				<Form.Control ref={urlElem} placeholder="ws://localhost:4455" defaultValue={websocket?.ip} />
			</FloatingLabel>
			<FloatingLabel controlId="password" label="Password">
				<Form.Control ref={pwElem} type="password" placeholder="Password" defaultValue={websocket?.password} />
			</FloatingLabel>
			<Form.Text>Status: <Status status={websocket?.status} /></Form.Text>
			<Button type="submit">Connect</Button>
		</Form>
	)
}


function DisconnectForm({ websocket }: { websocket: Websocket }) {
	function disconnect(e: FormEvent) {
		e.preventDefault();
		if (confirm("Are you sure you want to disconnect from OBS?")) {
			nodecg.log.info('Attempting to disconnect');
			(sendTo("disconnect", {}) as unknown as Promise<void>
			).then(() => nodecg.log.info('successfully disconnected from obs'))
				.catch((err: any) => nodecg.log.error('failed to disconnect to obs:', err));
		}
	}

	return (
		<Form onSubmit={disconnect} className="m-3 vstack gap-3">
			<Form.Text>Status: <Status status={websocket?.status} /></Form.Text>
			<Button variant="outline-danger" type="submit">Disconnect</Button>
		</Form>
	)
}


export function MsgControlPanel() {
	const [websocketRep,] = useReplicant<Websocket>("websocket", { ip: "ws://localhost:4455", password: "", status: "disconnected" });
	const [sceneListRep,] = useReplicant<SceneList>("sceneList", []);
	const [previewSceneRep,] = useReplicant<PreviewScene>("previewScene", null);
	const [programSceneRep,] = useReplicant<ProgramScene>("programScene", null);
	const [transitioningRep,] = useReplicant<Transitioning>("transitioning", false);
	const [studioModeRep,] = useReplicant<StudioMode>("studioMode", false);
	if (websocketRep) {
		if (websocketRep.status !== "connected") {
			return <ConnectForm websocket={websocketRep} />
		} else {
			return <DisconnectForm websocket={websocketRep} />
		}
	}

	/* <Form.Text>{JSON.stringify(sceneListRep)}</Form.Text>
	<Form.Text>{JSON.stringify(previewSceneRep?.name)}</Form.Text>
	<Form.Text>{JSON.stringify(programSceneRep?.name)}</Form.Text>
	<Form.Text>{JSON.stringify(programSceneRep?.sources)}</Form.Text>
	<Form.Text>{JSON.stringify(transitioningRep)}</Form.Text>
	<Form.Text>{JSON.stringify(studioModeRep)}</Form.Text> */
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

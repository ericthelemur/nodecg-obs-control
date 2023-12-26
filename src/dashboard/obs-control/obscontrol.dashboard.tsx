import '../uwcs-bootstrap.css';
import "./obscontrol.scss"

import { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useReplicant } from "use-nodecg";
import { Websocket } from "../../types/schemas/websocket";
import { sendTo } from "../../common/listeners";
import { PreviewScene, ProgramScene, SceneList } from 'types/schemas';

export function MsgControlPanel() {
	const [websocketRep,] = useReplicant<Websocket>("websocket", { ip: "ws://localhost:4455", password: "", status: "disconnected" });
	const [sceneListRep,] = useReplicant<SceneList>("sceneList", []);
	const [previewSceneRep,] = useReplicant<PreviewScene>("previewScene", null);
	const [programSceneRep,] = useReplicant<ProgramScene>("programScene", null);

	const urlElem = useRef<HTMLInputElement>(null);
	const pwElem = useRef<HTMLInputElement>(null);

	function connect() {
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
				<Form.Control ref={urlElem} placeholder="ws://localhost:4455" defaultValue={websocketRep?.ip} />
			</FloatingLabel>
			<FloatingLabel controlId="password" label="Password">
				<Form.Control ref={pwElem} type="password" placeholder="Password" defaultValue={websocketRep?.password} />
			</FloatingLabel>
			<Form.Text>Status: {websocketRep?.status}</Form.Text>
			<Button type="submit">Connect</Button>

			<Form.Text>{JSON.stringify(sceneListRep)}</Form.Text>
			<Form.Text>{JSON.stringify(previewSceneRep?.name)}</Form.Text>
			<Form.Text>{JSON.stringify(programSceneRep?.name)}</Form.Text>
			<Form.Text>{JSON.stringify(programSceneRep?.sources)}</Form.Text>
		</Form>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

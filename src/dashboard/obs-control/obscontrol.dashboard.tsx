import '../uwcs-bootstrap.css';
import "./obscontrol.scss"

import { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { useReplicant } from "use-nodecg"
import { Websocket } from "../../types/schemas/websocket"

export function MsgControlPanel() {
	const [websocketRep,] = useReplicant<Websocket>("obs:websocket", { ip: "ws://localhost:4455", password: "", status: "disconnected" })

	const urlElem = useRef<HTMLInputElement>(null);
	const pwElem = useRef<HTMLInputElement>(null);

	function connect() {
		nodecg.log.info('Attempting to connect', urlElem.current?.value, pwElem.current?.value);
		nodecg.sendMessage('obs:connect', {
			ip: urlElem.current?.value,
			password: pwElem.current?.value
		}).then(() => {
			nodecg.log.info('successfully connected to obs');
		}).catch(err => {
			nodecg.log.error('failed to connect to obs:', err);
		});
	}
	return (
		<Form onSubmit={connect} className="m-3 vstack gap-3">
			<FloatingLabel className="flex-grow-1" controlId="url" label="OBS URL">
				<Form.Control placeholder="ws://localhost:4455" defaultValue={websocketRep?.ip} />
			</FloatingLabel>
			<FloatingLabel controlId="password" label="Password">
				<Form.Control type="password" placeholder="Password" defaultValue={websocketRep?.password} />
			</FloatingLabel>
			<Form.Text>Status: {websocketRep?.status}</Form.Text>
			<Button type="submit">Connect</Button>
		</Form>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

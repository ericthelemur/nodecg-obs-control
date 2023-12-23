import '../uwcs-bootstrap.css';

import { createRoot } from 'react-dom/client';


export function MsgControlPanel() {
	return (
		<div className="vstack" style={{ height: "100vh" }}>
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<MsgControlPanel />);

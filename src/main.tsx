import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerConfiareServiceWorker } from './utils/pwaMobileMode';

registerConfiareServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);

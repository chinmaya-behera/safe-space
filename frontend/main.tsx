import { createRoot } from 'react-dom/client';
import { AuthPanel } from '@/components/auth-panel';
import './styles.css';

const root = document.getElementById('auth-root');
if (!root) throw new Error('Safe Space login mount is missing.');
createRoot(root).render(<AuthPanel />);

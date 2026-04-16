import { AppProvider } from './store/AppContext';
import { AppShell } from './screens/AppShell';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

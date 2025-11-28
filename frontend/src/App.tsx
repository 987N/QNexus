import { BrowserRouter as Router } from 'react-router-dom';
import Layout from './components/Layout';
import { QBProvider } from './context/QBContext';

function App() {
  return (
    <QBProvider>
      <Router>
        <Layout />
      </Router>
    </QBProvider>
  );
}

export default App;

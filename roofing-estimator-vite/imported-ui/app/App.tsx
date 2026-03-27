import { RouterProvider } from 'react-router';
import { router } from './routes';
import { RoofingProvider } from './context/RoofingContext';

function App() {
  return (
    <RoofingProvider>
      <RouterProvider router={router} />
    </RoofingProvider>
  );
}

export default App;

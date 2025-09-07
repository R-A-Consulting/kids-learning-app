import Canvas from './pages/canvas';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';

const routes = [
  {
    path: '/',
    element: <Canvas />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
];

export default routes;
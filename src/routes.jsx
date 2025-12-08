import Canvas from './pages/canvas';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import UsersPage from './pages/users';
import PromptsPage from './pages/prompts';
import AuthConsumePage from './pages/auth/consume';
import CrossDomainLoginTestPage from './pages/test/cross-domain-login';

const routes = [
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/canvas/:id',
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
  {
    path: '/dashboard/users',
    element: <UsersPage />,
  },
  {
    path: '/dashboard/prompts',
    element: <PromptsPage />,
  },
  {
    path: '/auth/consume',
    element: <AuthConsumePage />,
  },
  {
    path: '/test/cross-domain-login',
    element: <CrossDomainLoginTestPage />,
  },
];

export default routes;
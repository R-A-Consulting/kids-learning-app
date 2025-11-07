import Canvas from './pages/canvas';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import UsersPage from './pages/users';
import PromptsPage from './pages/prompts';

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
];

export default routes;
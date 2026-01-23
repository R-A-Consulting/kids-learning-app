import Canvas from './pages/canvas';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import UsersPage from './pages/users';
import PromptsPage from './pages/prompts';
import AIQuestionsPage from './pages/ai-questions/index';
import AIQuestionDetailPage from './pages/ai-questions/detail';

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
    path: '/dashboard/ai-questions',
    element: <AIQuestionsPage />,
  },
  {
    path: '/dashboard/ai-questions/:id',
    element: <AIQuestionDetailPage />,
  },
];

export default routes;
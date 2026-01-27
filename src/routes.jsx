import Canvas from './pages/canvas';
import LoginPage from './pages/login';
import DashboardPage from './pages/dashboard';
import UsersPage from './pages/users';
import PromptsPage from './pages/prompts';
import AIQuestionsPage from './pages/ai-questions/index';
import AIQuestionDetailPage from './pages/ai-questions/detail';
import QuestionBankList from './pages/question-bank/index';
import QuestionBankCreate from './pages/question-bank/create';
import QuestionBankDetail from './pages/question-bank/detail';
import QuestionBankDashboard from './pages/question-bank/dashboard';

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
  // Question Bank Generator routes
  {
    path: '/dashboard/question-bank',
    element: <QuestionBankList />,
  },
  {
    path: '/dashboard/question-bank/create',
    element: <QuestionBankCreate />,
  },
  {
    path: '/dashboard/question-bank/dashboard',
    element: <QuestionBankDashboard />,
  },
  {
    path: '/dashboard/question-bank/:id',
    element: <QuestionBankDetail />,
  },
  {
    path: '/dashboard/question-bank/:id/edit',
    element: <QuestionBankCreate />,
  },
];

export default routes;
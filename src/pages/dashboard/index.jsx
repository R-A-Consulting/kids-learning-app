import { useEffect } from 'react'
import {
  MoreHorizontal,
  Trash2,
  Edit,
  Share,
  Plus,
  BookOpen,
  Calendar,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Link } from 'react-router-dom'
import { useGetAllSessions } from '@/services/apis/sessions/useGetAllSessions'

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
  if (diffInHours < 720) return `${Math.floor(diffInHours / 168)} weeks ago`;
  return `${Math.floor(diffInHours / 720)} months ago`;
};

// Helper function to get subject icon
const getSubjectIcon = (subject) => {
  const subjectIcons = {
    'Mathematics': '🔢',
    'Science': '🧪',
    'Art': '🎨',
    'History': '📚',
    'Geography': '🌍',
    'English': '📝',
    'Physics': '⚛️',
    'Chemistry': '🧬',
    'Biology': '🦠'
  };
  return subjectIcons[subject] || '📖';
};

export default function DashboardPage() {
  const { sessions, isLoading, error, getAllSessions } = useGetAllSessions();

  useEffect(() => {
    getAllSessions();
  }, [getAllSessions]);
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 bg-white">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-sm font-medium text-gray-700">Learning Sessions</h1>
      </header>

      <div className="flex-1 bg-white p-4 px-6">
        {/* Sessions Grid - Consistent Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* New Page Card */}
          <Link to="/canvas/new">
            <Card className="bg-gray-50 border-[2px] border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group min-h-[140px] shadow-none">
              <CardContent className="p-4 flex flex-col justify-start items-start h-full">
                {/* Thumbnail */}
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-lg mb-3 transition-colors">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>

                {/* Content */}
                <div className="space-y-1 w-full">
                  <h3 className="font-medium text-gray-900 text-sm">
                    New Page
                  </h3>
                  <p className="text-xs text-gray-500">
                    Create a new page
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Existing Sessions */}
          {sessions.map((session) => (
            <Link key={session._id} to={`/canvas/${session._id}`}>
              <Card className="bg-white border border-gray-100 hover:border-blue-300 transition-all duration-200 cursor-pointer group h-[200px] shadow-soft hover:shadow-soft-md p-1">
                <CardContent className="p-0 flex flex-col justify-start items-start h-full">
                  {/* Thumbnail */}
                  <div className="flex items-center justify-center w-full h-full bg-blue-50 group-hover:bg-blue-100 rounded-lg mb-3 transition-colors">
                    <span className="text-xl">{getSubjectIcon(session.subject)}</span>
                  </div>

                  {/* Content */}
                  <div className="space-y-1 w-full px-2 pb-2">
                    <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">
                      {session.name}
                    </h3>
                    <p className="text-xs text-gray-600 leading-tight truncate">
                      {session.description}
                    </p>

                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {formatDate(session.lastAccessedAt)}
                        </span>
                        <span className="text-xs text-blue-600 font-medium">
                          {session.subject}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 shadow-soft-lg border-gray-100">
                          <DropdownMenuItem className="text-xs py-1">
                            <Edit className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs py-1">
                            <Share className="h-3 w-3 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <Separator className="my-1" />
                          <DropdownMenuItem className="text-xs py-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty State for when no sessions */}
        {!isLoading && !error && sessions.length === 0 && (
          <div className="flex flex-col justify-start items-start py-8">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">📄</span>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No sessions yet</h3>
            <p className="text-sm text-gray-500 mb-3">Create your first learning session to get started.</p>
            <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Plus className="h-4 w-4 mr-2" />
              Create Session
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gray-500">Loading sessions...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col justify-center items-center py-12">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">❌</span>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">Failed to load sessions</h3>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={getAllSessions}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

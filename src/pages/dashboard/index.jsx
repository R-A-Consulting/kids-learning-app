import {
  MoreHorizontal,
  Trash2,
  Edit,
  Share,
  Plus
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

// Sample pages data
const pages = [
  {
    id: 1,
    title: 'Shape Detective: Hunt for Hidden Geometric Figures',
    thumbnail: '🔺',
    lastOpened: '2 hours ago',
    type: 'math'
  },
  {
    id: 2,
    title: 'Number Patterns: Discover the Magic of Sequences',
    thumbnail: '🔢',
    lastOpened: '5 hours ago',
    type: 'math'
  },
  {
    id: 3,
    title: 'Planet Puzzles: Explore the Solar System Mysteries',
    thumbnail: '🪐',
    lastOpened: '1 day ago',
    type: 'science'
  },
  {
    id: 4,
    title: 'Measurement Master: Ruler of Length and Volume',
    thumbnail: '📏',
    lastOpened: '2 days ago',
    type: 'math'
  },
  {
    id: 5,
    title: 'Animal Architects: Build Amazing Animal Habitats',
    thumbnail: '🏗️',
    lastOpened: '3 days ago',
    type: 'science'
  },
  {
    id: 6,
    title: 'Color Theory Quest: Master the Rainbow Palette',
    thumbnail: '🎨',
    lastOpened: '1 week ago',
    type: 'art'
  },
  {
    id: 7,
    title: 'Fraction Fun: Divide and Conquer Pizza Problems',
    thumbnail: '🥧',
    lastOpened: '2 weeks ago',
    type: 'math'
  },
  {
    id: 8,
    title: 'Weather Predictor: Become a Storm Chaser Expert',
    thumbnail: '🌤️',
    lastOpened: '3 weeks ago',
    type: 'science'
  },
  {
    id: 9,
    title: 'Symmetry Artist: Create Perfect Mirror Images',
    thumbnail: '🔄',
    lastOpened: '1 month ago',
    type: 'art'
  },
  {
    id: 10,
    title: 'Force & Motion: Physics of Speed and Power',
    thumbnail: '🏃',
    lastOpened: '2 months ago',
    type: 'science'
  },
  {
    id: 11,
    title: 'Time Teller: Master Clocks and Calendars',
    thumbnail: '🕐',
    lastOpened: '3 months ago',
    type: 'math'
  },
  {
    id: 12,
    title: 'Nature Patterns: Find Beauty in Mathematical Design',
    thumbnail: '🌿',
    lastOpened: '4 months ago',
    type: 'art'
  },
]

export default function DashboardPage() {
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 bg-white">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-sm font-medium text-gray-700">Pages</h1>
      </header>

      <div className="flex-1 bg-white p-4 px-6">
        {/* Pages Grid - Consistent Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* New Page Card */}
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

          {/* Existing Pages */}
          {pages.map((page) => (
            <Card key={page.id} className="bg-white border border-gray-100 hover:border-blue-300 transition-all duration-200 cursor-pointer group h-[200px] shadow-soft hover:shadow-soft-md p-1">
              <CardContent className="p-0 flex flex-col justify-start items-start h-full">
                {/* Thumbnail */}
                <div className="flex items-center justify-center w-full h-full bg-blue-50 group-hover:bg-blue-100 rounded-lg mb-3 transition-colors">
                  <span className="text-xl">{page.thumbnail}</span>
                </div>

                {/* Content */}
                <div className="space-y-1 w-full px-2 pb-2">
                  <h3 className="font-medium text-gray-900 text-sm leading-tight truncate">
                    {page.title}
                  </h3>

                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-gray-500">
                      {page.lastOpened}
                    </span>

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
          ))}
        </div>

        {/* Empty State for when no pages */}
        {pages.length === 0 && (
          <div className="flex flex-col justify-start items-start py-8">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl">📄</span>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No pages yet</h3>
            <p className="text-sm text-gray-500 mb-3">Create your first page to get started.</p>
            <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

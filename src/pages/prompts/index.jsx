import { useEffect, useState, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Sparkles, Copy, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGetPrompts, useCreatePrompt, useUpdatePrompt, useDeletePrompt } from '@/services/apis/prompts';
import { toast } from 'sonner';

const grades = ['Kindergarten', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const subjects = ['math', 'science', 'english', 'history', 'geography', 'art', 'music', 'physical-education', 'computer-science', 'other'];

const subjectColors = {
  math: 'bg-blue-100 text-blue-800 border border-blue-200',
  science: 'bg-green-100 text-green-800 border border-green-200',
  english: 'bg-purple-100 text-purple-800 border border-purple-200',
  history: 'bg-orange-100 text-orange-800 border border-orange-200',
  geography: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  art: 'bg-pink-100 text-pink-800 border border-pink-200',
  music: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  'physical-education': 'bg-red-100 text-red-800 border border-red-200',
  'computer-science': 'bg-teal-100 text-teal-800 border border-teal-200',
  other: 'bg-gray-100 text-gray-800 border border-gray-200',
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatSubject = (subject) => {
  return subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PromptsPage() {
  const { prompts, isLoading: isLoadingPrompts, error: promptsError, getPrompts } = useGetPrompts();
  const { isLoading: isCreating, createPrompt } = useCreatePrompt();
  const { isLoading: isUpdating, updatePrompt } = useUpdatePrompt();
  const { isLoading: isDeleting, deletePrompt } = useDeletePrompt();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [formData, setFormData] = useState({
    grade: '',
    subject: '',
    prompt: '',
    description: '',
    tags: '',
    isActive: true,
  });

  const loadPrompts = useCallback(async () => {
    const result = await getPrompts({ isActive: true });
    if (!result.success && result.error) {
      toast.error(result.error);
    }
  }, [getPrompts]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPrompt(null);
      setFormData({
        grade: '',
        subject: '',
        prompt: '',
        description: '',
        tags: '',
        isActive: true,
      });
    }
  };

  const handleEditClick = (prompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      grade: prompt.grade || '',
      subject: prompt.subject || '',
      prompt: prompt.prompt || '',
      description: prompt.description || '',
      tags: Array.isArray(prompt.tags) ? prompt.tags.join(', ') : '',
      isActive: prompt.isActive !== undefined ? prompt.isActive : true,
    });
    setDialogOpen(true);
  };

  const handleInputChange = (field, value) => {
    if (field === 'isActive') {
      setFormData((prev) => ({ ...prev, [field]: value === 'true' || value === true }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleCreatePrompt = async () => {
    if (!formData.grade || !formData.subject || !formData.prompt) {
      toast.error('Please fill in all required fields');
      return;
    }

    const promptData = {
      grade: formData.grade,
      subject: formData.subject,
      prompt: formData.prompt,
      description: formData.description || undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      isActive: formData.isActive,
    };

    const result = await createPrompt(promptData);
    
    if (result.success) {
      toast.success(result.message || 'Prompt created successfully');
      setDialogOpen(false);
      loadPrompts();
    } else {
      toast.error(result.error || 'Failed to create prompt');
    }
  };

  const handleUpdatePrompt = async () => {
    if (!selectedPrompt || !formData.grade || !formData.subject || !formData.prompt) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updateData = {
      grade: formData.grade,
      subject: formData.subject,
      prompt: formData.prompt,
      description: formData.description || undefined,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      isActive: formData.isActive,
    };

    const result = await updatePrompt(selectedPrompt._id || selectedPrompt.id, updateData);
    
    if (result.success) {
      toast.success(result.message || 'Prompt updated successfully');
      setDialogOpen(false);
      loadPrompts();
    } else {
      toast.error(result.error || 'Failed to update prompt');
    }
  };

  const handleDeletePrompt = async (promptId) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    const result = await deletePrompt(promptId);
    
    if (result.success) {
      toast.success(result.message || 'Prompt deleted successfully');
      loadPrompts();
    } else {
      toast.error(result.error || 'Failed to delete prompt');
    }
  };

  const handleCopyPrompt = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Prompt copied to clipboard');
  };

  const renderSubjectBadge = (subject) => {
    const className = subjectColors[subject] || 'bg-gray-100 text-gray-800 border border-gray-200';
    return <Badge className={className}>{formatSubject(subject)}</Badge>;
  };

  const isLoading = isLoadingPrompts || isCreating || isUpdating || isDeleting;
  const error = promptsError;

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="" />
        <div className="flex items-center gap-2">
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-medium text-gray-700">Prompts</h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button
              variant="soft"
              size="sm"
              className="ml-auto bg-blue-500 text-white"
              onClick={() => {
                setSelectedPrompt(null);
                setFormData({
                  grade: '',
                  subject: '',
                  prompt: '',
                  description: '',
                  tags: '',
                  isActive: true,
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedPrompt ? 'Edit Prompt' : 'Create Prompt'}</DialogTitle>
              <DialogDescription>
                {selectedPrompt
                  ? 'Update the prompt details below.'
                  : 'Create a new prompt template for AI interactions.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="grade">Grade *</Label>
                <select
                  id="grade"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                >
                  <option value="">Select a grade</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Subject *</Label>
                <select
                  id="subject"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {formatSubject(subject)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the prompt"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="prompt">Prompt Content *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter the prompt content..."
                  value={formData.prompt}
                  onChange={(e) => handleInputChange('prompt', e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., math, elementary, tutoring"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('isActive', e.target.value)}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={selectedPrompt ? handleUpdatePrompt : handleCreatePrompt}
                disabled={!formData.grade || !formData.subject || !formData.prompt || isLoading}
              >
                {isLoading ? 'Saving...' : selectedPrompt ? 'Save Changes' : 'Create Prompt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 overflow-auto p-4 px-6">
        {isLoadingPrompts ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-red-600">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadPrompts}>
              Try Again
            </Button>
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-12">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No prompts yet</h3>
            <p className="text-sm text-gray-500 mb-3">Create your first prompt to get started.</p>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((prompt) => (
              <Card key={prompt._id || prompt.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        Grade {prompt.grade} - {formatSubject(prompt.subject)}
                      </CardTitle>
                      <CardDescription className="mb-3">{prompt.description || 'No description'}</CardDescription>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {renderSubjectBadge(prompt.subject)}
                        {prompt.grade && (
                          <Badge variant="outline">Grade {prompt.grade}</Badge>
                        )}
                        {Array.isArray(prompt.tags) && prompt.tags.length > 0 && (
                          <>
                            {prompt.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {prompt.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{prompt.tags.length - 2}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyPrompt(prompt.prompt)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(prompt)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <Separator className="my-1" />
                        <DropdownMenuItem
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletePrompt(prompt._id || prompt.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 line-clamp-3">{prompt.prompt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span>
                        {prompt.updatedAt ? `Updated ${formatDate(prompt.updatedAt)}` : 
                         prompt.createdAt ? `Created ${formatDate(prompt.createdAt)}` : ''}
                      </span>
                      {prompt.isActive !== undefined && (
                        <Badge variant={prompt.isActive ? 'default' : 'secondary'} className="text-xs">
                          {prompt.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

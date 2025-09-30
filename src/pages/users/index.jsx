import { useEffect, useMemo, useState } from 'react';
import {
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useGetUsers, useUpdateUser } from '@/services/apis/users';
import { useRegister } from '@/services/apis/auth/useRegister';

const roleColors = {
  admin: 'bg-green-100 text-green-800 border border-green-200',
  user: 'bg-blue-100 text-blue-800 border border-blue-200',
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const formatTokenCount = (tokens) => {
  if (tokens == null) return '0';
  return tokens.toLocaleString();
};

export default function UsersPage() {
  const { users, isLoading, error, getUsers } = useGetUsers();
  const { updateUser, isLoading: isUpdating } = useUpdateUser();
  const { register, isLoading: isRegistering, error: registerError, clearError: clearRegisterError } = useRegister();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
      setFormData({ name: '', email: '', role: 'user' });
      setFormErrors({});
      clearRegisterError();
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    if (registerError) {
      clearRegisterError();
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!selectedUser?._id && !selectedUser?.id) return;

    if (!validateForm()) return;

    const userId = selectedUser._id || selectedUser.id;

    const result = await updateUser(userId, {
      name: formData.name,
      email: formData.email,
      role: formData.role,
    });

    if (result.success) {
      setDialogOpen(false);
      await getUsers();
    }
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    const result = await register({
      name: formData.name,
      email: formData.email,
      role: formData.role,
    });

    if (result.success) {
      setDialogOpen(false);
      await getUsers();
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const dateA = new Date(a.lastLogin || 0).getTime();
      const dateB = new Date(b.lastLogin || 0).getTime();
      return dateB - dateA;
    });
  }, [users]);

  const renderRoleBadge = (role) => {
    const className = roleColors[role] || 'bg-gray-100 text-gray-800 border border-gray-200';
    return (
      <Badge className={`${className} capitalize`}>{role}</Badge>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="" />
        <div className="flex items-center gap-2">
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-medium text-gray-700">Users Management</h1>
        </div>

        <Button variant="soft" size="sm" className="ml-auto bg-blue-500 text-white" onClick={() => {
          setSelectedUser(null);
          setFormData({ name: '', email: '', role: 'user' });
          setFormErrors({});
          clearRegisterError();
          setDialogOpen(true);
        }}>
          Create User
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-0 space-y-4">
        <Card className="shadow-none border border-gray-200 p-0 gap-1 rounded-none border-t-0">
          <CardContent className="space-y-4 px-0">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm text-red-600">
                <p>{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={getUsers}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">Name</TableHead>
                      <TableHead className="px-5">Email</TableHead>
                      <TableHead className="px-5">Role</TableHead>
                      <TableHead className="px-5">Last Login</TableHead>
                      <TableHead className="px-5">Monthly Tokens</TableHead>
                      <TableHead className="px-5">Total Tokens</TableHead>
                      <TableHead className="px-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {sortedUsers.map((userItem) => (
                      <TableRow key={userItem._id || userItem.id}>
                        <TableCell className="px-5 font-medium capitalize">{userItem.name}</TableCell>
                        <TableCell className="px-5">{userItem.email}</TableCell>
                        <TableCell className="px-5">{renderRoleBadge(userItem.role)}</TableCell>
                        <TableCell className="px-5">{formatDate(userItem.lastLogin)}</TableCell>
                        <TableCell className="px-5">{formatTokenCount(userItem.tokenUsage?.monthlyTokens)}</TableCell>
                        <TableCell className="px-5">{formatTokenCount(userItem.tokenUsage?.totalTokens)}</TableCell>
                        <TableCell className="px-5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(userItem)}
                            className="p-0 text-xs underline cursor-pointer"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? 'Update the details for the selected user.' : 'Fill in the details to create a new user.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              {formErrors.role && (
                <p className="text-xs text-red-500">{formErrors.role}</p>
              )}
              {formData.role === 'admin' && (
                <p className="text-xs text-red-500">Admin users can access and manage the entire application.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isUpdating || isRegistering}>
              Cancel
            </Button>
            {selectedUser ? (
              <Button onClick={handleUpdateUser} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            ) : (
              <Button onClick={handleCreateUser} disabled={isRegistering}>
                {isRegistering ? 'Creating...' : 'Create User'}
              </Button>
            )}
          </DialogFooter>
          {!selectedUser && registerError && (
            <p className="px-1 text-xs text-red-500">{registerError}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


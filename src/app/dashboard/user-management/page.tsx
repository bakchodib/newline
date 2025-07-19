
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Edit, Save } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const userSchema = z.object({
  name: z.string().min(3, "Name is required."),
  loginId: z.string().min(5, "Login ID is required (email or phone)."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['admin', 'agent', 'customer']),
});

type User = z.infer<typeof userSchema>;
type UserData = { [key: string]: Omit<User, 'loginId'> };

const AddUserDialog = ({ onUserAdded }: { onUserAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<User>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = (data: User) => {
    try {
      const usersDb: UserData = JSON.parse(localStorage.getItem('jls_users_db') || '{}');
      if (usersDb[data.loginId]) {
        toast({ variant: 'destructive', title: "Error", description: "A user with this Login ID already exists." });
        return;
      }

      usersDb[data.loginId] = {
        name: data.name,
        password: data.password,
        role: data.role,
      };

      localStorage.setItem('jls_users_db', JSON.stringify(usersDb));
      toast({ title: "User Added", description: `User ${data.name} has been created.` });
      onUserAdded();
      reset();
      setIsOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to add user." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new account for an admin or agent.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="loginId">Login ID (Email or Phone)</Label>
            <Input id="loginId" {...register('loginId')} />
            {errors.loginId && <p className="text-destructive text-sm mt-1">{errors.loginId.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value) => (register('role').onChange({ target: { value } }))} name={register('role').name}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
            </Select>
            {errors.role && <p className="text-destructive text-sm mt-1">{errors.role.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const UserList = ({ users, onUserUpdated, onUserDeleted }: { users: User[], onUserUpdated: () => void, onUserDeleted: (loginId: string) => void }) => {
    const { toast } = useToast();

    const handleRoleChange = (loginId: string, newRole: 'admin' | 'agent' | 'customer') => {
        try {
            const usersDb: UserData = JSON.parse(localStorage.getItem('jls_users_db') || '{}');
            if (usersDb[loginId]) {
                usersDb[loginId].role = newRole;
                localStorage.setItem('jls_users_db', JSON.stringify(usersDb));
                toast({ title: 'Role Updated', description: `User role has been changed to ${newRole}.` });
                onUserUpdated();
            }
        } catch(e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user role.' });
        }
    };
    
    if (users.length === 0) {
        return <p className="text-muted-foreground mt-4">No users found.</p>;
    }

    return (
        <div className="mt-6 rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Login ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.loginId}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.loginId}</TableCell>
                            <TableCell>
                                <Select value={user.role} onValueChange={(value) => handleRoleChange(user.loginId, value as User['role'])}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="agent">Agent</SelectItem>
                                        <SelectItem value="customer">Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the user account.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onUserDeleted(user.loginId)} className="bg-destructive hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};


export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const { toast } = useToast();

    const fetchUsers = () => {
        try {
            const usersDb: UserData = JSON.parse(localStorage.getItem('jls_users_db') || '{}');
            const userList: User[] = Object.entries(usersDb).map(([loginId, data]) => ({
                loginId,
                name: data.name,
                role: data.role,
                password: data.password, // This is kept for consistency but should not be displayed
            }));
            setUsers(userList);
        } catch (e) {
            console.error("Failed to fetch users", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUserDeleted = (loginId: string) => {
        try {
            const usersDb: UserData = JSON.parse(localStorage.getItem('jls_users_db') || '{}');
            delete usersDb[loginId];
            localStorage.setItem('jls_users_db', JSON.stringify(usersDb));
            toast({ title: 'User Deleted', description: `User with ID ${loginId} has been removed.`, variant: 'destructive' });
            fetchUsers(); // Refresh the list
        } catch (e) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete user.' });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and roles in the system.</CardDescription>
                </div>
                <AddUserDialog onUserAdded={fetchUsers} />
            </CardHeader>
            <CardContent>
                <UserList users={users} onUserUpdated={fetchUsers} onUserDeleted={handleUserDeleted} />
            </CardContent>
        </Card>
    );
}

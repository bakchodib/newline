
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  loginId: z.string().email("Please enter a valid email address for the Login ID."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['admin', 'agent', 'customer']),
});

export type User = z.infer<typeof userSchema> & { id: string, authUid: string };

const AddUserDialog = ({ onUserAdded }: { onUserAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    try {
      // Step 1: Create user in Supabase Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.loginId,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Supabase Auth user creation failed.");
      
      const supabaseUser = authData.user;

      // Step 2: Save user profile to our public 'users' table
      const { password, ...userData } = data;
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          ...userData,
          authUid: supabaseUser.id // Link profile to Auth user
        });

      if (dbError) throw dbError;

      toast({ title: "User Added", description: `User ${data.name} has been created.` });
      onUserAdded();
      reset();
      setIsOpen(false);
    } catch (e: any) {
      console.error("Error adding user:", e);
      toast({ variant: 'destructive', title: "Registration Failed", description: e.message });
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
          <DialogDescription>Create a new account for an admin, agent or customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="loginId">Login ID (Email)</Label>
            <Input id="loginId" {...register('loginId')} type="email" />
            {errors.loginId && <p className="text-destructive text-sm mt-1">{errors.loginId.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Controller
                name="role"
                control={control}
                render={({ field }) => (
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
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

const UserList = ({ users, onUserUpdated, onUserDeleted }: { users: User[], onUserUpdated: () => void, onUserDeleted: (user: User) => void }) => {
    const { toast } = useToast();

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'agent' | 'customer') => {
        try {
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            toast({ title: 'Role Updated', description: `User role has been changed to ${newRole}.` });
            onUserUpdated();
        } catch(e: any) {
            console.error("Error updating role:", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to update user role.' });
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
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.loginId}</TableCell>
                            <TableCell>
                                <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value as User['role'])}>
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
                                                This action cannot be undone. This will permanently delete the user account from both authentication and the database.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onUserDeleted(user)} className="bg-destructive hover:bg-destructive/90">
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

    const fetchUsers = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            setUsers(data as User[]);
        } catch (e: any) {
            console.error("Failed to fetch users", e);
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not load user data.' });
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserDeleted = async (user: User) => {
        // Deleting a Supabase Auth user requires a special admin client, which should be done in a secure backend environment (e.g., a Supabase Edge Function).
        // This client-side delete will only remove the user from the 'users' table.
        // For a full implementation, a backend function is recommended to delete the Auth user.
        try {
            const { error } = await supabase.from('users').delete().eq('id', user.id);
            if (error) throw error;
            toast({ title: 'User Deleted', description: `User profile for ${user.name} has been removed. The Auth record still exists.`, variant: 'destructive' });
            fetchUsers(); // Refresh the list
        } catch (e: any) {
             console.error("Error deleting user: ", e);
             toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to delete user profile.' });
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

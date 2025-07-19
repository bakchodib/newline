
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
// import { useAuth } from '@/hooks/useAuth';

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
    defaultValues: {
      role: 'admin',
    }
  });

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.loginId,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Supabase Auth user creation failed.");
      
      const supabaseUser = authData.user;

      const { error: dbError } = await supabase
        .from('users')
        .insert({
          name: data.name,
          loginId: data.loginId,
          role: data.role,
          authUid: supabaseUser.id
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
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Create an account for a new staff member or administrator.</DialogDescription>
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
                defaultValue="admin"
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


const UserList = ({ users, onDeleteUser }: { users: User[], onDeleteUser: (id: string, authUid: string) => void }) => {
    if (users.length === 0) {
        return (
            <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No users found. Add one to get started.</p>
            </div>
        )
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
                            <TableCell>{user.role}</TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the user's account.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteUser(user.id, user.authUid)} className="bg-destructive hover:bg-destructive/90">
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
    )
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const { toast } = useToast();

    const fetchUsers = useCallback(async () => {
       try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            setUsers(data as User[]);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message || "Could not load users." });
            setUsers([]);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleDeleteUser = async (id: string, authUid: string) => {
      // In a real app, you would need an admin client to delete other users.
      // Supabase client-side can only delete the currently logged in user.
      // This will likely fail due to permissions unless you have RLS policies that allow it.
      // For this demo, we assume an admin can delete.
      try {
        // First delete from your public users table
        const { error: dbError } = await supabase.from('users').delete().eq('id', id);
        if (dbError) throw dbError;
        
        // This part requires admin privileges and won't work from the client by default.
        // It's here for completeness but will need server-side logic in a real app.
        // const { error: authError } = await supabase.auth.admin.deleteUser(authUid);
        // if (authError) throw authError;

        toast({
            title: "User Deleted",
            description: `User record has been removed from the database.`,
        });
        fetchUsers(); // Refresh the list
      } catch (error: any) {
        console.error("Error deleting user: ", error);
        toast({ variant: "destructive", title: "Deletion Error", description: error.message || "Failed to delete user. Admin rights may be required." });
      }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Add, view, and remove system users.</CardDescription>
                </div>
                <AddUserDialog onUserAdded={fetchUsers} />
            </CardHeader>
            <CardContent>
                <UserList users={users} onDeleteUser={handleDeleteUser} />
            </CardContent>
        </Card>
    );
}

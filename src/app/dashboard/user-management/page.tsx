
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Info, Loader2 } from 'lucide-react';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Schema with password, required for creation
const newUserSchema = z.object({
  name: z.string().min(3, "Name is required."),
  loginId: z.string().email("Please enter a valid email address for the Login ID."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['admin', 'agent', 'customer']),
});

export type User = {
    id: string;
    authUid: string;
    name: string;
    loginId: string;
    role: 'admin' | 'agent' | 'customer';
};


const AddUserDialog = ({ onUserAdded }: { onUserAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      role: 'admin',
    }
  });

  const onSubmit = async (data: z.infer<typeof newUserSchema>) => {
    try {
      // Step 1: Create the auth user in Supabase.
      // We disable email confirmation for a smoother setup experience.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.loginId,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: data.name,
            role: data.role,
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed, no user returned.");

      // Step 2: Insert the user profile into the public `users` table.
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          authUid: authData.user.id, // Link to the auth user
          name: data.name,
          loginId: data.loginId,
          role: data.role,
        });
      
      if (profileError) throw profileError;

      toast({ 
        title: "User Created Successfully", 
        description: `${data.name} can now log in with their credentials.` 
      });
      onUserAdded();
      reset();
      setIsOpen(false);
    } catch (e: any) {
      console.error("Error adding user:", e);
      toast({ variant: 'destructive', title: "User Creation Failed", description: e.message || "An unexpected error occurred." });
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
          <DialogDescription>
            Fill out the form to add a new user to the system.
          </DialogDescription>
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
            <Input id="password" {...register('password')} type="password" />
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
                            <SelectItem value="customer">Customer (Manual Create)</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.role && <p className="text-destructive text-sm mt-1">{errors.role.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="animate-spin" /> Saving...</> : 'Save User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const UserList = ({ users, onDeleteUser }: { users: User[], onDeleteUser: (authUid: string, id: string) => void }) => {
    if (users.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-48 border-2 border-dashed rounded-lg text-center">
                <p className="text-muted-foreground font-semibold">No users found.</p>
                <p className="text-muted-foreground text-sm">Add your first user to get started.</p>
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
                                               This action cannot be undone. This will permanently delete the user's account and profile data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteUser(user.authUid, user.id)} className="bg-destructive hover:bg-destructive/90">
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
    
    const handleDeleteUser = async (authUid: string, id: string) => {
      try {
        // We need an admin client to delete users, which is not secure on the client-side.
        // For this demo, we will just delete the profile from our public table.
        // In a real production app, you would call a secure Supabase Edge Function.
        const { error: dbError } = await supabase.from('users').delete().eq('id', id);
        if (dbError) throw dbError;
        
        toast({
            title: "User Profile Deleted",
            description: `User record has been removed. Deleting the auth user requires admin privileges and should be done from the Supabase dashboard.`,
            variant: "destructive"
        });
        fetchUsers(); 
      } catch (error: any) {
        console.error("Error deleting user: ", error);
        toast({ variant: "destructive", title: "Deletion Error", description: error.message || "Failed to delete user." });
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
                 <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 !text-blue-700" />
                    <AlertTitle className="text-blue-800">User Creation</AlertTitle>
                    <AlertDescription className="text-blue-700">
                       Adding a user here creates their login credentials and profile in one step. Email confirmation is disabled for this demo.
                    </AlertDescription>
                </Alert>
                <UserList users={users} onDeleteUser={handleDeleteUser} />
            </CardContent>
        </Card>
    );
}

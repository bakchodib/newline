
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Info } from 'lucide-react';
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

// Schema without password
const userSchema = z.object({
  name: z.string().min(3, "Name is required."),
  loginId: z.string().email("Please enter a valid email address for the Login ID."),
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
      // Step 1: Just add the user to the public `users` table.
      // We are skipping Supabase Auth user creation from the client.
      const { error } = await supabase
        .from('users')
        .insert({
          name: data.name,
          loginId: data.loginId,
          role: data.role,
          // authUid will be null for now, this is okay.
        });

      if (error) throw error;

      toast({ 
        title: "User Profile Created", 
        description: `Profile for ${data.name} added. Now, add them as an auth user in the Supabase dashboard.` 
      });
      onUserAdded();
      reset();
      setIsOpen(false);
    } catch (e: any) {
      console.error("Error adding user profile:", e);
      toast({ variant: 'destructive', title: "Profile Creation Failed", description: e.message });
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
          <DialogTitle>Create New User Profile</DialogTitle>
          <DialogDescription>
            This will add a user to the system. You must then add them as an authentication user in your Supabase dashboard.
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
                            <SelectItem value="customer">Customer (Not recommended)</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.role && <p className="text-destructive text-sm mt-1">{errors.role.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save User Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const UserList = ({ users, onDeleteUser }: { users: User[], onDeleteUser: (id: string, authUid: string | null) => void }) => {
    if (users.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-48 border-2 border-dashed rounded-lg text-center">
                <p className="text-muted-foreground font-semibold">No users found.</p>
                <p className="text-muted-foreground text-sm">Add your first user profile to get started.</p>
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
                                                This action will delete the user's profile from your table. You may also need to delete them from the Supabase Auth section.
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
    
    const handleDeleteUser = async (id: string, authUid: string | null) => {
      try {
        const { error: dbError } = await supabase.from('users').delete().eq('id', id);
        if (dbError) throw dbError;
        
        toast({
            title: "User Profile Deleted",
            description: `User record has been removed. If they are an auth user, you may need to remove them from the Supabase dashboard.`,
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
                    <CardDescription>Add, view, and remove system user profiles.</CardDescription>
                </div>
                <AddUserDialog onUserAdded={fetchUsers} />
            </CardHeader>
            <CardContent>
                 <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 !text-blue-700" />
                    <AlertTitle className="text-blue-800">Important: Two-Step Process</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        <strong>Step 1:</strong> Use the "Add New User" button to create a user profile here.
                        <br/>
                        <strong>Step 2:</strong> Go to your <strong>Supabase Dashboard</strong> {'->'} Authentication section and click "Add user" to create a matching login with the same email.
                    </AlertDescription>
                </Alert>
                <UserList users={users} onDeleteUser={handleDeleteUser} />
            </CardContent>
        </Card>
    );
}

    
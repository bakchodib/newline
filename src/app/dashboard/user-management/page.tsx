
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Trash2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
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

export type User = {
    id: string;
    authUid: string;
    name: string;
    loginId: string;
    role: 'admin' | 'agent' | 'customer';
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
                    <CardDescription>View and remove system users.</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/dashboard/user-management/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New User
                  </Link>
                </Button>
            </CardHeader>
            <CardContent>
                 <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 !text-blue-700" />
                    <AlertTitle className="text-blue-800">User Management</AlertTitle>
                    <AlertDescription className="text-blue-700">
                       Add new users from the dedicated registration page. You can view all existing users here.
                    </AlertDescription>
                </Alert>
                <UserList users={users} onDeleteUser={handleDeleteUser} />
            </CardContent>
        </Card>
    );
}

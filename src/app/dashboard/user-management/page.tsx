
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Trash2, Info } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    id: string; // This will be the document ID from Firestore (same as auth UID)
    name: string;
    loginId: string;
    role: 'admin' | 'agent' | 'customer';
};

const UserList = ({ users, onDeleteUser }: { users: User[], onDeleteUser: (id: string) => void }) => {
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
                                               This will only delete the user's profile data from Firestore. The user's authentication account must be deleted from the Firebase Console.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
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
            const usersCollection = collection(db, 'users');
            const userSnapshot = await getDocs(usersCollection);
            const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(userList);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message || "Could not load users." });
            setUsers([]);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleDeleteUser = async (id: string) => {
      try {
        // Deletes the user profile from Firestore.
        // Deleting the Firebase Auth user requires the Admin SDK, which cannot be used securely on the client.
        // This must be done from the Firebase Console or a secure backend environment.
        await deleteDoc(doc(db, "users", id));
        
        toast({
            title: "User Profile Deleted",
            description: `User record has been removed from Firestore. Please delete the user from the Firebase Authentication console.`,
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
                       Add new agent or admin users from the dedicated registration page. You can view all existing users here. Deleting a user here only removes their data, not their login.
                    </AlertDescription>
                </Alert>
                <UserList users={users} onDeleteUser={handleDeleteUser} />
            </CardContent>
        </Card>
    );
}

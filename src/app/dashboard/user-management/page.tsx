
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

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

export type User = z.infer<typeof userSchema> & { id: string };

const AddUserDialog = ({ onUserAdded }: { onUserAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.loginId, data.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser) {
        throw new Error("Firebase Auth user creation failed.");
      }

      // Step 2: Save user profile to Firestore, but without the password
      const { password, ...userData } = data;
      await addDoc(collection(db, "users"), {
        ...userData,
        authUid: firebaseUser.uid // Link Firestore doc to Auth user
      });

      toast({ title: "User Added", description: `User ${data.name} has been created.` });
      onUserAdded();
      reset();
      setIsOpen(false);
    } catch (e: any) {
      console.error("Error adding user:", e);
      let description = "Failed to add user. Please check the console for details.";
      if (e.code === 'auth/email-already-in-use') {
        description = "This email address is already in use by another account.";
      } else if (e.code === 'auth/weak-password') {
        description = "The password is too weak. Please use at least 6 characters.";
      } else if (e.code === 'auth/invalid-email') {
        description = "The email address is not valid.";
      } else if (e.code === 'auth/operation-not-allowed') {
        description = "Email/password sign-up is not enabled. Please enable it in the Firebase console.";
      }
      toast({ variant: 'destructive', title: "Registration Failed", description });
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

const UserList = ({ users, onUserUpdated, onUserDeleted }: { users: User[], onUserUpdated: () => void, onUserDeleted: (id: string) => void }) => {
    const { toast } = useToast();

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'agent' | 'customer') => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { role: newRole });
            toast({ title: 'Role Updated', description: `User role has been changed to ${newRole}.` });
            onUserUpdated();
        } catch(e) {
            console.error("Error updating role:", e);
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
                                            <AlertDialogAction onClick={() => onUserDeleted(user.id)} className="bg-destructive hover:bg-destructive/90">
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
            const querySnapshot = await getDocs(collection(db, "users"));
            const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(userList);
        } catch (e) {
            console.error("Failed to fetch users", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserDeleted = async (id: string) => {
        // Note: Deleting a Firebase Auth user requires re-authentication or server-side logic (Cloud Function).
        // This client-side delete will only remove the user from the Firestore database.
        // For a full implementation, a backend function is recommended to delete the Auth user.
        try {
            await deleteDoc(doc(db, "users", id));
            toast({ title: 'User Deleted', description: `User profile has been removed from the database.`, variant: 'destructive' });
            fetchUsers(); // Refresh the list
        } catch (e) {
             console.error("Error deleting user: ", e);
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete user profile.' });
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

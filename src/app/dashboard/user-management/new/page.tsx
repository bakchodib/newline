
"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const newUserSchema = z.object({
  name: z.string().min(3, "Name is required."),
  loginId: z.string().email("Please enter a valid email address for the Login ID."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['admin', 'agent', 'customer']),
});

export default function NewUserPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      role: 'agent',
    }
  });

  const onSubmit = async (data: z.infer<typeof newUserSchema>) => {
    try {
      // NOTE: Firebase Auth doesn't allow creating users with password from the client-side
      // without signing them in. This functionality is intended for an Admin SDK on a server.
      // For this client-side only app, we have to use a workaround. We will create the user
      // but this will also sign in the admin as the new user. The admin will need to log out and log back in.
      // A better solution involves a server-side function (e.g., Firebase Cloud Function).
      
      const userCredential = await createUserWithEmailAndPassword(auth, data.loginId, data.password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("User creation failed in Firebase Auth.");
      }

      // 2. Create the user's profile in Firestore
      const userProfile = {
        name: data.name,
        loginId: data.loginId,
        role: data.role,
      };
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      toast({ 
        title: "User Created Successfully", 
        description: `${data.name} can now log in. You have been logged in as this new user. Please log out and back in with your admin account.` 
      });
      router.push('/dashboard/user-management');

    } catch (e: any) {
      console.error("Error adding user:", e);
      toast({ variant: 'destructive', title: "User Creation Failed", description: e.message || "An unexpected error occurred." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <UserPlus className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Register New User</CardTitle>
            <CardDescription>
              Create a new user account with login credentials and an assigned role.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
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
                defaultValue="agent"
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
          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="animate-spin" /> Saving User...</> : 'Create User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

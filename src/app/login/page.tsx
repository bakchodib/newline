
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Lock, LogIn, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@jls.com");
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Email and password are required.",
        });
        return;
    }
    setIsLoading(true);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        if (data.user) {
          // Fetch user profile from your 'users' table
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('authUid', data.user.id)
            .single();
          
          if(profileError) throw new Error("Could not find user profile. Please contact admin.");
          if(!userProfile) throw new Error("User profile not found.");

          toast({
            title: "Login Successful",
            description: `Welcome back, ${userProfile.name}!`,
          });

          // Store user session info
          const userData = {
              id: userProfile.id,
              loginId: userProfile.loginId,
              name: userProfile.name,
              role: userProfile.role,
              authUid: data.user.id,
          };
          localStorage.setItem("jls_user", JSON.stringify(userData));
          router.push("/dashboard");

        } else {
            throw new Error("Login failed, no user data returned.");
        }

    } catch (error: any) {
        console.error("Login failed:", error);
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message || "Invalid credentials. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription>
            Log in to your JLS Finance account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
             <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Demo Credentials</AlertTitle>
              <AlertDescription>
                Use <strong>admin@jls.com</strong> / <strong>password</strong> to log in.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative flex items-center">
                <AtSign className="absolute left-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., your.email@jls.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log In"}
              <LogIn className="ml-2 h-5 w-5" />
            </Button>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>First-time user?</AlertTitle>
              <AlertDescription>
                Contact an admin or use the User Management page to create an account.
              </AlertDescription>
            </Alert>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

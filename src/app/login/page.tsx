
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Lock, LogIn } from "lucide-react";
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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router]);

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
          
          if(profileError) throw profileError;

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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative flex items-center">
                <AtSign className="absolute left-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., admin@jls.com"
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
              <div className="flex items-center text-sm">
                <a href="#" className="ml-auto font-medium text-primary hover:underline">Forgot password?</a>
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account? <a href="#" className="font-medium text-primary hover:underline">Contact support</a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

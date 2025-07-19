
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Lock, LogIn } from "lucide-react";

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

// Initial set of users, will be stored in localStorage
const initialUsers = {
  "admin@jls.com": { password: "password", role: "admin", name: "Admin User" },
  "agent@jls.com": { password: "password", role: "agent", name: "Agent Smith" },
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // On first load, check if the user database exists in localStorage.
    // If not, initialize it with the default admin/agent users.
    if (!localStorage.getItem("jls_users_db")) {
      localStorage.setItem("jls_users_db", JSON.stringify(initialUsers));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Email/ID and password are required.",
        });
        return;
    }
    setIsLoading(true);

    setTimeout(() => {
      // Read the user database from localStorage
      const usersDb = JSON.parse(localStorage.getItem("jls_users_db") || "{}");
      const user = usersDb[email as keyof typeof usersDb];

      if (user && user.password === password) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${user.name}!`,
        });
        // Simulate session by storing user data in localStorage
        // The email key is used to store the login ID (which can be an email or phone number)
        localStorage.setItem("jls_user", JSON.stringify({ email, ...user }));
        router.push("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
        });
        setIsLoading(false);
      }
    }, 1000); // Simulate network delay
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
            Customers can log in with their registered phone number.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email or Phone Number</Label>
              <div className="relative flex items-center">
                <AtSign className="absolute left-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  placeholder="e.g., admin@jls.com or +919876543210"
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

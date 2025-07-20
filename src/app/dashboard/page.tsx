"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HandCoins, Users, Banknote, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-9 w-72 mb-2" />
                <Skeleton className="h-5 w-96" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome back, {user?.name}!
                </h1>
                <p className="text-muted-foreground">
                    Here's a summary of your account activity.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Customers
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">1,234</p>
                        <p className="text-xs text-muted-foreground">+25 this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Loans
                        </CardTitle>
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">567</p>
                        <p className="text-xs text-muted-foreground">Value: $1.2M</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Disbursed
                        </CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">$89,123</p>
                        <p className="text-xs text-muted-foreground">in last 30 days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Overdue EMIs
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">42</p>
                        <p className="text-xs text-muted-foreground">Totaling $4,530</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        A log of recent actions and events in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        No recent activity to show.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

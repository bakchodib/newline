import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function UserManagementPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">The interface to add, edit, and remove users and assign roles will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

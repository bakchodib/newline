import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function CustomersPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Register new customers and manage existing ones.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">The customer registration form and customer list will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

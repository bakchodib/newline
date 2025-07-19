import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function AdminPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>Manage system settings and trigger administrative actions.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Simulated API triggers (e.g., WhatsApp, PDF generation) for administrators will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

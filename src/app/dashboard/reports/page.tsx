import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function ReportsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Generate and download reports for analysis.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">EMI reports with filters and download options will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

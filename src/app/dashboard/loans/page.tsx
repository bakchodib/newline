import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function LoansPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Management</CardTitle>
                <CardDescription>Disburse new loans and track EMI collections.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Loan disbursal forms and EMI management tables will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

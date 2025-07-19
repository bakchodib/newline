import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function LoanApprovalsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Approvals</CardTitle>
                <CardDescription>Approve or reject submitted loan applications.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">A list of applications awaiting approval with approve/reject actions will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function ReceiptsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Receipts</CardTitle>
                <CardDescription>Generate and view payment receipts for collected EMIs.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">A list of all payment transactions with options to generate receipts will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

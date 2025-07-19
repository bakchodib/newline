import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function EmiCollectionPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>EMI Collection</CardTitle>
                <CardDescription>Record and track EMI payments from customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">The interface to search for customers/loans and record EMI payments will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

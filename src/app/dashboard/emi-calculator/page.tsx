import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function EmiCalculatorPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>EMI Calculator</CardTitle>
                <CardDescription>Calculate loan EMIs based on amount, tenure, and interest rate.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">An interactive EMI calculator tool will be implemented here.</p>
            </CardContent>
        </Card>
    );
}

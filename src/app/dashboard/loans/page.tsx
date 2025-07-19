import { LoanDocuments } from "@/components/loan-documents";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function LoansPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Loan Management</CardTitle>
                    <CardDescription>Disburse new loans, track EMI collections, and generate documents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Loan disbursal forms and EMI management tables will be implemented here.</p>
                     <LoanDocuments />
                </CardContent>
            </Card>
        </div>
    );
}

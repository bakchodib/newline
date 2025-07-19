
"use client";

import React, { useState, useEffect } from 'react';
import { CheckSquare, HandCoins, ThumbsUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import type { LoanApplication } from '@/app/dashboard/loans/applications/page';
import type { Customer } from '@/app/dashboard/customers/page';

export default function LoanApprovalsPage() {
    const [pendingLoans, setPendingLoans] = useState<LoanApplication[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const storedCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
            setCustomers(storedCustomers);
            const storedPending = JSON.parse(localStorage.getItem('jls_pending_loans') || '[]');
            setPendingLoans(storedPending);
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
        }
    }, []);

    const findCustomerName = (customerId: string) => {
        return customers.find(c => c.id === customerId)?.name || 'Unknown';
    };

    const handleApprove = (appId: string) => {
        const loanToApprove = pendingLoans.find(app => app.id === appId);
        if (!loanToApprove) return;

        // Update status and move to approved list
        const approvedLoan = { ...loanToApprove, status: 'approved' as const };
        const approvedLoans = JSON.parse(localStorage.getItem('jls_approved_loans') || '[]');
        localStorage.setItem('jls_approved_loans', JSON.stringify([...approvedLoans, approvedLoan]));

        // Remove from pending list
        const updatedPending = pendingLoans.filter(app => app.id !== appId);
        localStorage.setItem('jls_pending_loans', JSON.stringify(updatedPending));
        setPendingLoans(updatedPending);

        toast({
            title: "Loan Approved",
            description: `Loan application ${appId} has been approved.`,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Approvals</CardTitle>
                <CardDescription>Review and approve pending loan applications.</CardDescription>
            </CardHeader>
            <CardContent>
                {pendingLoans.length === 0 ? (
                     <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                        <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Applications to Approve</h3>
                        <p className="text-muted-foreground">Approved applications will appear in the disbursal section.</p>
                    </div>
                ) : (
                    <div className="mt-6 rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Application ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingLoans.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell className="font-medium">{app.id}</TableCell>
                                        <TableCell>{findCustomerName(app.customerId)}</TableCell>
                                        <TableCell>Rs. {app.amount.toLocaleString()}</TableCell>
                                        <TableCell>{new Date(app.applicationDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => handleApprove(app.id!)}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

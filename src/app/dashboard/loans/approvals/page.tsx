
"use client";

import React, { useState, useEffect } from 'react';
import { CheckSquare, ThumbsUp } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    const fetchAllData = async () => {
         try {
            const customersCollection = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersCollection);
            const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customerList);

            const appsCollection = collection(db, 'loanApplications');
            const appsSnapshot = await getDocs(appsCollection);
            const appsList = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanApplication));
            setPendingLoans(appsList.filter(app => app.status === 'pending'));

        } catch (e) {
            console.error("Failed to parse data from Firestore", e);
        }
    };
    
    useEffect(() => {
        fetchAllData();
    }, []);

    const findCustomerName = (customerId: string) => {
        return customers.find(c => c.id === customerId)?.name || 'Unknown';
    };

    const handleApprove = async (appId: string) => {
        const loanToApprove = pendingLoans.find(app => app.id === appId);
        if (!loanToApprove) return;

        try {
            const loanRef = doc(db, "loanApplications", appId);
            await updateDoc(loanRef, { status: 'approved' });
            
            fetchAllData(); // Refresh the list
            
            toast({
                title: "Loan Approved",
                description: `Loan application ${appId} has been approved.`,
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: `Failed to approve loan: ${e.message}`});
        }
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
                                        <TableCell>{app.applicationDate.toDate().toLocaleDateString()}</TableCell>
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


"use client";

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { HandCoins } from 'lucide-react';
import { format } from 'date-fns';

import { LoanDocuments } from "@/components/loan-documents";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import type { Customer } from '@/app/dashboard/customers/page';


const loanSchema = z.object({
  id: z.string().optional(),
  customerId: z.string({ required_error: "Please select a customer." }),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative."),
  tenure: z.coerce.number().int().min(1, "Tenure must be at least 1 month."),
  disbursalDate: z.date({ required_error: "Disbursal date is required." }),
  processingFee: z.coerce.number().min(0).optional(),
});

export type Loan = z.infer<typeof loanSchema>;


const LoanList = ({ loans, customers }: { loans: (Loan & {id: string})[], customers: Customer[] }) => {
    
    const findCustomer = (customerId: string) => customers.find(c => c.id === customerId);

    if (loans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                <HandCoins className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Active Loans</h3>
                <p className="text-muted-foreground">Disbursed loans will appear here.</p>
            </div>
        )
    }

    return (
        <div className="mt-6 rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Loan ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Documents</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loans.map((loan) => {
                        const customer = findCustomer(loan.customerId);
                        return (
                            <TableRow key={loan.id}>
                                <TableCell className="font-medium">{loan.id}</TableCell>
                                <TableCell>{customer?.name || 'Unknown'}</TableCell>
                                <TableCell>Rs. {loan.amount.toLocaleString()}</TableCell>
                                <TableCell>{loan.interestRate}%</TableCell>
                                <TableCell>{loan.tenure} m</TableCell>
                                <TableCell>{format(new Date(loan.disbursalDate), "PP")}</TableCell>
                                <TableCell className="text-center space-x-1">
                                    {customer && <LoanDocuments customer={customer} loan={loan} />}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

export default function AllLoansPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loans, setLoans] = useState<(Loan & {id: string})[]>([]);

    useEffect(() => {
        try {
            const storedCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
            setCustomers(storedCustomers);
            const storedLoans = JSON.parse(localStorage.getItem('jls_loans') || '[]');
            setLoans(storedLoans.map((l: Loan) => ({...l, disbursalDate: new Date(l.disbursalDate)})));
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
            setCustomers([]);
            setLoans([]);
        }
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>All Loans</CardTitle>
                        <CardDescription>View all disbursed loans and manage them.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <LoanList loans={loans} customers={customers} />
                </CardContent>
            </Card>
        </div>
    );
}

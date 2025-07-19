
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HandCoins, Eye, Edit, CalendarIcon, Loader2, PlusCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { collection, getDocs, doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoanDocuments } from "@/components/loan-documents";
import { LoanDetailsView } from "@/components/loan-details-view";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Customer } from '@/app/dashboard/customers/page';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const topUpSchema = z.object({
    id: z.string().optional(),
    topupDate: z.date(),
    topupAmount: z.coerce.number().min(1),
    processingFee: z.coerce.number().min(0),
    interestRate: z.coerce.number().min(0),
    tenure: z.coerce.number().int().min(1),
});

const loanSchema = z.object({
  id: z.string().optional(),
  customerId: z.string({ required_error: "Please select a customer." }),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative."),
  tenure: z.coerce.number().int().min(1, "Tenure must be at least 1 month."),
  disbursalDate: z.union([z.instanceof(Timestamp), z.date()]),
  processingFee: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'closed']).default('active'),
  closureDetails: z.object({
    closureDate: z.date(),
    closureCharges: z.number(),
    remarks: z.string().optional(),
  }).optional(),
  topupHistory: z.array(topUpSchema).optional(),
});

export type Loan = z.infer<typeof loanSchema>;
export type TopUp = z.infer<typeof topUpSchema>;

type Emi = {
  id: string;
  loanId: string;
  installment: number;
  dueDate: Timestamp;
  amount: number;
  status: 'paid' | 'unpaid';
};

const generateEmiSchedule = (loanId: string, amount: number, annualRate: number, tenureMonths: number, startDate: Date) => {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate <= 0) { // Avoid division by zero or negative rates
        const emiAmount = amount / tenureMonths;
        const schedule = [];
        for (let i = 1; i <= tenureMonths; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(startDate.getMonth() + i);
            schedule.push({
                loanId: loanId,
                installment: i,
                dueDate: Timestamp.fromDate(dueDate),
                amount: parseFloat(emiAmount.toFixed(2)),
                status: 'unpaid' as const,
            });
        }
        return schedule;
    }

    const emiAmount = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        schedule.push({
            loanId: loanId,
            installment: i,
            dueDate: Timestamp.fromDate(dueDate),
            amount: parseFloat(emiAmount.toFixed(2)),
            status: 'unpaid' as const,
        });
    }
    return schedule;
};


const LoanList = ({ loans, customers, onLoanUpdated }: { loans: Loan[], customers: Customer[], onLoanUpdated: () => void }) => {
    
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

    const toDate = (date: Date | Timestamp) => {
        return date instanceof Timestamp ? date.toDate() : date;
    }

    return (
        <div className="mt-6 rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Loan ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loans.map((loan) => {
                        const customer = findCustomer(loan.customerId);
                        return (
                            <TableRow key={loan.id} className={cn(loan.status === 'closed' && 'bg-muted/50 text-muted-foreground')}>
                                <TableCell className="font-medium">{loan.id}</TableCell>
                                <TableCell>{customer?.name || 'Unknown'}</TableCell>
                                <TableCell>Rs. {loan.amount.toLocaleString()}</TableCell>
                                <TableCell>{loan.tenure} m</TableCell>
                                <TableCell>{format(toDate(loan.disbursalDate), "PP")}</TableCell>
                                <TableCell>
                                    <Badge variant={loan.status === 'closed' ? 'destructive' : 'default'} className={cn(loan.status === 'active' && 'bg-green-600')}>
                                        {loan.status ? loan.status.charAt(0).toUpperCase() + loan.status.slice(1) : 'Active'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {customer && (
                                        <TooltipProvider>
                                            <div className="flex justify-center items-center gap-1">
                                               <Tooltip>
                                                   <TooltipTrigger asChild>
                                                       <LoanDetailsView loan={loan} customer={customer} />
                                                   </TooltipTrigger>
                                                   <TooltipContent><p>View Details</p></TooltipContent>
                                               </Tooltip>
                                               <LoanDocuments customer={customer} loan={loan} />
                                            </div>
                                        </TooltipProvider>
                                    )}
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
    const [loans, setLoans] = useState<Loan[]>([]);

    const fetchLoans = async () => {
         try {
            const customersCollection = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersCollection);
            const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customerList);

            const loansCollection = collection(db, 'loans');
            const loanSnapshot = await getDocs(loansCollection);
            const loanList = loanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
            setLoans(loanList);
        } catch (e: any) {
            console.error("Failed to parse data from Firestore", e);
            setCustomers([]);
            setLoans([]);
        }
    }

    useEffect(() => {
        fetchLoans();
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
                    <LoanList loans={loans} customers={customers} onLoanUpdated={fetchLoans} />
                </CardContent>
            </Card>
        </div>
    );
}

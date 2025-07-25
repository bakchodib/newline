
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Banknote, CalendarIcon, Send } from 'lucide-react';
import { collection, getDocs, doc, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { cn } from '@/lib/utils';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import type { LoanApplication } from '@/app/dashboard/loans/applications/page';
import type { Customer } from '@/app/dashboard/customers/page';
import type { Loan } from '@/app/dashboard/loans/all/page';

const disbursalSchema = z.object({
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative."),
  tenure: z.coerce.number().int().min(1, "Tenure must be at least 1 month."),
  disbursalDate: z.date({ required_error: "Disbursal date is required." }),
});

type DisbursalForm = z.infer<typeof disbursalSchema>;

// EMI Generation Logic
const generateEmiSchedule = (loanId: string, amount: number, annualRate: number, tenureMonths: number, startDate: Date) => {
    const monthlyRate = annualRate / 12 / 100;
    const emiAmount = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        schedule.push({
            loanId: loanId,
            installment: i,
            dueDate: dueDate,
            amount: parseFloat(emiAmount.toFixed(2)),
            status: 'unpaid' as const,
        });
    }
    return schedule;
};


const DisburseLoanDialog = ({ loanApp, customer, onDisbursed }: { loanApp: LoanApplication, customer: Customer, onDisbursed: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<DisbursalForm>({
        resolver: zodResolver(disbursalSchema),
    });

    const onSubmit = async (data: DisbursalForm) => {
        const processingFee = loanApp.amount * 0.05; // 5% processing fee

        const finalLoan: Omit<Loan, 'id'> = {
            customerId: loanApp.customerId,
            amount: loanApp.amount,
            interestRate: data.interestRate,
            tenure: data.tenure,
            disbursalDate: data.disbursalDate,
            processingFee: processingFee,
            status: 'active',
            topupHistory: [],
        };

        const batch = writeBatch(db);
        try {
            // 1. Add loan to 'loans' collection
            const loanRef = doc(collection(db, "loans"));
            batch.set(loanRef, finalLoan);

            // 2. Generate and add EMIs to 'emis' collection
            const emiSchedule = generateEmiSchedule(loanRef.id, finalLoan.amount, finalLoan.interestRate, finalLoan.tenure, finalLoan.disbursalDate);
            emiSchedule.forEach(emi => {
                const emiRef = doc(collection(db, "emis"));
                batch.set(emiRef, emi);
            });
            
            // 3. Update application status
            const appRef = doc(db, "loanApplications", loanApp.id!);
            batch.update(appRef, { status: 'disbursed' });
            
            await batch.commit();

            toast({ title: "Loan Disbursed!", description: `Loan ${loanRef.id} has been disbursed and EMI schedule generated.` });
            setIsOpen(false);
            onDisbursed();
        } catch(e: any) {
            console.error("Disbursal failed: ", e);
            toast({ variant: 'destructive', title: "Error", description: `Disbursal failed: ${e.message}`});
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Send className="mr-2 h-4 w-4" /> Disburse</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Disburse Loan: {loanApp.id}</DialogTitle>
                    <DialogDescription>
                        Finalize loan terms for an amount of Rs. {loanApp.amount.toLocaleString()}.
                        A 5% processing fee of Rs. {(loanApp.amount * 0.05).toLocaleString()} will be applied.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <Label htmlFor="interestRate">Interest Rate (% p.a.)</Label>
                        <Input id="interestRate" type="number" step="0.1" {...register('interestRate')} />
                        {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate.message}</p>}
                        </div>
                        <div>
                        <Label htmlFor="tenure">Tenure (Months)</Label>
                        <Input id="tenure" type="number" {...register('tenure')} />
                        {errors.tenure && <p className="text-destructive text-sm mt-1">{errors.tenure.message}</p>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="disbursalDate">Disbursal Date</Label>
                        <Controller
                        name="disbursalDate"
                        control={control}
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                        )}
                        />
                        {errors.disbursalDate && <p className="text-destructive text-sm mt-1">{errors.disbursalDate.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Processing...' : 'Confirm Disbursal'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


export default function LoanDisbursalPage() {
    const [approvedLoans, setApprovedLoans] = useState<LoanApplication[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    const fetchApprovedLoans = async () => {
         try {
            const customersCollection = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersCollection);
            const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customerList);

            const appsCollection = collection(db, 'loanApplications');
            const appsSnapshot = await getDocs(appsCollection);
            const appsList = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanApplication));
            setApprovedLoans(appsList.filter(app => app.status === 'approved'));

        } catch (e) {
            console.error("Failed to parse data from Firestore", e);
        }
    };

    useEffect(() => {
       fetchApprovedLoans();
    }, []);

    const findCustomer = (customerId: string) => {
        return customers.find(c => c.id === customerId);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Disbursal</CardTitle>
                <CardDescription>Manage the disbursal of approved loans.</CardDescription>
            </CardHeader>
            <CardContent>
                 {approvedLoans.length === 0 ? (
                     <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                        <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Loans Awaiting Disbursal</h3>
                        <p className="text-muted-foreground">Approved loans will appear here, ready for payment.</p>
                    </div>
                ) : (
                    <div className="mt-6 rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Application ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {approvedLoans.map((loan) => {
                                    const customer = findCustomer(loan.customerId);
                                    return (
                                    <TableRow key={loan.id}>
                                        <TableCell className="font-medium">{loan.id}</TableCell>
                                        <TableCell>{customer?.name || 'Unknown'}</TableCell>
                                        <TableCell>Rs. {loan.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-200 text-green-800">
                                               {loan.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {customer && <DisburseLoanDialog loanApp={loan} customer={customer} onDisbursed={fetchApprovedLoans} />}
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HandCoins, Eye, Edit, CalendarIcon, Loader2, PlusCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Customer } from '@/app/dashboard/customers/page';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LoanApplication } from '@/app/dashboard/loans/applications/page';


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

type Emi = {
  id: string;
  loanId: string;
  installment: number;
  dueDate: string;
  amount: number;
  status: 'paid' | 'unpaid';
};


const LoanTopUpDialog = ({ loan, customer, onLoanUpdated }: { loan: Loan & {id: string}, customer: Customer, onLoanUpdated: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const [amount, setAmount] = useState(0);

    const handleSubmit = () => {
        if (amount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Top-up amount must be greater than zero." });
            return;
        }

        const newApplication: LoanApplication = {
            id: `APP-${Date.now()}`,
            customerId: loan.customerId,
            amount: amount,
            status: 'pending',
            applicationDate: new Date(),
        };

        const existingApps = JSON.parse(localStorage.getItem('jls_pending_loans') || '[]');
        localStorage.setItem('jls_pending_loans', JSON.stringify([...existingApps, newApplication]));
        
        toast({ title: "Top-up Application Submitted", description: `A new loan application for ${customer.name} has been created.` });
        setIsOpen(false);
        onLoanUpdated();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <PlusCircle className="h-4 w-4 text-green-600" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Loan Top-up for {customer.name}</DialogTitle>
                    <DialogDescription>
                        Enter the additional amount for the new loan. This will create a new application that needs to go through the approval process.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Label htmlFor="topup-amount">Top-up Amount (Rs.)</Label>
                    <Input id="topup-amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Submit Application</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};


const EarlyCloseDialog = ({ loan, onLoanUpdated }: { loan: Loan & {id: string}, onLoanUpdated: () => void }) => {
    const { toast } = useToast();
    const [outstandingAmount, setOutstandingAmount] = useState(0);

    const calculateOutstanding = () => {
        const allEmis: Emi[] = JSON.parse(localStorage.getItem('jls_emis') || '[]');
        const unpaidEmis = allEmis.filter(emi => emi.loanId === loan.id && emi.status === 'unpaid');
        const totalOutstanding = unpaidEmis.reduce((sum, emi) => sum + emi.amount, 0);
        setOutstandingAmount(totalOutstanding);
    };

    const handleEarlyClose = () => {
        const allEmis: Emi[] = JSON.parse(localStorage.getItem('jls_emis') || '[]');
        const updatedEmis = allEmis.map(emi => {
            if (emi.loanId === loan.id && emi.status === 'unpaid') {
                return { ...emi, status: 'paid' as const };
            }
            return emi;
        });

        localStorage.setItem('jls_emis', JSON.stringify(updatedEmis));
        toast({ title: "Loan Closed", description: `Loan ${loan.id} has been marked as early closed.` });
        onLoanUpdated();
    };

    return (
        <AlertDialog onOpenChange={(open) => { if(open) calculateOutstanding() }}>
            <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon">
                    <XCircle className="h-4 w-4 text-red-600" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Early Closure</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to close this loan? The total outstanding amount is 
                        <strong className="text-foreground"> Rs. {outstandingAmount.toLocaleString()}</strong>. This action will mark all remaining EMIs as paid and cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEarlyClose} className="bg-destructive hover:bg-destructive/90">
                        Confirm & Close Loan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


const EditLoanDialog = ({ loan, onLoanUpdated }: { loan: Loan & {id: string}, onLoanUpdated: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Loan>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            ...loan,
            disbursalDate: new Date(loan.disbursalDate),
        },
    });

    const onSubmit = (data: Loan) => {
        try {
            const allLoans = JSON.parse(localStorage.getItem('jls_loans') || '[]') as (Loan & {id: string})[];
            const updatedLoans = allLoans.map(l => l.id === loan.id ? { ...l, ...data } : l);
            localStorage.setItem('jls_loans', JSON.stringify(updatedLoans));

            // Note: This simplified update does not regenerate EMI schedules.
            // A more complex implementation would be needed to handle that.
            
            toast({ title: "Loan Updated", description: `Loan ${loan.id} has been successfully updated.` });
            setIsOpen(false);
            onLoanUpdated();
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Error", description: "Failed to update loan." });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Loan: {loan.id}</DialogTitle>
                    <DialogDescription>
                        Modify the details for this loan. Note that changing these values does not automatically regenerate the EMI schedule.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="amount">Loan Amount (Rs.)</Label>
                        <Input id="amount" type="number" {...register('amount')} />
                        {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
                    </div>
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
                        {isSubmitting ? <><Loader2 className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};


const LoanList = ({ loans, customers, onLoanUpdated }: { loans: (Loan & {id: string})[], customers: Customer[], onLoanUpdated: () => void }) => {
    
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
                        <TableHead className="text-center">Actions</TableHead>
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
                                <TableCell className="text-center">
                                    {customer && (
                                        <TooltipProvider>
                                            <div className="flex justify-center items-center gap-1">
                                               <Tooltip>
                                                   <TooltipTrigger asChild><LoanDetailsView loan={loan} customer={customer} /></TooltipTrigger>
                                                   <TooltipContent><p>View Details</p></TooltipContent>
                                               </Tooltip>
                                               <Tooltip>
                                                    <TooltipTrigger asChild><EditLoanDialog loan={loan} onLoanUpdated={onLoanUpdated} /></TooltipTrigger>
                                                    <TooltipContent><p>Edit Loan</p></TooltipContent>
                                               </Tooltip>
                                               <Tooltip>
                                                    <TooltipTrigger asChild><LoanTopUpDialog loan={loan} customer={customer} onLoanUpdated={onLoanUpdated} /></TooltipTrigger>
                                                    <TooltipContent><p>Loan Top-up</p></TooltipContent>
                                               </Tooltip>
                                               <Tooltip>
                                                    <TooltipTrigger asChild><EarlyCloseDialog loan={loan} onLoanUpdated={onLoanUpdated} /></TooltipTrigger>
                                                    <TooltipContent><p>Early Close</p></TooltipContent>
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
    const [loans, setLoans] = useState<(Loan & {id: string})[]>([]);

    const fetchLoans = () => {
         try {
            const storedCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
            setCustomers(storedCustomers);
            const storedLoans = JSON.parse(localStorage.getItem('jls_loans') || '[]');
            setLoans(storedLoans.map((l: Loan & {id: string}) => ({...l, disbursalDate: new Date(l.disbursalDate)})));
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
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

    
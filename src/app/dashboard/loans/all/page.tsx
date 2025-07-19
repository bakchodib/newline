
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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const topUpHistorySchema = z.object({
  topUpDate: z.date(),
  topUpAmount: z.number(),
  newTenure: z.number(),
  previousOutstanding: z.number(),
});

const loanSchema = z.object({
  id: z.string().optional(),
  customerId: z.string({ required_error: "Please select a customer." }),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative."),
  tenure: z.coerce.number().int().min(1, "Tenure must be at least 1 month."),
  disbursalDate: z.date({ required_error: "Disbursal date is required." }),
  processingFee: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'closed']).default('active'),
  closureDetails: z.object({
    closureDate: z.date(),
    closureCharges: z.number(),
    remarks: z.string().optional(),
  }).optional(),
  topupHistory: z.array(topUpHistorySchema).optional(),
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

const generateEmiSchedule = (loanId: string, amount: number, annualRate: number, tenureMonths: number, startDate: Date) => {
    const monthlyRate = annualRate / 12 / 100;
    const emiAmount = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        schedule.push({
            id: `EMI-${loanId}-${i}`,
            loanId: loanId,
            installment: i,
            dueDate: dueDate.toISOString(),
            amount: parseFloat(emiAmount.toFixed(2)),
            status: 'unpaid' as const,
        });
    }
    return schedule;
};

const topUpFormSchema = z.object({
    topUpAmount: z.coerce.number().min(1, "Top-up amount must be positive."),
    newTenure: z.coerce.number().int().min(1, "New tenure must be at least 1 month."),
    topUpDate: z.date(),
});
type TopUpForm = z.infer<typeof topUpFormSchema>;

const LoanTopUpDialog = ({ loan, customer, onLoanUpdated }: { loan: Loan & {id: string}, customer: Customer, onLoanUpdated: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const [outstandingPrincipal, setOutstandingPrincipal] = useState(0);

    const form = useForm<TopUpForm>({
        resolver: zodResolver(topUpFormSchema),
        defaultValues: { topUpDate: new Date(), newTenure: loan.tenure }
    });
     const { register, control, handleSubmit, formState: { errors, isSubmitting } } = form;

    useEffect(() => {
        if (!isOpen) return;
        
        const allEmis: Emi[] = JSON.parse(localStorage.getItem('jls_emis') || '[]');
        const paidEmis = allEmis.filter(emi => emi.loanId === loan.id && emi.status === 'paid');
        const unpaidEmis = allEmis.filter(emi => emi.loanId === loan.id && emi.status === 'unpaid');

        if (unpaidEmis.length === 0) {
            setOutstandingPrincipal(0);
            return;
        }

        const monthlyRate = loan.interestRate / 12 / 100;
        let principal = loan.amount;
        
        // This is a simplified calculation. Real amortization would be more complex.
        const emiAmount = unpaidEmis[0]?.amount || 0;
        for(let i = 0; i < paidEmis.length; i++) {
            const interestPortion = principal * monthlyRate;
            const principalPortion = emiAmount - interestPortion;
            principal -= principalPortion;
        }
        setOutstandingPrincipal(parseFloat(principal.toFixed(2)));

    }, [isOpen, loan]);


    const handleTopUpSubmit = (data: TopUpForm) => {
        const allLoans: (Loan & {id: string})[] = JSON.parse(localStorage.getItem('jls_loans') || '[]');
        const allEmis: Emi[] = JSON.parse(localStorage.getItem('jls_emis') || '[]');

        const newPrincipal = outstandingPrincipal + data.topUpAmount;

        // 1. Update the loan object
        const updatedLoans = allLoans.map(l => {
            if (l.id === loan.id) {
                const newTopUpRecord: z.infer<typeof topUpHistorySchema> = {
                    topUpDate: data.topUpDate,
                    topUpAmount: data.topUpAmount,
                    newTenure: data.newTenure,
                    previousOutstanding: outstandingPrincipal,
                };
                return {
                    ...l,
                    amount: newPrincipal, // Update amount to new total principal
                    tenure: data.newTenure,
                    disbursalDate: data.topUpDate, // The "new" disbursal date is the top-up date
                    topupHistory: [...(l.topupHistory || []), newTopUpRecord],
                };
            }
            return l;
        });
        const updatedLoan = updatedLoans.find(l => l.id === loan.id);
        if(!updatedLoan) return;

        // 2. Remove old unpaid EMIs for this loan
        const remainingEmis = allEmis.filter(emi => !(emi.loanId === loan.id && emi.status === 'unpaid'));

        // 3. Generate new EMI schedule
        const newEmiSchedule = generateEmiSchedule(loan.id, newPrincipal, loan.interestRate, data.newTenure, data.topUpDate);

        // 4. Save everything back to localStorage
        localStorage.setItem('jls_loans', JSON.stringify(updatedLoans));
        localStorage.setItem('jls_emis', JSON.stringify([...remainingEmis, ...newEmiSchedule]));

        toast({ title: "Loan Topped Up", description: `Loan ${loan.id} has been topped up. New EMI schedule is generated.` });
        onLoanUpdated();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button variant="ghost" size="icon" disabled={loan.status === 'closed'}>
                    <PlusCircle className="h-4 w-4 text-green-600" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Loan Top-up for {customer.name}</DialogTitle>
                    <DialogDescription>
                        Current outstanding principal is Rs. {outstandingPrincipal.toLocaleString()}.
                        Add a top-up amount and define the new tenure for the combined loan.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit(handleTopUpSubmit)} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="topUpAmount">Top-up Amount (Rs.)</Label>
                        <Input id="topUpAmount" type="number" {...register('topUpAmount')} />
                        {errors.topUpAmount && <p className="text-destructive text-sm mt-1">{errors.topUpAmount.message}</p>}
                    </div>
                    <div>
                        <Label>New Total Principal</Label>
                        <Input readOnly disabled value={`Rs. ${(outstandingPrincipal + (form.watch('topUpAmount') || 0)).toLocaleString()}`} />
                    </div>
                     <div>
                        <Label htmlFor="newTenure">New Tenure (Months)</Label>
                        <Input id="newTenure" type="number" {...register('newTenure')} />
                        {errors.newTenure && <p className="text-destructive text-sm mt-1">{errors.newTenure.message}</p>}
                    </div>
                    <div>
                        <Label>Top-up Date</Label>
                        <Controller
                            name="topUpDate"
                            control={control}
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
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
                         {errors.topUpDate && <p className="text-destructive text-sm mt-1">{errors.topUpDate.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Confirm Top-up'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
};

const closureFormSchema = z.object({
    closureDate: z.date(),
    closureCharges: z.coerce.number().min(0).default(0),
    remarks: z.string().optional(),
});
type ClosureForm = z.infer<typeof closureFormSchema>;

const EarlyCloseDialog = ({ loan, onLoanUpdated }: { loan: Loan & {id: string}, onLoanUpdated: () => void }) => {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [calculations, setCalculations] = useState({
        principal: 0,
        interest: 0,
        total: 0
    });
    
    const form = useForm<ClosureForm>({
        resolver: zodResolver(closureFormSchema),
        defaultValues: { closureDate: new Date(), closureCharges: 0, remarks: "" }
    });
    const { register, control, watch, handleSubmit, formState: { isSubmitting } } = form;

    const closureDate = watch('closureDate');
    const closureCharges = watch('closureCharges');

    useEffect(() => {
        if (!isOpen) return;

        const allEmis: Emi[] = JSON.parse(localStorage.getItem('jls_emis') || '[]');
        const paidEmis = allEmis.filter(emi => emi.loanId === loan.id && emi.status === 'paid');
        const unpaidEmis = allEmis.filter(emi => emi.loanId === loan.id && emi.status === 'unpaid');

        if (unpaidEmis.length === 0) {
            setCalculations({ principal: 0, interest: 0, total: 0 });
            return;
        }

        const monthlyRate = loan.interestRate / 12 / 100;
        let outstandingPrincipal = loan.amount;

        // Simplified principal reduction based on paid EMIs
        // A real amortization schedule would be more accurate
        const emiAmount = unpaidEmis[0]?.amount || 0;
        for(let i = 0; i < paidEmis.length; i++) {
            const interestPortion = outstandingPrincipal * monthlyRate;
            const principalPortion = emiAmount - interestPortion;
            outstandingPrincipal -= principalPortion;
        }
        
        const lastDueDate = paidEmis.length > 0 ? new Date(paidEmis[paidEmis.length - 1].dueDate) : new Date(loan.disbursalDate);
        const daysSinceLastDue = Math.max(0, (closureDate.getTime() - lastDueDate.getTime()) / (1000 * 3600 * 24));
        const interestTillDate = (outstandingPrincipal * (loan.interestRate / 100) / 365) * daysSinceLastDue;

        setCalculations({
            principal: parseFloat(outstandingPrincipal.toFixed(2)),
            interest: parseFloat(interestTillDate.toFixed(2)),
            total: parseFloat((outstandingPrincipal + interestTillDate + Number(closureCharges)).toFixed(2))
        });

    }, [closureDate, closureCharges, loan, isOpen]);

    const handleEarlyClose = (data: ClosureForm) => {
        // 1. Update Loan Status and add closure details
        const allLoans: (Loan & {id: string})[] = JSON.parse(localStorage.getItem('jls_loans') || '[]');
        const updatedLoans = allLoans.map(l => {
            if (l.id === loan.id) {
                return {
                    ...l,
                    status: 'closed' as const,
                    closureDetails: {
                        closureDate: data.closureDate,
                        closureCharges: data.closureCharges,
                        remarks: data.remarks,
                    }
                };
            }
            return l;
        });
        localStorage.setItem('jls_loans', JSON.stringify(updatedLoans));

        // 2. Remove future EMIs from master list
        const allEmis: Emi[] = JSON.parse(localStorage.getItem('jls_emis') || '[]');
        const remainingEmis = allEmis.filter(emi => !(emi.loanId === loan.id && emi.status === 'unpaid'));
        localStorage.setItem('jls_emis', JSON.stringify(remainingEmis));

        toast({ title: "Loan Closed Successfully", description: `Loan ${loan.id} has been marked as closed.` });
        onLoanUpdated();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={loan.status === 'closed'}>
                    <XCircle className="h-4 w-4 text-red-600" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Early Loan Closure: {loan.id}</DialogTitle>
                    <DialogDescription>
                       Finalize the early closure of this loan. Calculations are estimates.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 my-4 p-4 border rounded-lg">
                    <div className="font-medium text-muted-foreground">Outstanding Principal</div>
                    <div className="text-right font-bold">Rs. {calculations.principal.toLocaleString()}</div>
                    <div className="font-medium text-muted-foreground">Interest up to Closure Date</div>
                    <div className="text-right font-bold">Rs. {calculations.interest.toLocaleString()}</div>
                    <div className="font-medium text-muted-foreground">Closure Charges</div>
                    <div className="text-right font-bold">Rs. {Number(closureCharges).toLocaleString()}</div>
                    <div className="col-span-2 border-t my-2"></div>
                    <div className="font-semibold text-lg text-primary">Total Payable Amount</div>
                    <div className="text-right font-extrabold text-lg text-primary">Rs. {calculations.total.toLocaleString()}</div>
                </div>
                 <form onSubmit={handleSubmit(handleEarlyClose)} className="space-y-4">
                     <div>
                        <Label htmlFor="closureDate">Closure Date</Label>
                        <Controller
                        name="closureDate"
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
                    </div>
                    <div>
                        <Label htmlFor="closureCharges">Closure Charges (Rs.)</Label>
                        <Input id="closureCharges" type="number" {...register('closureCharges')} />
                    </div>
                     <div>
                        <Label htmlFor="remarks">Remarks (Optional)</Label>
                        <Textarea id="remarks" {...register('remarks')} />
                    </div>
                    <DialogFooter>
                         <Button type="submit" variant="destructive" disabled={isSubmitting}>
                           {isSubmitting ? 'Processing...' : 'Confirm & Close Loan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
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
            const updatedLoans = allLoans.map(l => l.id === loan.id ? { ...loan, ...data, status: loan.status || 'active' } : l);
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
                <Button variant="ghost" size="icon" disabled={loan.status === 'closed'}>
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
                                <TableCell>{format(new Date(loan.disbursalDate), "PP")}</TableCell>
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
                                               <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <EditLoanDialog loan={loan} onLoanUpdated={onLoanUpdated} />
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Edit Loan</p></TooltipContent>
                                               </Tooltip>
                                               <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <LoanTopUpDialog loan={loan} customer={customer} onLoanUpdated={onLoanUpdated} />
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Loan Top-up</p></TooltipContent>
                                               </Tooltip>
                                               <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <EarlyCloseDialog loan={loan} onLoanUpdated={onLoanUpdated} />
                                                    </TooltipTrigger>
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
            setLoans(storedLoans.map((l: any) => ({
                ...l, 
                disbursalDate: new Date(l.disbursalDate),
                closureDetails: l.closureDetails ? { ...l.closureDetails, closureDate: new Date(l.closureDetails.closureDate) } : undefined,
                topupHistory: l.topupHistory ? l.topupHistory.map((th: any) => ({ ...th, topUpDate: new Date(th.topUpDate) })) : [],
            })));
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

    
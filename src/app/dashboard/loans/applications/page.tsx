
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FilePenLine, PlusCircle, HandCoins } from 'lucide-react';

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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Customer } from '@/app/dashboard/customers/page';

const loanApplicationSchema = z.object({
  id: z.string().optional(),
  customerId: z.string({ required_error: "Please select a customer." }),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  status: z.enum(['pending', 'approved', 'disbursed', 'rejected']).default('pending'),
  applicationDate: z.date().default(() => new Date()),
});

export type LoanApplication = z.infer<typeof loanApplicationSchema>;

const ApplyLoanForm = ({ customers, onLoanApplied }: { customers: Customer[], onLoanApplied: (app: LoanApplication) => void }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LoanApplication>({
    resolver: zodResolver(loanApplicationSchema),
  });

  const onSubmit = (data: LoanApplication) => {
    const newApplication: LoanApplication = {
      ...data,
      id: `APP-${Date.now()}`
    };
    
    const existingApps = JSON.parse(localStorage.getItem('jls_pending_loans') || '[]');
    localStorage.setItem('jls_pending_loans', JSON.stringify([...existingApps, newApplication]));
    
    onLoanApplied(newApplication);
    toast({ title: "Success", description: "Loan application submitted successfully." });
    reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          New Loan Application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Loan Application</DialogTitle>
          <DialogDescription>
            Select a customer and enter the desired loan amount.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length > 0 ? customers.map(c => (
                      <SelectItem key={c.id} value={c.id!}>{c.name} ({c.id})</SelectItem>
                    )) : <SelectItem value="no-customer" disabled>No customers found</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-destructive text-sm mt-1">{errors.customerId.message}</p>}
          </div>
          <div>
            <Label htmlFor="amount">Loan Amount (Rs.)</Label>
            <Input id="amount" type="number" {...register('amount')} />
            {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ApplicationList = ({ applications, customers }: { applications: LoanApplication[], customers: Customer[] }) => {
    
    const findCustomerName = (customerId: string) => {
        return customers.find(c => c.id === customerId)?.name || 'Unknown';
    };

    if (applications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                <HandCoins className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Pending Applications</h3>
                <p className="text-muted-foreground">New loan applications will appear here.</p>
            </div>
        )
    }

    return (
        <div className="mt-6 rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Application ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Application Date</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {applications.map((app) => (
                        <TableRow key={app.id}>
                            <TableCell className="font-medium">{app.id}</TableCell>
                            <TableCell>{findCustomerName(app.customerId)}</TableCell>
                            <TableCell>Rs. {app.amount.toLocaleString()}</TableCell>
                            <TableCell>{new Date(app.applicationDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">
                                    {app.status}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default function LoanApplicationsPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [applications, setApplications] = useState<LoanApplication[]>([]);

    useEffect(() => {
        try {
            const storedCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
            setCustomers(storedCustomers);
            const storedApps = JSON.parse(localStorage.getItem('jls_pending_loans') || '[]');
            setApplications(storedApps);
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
        }
    }, []);

    const handleLoanApplied = (app: LoanApplication) => {
        setApplications(prev => [...prev, app]);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Loan Applications</CardTitle>
                    <CardDescription>Submit and review new loan applications.</CardDescription>
                </div>
                <ApplyLoanForm customers={customers} onLoanApplied={handleLoanApplied} />
            </CardHeader>
            <CardContent>
                <ApplicationList applications={applications} customers={customers} />
            </CardContent>
        </Card>
    );
}

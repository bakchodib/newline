
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HandCoins, User, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Customer } from '@/app/dashboard/customers/page';

const loanApplicationSchema = z.object({
  id: z.string().optional(),
  customerId: z.string({ required_error: "Please select a customer." }),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  status: z.enum(['pending', 'approved', 'disbursed', 'rejected']).default('pending'),
  applicationDate: z.instanceof(Timestamp),
});

export type LoanApplication = z.infer<typeof loanApplicationSchema>;

const CustomerSelector = ({ customers, onSelectCustomer, selectedCustomerId }: { customers: Customer[], onSelectCustomer: (id: string) => void, selectedCustomerId: string | null }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight text-primary">Select a Customer</h3>
            <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {customers.map((customer) => (
                        <Card 
                            key={customer.id} 
                            onClick={() => onSelectCustomer(customer.id!)}
                            className={cn(
                                "cursor-pointer transition-all hover:shadow-lg hover:border-primary",
                                selectedCustomerId === customer.id && "border-2 border-primary ring-2 ring-primary/50"
                            )}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                                <Avatar className="h-20 w-20 mb-3 border-2 border-muted">
                                    <AvatarImage src={customer.photo || `https://placehold.co/100x100.png`} alt={customer.name} data-ai-hint="person face" />
                                    <AvatarFallback>{customer.name.split(' ').map(n=>n[0]).join('').toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-medium leading-tight">{customer.name}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};


const ApplyLoanForm = ({ customers, onLoanApplied }: { customers: Customer[], onLoanApplied: () => void }) => {
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<{customerId: string, amount: number}>({
    resolver: zodResolver(z.object({
      customerId: z.string().min(1),
      amount: z.coerce.number().min(1),
    })),
  });

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setValue('customerId', id);
  };

  const onSubmit = async (data: {customerId: string, amount: number}) => {
    
    const newApplication = {
      ...data,
      status: 'pending',
      applicationDate: serverTimestamp(),
    };
    
    try {
        await addDoc(collection(db, "loanApplications"), newApplication);
        onLoanApplied();
        toast({ title: "Success", description: "Loan application submitted successfully." });
        reset();
        setSelectedCustomerId(null);
    } catch(e: any) {
        console.error("Error submitting application: ", e);
        toast({ variant: 'destructive', title: "Error", description: "Could not submit application."});
    }
  };
  
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <CustomerSelector customers={customers} onSelectCustomer={handleSelectCustomer} selectedCustomerId={selectedCustomerId} />
        
        {selectedCustomerId && (
            <Card className="bg-muted/50">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                        <div>
                        <CardTitle>Loan Details for {selectedCustomer?.name}</CardTitle>
                        <CardDescription>Enter the requested loan amount.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="amount" className="font-semibold">Loan Amount (Rs.)</Label>
                        <Input id="amount" type="number" {...register('amount')} className="max-w-xs mt-1" />
                        {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount.message}</p>}
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                </CardContent>
            </Card>
        )}
    </form>
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
                            <TableCell>{app.applicationDate.toDate().toLocaleDateString()}</TableCell>
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

    const fetchAllData = async () => {
        try {
            const customersCollection = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersCollection);
            const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customerList);

            const appsCollection = collection(db, 'loanApplications');
            const appsSnapshot = await getDocs(appsCollection);
            const appsList = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanApplication));
            setApplications(appsList.filter(app => app.status === 'pending'));

        } catch (e) {
            console.error("Failed to parse data from Firestore", e);
        }
    }
    
    useEffect(() => {
        fetchAllData();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan Application Form</CardTitle>
                <CardDescription>Select a customer to begin a new loan application.</CardDescription>
            </CardHeader>
            <CardContent>
                {customers.length > 0 ? (
                    <ApplyLoanForm customers={customers} onLoanApplied={fetchAllData} />
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg">
                        <User className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Customers Found</h3>
                        <p className="text-muted-foreground">Please register a customer before applying for a loan.</p>
                    </div>
                )}

                <div className="mt-12">
                    <h2 className="text-2xl font-semibold tracking-tight mb-4">Pending Applications</h2>
                     <ApplicationList applications={applications} customers={customers} />
                </div>
            </CardContent>
        </Card>
    );
}

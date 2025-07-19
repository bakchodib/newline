
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Download } from 'lucide-react';
import type { Loan } from '@/app/dashboard/loans/all/page';
import type { Customer } from '@/app/dashboard/customers/page';
import type { Emi } from '@/components/loan-documents';
import { generateEmiReceipt } from '@/components/loan-documents';
import { useToast } from '@/hooks/use-toast';


interface LoanDetailsViewProps {
  loan: Loan & { id: string };
  customer: Customer;
}

export function LoanDetailsView({ loan, customer }: LoanDetailsViewProps) {
  const [emis, setEmis] = useState<Emi[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (loan) {
      const allEmis = JSON.parse(localStorage.getItem('jls_emis') || '[]') as Emi[];
      const loanEmis = allEmis.filter(e => e.loanId === loan.id).sort((a,b) => a.installment - b.installment);
      setEmis(loanEmis);
    }
  }, [loan]);
  
  const handleDownloadReceipt = (emi: Emi) => {
    const success = generateEmiReceipt(emi, loan, customer);
    if(success) {
      toast({ title: 'Receipt Downloaded', description: `Receipt for EMI ${emi.id} has been saved.` });
    } else {
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate the EMI receipt.' });
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Loan Details - {loan.id}</DialogTitle>
          <DialogDescription>
            Showing full details for the loan provided to {customer.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            {/* Customer Details */}
            <div className="col-span-1 space-y-3">
                <h4 className="font-semibold text-lg text-primary">Customer Details</h4>
                <p><strong>Name:</strong> {customer.name}</p>
                <p><strong>ID:</strong> {customer.id}</p>
                <p><strong>Phone:</strong> {customer.phone}</p>
                <p><strong>Address:</strong> {customer.address}</p>
            </div>
            {/* Loan Details */}
            <div className="col-span-2 space-y-3">
                 <h4 className="font-semibold text-lg text-primary">Loan Details</h4>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <p><strong>Loan Amount:</strong> Rs. {loan.amount.toLocaleString()}</p>
                    <p><strong>Interest Rate:</strong> {loan.interestRate}% p.a.</p>
                    <p><strong>Tenure:</strong> {loan.tenure} months</p>
                    <p><strong>Disbursal Date:</strong> {new Date(loan.disbursalDate).toLocaleDateString()}</p>
                    <p><strong>Processing Fee:</strong> Rs. {loan.processingFee?.toLocaleString()}</p>
                 </div>
            </div>
        </div>
        <div>
            <h4 className="font-semibold text-lg text-primary mb-2">EMI Schedule</h4>
            <ScrollArea className="h-[45vh] rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Installment</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {emis.map((emi) => (
                    <TableRow key={emi.id}>
                        <TableCell>{emi.installment}</TableCell>
                        <TableCell>{new Date(emi.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>Rs. {emi.amount.toLocaleString()}</TableCell>
                        <TableCell>
                             <Badge variant={emi.status === 'paid' ? 'default' : 'secondary'} className={emi.status === 'paid' ? 'bg-green-600' : 'bg-red-500'}>
                                {emi.status.charAt(0).toUpperCase() + emi.status.slice(1)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           {emi.status === 'paid' && (
                                <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(emi)}>
                                    <Download className="mr-2 h-4 w-4" /> Receipt
                                </Button>
                           )}
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

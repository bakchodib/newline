
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Receipt, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, getDocs, doc, updateDoc, Timestamp, where, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Loan } from '@/app/dashboard/loans/all/page';
import type { Customer } from '@/app/dashboard/customers/page';

type Emi = {
  id: string;
  loanId: string;
  installment: number;
  dueDate: Timestamp;
  amount: number;
  status: 'paid' | 'unpaid';
};

const months = [
    { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
    { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
    { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
    { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' }
];

const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        years.push(i);
    }
    return years;
};

export default function EmiCollectionPage() {
    const [allEmis, setAllEmis] = useState<Emi[]>([]);
    const [filteredEmis, setFilteredEmis] = useState<Emi[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const { toast } = useToast();
    const years = getYears();
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const customersCollection = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersCollection);
            const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customerList);

            const loansCollection = collection(db, 'loans');
            const loanSnapshot = await getDocs(loansCollection);
            const loanList = loanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
            setLoans(loanList);
            
            const emisCollection = collection(db, 'emis');
            const emiSnapshot = await getDocs(emisCollection);
            const emiList = emiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Emi));
            setAllEmis(emiList);
            
        } catch (error) {
            console.error("Failed to load data from Firestore", error);
            toast({variant: 'destructive', title: "Error", description: "Failed to load data from Firestore."})
        } finally {
            setLoading(false);
        }
    }
    
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        let results = allEmis;

        // Filter by month and year
        results = results.filter(emi => {
            const dueDate = emi.dueDate.toDate();
            return dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear;
        });

        // Filter by search term
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            results = results.filter(emi => {
                const loan = loans.find(l => l.id === emi.loanId);
                if (!loan) return false;
                const customer = customers.find(c => c.id === loan.customerId);
                return (
                    emi.loanId.toLowerCase().includes(lowercasedTerm) ||
                    customer?.name.toLowerCase().includes(lowercasedTerm) ||
                    customer?.id?.toLowerCase().includes(lowercasedTerm)
                );
            });
        }

        setFilteredEmis(results);

    }, [searchTerm, allEmis, loans, customers, selectedMonth, selectedYear]);


    const getLoanAndCustomer = (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        const customer = loan ? customers.find(c => c.id === loan.customerId) : undefined;
        return { loan, customer };
    }

    const handleMarkAsPaid = async (emiId: string) => {
        try {
            const emiRef = doc(db, 'emis', emiId);
            await updateDoc(emiRef, { status: 'paid' });
            
            toast({ title: 'EMI Paid', description: `EMI has been marked as paid.` });
            fetchData(); // Refresh data
        } catch (e: any) {
             toast({ variant: 'destructive', title: "Error", description: `Failed to update EMI: ${e.message}`});
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>EMI Collection</CardTitle>
                <CardDescription>Record and track EMI payments from customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex items-center gap-2 flex-grow">
                         <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by Customer Name, Customer ID, or Loan ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                         <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                               {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading ? <p>Loading...</p> : filteredEmis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No EMIs Found for {months.find(m=>m.value === selectedMonth)?.label} {selectedYear}</h3>
                        <p className="text-muted-foreground">
                            {searchTerm ? 'No results match your search criteria.' : 'Try selecting a different month or year.'}
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Loan ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Installment</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmis.map((emi) => {
                                    const { customer } = getLoanAndCustomer(emi.loanId);
                                    return (
                                        <TableRow key={emi.id}>
                                            <TableCell className="font-medium">{emi.loanId}</TableCell>
                                            <TableCell>{customer?.name || 'N/A'}</TableCell>
                                            <TableCell>{emi.installment}</TableCell>
                                            <TableCell>{emi.dueDate.toDate().toLocaleDateString()}</TableCell>
                                            <TableCell>Rs. {emi.amount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={emi.status === 'paid' ? 'default' : 'secondary'} className={emi.status === 'paid' ? 'bg-green-600' : 'bg-red-500'}>
                                                    {emi.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {emi.status === 'unpaid' && (
                                                    <Button size="sm" onClick={() => handleMarkAsPaid(emi.id)}>
                                                        Mark as Paid
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

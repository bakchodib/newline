
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FileDown, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer } from '@/app/dashboard/customers/page';
import type { Loan } from '@/app/dashboard/loans/all/page';

interface jsPDFWithAutoTable extends jsPDFType {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

type Emi = {
  id: string;
  loanId: string;
  installment: number;
  dueDate: Timestamp;
  amount: number;
  status: 'paid' | 'unpaid';
};

type ReportRow = {
  customerName: string;
  guarantorName: string;
  phone: string;
  emiAmount: number;
  installment: number;
  loanId: string;
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

export default function ReportsPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [emis, setEmis] = useState<Emi[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const years = getYears();

    useEffect(() => {
        const fetchData = async () => {
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
                setEmis(emiList);
            } catch (error) {
                console.error("Failed to load data from Firestore", error);
            }
        };
        fetchData();
    }, []);

    const handleGenerateReport = () => {
        const dueEmis = emis.filter(emi => {
            const dueDate = emi.dueDate.toDate();
            return dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear;
        });

        const generatedData = dueEmis.map(emi => {
            const loan = loans.find(l => l.id === emi.loanId);
            if (!loan) return null;
            const customer = customers.find(c => c.id === loan.customerId);
            if (!customer) return null;

            return {
                customerName: customer.name,
                guarantorName: customer.guarantor?.name || 'N/A',
                phone: customer.phone,
                emiAmount: emi.amount,
                installment: emi.installment,
                loanId: loan.id!
            };
        }).filter(Boolean) as ReportRow[];

        setReportData(generatedData);
    };
    
    const handleDownloadPdf = () => {
        const doc = new jsPDF() as jsPDFWithAutoTable;
        const monthName = months.find(m => m.value === selectedMonth)?.label;

        doc.setFontSize(18);
        doc.text(`Due EMI Report for ${monthName} ${selectedYear}`, 14, 22);

        const tableColumn = ["Customer", "Guarantor", "Phone", "EMI Amount", "Installment"];
        const tableRows: (string | number)[][] = [];

        reportData.forEach(row => {
            const rowData = [
                row.customerName,
                row.guarantorName,
                row.phone,
                `Rs. ${row.emiAmount.toLocaleString()}`,
                row.installment
            ];
            tableRows.push(rowData);
        });
        
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            didParseCell: function (data) {
                // Check if the cell is in the 'Phone' column
                if (data.column.index === 2 && data.cell.section === 'body') {
                    // Make the phone number a clickable link
                    data.cell.styles.textColor = [0, 0, 255]; // Blue color for link
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            willDrawCell: function (data) {
                 if (data.column.index === 2 && data.cell.section === 'body') {
                    // Add the link annotation to the PDF
                    const text = data.cell.text[0];
                    const url = `tel:${text}`;
                    doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
                }
            }
        });

        doc.save(`Due_EMI_Report_${monthName}_${selectedYear}.pdf`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Generate and download reports for analysis.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-6 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-4 text-lg">Monthly Due EMI Report</h3>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex items-center gap-2">
                             <Select value={String(selectedMonth)} onValueChange={(val) => setSelectedMonth(Number(val))}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex items-center gap-2">
                             <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                                <SelectTrigger className="w-full sm:w-[120px] bg-background">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                   {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleGenerateReport}>Generate Report</Button>
                    </div>
                </div>

                {reportData.length > 0 && (
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Report for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</h3>
                            <Button onClick={handleDownloadPdf} variant="outline">
                                <FileDown className="mr-2 h-4 w-4" />
                                Download PDF
                            </Button>
                        </div>
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Guarantor</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>EMI Amount</TableHead>
                                        <TableHead>Installment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.map((row, index) => (
                                        <TableRow key={`${row.loanId}-${index}`}>
                                            <TableCell>{row.customerName}</TableCell>
                                            <TableCell>{row.guarantorName}</TableCell>
                                            <TableCell>{row.phone}</TableCell>
                                            <TableCell>Rs. {row.emiAmount.toLocaleString()}</TableCell>
                                            <TableCell>{row.installment}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
                
                {reportData.length === 0 && (
                     <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">No Report Generated</h3>
                        <p className="text-muted-foreground">Select a month and year, then click "Generate Report" to see results.</p>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}

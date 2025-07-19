
"use client";

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from './ui/button';
import { FileText, CreditCard, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { Customer } from '@/app/dashboard/customers/page';
import type { Loan } from '@/app/dashboard/loans/all/page';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export type Emi = {
  id: string;
  loanId: string;
  installment: number;
  dueDate: string;
  amount: number;
  status: 'paid' | 'unpaid';
};


interface LoanDocumentsProps {
    customer: Customer;
    loan: Loan & { id: string };
}

const generateEmiScheduleData = (amount: number, annualRate: number, tenureMonths: number, startDate: Date) => {
    const monthlyRate = annualRate / 12 / 100;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    let balance = amount;
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        const interest = balance * monthlyRate;
        const principal = emi - interest;
        balance -= principal;

        schedule.push({
            month: i,
            dueDate: dueDate.toLocaleDateString(),
            amount: emi.toFixed(2),
            principal: principal.toFixed(2),
            interest: interest.toFixed(2),
            balance: balance.toFixed(2),
        });
    }
    return schedule;
};


export function LoanDocuments({ customer, loan }: LoanDocumentsProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [allEmis, setAllEmis] = useState<Emi[]>([]);
    
    useEffect(() => {
        try {
            const storedEmis = JSON.parse(localStorage.getItem('jls_emis') || '[]');
            setAllEmis(storedEmis);
        } catch (e) {
            console.error("Failed to load EMIs from localStorage", e)
        }
    }, [])

    const customerPhoto = customer.photo || 'https://placehold.co/150x150.png';


    const addWatermark = (doc: jsPDF) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(50);
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({opacity: 0.5}));
            doc.text("JLS FINANCE LTD", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, { 
                align: 'center', 
                angle: -45 
            });
            doc.restoreGraphicsState();
        }
    };

    const generatePdf = (type: 'agreement' | 'card') => {
        if (!customer) {
            toast({
                variant: "destructive",
                title: "Cannot Generate PDF",
                description: "Customer data is not available."
            });
            return;
        }

        setIsGenerating(true);
        try {
            const doc = new jsPDF() as jsPDFWithAutoTable;
            const emiScheduleData = generateEmiScheduleData(loan.amount, loan.interestRate, loan.tenure, new Date(loan.disbursalDate));
            const netDisbursedAmount = loan.amount - (loan.processingFee || 0);

            // Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text("JLS FINANCE LTD", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(type === 'agreement' ? "Loan Agreement" : "Loan Card", doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(20, 32, doc.internal.pageSize.getWidth() - 20, 32);

            // Customer Details Section
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Customer Details", 20, 42);

            try {
              doc.addImage(customerPhoto, 'PNG', 150, 45, 40, 40);
            } catch (e) {
              console.error("Error adding image to PDF:", e);
            }
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Customer Name: ${customer.name}`, 20, 50);
            doc.text(`Customer ID: ${customer.id}`, 20, 56);
            doc.text(`Phone Number: ${customer.phone}`, 20, 62);
            doc.text(`Address: ${customer.address}`, 20, 68, { maxWidth: 120 });
            
            // Loan Details Section
            doc.setFont('helvetica', 'bold');
            doc.text("Loan Details", 20, 95);
            doc.setFont('helvetica', 'normal');
            doc.text(`Loan ID: ${loan.id}`, 20, 103);
            doc.text(`Sanctioned Amount: Rs. ${loan.amount.toLocaleString()}`, 20, 109);
            doc.text(`Processing Fee (5%): Rs. ${loan.processingFee?.toLocaleString() || 'N/A'}`, 20, 115);
            doc.setFont('helvetica', 'bold');
            doc.text(`Net Disbursed Amount: Rs. ${netDisbursedAmount.toLocaleString()}`, 20, 121);
            doc.setFont('helvetica', 'normal');
            doc.text(`Interest Rate: ${loan.interestRate}% p.a.`, 20, 127);
            doc.text(`Tenure: ${loan.tenure} months`, 20, 133);
            doc.text(`Disbursal Date: ${new Date(loan.disbursalDate).toLocaleDateString()}`, 20, 139);
            
            // EMI Schedule Table
            doc.setFont('helvetica', 'bold');
            doc.text("EMI Schedule", 20, 152);

            const tableHeaders = ['Month', 'Due Date', 'EMI (Rs.)', 'Principal', 'Interest', 'Balance'];
            if(type === 'card'){
                tableHeaders.push('Status');
            }

            const loanEmisForLoan = allEmis.filter(e => e.loanId === loan.id);
            const tableBody = emiScheduleData.map(emi => {
                 const emiData = [emi.month, emi.dueDate, emi.amount, emi.principal, emi.interest, emi.balance];
                 if (type === 'card') {
                    const emiRecord = loanEmisForLoan.find(e => e.installment === emi.month);
                    emiData.push(emiRecord ? emiRecord.status.charAt(0).toUpperCase() + emiRecord.status.slice(1) : 'Unpaid');
                 }
                 return emiData;
            });

            doc.autoTable({
                startY: 157,
                head: [tableHeaders],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [34, 139, 34] },
            });
            
            let finalY = (doc as any).lastAutoTable.finalY || 180;

            if(type === 'agreement'){
                doc.addPage();
                finalY = 20; 
                
                if (customer.guarantor && customer.guarantor.name) {
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Guarantor Details", 20, finalY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Name: ${customer.guarantor.name}`, 20, finalY + 8);
                    doc.text(`Phone: ${customer.guarantor.phone}`, 20, finalY + 14);
                    doc.text(`Address: ${customer.guarantor.address}`, 20, finalY + 20);
                    finalY += 40;
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text("Terms and Conditions:", 20, finalY);
                doc.setFont('helvetica', 'normal');
                const terms = `1. The borrower agrees to repay the loan amount with interest as per the EMI schedule.\n2. Late payment will attract a penalty fee of 2% per month on the overdue amount.\n3. All disputes are subject to the jurisdiction of the Anytown courts.`;
                doc.text(terms, 20, finalY + 6, { maxWidth: doc.internal.pageSize.getWidth() - 40 });
                finalY += 40;
            } else {
                 finalY += 10;
            }
            
            // Signature Section
            doc.setLineWidth(0.2);
            doc.line(20, finalY + 25, 80, finalY + 25);
            doc.text("Customer Signature", 35, finalY + 30);

            doc.line(doc.internal.pageSize.getWidth() - 80, finalY + 25, doc.internal.pageSize.getWidth() - 20, finalY + 25);
            doc.text("Authorized Signatory", doc.internal.pageSize.getWidth() - 65, finalY + 30);
            doc.text("(JLS Finance Ltd)", doc.internal.pageSize.getWidth() - 65, finalY + 35);
            
            addWatermark(doc);

            doc.save(`${type}_${customer.id}_${loan.id}.pdf`);
            
            toast({
                title: "PDF Generated",
                description: `The ${type.replace(/^\w/, c => c.toUpperCase())} has been downloaded.`,
            });
        } catch (error) {
            console.error("PDF Generation Error:", error);
             toast({
                variant: "destructive",
                title: "PDF Generation Failed",
                description: "An unexpected error occurred while creating the document."
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="flex gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => generatePdf('agreement')} disabled={isGenerating} variant="ghost" size="icon">
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Generate Agreement</p>
                    </TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                       <Button onClick={() => generatePdf('card')} disabled={isGenerating} variant="ghost" size="icon">
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Generate Loan Card</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}

export const generateEmiReceipt = (emi: Emi, loan: Loan & { id: string }, customer: Customer) => {
    try {
        const doc = new jsPDF() as jsPDFWithAutoTable;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text("JLS FINANCE LTD", doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text("EMI Payment Receipt", doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(20, 32, doc.internal.pageSize.getWidth() - 20, 32);

        // Receipt Details
        doc.setFontSize(12);
        const receiptDate = new Date().toLocaleDateString();
        doc.text(`Date: ${receiptDate}`, 150, 42);
        doc.text(`Receipt No: ${emi.id}`, 20, 42);
        
        doc.setFont('helvetica', 'bold');
        doc.text("Payment Details", 20, 55);
        doc.setFont('helvetica', 'normal');
        
        const data = [
            ['Received From:', customer.name],
            ['Customer ID:', customer.id!],
            ['Loan ID:', loan.id],
            ['Payment For:', `Installment No. ${emi.installment}`],
            ['Amount Paid:', `Rs. ${emi.amount.toLocaleString()}`],
            ['Due Date:', new Date(emi.dueDate).toLocaleDateString()],
            ['Payment Status:', 'Paid'],
        ];

        doc.autoTable({
            startY: 60,
            body: data,
            theme: 'plain',
            styles: { fontSize: 11, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 20;

        doc.setFontSize(10);
        doc.text("This is a computer-generated receipt and does not require a signature.", doc.internal.pageSize.getWidth() / 2, finalY, { align: 'center' });

        doc.save(`Receipt_${emi.id}.pdf`);
        return true;
    } catch (error) {
        console.error("Receipt Generation Error:", error);
        return false;
    }
};


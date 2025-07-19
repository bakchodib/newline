"use client";

import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from './ui/button';
import { Download, FileText, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Extend jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Sample data for demonstration
const sampleLoanData = {
    loanId: 'L-202407-001',
    customer: {
        id: 'C-101',
        name: 'John Doe',
        phone: '+1-555-123-4567',
        address: '123 Main Street, Anytown, USA, 12345',
        photo: 'https://placehold.co/150x150.png', // Placeholder URL
    },
    loan: {
        amount: 50000,
        interestRate: 12.5, // Annual
        tenure: 12, // Months
        disbursalDate: new Date(),
    },
};

const generateEmiSchedule = (amount: number, annualRate: number, tenureMonths: number, startDate: Date) => {
    const monthlyRate = annualRate / 12 / 100;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    let balance = amount;
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
        const interest = balance * monthlyRate;
        const principal = emi - interest;
        balance -= principal;

        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

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


export function LoanDocuments() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);

    useEffect(() => {
        // In a real app, this would be fetched when customer data is loaded
        // For demo, storing and retrieving from localStorage
        try {
            let photo = localStorage.getItem('customer_photo');
            if (!photo) {
                // Fetch image and convert to base64 to avoid CORS issues in jsPDF
                fetch(sampleLoanData.customer.photo)
                    .then(response => response.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            localStorage.setItem('customer_photo', base64data);
                            setCustomerPhoto(base64data);
                        };
                        reader.readAsDataURL(blob);
                    });
            } else {
                 setCustomerPhoto(photo);
            }
        } catch (error) {
            console.error("Could not process customer photo:", error);
            toast({
                variant: "destructive",
                title: "Photo Error",
                description: "Failed to load customer photo for PDF generation."
            });
        }
    }, [toast]);

    const addWatermark = (doc: jsPDF) => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(50);
            doc.saveState();
            doc.translate(doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2);
            doc.rotate(-45);
            doc.text("JLS FINANCE LTD", 0, 0, { align: 'center' });
            doc.restoreState();
        }
    };

    const generatePdf = (type: 'agreement' | 'card') => {
        if (!customerPhoto) {
            toast({
                variant: "destructive",
                title: "Cannot Generate PDF",
                description: "Customer photo is not available. Please try again."
            });
            return;
        }

        setIsGenerating(true);
        try {
            const doc = new jsPDF() as jsPDFWithAutoTable;
            const { customer, loan, loanId } = sampleLoanData;
            const emiSchedule = generateEmiSchedule(loan.amount, loan.interestRate, loan.tenure, loan.disbursalDate);

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

            if (customerPhoto) {
              doc.addImage(customerPhoto, 'PNG', 150, 45, 40, 40);
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
            doc.text(`Loan ID: ${loanId}`, 20, 103);
            doc.text(`Loan Amount: Rs. ${loan.amount.toLocaleString()}`, 20, 109);
            doc.text(`Interest Rate: ${loan.interestRate}% p.a.`, 20, 115);
            doc.text(`Tenure: ${loan.tenure} months`, 20, 121);
            doc.text(`Disbursal Date: ${loan.disbursalDate.toLocaleDateString()}`, 20, 127);
            
            // EMI Schedule Table
            doc.setFont('helvetica', 'bold');
            doc.text("EMI Schedule", 20, 140);
            doc.autoTable({
                startY: 145,
                head: [['Month', 'Due Date', 'EMI Amount (Rs.)']],
                body: emiSchedule.map(emi => [emi.month, emi.dueDate, emi.amount]),
                theme: 'grid',
                headStyles: { fillColor: [22, 163, 74] },
            });
            
            let finalY = (doc as any).lastAutoTable.finalY || 180;

            if(type === 'agreement'){
                doc.setFontSize(10);
                doc.text("Terms and Conditions:", 20, finalY + 10);
                doc.setFont('helvetica', 'normal');
                const terms = `1. The borrower agrees to repay the loan amount with interest as per the EMI schedule.\n2. Late payment will attract a penalty fee of 2% per month on the overdue amount.\n3. All disputes are subject to the jurisdiction of the Anytown courts.`;
                doc.text(terms, 20, finalY + 16, { maxWidth: doc.internal.pageSize.getWidth() - 40 });
                finalY += 30;
            }
            
            // Signature Section
            doc.setLineWidth(0.2);
            doc.line(20, finalY + 25, 80, finalY + 25);
            doc.text("Customer Signature", 35, finalY + 30);

            doc.line(doc.internal.pageSize.getWidth() - 80, finalY + 25, doc.internal.pageSize.getWidth() - 20, finalY + 25);
            doc.text("Authorized Signatory", doc.internal.pageSize.getWidth() - 65, finalY + 30);
            doc.text("(JLS Finance Ltd)", doc.internal.pageSize.getWidth() - 65, finalY + 35);
            
            // Add watermark
            addWatermark(doc);

            // Preview or Download
            doc.save(`${type}_${customer.id}.pdf`);
            
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
        <div className="border-t pt-4 mt-4">
             <h3 className="text-lg font-semibold mb-2">Generate Loan Documents</h3>
             <p className="text-sm text-muted-foreground mb-4">
                Click to generate and download the official loan documents for a sample customer.
             </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => generatePdf('agreement')} disabled={isGenerating || !customerPhoto} className="w-full sm:w-auto">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Generate Agreement
                </Button>
                <Button onClick={() => generatePdf('card')} disabled={isGenerating || !customerPhoto} variant="secondary" className="w-full sm:w-auto">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Generate Loan Card
                </Button>
            </div>
             {!customerPhoto && !isGenerating && (
                <p className="text-sm text-amber-600 mt-4 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparing customer photo for documents...
                </p>
            )}
        </div>
    );
}

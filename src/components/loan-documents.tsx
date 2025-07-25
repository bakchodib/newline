
"use client";

import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from './ui/button';
import { FileText, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Customer } from '@/app/dashboard/customers/page';
import type { Loan, TopUp } from '@/app/dashboard/loans/all/page';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export type Emi = {
  id: string;
  loanId: string;
  installment: number;
  dueDate: Timestamp;
  amount: number;
  status: 'paid' | 'unpaid';
};


interface LoanDocumentsProps {
    customer: Customer;
    loan: Loan;
}

const toDate = (date: Date | Timestamp) => {
    return date instanceof Timestamp ? date.toDate() : date;
}

// Helper function to fetch image as base64
const getImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


const generateEmiScheduleData = (loanId: string, allEmis: Emi[]) => {
    return allEmis
        .filter(e => e.loanId === loanId)
        .sort((a,b) => a.installment - b.installment)
        .map(e => ({
            month: e.installment,
            dueDate: toDate(e.dueDate).toLocaleDateString(),
            amount: e.amount.toFixed(2),
            status: e.status.charAt(0).toUpperCase() + e.status.slice(1)
        }));
};

export function LoanDocuments({ customer, loan }: LoanDocumentsProps) {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [allEmis, setAllEmis] = useState<Emi[]>([]);
    
    useEffect(() => {
        if (loan && loan.id) {
            const fetchEmis = async () => {
                const q = query(collection(db, "emis"), where("loanId", "==", loan.id));
                const querySnapshot = await getDocs(q);
                const loanEmis = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Emi);
                setAllEmis(loanEmis);
            }
            fetchEmis();
        }
    }, [loan])

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

    const generatePdf = async (type: 'agreement' | 'card') => {
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
            
            // Add Logo
            const logoUrl = 'https://i.ibb.co/mSqkZJ4/JLS-FINANCE.png';
            const logoBase64 = await getImageAsBase64(logoUrl);
            doc.addImage(logoBase64, 'PNG', doc.internal.pageSize.getWidth() / 2 - 35, 10, 70, 20);

            // Header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(type === 'agreement' ? "Loan Agreement" : "Loan Card", doc.internal.pageSize.getWidth() / 2, 38, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(20, 42, doc.internal.pageSize.getWidth() - 20, 42);

            // Customer Details Section
            let startY = 52;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Customer Details", 20, startY);

            const customerPhotoBase64 = customer.photo ? await getImageAsBase64(customer.photo) : null;
            if(customerPhotoBase64) {
                 try {
                  doc.addImage(customerPhotoBase64, 'JPEG', 150, startY + 5, 40, 40);
                } catch (e) {
                  console.error("Error adding customer image to PDF:", e);
                }
            }
            
            startY += 8;
            doc.setFont('helvetica', 'normal');
            doc.text(`Customer Name: ${customer.name}`, 20, startY); startY += 6;
            doc.text(`Customer ID: ${customer.id}`, 20, startY); startY += 6;
            doc.text(`Phone Number: ${customer.phone}`, 20, startY); startY += 6;
            doc.text(`Address: ${customer.address}`, 20, startY, { maxWidth: 120 });
            
            let finalY = startY + 20;

            // Original Loan Details
            doc.setFont('helvetica', 'bold');
            doc.text("Loan Details (Post-Topup)", 20, finalY);
            finalY += 8;
            doc.setFont('helvetica', 'normal');
            doc.text(`Loan ID: ${loan.id}`, 20, finalY); finalY += 6;
            doc.text(`Total Sanctioned Amount: Rs. ${loan.amount.toLocaleString()}`, 20, finalY); finalY += 6;
            doc.text(`Final Interest Rate: ${loan.interestRate}% p.a.`, 20, finalY); finalY += 6;
            doc.text(`Final Tenure: ${loan.tenure} months`, 20, finalY); finalY += 6;
            doc.text(`Last Transaction Date: ${toDate(loan.disbursalDate).toLocaleDateString()}`, 20, finalY);
            finalY += 10;
            
            if (loan.topupHistory && loan.topupHistory.length > 0) {
                loan.topupHistory.forEach((topup, index) => {
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Top-up Transaction #${index + 1}`, 20, finalY);
                    finalY += 8;
                    doc.setFont('helvetica', 'normal');
                    const netDisbursed = topup.topupAmount - topup.processingFee;
                    doc.text(`Top-up ID: ${topup.id}`, 20, finalY); finalY += 6;
                    doc.text(`Top-up Amount: Rs. ${topup.topupAmount.toLocaleString()}`, 20, finalY); finalY += 6;
                    doc.text(`Processing Fee: Rs. ${topup.processingFee.toLocaleString()}`, 20, finalY); finalY += 6;
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Net Disbursed: Rs. ${netDisbursed.toLocaleString()}`, 20, finalY); finalY += 6;
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Transaction Date: ${toDate(topup.topupDate).toLocaleDateString()}`, 20, finalY); finalY += 6;
                    doc.text(`Terms at Top-up: ${topup.interestRate}% for ${topup.tenure} months`, 20, finalY);
                    finalY += 10;
                });
            }

            // EMI Schedule Table
            doc.setFont('helvetica', 'bold');
            doc.text("Consolidated EMI Schedule", 20, finalY);
            finalY += 5;

            const tableHeaders = ['Installment', 'Due Date', 'EMI (Rs.)'];
            if(type === 'card'){
                tableHeaders.push('Status');
            }
            
            const emiScheduleData = generateEmiScheduleData(loan.id!, allEmis);
            const tableBody = emiScheduleData.map(emi => {
                 const emiData = [emi.month, emi.dueDate, emi.amount];
                 if (type === 'card') {
                    emiData.push(emi.status);
                 }
                 return emiData;
            });

            doc.autoTable({
                startY: finalY,
                head: [tableHeaders],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [34, 139, 34] },
            });
            
            finalY = (doc as any).lastAutoTable.finalY || finalY + 20;

            if(type === 'agreement'){
                if (finalY > 200) doc.addPage();
                
                let guarantorY = finalY > 200 ? 20 : finalY + 10;

                if (customer.guarantor && customer.guarantor.name) {
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Guarantor Details", 20, guarantorY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Name: ${customer.guarantor.name}`, 20, guarantorY + 8);
                    doc.text(`Phone: ${customer.guarantor.phone}`, 20, guarantorY + 14);
                    doc.text(`Address: ${customer.guarantor.address}`, 20, guarantorY + 20);
                    guarantorY += 40;
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text("Terms and Conditions:", 20, guarantorY);
                doc.setFont('helvetica', 'normal');
                const terms = `1. The borrower agrees to repay the loan amount with interest as per the EMI schedule.\n2. Late payment will attract a penalty fee of 2% per month on the overdue amount.\n3. All disputes are subject to the jurisdiction of the Anytown courts.`;
                doc.text(terms, 20, guarantorY + 6, { maxWidth: doc.internal.pageSize.getWidth() - 40 });
                finalY = guarantorY + 40;
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

export const generateEmiReceipt = async (emi: Emi, loan: Loan, customer: Customer) => {
    try {
        const doc = new jsPDF() as jsPDFWithAutoTable;

        // Add Logo
        const logoUrl = 'https://i.ibb.co/mSqkZJ4/JLS-FINANCE.png';
        const logoBase64 = await getImageAsBase64(logoUrl);
        doc.addImage(logoBase64, 'PNG', doc.internal.pageSize.getWidth() / 2 - 35, 10, 70, 20);


        // Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text("EMI Payment Receipt", doc.internal.pageSize.getWidth() / 2, 38, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(20, 42, doc.internal.pageSize.getWidth() - 20, 42);

        // Receipt Details
        doc.setFontSize(12);
        const receiptDate = new Date().toLocaleDateString();
        doc.text(`Date: ${receiptDate}`, 150, 52);
        doc.text(`Receipt No: ${emi.id}`, 20, 52);
        
        doc.setFont('helvetica', 'bold');
        doc.text("Payment Details", 20, 65);
        doc.setFont('helvetica', 'normal');
        
        const data = [
            ['Received From:', customer.name],
            ['Customer ID:', customer.id!],
            ['Loan ID:', loan.id!],
            ['Payment For:', `Installment No. ${emi.installment}`],
            ['Amount Paid:', `Rs. ${emi.amount.toLocaleString()}`],
            ['Due Date:', toDate(emi.dueDate).toLocaleDateString()],
            ['Payment Status:', 'Paid'],
        ];

        doc.autoTable({
            startY: 70,
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

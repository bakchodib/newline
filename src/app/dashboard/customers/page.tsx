
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, User, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define the schema for a customer
const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number."),
  address: z.string().min(5, "Address is too short."),
  kyc: z.object({
    idType: z.string().min(1, "Please select an ID type."),
    idNumber: z.string().min(4, "ID number seems too short."),
  }),
  guarantor: z.object({
    name: z.string().min(3, "Guarantor name is required."),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number."),
    address: z.string().min(5, "Guarantor address is required."),
  })
});

export type Customer = z.infer<typeof customerSchema>;

const CustomerRegistrationForm = ({ onCustomerAdded }: { onCustomerAdded: (customer: Customer) => void }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGuarantorOpen, setIsGuarantorOpen] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<Customer>({
    resolver: zodResolver(customerSchema),
  });

  const onSubmit = (data: Customer) => {
    const newCustomer: Customer = {
      ...data,
      id: `C-${Date.now()}`
    };
    
    // Save to localStorage
    const existingCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
    localStorage.setItem('jls_customers', JSON.stringify([...existingCustomers, newCustomer]));
    
    onCustomerAdded(newCustomer);
    toast({ title: "Success", description: "Customer registered successfully." });
    reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Register Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register New Customer</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new customer to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
            
            <h4 className="font-semibold text-primary">Personal Details</h4>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
              {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
            </div>

            <h4 className="font-semibold text-primary pt-4">KYC Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="kyc.idType">ID Type</Label>
                   <select {...register('kyc.idType')} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="">Select ID Type</option>
                        <option value="Aadhar Card">Aadhar Card</option>
                        <option value="Voter ID">Voter ID</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Passport">Passport</option>
                    </select>
                  {errors.kyc?.idType && <p className="text-destructive text-sm mt-1">{errors.kyc.idType.message}</p>}
              </div>
               <div className="space-y-2">
                  <Label htmlFor="kyc.idNumber">ID Number</Label>
                  <Input id="kyc.idNumber" {...register('kyc.idNumber')} />
                  {errors.kyc?.idNumber && <p className="text-destructive text-sm mt-1">{errors.kyc.idNumber.message}</p>}
               </div>
            </div>

            <Collapsible open={isGuarantorOpen} onOpenChange={setIsGuarantorOpen} className="space-y-2 pt-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-primary">
                Guarantor Details
                {isGuarantorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                 <div className="space-y-2">
                    <Label htmlFor="guarantor.name">Guarantor Name</Label>
                    <Input id="guarantor.name" {...register('guarantor.name')} />
                    {errors.guarantor?.name && <p className="text-destructive text-sm mt-1">{errors.guarantor.name.message}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="guarantor.phone">Guarantor Phone</Label>
                    <Input id="guarantor.phone" {...register('guarantor.phone')} />
                    {errors.guarantor?.phone && <p className="text-destructive text-sm mt-1">{errors.guarantor.phone.message}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="guarantor.address">Guarantor Address</Label>
                    <Input id="guarantor.address" {...register('guarantor.address')} />
                    {errors.guarantor?.address && <p className="text-destructive text-sm mt-1">{errors.guarantor.address.message}</p>}
                 </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


const CustomerList = ({ customers, onDeleteCustomer }: { customers: Customer[], onDeleteCustomer: (id: string) => void }) => {
    if (customers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed rounded-lg mt-6">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Customers Found</h3>
                <p className="text-muted-foreground">Get started by registering a new customer.</p>
            </div>
        )
    }

    return (
        <div className="mt-6 rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.map((customer) => (
                        <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.id}</TableCell>
                            <TableCell>{customer.name}</TableCell>
                            <TableCell>{customer.phone}</TableCell>
                            <TableCell>{customer.address}</TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the customer
                                                and all associated loan data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDeleteCustomer(customer.id!)} className="bg-destructive hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        // Load customers from localStorage on component mount
        try {
            const storedCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
            setCustomers(storedCustomers);
        } catch (e) {
            console.error("Failed to parse customers from localStorage", e);
            setCustomers([]);
        }
    }, []);

    const handleCustomerAdded = (customer: Customer) => {
        setCustomers(prev => [...prev, customer]);
    };
    
    const handleDeleteCustomer = (id: string) => {
        const updatedCustomers = customers.filter(c => c.id !== id);
        localStorage.setItem('jls_customers', JSON.stringify(updatedCustomers));

        // Also delete associated loans
        const loans = JSON.parse(localStorage.getItem('jls_loans') || '[]');
        const updatedLoans = loans.filter((loan: { customerId: string }) => loan.customerId !== id);
        localStorage.setItem('jls_loans', JSON.stringify(updatedLoans));

        setCustomers(updatedCustomers);
        toast({
            title: "Customer Deleted",
            description: `Customer with ID ${id} and their loans have been removed.`,
            variant: "destructive"
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Customer Management</CardTitle>
                    <CardDescription>Register new customers and manage existing ones.</CardDescription>
                </div>
                <CustomerRegistrationForm onCustomerAdded={handleCustomerAdded} />
            </CardHeader>
            <CardContent>
                <CustomerList customers={customers} onDeleteCustomer={handleDeleteCustomer} />
            </CardContent>
        </Card>
    );
}

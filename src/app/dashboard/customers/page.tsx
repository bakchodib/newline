
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, User, Trash2 } from 'lucide-react';

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

// Define the schema for a customer
const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number."),
  address: z.string().min(5, "Address is too short."),
});

type Customer = z.infer<typeof customerSchema>;

const CustomerRegistrationForm = ({ onCustomerAdded }: { onCustomerAdded: (customer: Customer) => void }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Customer>({
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register New Customer</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new customer to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <div className="col-span-3">
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
               <div className="col-span-3">
                <Input id="phone" {...register('phone')} />
                {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
               <div className="col-span-3">
                <Input id="address" {...register('address')} />
                {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
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
        const storedCustomers = JSON.parse(localStorage.getItem('jls_customers') || '[]');
        setCustomers(storedCustomers);
    }, []);

    const handleCustomerAdded = (customer: Customer) => {
        setCustomers(prev => [...prev, customer]);
    };
    
    const handleDeleteCustomer = (id: string) => {
        const updatedCustomers = customers.filter(c => c.id !== id);
        localStorage.setItem('jls_customers', JSON.stringify(updatedCustomers));
        setCustomers(updatedCustomers);
        toast({
            title: "Customer Deleted",
            description: `Customer with ID ${id} has been removed.`,
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

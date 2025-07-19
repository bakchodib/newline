
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, User, Trash2, ChevronDown, ChevronUp, Upload, X, Loader2, Edit } from 'lucide-react';
import Image from 'next/image';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from '@/components/ui/skeleton';


// Define the schema for a customer
const customerSchema = z.object({
  id: z.string().optional(),
  photo: z.string().optional(),
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

const PhotoUploader = ({
  photoPreview,
  isUploading,
  onPhotoChange,
  onClearPhoto,
}: {
  photoPreview: string | null;
  isUploading: boolean;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearPhoto: () => void;
}) => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-40 h-40 rounded-full border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden">
      {photoPreview ? (
        <Image src={photoPreview} alt="Preview" width={160} height={160} className="object-cover w-full h-full" />
      ) : isUploading ? (
        <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
      ) : (
        <User className="w-20 h-20 text-muted-foreground" />
      )}
    </div>
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" asChild disabled={isUploading}>
        <label htmlFor="photo-upload" className="cursor-pointer">
          <Upload className="mr-2 h-4 w-4" /> Upload
        </label>
      </Button>
      <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={onPhotoChange} disabled={isUploading} />
      {photoPreview && (
        <Button type="button" size="sm" variant="destructive" onClick={onClearPhoto} disabled={isUploading}>
          <X className="mr-2 h-4 w-4" /> Remove
        </Button>
      )}
    </div>
  </div>
);

const handlePhotoUpload = async (file: File): Promise<string> => {
    const IMGUR_API_KEY = "881d667e66f0b22ff45ba16e248fbcb2";
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGUR_API_KEY}`, {
        method: 'POST',
        body: formData,
    });
    
    const result = await response.json();

    if (result.success && result.data.url) {
        return result.data.url;
    } else {
        throw new Error(result.error?.message || 'Failed to upload image.');
    }
};

const CustomerRegistrationForm = ({ onCustomerAdded }: { onCustomerAdded: () => void }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGuarantorOpen, setIsGuarantorOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      photo: "",
      kyc: { idType: "", idNumber: "" },
      guarantor: { name: "", phone: "", address: "" }
    }
  });
  
  const { control, handleSubmit, register, reset, setValue, formState: { errors, isSubmitting } } = form;

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const imageUrl = await handlePhotoUpload(file);
        setValue('photo', imageUrl);
        setPhotoPreview(imageUrl);
        toast({ title: "Photo Uploaded", description: "The customer photo was uploaded successfully." });
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the photo. Please try again."});
        clearPhoto();
    } finally {
        setIsUploading(false);
    }
  };
  
  const clearPhoto = () => {
      setValue('photo', '');
      setPhotoPreview(null);
  }

  const onSubmit = async (data: Customer) => {
    try {
        await addDoc(collection(db, "customers"), data);
        onCustomerAdded();
        toast({ title: "Success", description: "Customer registered successfully." });
        reset();
        setPhotoPreview(null);
        setIsOpen(false);
    } catch (error: any) {
        console.error("Error adding customer: ", error);
        let description = "Failed to register customer.";
        if (error.code === 'permission-denied') {
            description = "You do not have permission to add customers. Please check your login or contact an admin.";
        }
        toast({ variant: "destructive", title: "Error", description });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            reset();
            setPhotoPreview(null);
        }
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Register Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register New Customer</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new customer to the system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <h4 className="font-semibold text-primary">Customer Photo</h4>
                   <FormField
                    control={control}
                    name="photo"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <PhotoUploader 
                            photoPreview={photoPreview}
                            isUploading={isUploading}
                            onPhotoChange={handlePhotoChange}
                            onClearPhoto={clearPhoto}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-semibold text-primary">Personal Details</h4>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" {...register('phone')} />
                      {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register('address')} />
                    {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
                  </div>

                  <h4 className="font-semibold text-primary pt-4">KYC Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
              </div>

              <Collapsible open={isGuarantorOpen} onOpenChange={setIsGuarantorOpen} className="space-y-2 pt-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-primary text-lg border-t pt-4">
                  Guarantor Details (Optional)
                  {isGuarantorOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
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
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Customer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const EditCustomerDialog = ({ customer, onCustomerUpdated }: { customer: Customer, onCustomerUpdated: () => void }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGuarantorOpen, setIsGuarantorOpen] = useState(customer.guarantor && !!customer.guarantor.name);
  const [photoPreview, setPhotoPreview] = useState<string | null>(customer.photo || null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer,
  });

  const { control, handleSubmit, register, reset, setValue, formState: { errors, isSubmitting } } = form;

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const imageUrl = await handlePhotoUpload(file);
      setValue('photo', imageUrl);
      setPhotoPreview(imageUrl);
      toast({ title: "Photo Updated", description: "The new photo was uploaded successfully." });
    } catch (error) {
      console.error("ImgBB Upload Error:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the new photo." });
    } finally {
      setIsUploading(false);
    }
  };

  const clearPhoto = () => {
    setValue('photo', '');
    setPhotoPreview(null);
  };

  const onSubmit = async (data: Customer) => {
    if (!customer.id) {
        toast({ variant: "destructive", title: "Error", description: "Customer ID is missing." });
        return;
    }
    try {
        const customerRef = doc(db, "customers", customer.id);
        await updateDoc(customerRef, data);
        onCustomerUpdated();
        toast({ title: "Success", description: "Customer details updated successfully." });
        setIsOpen(false);
    } catch (error) {
        console.error("Error updating customer: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update customer details." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) {
        reset(customer);
        setPhotoPreview(customer.photo || null);
      }
      setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Customer: {customer.name}</DialogTitle>
          <DialogDescription>
            Update the details for this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <h4 className="font-semibold text-primary">Customer Photo</h4>
                  <FormField
                    control={control}
                    name="photo"
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <PhotoUploader
                            photoPreview={photoPreview}
                            isUploading={isUploading}
                            onPhotoChange={handlePhotoChange}
                            onClearPhoto={clearPhoto}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <h4 className="font-semibold text-primary">Personal Details</h4>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" {...register('phone')} />
                      {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register('address')} />
                    {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
                  </div>

                  <h4 className="font-semibold text-primary pt-4">KYC Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
              </div>

              <Collapsible open={isGuarantorOpen} onOpenChange={setIsGuarantorOpen} className="space-y-2 pt-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between font-semibold text-primary text-lg border-t pt-4">
                  Guarantor Details
                  {isGuarantorOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
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
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


const CustomerList = ({ customers, isLoading, onDeleteCustomer, onCustomerUpdated }: { customers: Customer[], isLoading: boolean, onDeleteCustomer: (id: string) => void, onCustomerUpdated: () => void }) => {
    
    if (isLoading) {
        return (
            <div className="mt-6 rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }
    
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
                                <div className="flex items-center justify-end">
                                    <EditCustomerDialog customer={customer} onCustomerUpdated={onCustomerUpdated} />
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
                                </div>
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
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            const customersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(customersData);
        } catch (e) {
            console.error("Failed to fetch customers from Firestore", e);
            toast({ variant: "destructive", title: "Error", description: "Could not load customer data." });
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);
    
    const handleDeleteCustomer = async (id: string) => {
        try {
            const batch = writeBatch(db);

            // Delete the customer
            const customerRef = doc(db, "customers", id);
            batch.delete(customerRef);

            // Find and delete associated loans
            const loansQuery = query(collection(db, "loans"), where("customerId", "==", id));
            const loansSnapshot = await getDocs(loansQuery);
            
            // For each loan, find and delete its EMIs
            for (const loanDoc of loansSnapshot.docs) {
                const loanId = loanDoc.id;
                batch.delete(loanDoc.ref); // Delete loan
                
                const emisQuery = query(collection(db, "emis"), where("loanId", "==", loanId));
                const emisSnapshot = await getDocs(emisQuery);
                emisSnapshot.forEach(emiDoc => batch.delete(emiDoc.ref)); // Delete EMIs
            }
            
            await batch.commit();

            toast({
                title: "Customer Deleted",
                description: `Customer and all associated data have been removed.`,
                variant: "destructive"
            });
            fetchCustomers(); // Refresh the list
        } catch (error) {
            console.error("Error deleting customer and related data: ", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete customer." });
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Customer Management</CardTitle>
                    <CardDescription>Register new customers and manage existing ones.</CardDescription>
                </div>
                <CustomerRegistrationForm onCustomerAdded={fetchCustomers} />
            </CardHeader>
            <CardContent>
                <CustomerList customers={customers} isLoading={isLoading} onDeleteCustomer={handleDeleteCustomer} onCustomerUpdated={fetchCustomers} />
            </CardContent>
        </Card>
    );
}

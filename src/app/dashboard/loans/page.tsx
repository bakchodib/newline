import { redirect } from 'next/navigation';

export default function LoansRedirectPage() {
  redirect('/dashboard/loans/all');
}

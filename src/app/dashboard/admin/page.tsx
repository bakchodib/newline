import { redirect } from 'next/navigation';

export default function AdminRedirectPage() {
  redirect('/dashboard/user-management');
}

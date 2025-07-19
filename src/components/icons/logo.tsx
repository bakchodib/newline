import Image from 'next/image';

export function Logo() {
  return (
    <Image
      src="https://i.ibb.co/mSqkZJ4/JLS-FINANCE.png"
      alt="JLS Finance Logo"
      width={140}
      height={40}
      priority
    />
  );
}

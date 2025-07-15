import Link from 'next/link';
import { Banknote, Shield } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-600">
            <Banknote className="h-7 w-7 text-primary" />
            <span className="font-headline">QueueNow</span>
          </Link>
          <nav>
            <Button variant="ghost" asChild>
                <Link href="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}

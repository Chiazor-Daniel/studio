import { JoinQueueForm } from '@/components/join-queue-form';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-center min-h-full">
      <div className="w-full max-w-md">
        <JoinQueueForm />
      </div>
    </div>
  );
}

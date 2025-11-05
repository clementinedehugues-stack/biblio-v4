import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const searchSchema = z.object({
  query: z.string().min(1),
});

type SearchFormInputs = z.infer<typeof searchSchema>;

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const { register, handleSubmit } = useForm<SearchFormInputs>({
    resolver: zodResolver(searchSchema),
  });

  const onSubmit = (data: SearchFormInputs) => {
    onSearch(data.query);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm items-center space-x-2">
      <Input type="text" placeholder="Search..." {...register('query')} />
      <Button type="submit">Search</Button>
    </form>
  );
}

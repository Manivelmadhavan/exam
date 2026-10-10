import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Select } from './ui';
import { Student } from '../types';

const base = {
  studentId: z.string().trim().min(2, 'Student ID must be at least 2 characters').max(50).regex(/^[A-Za-z0-9._-]+$/, 'Only letters, numbers, . _ - allowed'),
  name: z.string().trim().min(2, 'Name is required').max(100),
  year: z.enum(['ONE_YEAR', 'TWO_YEAR']),
  email: z.string().trim().email('Enter a valid email').or(z.literal('')),
  phone: z.string().trim().max(30),
  department: z.string().trim().max(100),
  batch: z.string().trim().max(50),
  rollNumber: z.string().trim().max(50),
};
export const studentCreateFormSchema = z.object({ ...base, password: z.string().min(6, 'Password must be at least 6 characters') });
export const studentEditFormSchema = z.object(base);
type CreateValues = z.infer<typeof studentCreateFormSchema>;

export function StudentForm({ student, onSubmit, onCancel }: { student?: Student; onSubmit: (values: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const editing = !!student;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(editing ? (studentEditFormSchema as unknown as typeof studentCreateFormSchema) : studentCreateFormSchema),
    defaultValues: {
      studentId: student?.studentId ?? '', name: student?.name ?? '', password: '', year: student?.year ?? 'ONE_YEAR',
      email: student?.email ?? '', phone: student?.phone ?? '', department: student?.department ?? '', batch: student?.batch ?? '', rollNumber: student?.rollNumber ?? '',
    },
  });
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => {
      const { password, ...rest } = v;
      return onSubmit(editing ? rest : { ...rest, password });
    })}>
      <Input label="Student ID *" error={errors.studentId?.message} {...register('studentId')} />
      <Input label="Student Name *" error={errors.name?.message} {...register('name')} />
      {!editing && <Input label="Password *" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />}
      <Select label="Year / Class *" error={errors.year?.message} {...register('year')}><option value="ONE_YEAR">1 Year</option><option value="TWO_YEAR">2 Year</option></Select>
      <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
      <Input label="Department" {...register('department')} />
      <Input label="Batch" {...register('batch')} />
      <Input label="Roll Number" {...register('rollNumber')} />
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{editing ? 'Save Changes' : 'Register Student'}</Button>
      </div>
    </form>
  );
}

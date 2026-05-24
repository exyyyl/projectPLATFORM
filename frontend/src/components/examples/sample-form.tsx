import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  name: z.string().min(2, 'Минимум 2 символа'),
})

type FormValues = z.infer<typeof schema>

export function SampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  })

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit((data) => console.log(data))}
    >
      <div>
        <Input placeholder="Email" {...register('email')} />
        {errors.email && (
          <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div>
        <Input placeholder="Имя" {...register('name')} />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
      <Button type="submit">Отправить</Button>
    </form>
  )
}

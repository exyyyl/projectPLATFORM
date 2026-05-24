import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  })

  const onSubmit = (data: FormValues) => {
    toast.success(`Форма отправлена: ${data.name}`)
    reset()
  }

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div>
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="name" className="sr-only">
          Имя
        </label>
        <Input
          id="name"
          placeholder="Имя"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>
      <Button type="submit">Отправить</Button>
    </form>
  )
}

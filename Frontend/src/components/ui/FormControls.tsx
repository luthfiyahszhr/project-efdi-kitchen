import React from 'react';
import { Calendar, Clock, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const sizeCls =
    size === 'sm' ? 'min-h-[40px] px-3.5 text-sm' : 'min-h-[44px] px-5 text-sm';

  const variantCls: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#245C3D] text-white hover:bg-[#1B472E] disabled:bg-[#93AC9D] disabled:text-white/90',
    secondary:
      'bg-[#EEF5EC] text-[#245C3D] hover:bg-[#DFECDC] border border-[#C5DEC1] disabled:opacity-50',
    outline:
      'bg-white text-[#243128] border border-[#CBD6C8] hover:bg-[#F5F7F4] disabled:opacity-50',
    danger:
      'bg-[#B42318] text-white hover:bg-[#911B12] disabled:bg-[#E4A5A0]',
    ghost:
      'bg-transparent text-[#243128] hover:bg-[#EEF5EC] disabled:opacity-50',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${sizeCls} ${variantCls[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
};

interface FieldWrapperProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  id,
  label,
  required,
  error,
  helper,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-[#243128]">
      {label}
      {required && (
        <span className="ml-1 text-[#B42318]" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p role="alert" className="text-xs font-medium text-[#B42318]">
        {error}
      </p>
    ) : helper ? (
      <p className="text-xs text-[#55645A]">{helper}</p>
    ) : null}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
  rightAdornment?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  required,
  error,
  helper,
  rightAdornment,
  className = '',
  ...rest
}) => (
  <FieldWrapper
    id={id}
    label={label}
    required={required}
    error={error}
    helper={helper}
  >
    <div className="relative">
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[44px] rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-[#243128] placeholder:text-[#7E8D83] transition-colors ${
          rightAdornment ? 'pr-11' : ''
        } ${
          error
            ? 'border-[#B42318] focus:border-[#B42318]'
            : 'border-[#CBD6C8] focus:border-[#245C3D]'
        } disabled:bg-[#F5F7F4] disabled:text-[#6B7A70] ${className}`}
        {...rest}
      />
      {rightAdornment && (
        <div className="absolute inset-y-0 right-2 flex items-center">
          {rightAdornment}
        </div>
      )}
    </div>
  </FieldWrapper>
);

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  id,
  label,
  required,
  error,
  helper,
  className = '',
  ...rest
}) => (
  <FieldWrapper
    id={id}
    label={label}
    required={required}
    error={error}
    helper={helper}
  >
    <textarea
      id={id}
      required={required}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-[#243128] placeholder:text-[#7E8D83] transition-colors ${
        error
          ? 'border-[#B42318] focus:border-[#B42318]'
          : 'border-[#CBD6C8] focus:border-[#245C3D]'
      } disabled:bg-[#F5F7F4] ${className}`}
      {...rest}
    />
  </FieldWrapper>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  required,
  error,
  helper,
  className = '',
  children,
  ...rest
}) => (
  <FieldWrapper
    id={id}
    label={label}
    required={required}
    error={error}
    helper={helper}
  >
    <select
      id={id}
      required={required}
      aria-invalid={Boolean(error)}
      className={`w-full min-h-[44px] rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-[#243128] transition-colors ${
        error
          ? 'border-[#B42318] focus:border-[#B42318]'
          : 'border-[#CBD6C8] focus:border-[#245C3D]'
      } disabled:bg-[#F5F7F4] disabled:text-[#6B7A70] ${className}`}
      {...rest}
    >
      {children}
    </select>
  </FieldWrapper>
);

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  label,
  required,
  error,
  helper,
  className = '',
  ...rest
}) => (
  <FieldWrapper
    id={id}
    label={label}
    required={required}
    error={error}
    helper={helper}
  >
    <div className="relative">
      <Calendar
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55645A]"
        aria-hidden="true"
      />
      <input
        id={id}
        type="date"
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[44px] rounded-[10px] border bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#243128] ${
          error ? 'border-[#B42318]' : 'border-[#CBD6C8] focus:border-[#245C3D]'
        } disabled:bg-[#F5F7F4] ${className}`}
        {...rest}
      />
    </div>
  </FieldWrapper>
);

interface TimePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helper?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  id,
  label,
  required,
  error,
  helper,
  className = '',
  ...rest
}) => (
  <FieldWrapper
    id={id}
    label={label}
    required={required}
    error={error}
    helper={helper}
  >
    <div className="relative">
      <Clock
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55645A]"
        aria-hidden="true"
      />
      <input
        id={id}
        type="time"
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[44px] rounded-[10px] border bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#243128] ${
          error ? 'border-[#B42318]' : 'border-[#CBD6C8] focus:border-[#245C3D]'
        } disabled:bg-[#F5F7F4] ${className}`}
        {...rest}
      />
    </div>
  </FieldWrapper>
);

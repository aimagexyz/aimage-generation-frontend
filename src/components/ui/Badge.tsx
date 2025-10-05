import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        success: 'border-transparent bg-green-600 text-white hover:bg-green-600/80',
        warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type Props = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof badgeVariants>;

function Badge(props: Props) {
  const { className, variant, ...restProps } = props;
  return <div className={twMerge(badgeVariants({ variant }), className)} {...restProps} />;
}

export { Badge, badgeVariants };

import {cva, type VariantProps} from 'class-variance-authority'

export {default as Button} from './Button.vue'

export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-6px_rgba(225,29,72,0.45)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_12px_32px_-4px_rgba(225,29,72,0.6)] hover:-translate-y-px active:translate-y-0',
                secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
                destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90',
                // Tinted with `foreground`, not literal white: a white overlay is
                // invisible on the light theme's near-white background, which left
                // `ghost` and `outline` with no hover feedback at all in light mode.
                outline:
                    'border border-border bg-foreground/[0.02] text-foreground hover:bg-foreground/[0.06] hover:border-foreground/20',
                ghost: 'bg-transparent text-foreground hover:bg-foreground/[0.06]',
                link: 'bg-transparent text-primary underline-offset-4 hover:underline'
            },
            size: {
                default: 'h-11 px-4 py-2 [&_svg]:size-4',
                sm: 'h-9 rounded-sm px-3 [&_svg]:size-4',
                lg: 'h-12 rounded-lg px-6 text-base [&_svg]:size-5',
                icon: 'size-11 [&_svg]:size-5'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

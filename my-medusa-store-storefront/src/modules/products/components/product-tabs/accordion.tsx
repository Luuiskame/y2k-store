import { clx } from "@medusajs/ui"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import React from "react"

type AccordionItemProps = AccordionPrimitive.AccordionItemProps & {
  title: string
  subtitle?: string
  description?: string
  required?: boolean
  tooltip?: string
  forceMountContent?: true
  headingSize?: "small" | "medium" | "large"
  customTrigger?: React.ReactNode
  complete?: boolean
  active?: boolean
  triggerable?: boolean
  children: React.ReactNode
}

type AccordionProps =
  | (AccordionPrimitive.AccordionSingleProps &
      React.RefAttributes<HTMLDivElement>)
  | (AccordionPrimitive.AccordionMultipleProps &
      React.RefAttributes<HTMLDivElement>)

const Accordion: React.FC<AccordionProps> & {
  Item: React.FC<AccordionItemProps>
} = ({ children, ...props }) => {
  return (
    <AccordionPrimitive.Root {...props}>{children}</AccordionPrimitive.Root>
  )
}

const Item: React.FC<AccordionItemProps> = ({
  title,
  subtitle,
  description,
  children,
  className,
  headingSize = "large",
  customTrigger = undefined,
  forceMountContent = undefined,
  triggerable,
  ...props
}) => {
  return (
    <AccordionPrimitive.Item
      {...props}
      className={clx(
        "group last:mb-0 py-4",
        "border-t last:border-b",
        className
      )}
      style={{ borderColor: "var(--brand-amethyst)" }}
    >
      <AccordionPrimitive.Header className="px-1">
        <AccordionPrimitive.Trigger className="w-full">
          <div className="flex w-full items-center justify-between text-left">
            <span className="font-heading uppercase tracking-[0.18em] text-sm text-brand-ghost-white">
              {title}
            </span>
            {customTrigger || <MorphingTrigger />}
          </div>
          {subtitle && (
            <span className="block mt-1 text-xs text-brand-silver-ash">
              {subtitle}
            </span>
          )}
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content
        forceMount={forceMountContent}
        className={clx(
          "radix-state-closed:animate-accordion-close radix-state-open:animate-accordion-open radix-state-closed:pointer-events-none px-1"
        )}
      >
        <div className="group-radix-state-closed:animate-accordion-close">
          {description && (
            <p className="text-sm text-brand-silver-ash">{description}</p>
          )}
          <div className="w-full">{children}</div>
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}

Accordion.Item = Item

const MorphingTrigger = () => {
  return (
    <div
      className="rounded-rounded relative p-[6px] transition-colors"
      style={{ color: "var(--brand-sacred-violet)" }}
    >
      <div className="h-5 w-5">
        <span
          className="rounded-circle group-radix-state-open:rotate-90 absolute inset-y-[31.75%] left-[48%] right-1/2 w-[1.5px] duration-300"
          style={{ backgroundColor: "var(--brand-sacred-violet)" }}
        />
        <span
          className="rounded-circle group-radix-state-open:rotate-90 group-radix-state-open:left-1/2 group-radix-state-open:right-1/2 absolute inset-x-[31.75%] top-[48%] bottom-1/2 h-[1.5px] duration-300"
          style={{ backgroundColor: "var(--brand-sacred-violet)" }}
        />
      </div>
    </div>
  )
}

export default Accordion

"use client"

import { Button } from "@medusajs/ui"
import React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  variant = "primary",
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "transparent" | "danger" | null
  className?: string
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()

  const brandClasses =
    variant === "primary"
      ? "bg-brand-sacred-violet hover:bg-brand-divine-lilac text-brand-ghost-white border-none transition-colors"
      : variant === "secondary"
        ? "bg-transparent border border-brand-amethyst text-brand-sacred-violet hover:bg-brand-abyss-purple hover:text-brand-divine-lilac transition-colors"
        : ""

  return (
    <Button
      size="large"
      className={`${brandClasses} ${className ?? ""}`.trim()}
      type="submit"
      isLoading={pending}
      variant={variant || "primary"}
      data-testid={dataTestId}
    >
      {children}
    </Button>
  )
}

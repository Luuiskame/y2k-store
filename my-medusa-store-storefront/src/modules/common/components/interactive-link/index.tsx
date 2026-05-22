import { ArrowUpRightMini } from "@medusajs/icons"
import LocalizedClientLink from "../localized-client-link"

type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      className="inline-flex gap-x-1.5 items-center group font-heading uppercase tracking-[0.18em] text-xs whitespace-nowrap transition-colors duration-200 ease-in-out"
      style={{ color: "var(--brand-sacred-violet)" }}
      href={href}
      onClick={onClick}
      {...props}
    >
      <span className="group-hover:[color:var(--brand-divine-lilac)] transition-colors duration-200 ease-in-out">
        {children}
      </span>
      <ArrowUpRightMini
        className="group-hover:rotate-45 group-hover:[color:var(--brand-divine-lilac)] ease-in-out duration-200"
        color="var(--brand-sacred-violet)"
      />
    </LocalizedClientLink>
  )
}

export default InteractiveLink

import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

export type NativeSelectProps = {
  placeholder?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
} & SelectHTMLAttributes<HTMLSelectElement>

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { placeholder = "Select...", defaultValue, className, children, ...props },
    ref
  ) => {
    const innerRef = useRef<HTMLSelectElement>(null)
    const [isPlaceholder, setIsPlaceholder] = useState(false)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    useEffect(() => {
      if (innerRef.current && innerRef.current.value === "") {
        setIsPlaceholder(true)
      } else {
        setIsPlaceholder(false)
      }
    }, [innerRef.current?.value])

    return (
      <div>
        <div
          onFocus={() => innerRef.current?.focus()}
          onBlur={() => innerRef.current?.blur()}
          style={{
            backgroundColor: "var(--brand-void-black)",
            borderColor: "var(--brand-amethyst)",
            color: isPlaceholder
              ? "var(--brand-silver-ash)"
              : "var(--brand-ghost-white)",
          }}
          className={clx(
            "relative flex items-center text-base-regular border rounded-md focus-within:border-[var(--brand-sacred-violet)] focus-within:shadow-[0_0_0_2px_rgba(155,77,202,0.25)] transition-colors",
            className
          )}
        >
          <select
            ref={innerRef}
            defaultValue={defaultValue}
            data-brand-select
            {...props}
            // El popup nativo se pinta con el color de fondo del propio
            // <select>, no con el del contenedor: si queda transparente la
            // lista sale blanca con texto ghost-white (ilegible).
            style={{ backgroundColor: "var(--brand-void-black)" }}
            className="appearance-none flex-1 w-full min-w-0 border-none pl-4 pr-10 py-2.5 transition-colors duration-150 outline-none text-inherit truncate"
          >
            <option disabled value="">
              {placeholder}
            </option>
            {children}
          </select>
          <span
            style={{ color: "var(--brand-silver-ash)" }}
            className="absolute right-4 inset-y-0 flex items-center pointer-events-none"
          >
            <ChevronUpDown />
          </span>
        </div>
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect

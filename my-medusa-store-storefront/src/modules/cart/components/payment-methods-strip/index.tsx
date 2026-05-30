const PaymentMethodsStrip = () => {
  return (
    <div
      className="rounded-large p-5 flex flex-col gap-y-4"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <div className="flex items-center justify-between gap-x-3 flex-wrap">
        <h3
          className="font-heading text-base small:text-lg tracking-wide"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          Paga como tú quieras
        </h3>

        <div className="flex items-center gap-x-2 flex-wrap">
          {/* Visa */}
          <svg
            width="40"
            height="26"
            viewBox="0 0 42 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Visa"
            role="img"
          >
            <rect width="42" height="28" rx="4" fill="#1A1F71" />
            <text
              x="21"
              y="19"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontWeight="700"
              fontStyle="italic"
              fontSize="13"
              fill="white"
              letterSpacing="0.5"
            >
              VISA
            </text>
          </svg>

          {/* Mastercard */}
          <svg
            width="40"
            height="26"
            viewBox="0 0 42 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Mastercard"
            role="img"
          >
            <rect width="42" height="28" rx="4" fill="#252525" />
            <circle cx="16" cy="14" r="8" fill="#EB001B" />
            <circle cx="26" cy="14" r="8" fill="#F79E1B" />
            <path
              d="M21 7.54a8 8 0 0 1 0 12.92A8 8 0 0 1 21 7.54z"
              fill="#FF5F00"
            />
          </svg>

          {/* BAC Credomatic */}
          <div
            className="flex items-center justify-center rounded px-2"
            style={{
              background: "#C8102E",
              height: "26px",
              minWidth: "62px",
            }}
            aria-label="BAC Credomatic"
            role="img"
          >
            <img
              src="/bac-credomatic.svg"
              alt=""
              style={{
                height: "12px",
                width: "auto",
                filter: "brightness(0) invert(1)",
              }}
            />
          </div>
        </div>
      </div>

      <ul
        className="flex flex-col gap-y-2 text-sm font-body"
        style={{ color: "var(--brand-silver-ash)" }}
      >
        <li className="flex items-start gap-x-2">
          <span
            className="shrink-0 mt-0.5"
            style={{ color: "var(--brand-divine-lilac)" }}
            aria-hidden
          >
            ✓
          </span>
          <span>
            <strong style={{ color: "var(--brand-ghost-white)" }}>
              Transferencia bancaria a cuenta BAC
            </strong>{" "}
            — el método más usado en Honduras, sin recargo.
          </span>
        </li>
        <li className="flex items-start gap-x-2">
          <span
            className="shrink-0 mt-0.5"
            style={{ color: "var(--brand-divine-lilac)" }}
            aria-hidden
          >
            ✓
          </span>
          <span>
            <strong style={{ color: "var(--brand-ghost-white)" }}>
              Tarjeta de crédito o débito
            </strong>{" "}
            — procesamiento cifrado, Visa y Mastercard.
          </span>
        </li>
        <li className="flex items-start gap-x-2">
          <span
            className="shrink-0 mt-0.5"
            style={{ color: "var(--brand-divine-lilac)" }}
            aria-hidden
          >
            ✓
          </span>
          <span>
            Elegís tu método en el siguiente paso. Sin sorpresas, sin comisiones
            ocultas.
          </span>
        </li>
      </ul>
    </div>
  )
}

export default PaymentMethodsStrip

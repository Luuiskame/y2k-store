import React from "react"

import { IconProps } from "types/icon"

const Cash: React.FC<IconProps> = ({
  size = "16",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <rect
        x="2.75"
        y="6.25"
        width="18.5"
        height="11.5"
        rx="1.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="2.75"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M5.5 9.25V14.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18.5 9.25V14.75"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Cash

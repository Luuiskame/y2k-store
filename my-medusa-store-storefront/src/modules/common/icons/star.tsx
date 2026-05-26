import React from "react"

import { IconProps } from "types/icon"

const Star: React.FC<IconProps> = ({
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
      <path
        d="M12 2.5l2.95 6.36 6.95.66-5.25 4.79 1.6 6.84L12 17.77l-6.25 3.38 1.6-6.84L2.1 9.52l6.95-.66L12 2.5z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default Star

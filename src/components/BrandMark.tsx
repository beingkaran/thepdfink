interface BrandMarkProps {
  size?: number
  className?: string
}

/**
 * The thepdf.ink ink-drop mark (stem + bowl + page), rendered inline so it
 * inherits crisp rendering at any size. Gradient ids are namespaced to avoid
 * collisions when multiple marks appear on one page.
 */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="thepdf.ink"
    >
      <defs>
        <linearGradient id="bm-mark" gradientUnits="userSpaceOnUse" x1="380" y1="130" x2="740" y2="530">
          <stop offset="0" stopColor="#225c71" />
          <stop offset="0.33" stopColor="#356f93" />
          <stop offset="0.58" stopColor="#5c5d94" />
          <stop offset="0.80" stopColor="#9c4c8d" />
          <stop offset="1" stopColor="#c74984" />
        </linearGradient>
        <linearGradient id="bm-page" gradientUnits="userSpaceOnUse" x1="360" y1="390" x2="500" y2="565">
          <stop offset="0" stopColor="#5aa9cd" />
          <stop offset="1" stopColor="#2b7ba6" />
        </linearGradient>
        <linearGradient id="bm-fold" gradientUnits="userSpaceOnUse" x1="464" y1="384" x2="500" y2="476">
          <stop offset="0" stopColor="#9ad7ec" />
          <stop offset="1" stopColor="#63b3d6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="#0f1622" />
      <g transform="translate(-124.2,43.5) scale(0.66)">
        <path d="M 402 150 C 372 150, 352 172, 352 206 L 352 512 C 352 545, 374 562, 404 562 C 434 562, 452 543, 452 512 L 452 206 C 452 172, 432 150, 402 150 Z" fill="url(#bm-mark)" />
        <path d="M 500 82 C 612 120, 726 180, 762 304 C 796 412, 752 510, 636 526 C 560 536, 486 512, 440 452 C 402 402, 388 330, 404 262 C 424 178, 452 118, 500 82 Z" fill="url(#bm-mark)" />
        <path d="M 562 190 C 516 258, 478 318, 478 372 C 478 430, 524 472, 574 472 C 626 472, 664 428, 664 372 C 664 316, 614 250, 562 190 Z" fill="#ffffff" />
        <path d="M 356 405 L 464 384 L 464 476 L 500 476 L 500 562 L 372 562 Z" fill="url(#bm-page)" />
        <path d="M 464 476 L 464 384 L 500 476 Z" fill="url(#bm-fold)" />
      </g>
    </svg>
  )
}

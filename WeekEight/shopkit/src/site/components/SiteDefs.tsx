/* One hidden SVG holding every shared filter and gradient. */
export function SiteDefs() {
  return (
    <svg className="site-defs" aria-hidden="true" focusable="false">
      <defs>
        {/* coffee */}
        <radialGradient id="tk-drop">
          <stop offset="0%" stopColor="#6b3b18" stopOpacity="0.22" />
          <stop offset="80%" stopColor="#6b3b18" stopOpacity="0.3" />
          <stop offset="94%" stopColor="#4f2a10" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4f2a10" stopOpacity="0" />
        </radialGradient>

        {/* rubber stamp ink: speckled and slightly wobbly */}
        <filter id="tk-stamp-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.1" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="eroded" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="wob" />
          <feDisplacementMap in="eroded" in2="wob" scale="3" />
        </filter>

        {/* chart-recorder pen and red marker */}
        <filter id="tk-pen" x="-2%" y="-10%" width="104%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="1" seed="2" result="p" />
          <feDisplacementMap in="SourceGraphic" in2="p" scale="1.6" />
        </filter>
        <filter id="tk-redpen" x="-20%" y="-40%" width="140%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="r" scale="6" />
        </filter>

        {/* rusted steel for gears */}
        <linearGradient id="tk-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9a6a48" />
          <stop offset="45%" stopColor="#7a4a2c" />
          <stop offset="100%" stopColor="#4a2a18" />
        </linearGradient>
        <filter id="tk-rust" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="3" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.55  0 0 0 0 0.22  0 0 0 0 0.07  0 0 0 2.4 -0.95"
            result="pits"
          />
          <feComposite in="pits" in2="SourceGraphic" operator="in" result="rustPits" />
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="8" result="blotch" />
          <feColorMatrix
            in="blotch"
            type="matrix"
            values="0 0 0 0 0.66  0 0 0 0 0.3  0 0 0 0 0.1  0 0 0 1.6 -0.55"
            result="patches"
          />
          <feComposite in="patches" in2="SourceGraphic" operator="in" result="rustPatches" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="rustPatches" />
            <feMergeNode in="rustPits" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}

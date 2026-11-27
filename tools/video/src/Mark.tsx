// Break the Wall's mark, from docs/images/brand/mark.svg in its repository.
export const Mark = ({ height }: { readonly height: number }) => (
  <svg viewBox="0 0 104 88" height={height} width={(height * 104) / 88}>
    <path d="M40 33H60V29H78" fill="none" stroke="#91A9BE" strokeWidth={3} />
    <g fill="#102B46">
      <rect x={4} y={6} width={54} height={12} rx={1} />
      <rect x={4} y={27} width={36} height={12} rx={1} />
      <rect x={4} y={48} width={54} height={12} rx={1} />
      <rect x={4} y={69} width={54} height={12} rx={1} />
    </g>
    <rect x={78} y={20} width={24} height={18} fill="#D96B4B" />
  </svg>
);

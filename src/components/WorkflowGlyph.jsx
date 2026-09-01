/**
 * The Workflows nav icon, as an inline glyph.
 *
 * Same path the menubar uses for its Workflows item, but painted with
 * `currentColor` so it inherits whatever it sits in — a link, a chip, a
 * breadcrumb. Single source, so a workflow is marked the same way everywhere
 * it is referenced.
 */
export default function WorkflowGlyph({ size = 14, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M216,144H168a16,16,0,0,0-16,16v16h-8a16,16,0,0,1-16-16V96a16,16,0,0,1,16-16h8V96a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V48a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16V64h-8a32,32,0,0,0-32,32v24H80v-8A16,16,0,0,0,64,96H32a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16H64a16,16,0,0,0,16-16v-8h32v24a32,32,0,0,0,32,32h8v16a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V160A16,16,0,0,0,216,144Z" />
    </svg>
  );
}

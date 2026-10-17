export interface BedProps {
  /** Height of the bed's top surface. */
  top?: number
  /** Extent along x (from, to) and depth along z (from, to). */
  x: [number, number]
  z: [number, number]
  /** Thickness drawn under the top surface. */
  thickness?: number
}

/** The build plate close up: a textured sheet's dark top on a steel plate, flat along x and z. */
export function Bed({ top = 0, x, z, thickness = 1.2 }: BedProps) {
  const w = x[1] - x[0]
  const d = z[1] - z[0]
  const cx = (x[0] + x[1]) / 2
  const cz = (z[0] + z[1]) / 2
  return (
    <group>
      <mesh position={[cx, top - thickness / 2 - 0.15, cz]}>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial color="#5A6378" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[cx, top - 0.075, cz]}>
        <boxGeometry args={[w, 0.15, d]} />
        <meshStandardMaterial color="#4A5574" roughness={0.85} metalness={0.1} />
      </mesh>
    </group>
  )
}

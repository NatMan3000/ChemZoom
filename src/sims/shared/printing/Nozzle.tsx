import { HOT, mix } from '../material'

const STEEL = { color: '#C2C9D6', metalness: 0.55, roughness: 0.32 }

export interface NozzleProps {
  /** Where the bottom of the tip (the hole) is. The nozzle points straight down. */
  position: [number, number, number]
  /**
   * 0..1: how hot the melt showing at the hole is (brighter when hotter). Omit to hide the melt, for a
   * nozzle that is not printing.
   */
  melt?: number
}

/**
 * The nozzle, side on and pointing down: a 0.4 mm hole in a flat tip, the cone, the hex and the heater block's
 * silicone sock above, which runs off the top of a close-up. The tip and hole are to scale (1 unit = 1/3 mm);
 * the cone and hex are shortened to fit the view.
 */
export function Nozzle({ position, melt }: NozzleProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.05, 1.0, 0.4, 40]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[2.6, 1.05, 2.0, 40]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[3.3, 3.3, 1.4, 6]} />
        <meshStandardMaterial {...STEEL} roughness={0.4} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[11, 4.8, 6]} />
        <meshStandardMaterial color="#3A4466" roughness={0.8} />
      </mesh>
      {melt != null && (
        // The melt at the hole, seen glowing just under the tip (a heat picture).
        <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial color={mix('#FFB070', HOT, 1 - melt)} />
        </mesh>
      )}
    </group>
  )
}

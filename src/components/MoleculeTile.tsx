import { useEffect, useMemo } from 'react'
import { View, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import clsx from 'clsx'
import * as THREE from 'three'
import { StageLights } from '../scenes/StageLights'
import { moleculeCentre, moleculeHalfExtents } from '../three/molecule-geometry'
import { MoleculeView } from '../three/MoleculeView'
import type { Molecule } from '../types/chem'

// A small 3D molecule inside a page that has a <ViewCanvas>. Drag sideways to turn it;
// vertical swipes still scroll the page on a phone.

const FOV = 32

function FitCamera({ half }: { half: THREE.Vector3 }) {
  const size = useThree((s) => s.size)
  const aspect = size.width / Math.max(1, size.height)
  const tv = Math.tan((FOV * Math.PI) / 360)
  // Fit the molecule's box face on, with a little room round it.
  const dist = Math.max((half.x * 1.2) / (tv * aspect), (half.y * 1.2) / tv) + half.z
  return <PerspectiveCamera makeDefault fov={FOV} near={0.05} far={300} position={[0, dist * 0.12, dist]} />
}

function Controls() {
  // OrbitControls claims every touch; let vertical swipes scroll the page instead.
  const connected = useThree((s) => s.events.connected) as HTMLElement | undefined
  useEffect(() => {
    if (connected?.style) connected.style.setProperty('touch-action', 'pan-y')
  }, [connected])
  return <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.12} rotateSpeed={0.8} />
}

export function MoleculeTile({ molecule, highlight, className, label }: { molecule: Molecule; highlight?: string | null; className?: string; label?: string }) {
  const centre = useMemo(() => moleculeCentre(molecule).negate(), [molecule])
  const half = useMemo(() => moleculeHalfExtents(molecule), [molecule])
  return (
    <div role="img" aria-label={label ?? `3D model of ${molecule.name}`} className={clsx('relative', className)}>
    <View className="absolute inset-0">
      <FitCamera half={half} />
      <StageLights />
      <group position={centre}>
        <MoleculeView molecule={molecule} highlight={highlight} />
      </group>
      <Controls />
    </View>
    </div>
  )
}

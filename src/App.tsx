import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { getMolecule, materialList } from './content'
import { MoleculeView } from './three/MoleculeView'

// Placeholder shell from the scaffold: proves the data and the shared renderer work.
// Lane B replaces this with the real app (plans/build-chemzoom.md).
export default function App() {
  const pla = getMolecule('pla-oligomer')
  return (
    <div className="flex h-dvh flex-col">
      <header className="p-4 font-display text-2xl">ChemZoom</header>
      <p className="px-4 text-ink-muted">{materialList.map((m) => m.short).join(' · ')}</p>
      <div className="min-h-0 flex-1">
        <Canvas frameloop="demand" camera={{ position: [0, 0, 14], fov: 40 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 6]} intensity={1.4} />
          <MoleculeView molecule={pla} highlight="repeat" />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
    </div>
  )
}

// Shared lighting for every ChemZoom stage: a soft key, a cool rim from behind, and sky fill.
export function StageLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#cdd6ff', '#0b1020', 0.9]} />
      <directionalLight position={[6, 9, 8]} intensity={2.1} />
      <directionalLight position={[-7, -3, -6]} intensity={0.9} color="#8B9CFF" />
    </>
  )
}

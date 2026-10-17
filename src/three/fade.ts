import * as THREE from 'three'

// Cross-fades a whole scene graph by scaling every material's opacity.
// The material's own opacity, transparency and depth write are saved on first touch and put back by clearFade.
// A material built opaque is compiled with OPAQUE (three.js forces its alpha to 1 in the shader), so turning it
// transparent, and back, needs a recompile: without it the faded opacity is ignored and the level stays solid
// until it vanishes in one frame (the spool's winding did, zoom4 lane 18 Oct). Three caches both programs, so
// after the first hand-over the switch is a lookup.

function setTransparent(m: THREE.Material, transparent: boolean) {
  if (m.transparent === transparent) return
  m.transparent = transparent
  m.needsUpdate = true
}

interface Saved {
  opacity: number
  transparent: boolean
  depthWrite: boolean
}

const KEY = '__fadeSaved'

function eachMaterial(root: THREE.Object3D, fn: (m: THREE.Material) => void) {
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material
    if (!mat) return
    if (Array.isArray(mat)) mat.forEach(fn)
    else fn(mat)
  })
}

export function setFade(root: THREE.Object3D, f: number) {
  const visible = f > 0.002
  root.visible = visible
  if (!visible) return
  eachMaterial(root, (m) => {
    let s = m.userData[KEY] as Saved | undefined
    if (!s) {
      s = { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite }
      m.userData[KEY] = s
    }
    const full = f >= 0.999
    m.opacity = s.opacity * f
    setTransparent(m, s.transparent || !full)
    m.depthWrite = s.depthWrite && (full || f > 0.6)
  })
}

export function clearFade(root: THREE.Object3D) {
  root.visible = true
  eachMaterial(root, (m) => {
    const s = m.userData[KEY] as Saved | undefined
    if (!s) return
    m.opacity = s.opacity
    setTransparent(m, s.transparent)
    m.depthWrite = s.depthWrite
    delete m.userData[KEY]
  })
}

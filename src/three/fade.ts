import * as THREE from 'three'

// Cross-fades a whole scene graph by scaling every material's opacity.
// The material's own opacity, transparency and depth write are saved on first touch and put back by clearFade.

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
    m.transparent = s.transparent || !full
    m.depthWrite = s.depthWrite && (full || f > 0.6)
  })
}

export function clearFade(root: THREE.Object3D) {
  root.visible = true
  eachMaterial(root, (m) => {
    const s = m.userData[KEY] as Saved | undefined
    if (!s) return
    m.opacity = s.opacity
    m.transparent = s.transparent
    m.depthWrite = s.depthWrite
    delete m.userData[KEY]
  })
}

'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { CarPartId } from '@/types/car'

interface F1CarModelProps {
  selectedParts: CarPartId[]
  onPartClick?: (partId: CarPartId) => void
  onTargetChange?: (target: THREE.Vector3) => void
}

/**
 * Mapping from GLB node names to our CarPartId
 * The qvist-2026-assemblies.glb model has 16 named parts
 */
const NODE_TO_PART: Record<string, CarPartId> = {
  'front-wing': 'front-wing',
  'rear-wing': 'rear-wing',
  'front-left-wheel': 'front-left-wheel',
  'front-right-wheel': 'front-right-wheel',
  'rear-left-wheel': 'rear-left-wheel',
  'rear-right-wheel': 'rear-right-wheel',
  'front-suspension': 'front-suspension',
  'rear-suspension': 'rear-suspension',
  'chassis': 'chassis',
  'floor': 'floor',
  'halo': 'chassis',
  'engine-cover': 'chassis',
  'left-sidepod': 'chassis',
  'right-sidepod': 'chassis',
  'mirrors': 'chassis',
  'exhaust': 'drivetrain',
}

/**
 * Get the CarPartId for a mesh by walking up its parent hierarchy
 */
function getPartIdForObject(obj: THREE.Object3D): CarPartId | null {
  let current: THREE.Object3D | null = obj
  while (current) {
    if (current.name && NODE_TO_PART[current.name]) {
      return NODE_TO_PART[current.name]
    }
    current = current.parent
  }
  return null
}

const PART_LABELS: Record<CarPartId, string> = {
  'front-wing': 'Front Wing',
  'rear-wing': 'Rear Wing',
  'front-left-wheel': 'Front Left Wheel',
  'front-right-wheel': 'Front Right Wheel',
  'rear-left-wheel': 'Rear Left Wheel',
  'rear-right-wheel': 'Rear Right Wheel',
  'front-suspension': 'Front Suspension',
  'rear-suspension': 'Rear Suspension',
  'front-brakes': 'Front Brakes',
  'rear-brakes': 'Rear Brakes',
  'drivetrain': 'Drivetrain',
  'chassis': 'Chassis',
  'floor': 'Floor',
}

const MODEL_SCALE = 0.00126
// Mid-luminance green: no channel at 1.0, so env lighting cannot clip it to yellow
const HIGHLIGHT_COLOR = 0x2a9d5c

function CarModel({ selectedParts, onPartClick, onTargetChange }: F1CarModelProps) {
  const { scene } = useGLTF('/models/f1-car.glb')
  const { camera, gl } = useThree()
  const originalMaterials = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map())
  const groupRef = useRef<THREE.Group>(null)

  // Clone scene once
  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    return clone
  }, [scene])

  // Fallback focus positions for parts with no named node in the GLB
  // (brakes, drivetrain). Everything else is measured from the mesh bounds.
  const PART_FOCUS: Record<CarPartId, [number, number, number]> = {
    'front-wing': [0, 0, 1.2],
    'rear-wing': [0, 0.3, -1.0],
    'front-left-wheel': [-0.5, 0, 0.7],
    'front-right-wheel': [0.5, 0, 0.7],
    'rear-left-wheel': [-0.5, 0, -0.7],
    'rear-right-wheel': [0.5, 0, -0.7],
    'front-suspension': [0, 0, 0.6],
    'rear-suspension': [0, 0, -0.5],
    'front-brakes': [0, 0, 0.7],
    'rear-brakes': [0, 0, -0.7],
    'drivetrain': [0, 0, -0.3],
    'chassis': [0, 0.2, 0],
    'floor': [0, -0.1, 0],
  }

  // Update focus target when selection changes.
  // Target = world-space center of the union of all selected parts' bounds.
  useEffect(() => {
    if (!onTargetChange) return

    if (selectedParts.length === 0) {
      onTargetChange(new THREE.Vector3(0, 0, 0))
      return
    }

    // World matrices must be current: the primitive applies MODEL_SCALE and
    // a position offset, and Box3.expandByObject reads matrixWorld.
    clonedScene.updateWorldMatrix(true, true)

    const box = new THREE.Box3()
    let measured = false
    clonedScene.traverse((obj) => {
      const partId = NODE_TO_PART[obj.name]
      if (partId && selectedParts.includes(partId)) {
        box.expandByObject(obj)
        measured = true
      }
    })

    if (measured && !box.isEmpty()) {
      onTargetChange(box.getCenter(new THREE.Vector3()))
      return
    }

    // No named geometry for any selected part: fall back to the table
    const pos = PART_FOCUS[selectedParts[0]] || [0, 0, 0]
    onTargetChange(new THREE.Vector3(pos[0], pos[1], pos[2]))
  }, [clonedScene, selectedParts, onTargetChange])

  // Store original materials on first render
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && !originalMaterials.current.has(child.uuid)) {
        if (Array.isArray(child.material)) {
          originalMaterials.current.set(child.uuid, child.material.map(m => m.clone()))
        } else {
          originalMaterials.current.set(child.uuid, child.material.clone())
        }
      }
    })
  }, [clonedScene])

  // Update highlights based on selected parts
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const partId = getPartIdForObject(child)
        const isSelected = partId && selectedParts.includes(partId)

        if (isSelected) {
          // Highlight: muted green, matte. Pure 0x00ff00 + metalness clipped
          // to white/yellow under the city environment map.
          const highlightMat = new THREE.MeshStandardMaterial({
            color: HIGHLIGHT_COLOR,
            emissive: HIGHLIGHT_COLOR,
            emissiveIntensity: 0.15,
            metalness: 0.1,
            roughness: 0.65,
          })
          child.material = highlightMat
        } else {
          // Restore original material
          const original = originalMaterials.current.get(child.uuid)
          if (original) {
            if (Array.isArray(original)) {
              child.material = original.map(m => m.clone())
            } else {
              child.material = original.clone()
            }
          }
        }
      }
    })
  }, [clonedScene, selectedParts])

  // Click detection
  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handlePointerDown = (event: PointerEvent) => {
      if (!groupRef.current || !onPartClick) return

      const rect = gl.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(groupRef.current.children, true)

      if (intersects.length > 0) {
        const partId = getPartIdForObject(intersects[0].object)
        if (partId) {
          onPartClick(partId)
        }
      }
    }

    gl.domElement.addEventListener('pointerdown', handlePointerDown)
    return () => gl.domElement.removeEventListener('pointerdown', handlePointerDown)
  }, [camera, gl, onPartClick])

  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        scale={MODEL_SCALE}
        position={[0, -0.2, 0]}
      />
    </group>
  )
}

interface F1CarProps {
  selectedParts?: CarPartId[]
  onPartClick?: (partId: CarPartId) => void
  className?: string
}

/**
 * OrbitControls state is (camera.position, target). `update()` rebuilds
 * camera.position = target + offset and calls camera.lookAt(target), where
 * offset is measured from the *current* camera position. So moving `target`
 * alone makes the camera rotate in place; to pan, the camera must move by the
 * same delta. A one-shot lerp in useEffect is a single integrator step, so it
 * only ever covers half the distance. Integration happens here per frame.
 */
const FOCUS_SPEED = 6          // 1/s; higher = snappier
const SETTLE_EPS = 1e-3        // stop animating below this (world units)

function CameraController({
  target,
  distance,
}: {
  target: THREE.Vector3
  distance: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const goal = useRef(target.clone())
  const goalDistance = useRef(distance)
  const animating = useRef(false)

  // Scratch vectors, allocated once
  const scratch = useRef({
    prevTarget: new THREE.Vector3(),
    delta: new THREE.Vector3(),
    offset: new THREE.Vector3(),
  })

  useEffect(() => {
    goal.current.copy(target)
    goalDistance.current = distance
    animating.current = true
  }, [target, distance])

  useFrame((_, dt) => {
    const controls = controlsRef.current
    if (!controls || !animating.current) return

    const { prevTarget, delta, offset } = scratch.current
    // Frame-rate independent exponential approach
    const t = 1 - Math.exp(-FOCUS_SPEED * dt)

    // 1. Move the orbit pivot
    prevTarget.copy(controls.target)
    controls.target.lerp(goal.current, t)

    // 2. Pan: translate the camera by the same delta so the viewing angle
    //    and distance are preserved (otherwise it just rotates in place)
    delta.copy(controls.target).sub(prevTarget)
    camera.position.add(delta)

    // 3. Dolly: ease the camera distance toward the focus distance along
    //    the current view direction
    offset.copy(camera.position).sub(controls.target)
    const dist = offset.length()
    const nextDist = THREE.MathUtils.lerp(dist, goalDistance.current, t)
    camera.position.copy(controls.target).add(offset.setLength(nextDist))

    controls.update()

    const settled =
      controls.target.distanceToSquared(goal.current) < SETTLE_EPS * SETTLE_EPS &&
      Math.abs(nextDist - goalDistance.current) < SETTLE_EPS
    if (settled) animating.current = false
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      minDistance={1.5}
      maxDistance={8}
      // User input wins: stop the auto-focus the moment they grab the view
      onStart={() => { animating.current = false }}
    />
  )
}

const DISTANCE_OVERVIEW = 6   // |[4, 2, 4]|, the initial camera distance
const DISTANCE_FOCUSED = 2.5

export default function F1Car({
  selectedParts = [],
  onPartClick,
  className = ''
}: F1CarProps) {
  const [target, setTarget] = useState(() => new THREE.Vector3(0, 0, 0))

  return (
    <div className={`w-full h-full bg-black/50 rounded-lg ${className}`}>
      <Canvas
        camera={{ position: [4, 2, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ cursor: 'pointer' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, 5, -5]} intensity={0.8} />
        <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={0.6} />

        <Environment preset="city" />

        <CarModel
          selectedParts={selectedParts}
          onPartClick={onPartClick}
          onTargetChange={setTarget}
        />

        <CameraController
          target={target}
          distance={selectedParts.length > 0 ? DISTANCE_FOCUSED : DISTANCE_OVERVIEW}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0a0a0a" />
        </mesh>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/f1-car.glb')

export { PART_LABELS, getPartIdForObject }

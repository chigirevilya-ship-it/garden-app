import { useMemo } from 'react'
import { useGarden } from '../store'
import { resolvePlant, type EffectivePlant, type PlacedPlant } from './plant'
import type { PlantInstance } from './types'

export interface PlantRow {
  instance: PlantInstance
  plant: EffectivePlant
  bedName?: string
  placed: boolean
}

/** Effective (reference + observed) profile for every plant instance. */
export function usePlantRows(): PlantRow[] {
  const instances = useGarden((s) => s.instances)
  const species = useGarden((s) => s.species)
  const placements = useGarden((s) => s.placements)
  const beds = useGarden((s) => s.beds)

  return useMemo(() => {
    const speciesById = new Map(species.map((sp) => [sp.id, sp]))
    const bedById = new Map(beds.map((b) => [b.id, b]))
    const placementByInstance = new Map(placements.map((p) => [p.instanceId, p]))
    return instances.map((instance) => {
      const placement = placementByInstance.get(instance.id)
      return {
        instance,
        plant: resolvePlant(instance, instance.speciesId ? speciesById.get(instance.speciesId) : undefined),
        bedName: placement?.bedId ? bedById.get(placement.bedId)?.name : undefined,
        placed: !!placement,
      }
    })
  }, [instances, species, placements, beds])
}

export function usePlacedPlants(): PlacedPlant[] {
  const rows = usePlantRows()
  const placements = useGarden((s) => s.placements)
  return useMemo(() => {
    const rowByInstance = new Map(rows.map((r) => [r.instance.id, r]))
    return placements.flatMap((p) => {
      const row = rowByInstance.get(p.instanceId)
      if (!row || row.instance.status !== 'active') return []
      return [{ instanceId: p.instanceId, x: p.x, y: p.y, plant: row.plant, speciesId: row.instance.speciesId }]
    })
  }, [rows, placements])
}

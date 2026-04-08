'use client'

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react'

export function SkeletonWrapper({ name, loading, children }) {
  return (
    <BoneyardSkeleton name={name} loading={loading}>
      {children}
    </BoneyardSkeleton>
  )
}

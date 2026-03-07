/**
 * lib/data/index.ts
 * Barrel — re-exporte tout pour rester 100 % rétrocompatible avec
 * les imports existants du style : import { useConsultants } from '@/lib/data'
 *
 * Ajouter ici tout nouveau slice créé sous lib/data/.
 */

export * from './consultants'
export * from './projects'
export * from './clients'
export * from './leaves'
export * from './timesheets'
export * from './finance'
export * from './dashboard'
export * from './teams'
export * from './settings'
// core (useSupabase) est intentionnellement privé — pas re-exporté
import { describe, it, expect } from 'vitest'
import { grantableRoles } from './roles'

describe('grantableRoles', () => {
  it('lets admins grant every tenant role but super_admin', () => {
    expect(grantableRoles('admin')).toEqual(['admin', 'manager', 'consultant', 'freelance'])
    expect(grantableRoles('super_admin')).not.toContain('super_admin')
  })
  it('limits managers to consultant and freelance', () => {
    expect(grantableRoles('manager')).toEqual(['consultant', 'freelance'])
  })
  it('grants nothing to other roles', () => {
    for (const r of ['consultant', 'freelance', 'viewer', undefined]) expect(grantableRoles(r)).toEqual([])
  })
})

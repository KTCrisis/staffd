import { describe, it, expect } from 'vitest'
import { grantableRoles, canIssueLinkFor } from './roles'

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

describe('canIssueLinkFor', () => {
  const A = 'company-a'
  it('allows a new account', () => {
    expect(canIssueLinkFor('manager', null, A)).toBe(true)
  })
  it('never reaches a super_admin, even from a super_admin', () => {
    expect(canIssueLinkFor('admin', { role: 'super_admin', companyId: null }, A)).toBe(false)
    expect(canIssueLinkFor('super_admin', { role: 'super_admin', companyId: null }, A)).toBe(false)
  })
  it('refuses another tenant, and a tenant-less account that holds a role', () => {
    expect(canIssueLinkFor('admin', { role: 'consultant', companyId: 'company-b' }, A)).toBe(false)
    expect(canIssueLinkFor('admin', { role: 'consultant', companyId: null }, A)).toBe(false)
  })
  it('accepts a pending account with neither tenant nor role', () => {
    expect(canIssueLinkFor('manager', { role: null, companyId: null }, A)).toBe(true)
  })
  it('only reaches accounts strictly below the caller', () => {
    expect(canIssueLinkFor('manager', { role: 'admin', companyId: A }, A)).toBe(false)
    expect(canIssueLinkFor('manager', { role: 'manager', companyId: A }, A)).toBe(false)
    expect(canIssueLinkFor('manager', { role: 'consultant', companyId: A }, A)).toBe(true)
    expect(canIssueLinkFor('admin', { role: 'admin', companyId: A }, A)).toBe(false)
    expect(canIssueLinkFor('admin', { role: 'manager', companyId: A }, A)).toBe(true)
    expect(canIssueLinkFor('super_admin', { role: 'admin', companyId: A }, A)).toBe(true)
  })
})

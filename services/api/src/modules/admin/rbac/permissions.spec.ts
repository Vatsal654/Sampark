import { roleHasPermission, PERMISSIONS } from './permissions';

describe('roleHasPermission', () => {
  it('grants support_agent read-only permissions but not mutating ones', () => {
    expect(roleHasPermission('support_agent', 'tags.view')).toBe(true);
    expect(roleHasPermission('support_agent', 'tags.issue')).toBe(false);
    expect(roleHasPermission('support_agent', 'feature_flags.update')).toBe(false);
  });

  it('grants operations_agent tag issuance but not feature-flag updates', () => {
    expect(roleHasPermission('operations_agent', 'tags.issue')).toBe(true);
    expect(roleHasPermission('operations_agent', 'feature_flags.update')).toBe(false);
  });

  it('grants only security_admin and super_admin the ability to update feature flags', () => {
    expect(roleHasPermission('security_admin', 'feature_flags.update')).toBe(true);
    expect(roleHasPermission('super_admin', 'feature_flags.update')).toBe(true);
    expect(roleHasPermission('fraud_reviewer', 'feature_flags.update')).toBe(false);
  });

  it('grants only security_admin and super_admin break-glass approval', () => {
    expect(roleHasPermission('security_admin', 'break_glass.approve')).toBe(true);
    expect(roleHasPermission('super_admin', 'break_glass.approve')).toBe(true);
    expect(roleHasPermission('operations_agent', 'break_glass.approve')).toBe(false);
  });

  it('every permission explicitly lists super_admin (no implicit bypass)', () => {
    for (const roles of Object.values(PERMISSIONS)) {
      expect(roles).toContain('super_admin');
    }
  });
});

// Who may act on a family's rows from a serverless route. Mirrors the SQL
// helpers (family_of / family_role in the family_accounts migration): an
// account with no family_accounts row owns its own family. Routes run as
// the service role, so RLS doesn't do this check for them.
export const resolveFamily = async (admin, userId) => {
  const { data } = await admin
    .from('family_accounts')
    .select('family_id, role, child_profile_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data
    ? { familyId: data.family_id, role: data.role, linkedChildId: data.child_profile_id }
    : { familyId: userId, role: 'owner', linkedChildId: null };
};

export const isParentRole = (role) => role === 'owner' || role === 'parent';

// True when the caller may generate/delete clips for a row owned by
// `rowUserId` — a parent of that family
export const mayManage = (family, rowUserId) =>
  isParentRole(family.role) && family.familyId === rowUserId;

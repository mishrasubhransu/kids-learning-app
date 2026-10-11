/* global process */
import { randomUUID, randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { resolveFamily } from './_lib/family.js';

// Move a family's customization from one Google account to another — the
// parent sets everything up on their own login, then hands it to the
// child's (or a grandparent's) account so the kid's device never carries
// the parent's session. Three actions, all keyed by the caller's bearer
// token:
//
//   issue  — mints a short-lived 6-letter code for the CALLER's content
//            (any earlier unclaimed code of theirs is dropped). The parent
//            reads it off their screen.
//   claim  — { code }: the CALLER becomes the destination. Everything the
//            destination already had is wiped, then the source's children,
//            family members, settings and the storage objects behind them
//            (name/praise clips, family photos) are copied under fresh ids
//            and the destination's own storage folder. The code is marked
//            claimed only once the copy finished, so a failed claim can
//            simply be retried.
//   cancel — drops the caller's unclaimed codes (parent closed the panel).
//
// Superseded for the kid's-device case by family accounts (a child login
// linked to a profile, api/_lib/family.js) — this stays as a FORK: a copy
// for someone who wants their own independent version. Neither side may
// be in a shared family: the source must own its rows outright, and the
// claimant's wipe would otherwise hit a family it merely belongs to.
//
// It's a COPY, not a move: the source account keeps its content, so the
// parent can keep it as a studio and re-send later (claiming again wipes
// the destination first, so a re-send is an overwrite, never a merge).
// Rows get new uuids because the source rows still exist; every reference
// between rows (family member → child profile, explicit parent links in a
// kinship path) is remapped, and every storage path is rewritten from
// <src uid>/<old id>/… to <dst uid>/<new id>/… so the destination owns
// its files outright (the own-folder RLS on family-photos would otherwise
// stop it from ever deleting them).

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
const CODE_LENGTH = 6;
const CODE_TTL_MS = 15 * 60 * 1000;

// Parent-recorded syllable clips only play for the recordings owner (see
// ADMIN_EMAIL in src/lib/recordings.js and the bucket policy). Their family
// should keep hearing that voice after the hand-off, so a transfer FROM the
// owner grants the destination the recordedVoice setting; so does one from
// an account that already holds the grant.
const RECORDINGS_OWNER_EMAIL = 'subhransu.kumar.mishra@gmail.com';
const RECORDED_VOICE_KEY = 'recordedVoice';

const NAME_AUDIO = 'name-audio';
const FAMILY_PHOTOS = 'family-photos';

const mintCode = () =>
  Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

const normalizeCode = (raw) =>
  String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

// Supabase storage has no recursive list: entries with an id are files,
// without one are folders.
const listFilesDeep = async (admin, bucket, prefix) => {
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return [];
  const files = [];
  for (const entry of data) {
    if (entry.id) files.push(`${prefix}/${entry.name}`);
    else files.push(...(await listFilesDeep(admin, bucket, `${prefix}/${entry.name}`)));
  }
  return files;
};

const removeDeep = async (admin, bucket, prefix) => {
  const files = await listFilesDeep(admin, bucket, prefix);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await admin.storage.from(bucket).remove(files.slice(i, i + 100));
    if (error) throw new Error(`Remove ${bucket}/${prefix}: ${error.message}`);
  }
  return files.length;
};

// Copy every file under fromPrefix to the same relative path under toPrefix
const copyFolder = async (admin, bucket, fromPrefix, toPrefix) => {
  const files = await listFilesDeep(admin, bucket, fromPrefix);
  const CONCURRENCY = 6;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    await Promise.all(
      files.slice(i, i + CONCURRENCY).map(async (from) => {
        const to = toPrefix + from.slice(fromPrefix.length);
        const { error } = await admin.storage.from(bucket).copy(from, to);
        if (error) throw new Error(`Copy ${bucket}/${from}: ${error.message}`);
      })
    );
  }
  return files.length;
};

// Rewrite a stored path's leading folder, leaving anything else untouched
// (a path from some other account or shape is kept as-is rather than
// broken)
const rewritePath = (path, fromPrefix, toPrefix) =>
  typeof path === 'string' && path.startsWith(`${fromPrefix}/`)
    ? toPrefix + path.slice(fromPrefix.length)
    : path;

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const wipeDestination = async (admin, dst) => {
  // family_members.child_profile_id is "on delete set null", so order
  // doesn't matter for integrity — members first just keeps it tidy
  must(await admin.from('family_members').delete().eq('user_id', dst), 'Wipe family');
  must(await admin.from('child_profiles').delete().eq('user_id', dst), 'Wipe children');
  must(await admin.from('user_settings').delete().eq('user_id', dst), 'Wipe settings');
  await removeDeep(admin, NAME_AUDIO, dst);
  await removeDeep(admin, FAMILY_PHOTOS, dst);
};

const copyAccount = async (admin, src, dst, grantRecordedVoice) => {
  const children = must(
    await admin.from('child_profiles').select('*').eq('user_id', src).order('created_at'),
    'Read children'
  );
  const members = must(
    await admin.from('family_members').select('*').eq('user_id', src).order('created_at'),
    'Read family'
  );
  const settings = must(
    await admin.from('user_settings').select('key, value').eq('user_id', src),
    'Read settings'
  );

  let files = 0;

  // ---- children ----
  const childIds = new Map(children.map((c) => [c.id, randomUUID()]));
  const childRows = children.map((c) => {
    const id = childIds.get(c.id);
    const from = `${src}/${c.id}`;
    const to = `${dst}/${id}`;
    const paths = Object.fromEntries(
      Object.entries(c.name_audio_paths || {}).map(([locale, p]) => [
        locale,
        rewritePath(p, from, to),
      ])
    );
    return {
      id,
      user_id: dst,
      name: c.name,
      avatar: c.avatar,
      avatar_color: c.avatar_color,
      birthdate: c.birthdate,
      is_default: c.is_default,
      settings: c.settings || {},
      name_audio_path: rewritePath(c.name_audio_path, from, to),
      name_audio_paths: paths,
      created_at: c.created_at,
    };
  });
  if (childRows.length) {
    must(await admin.from('child_profiles').insert(childRows), 'Insert children');
  }
  for (const c of children) {
    files += await copyFolder(admin, NAME_AUDIO, `${src}/${c.id}`, `${dst}/${childIds.get(c.id)}`);
  }

  // ---- family members ----
  const memberIds = new Map(members.map((m) => [m.id, randomUUID()]));
  const memberRows = members.map((m) => {
    const id = memberIds.get(m.id);
    const photoFrom = `${src}/${m.id}`;
    const photoTo = `${dst}/${id}`;
    const audioFrom = `${src}/family/${m.id}`;
    const audioTo = `${dst}/family/${id}`;
    let detail = m.relation_detail;
    if (detail?.parents) {
      // Explicit mum/dad picks point at other members — remap, and drop a
      // pick whose member didn't come along (same as FamilyManager treats
      // a deleted member)
      const parents = {};
      for (const [slot, oldId] of Object.entries(detail.parents)) {
        if (memberIds.has(oldId)) parents[slot] = memberIds.get(oldId);
      }
      detail = { ...detail };
      if (Object.keys(parents).length) detail.parents = parents;
      else delete detail.parents;
    }
    return {
      id,
      user_id: dst,
      name: m.name,
      relation: m.relation,
      relation_detail: detail,
      photo_path: rewritePath(m.photo_path, photoFrom, photoTo),
      photo_paths: (m.photo_paths || []).map((p) => rewritePath(p, photoFrom, photoTo)),
      name_audio_path: rewritePath(m.name_audio_path, audioFrom, audioTo),
      name_lang: m.name_lang,
      name_phonetic: m.name_phonetic,
      child_profile_id: m.child_profile_id ? childIds.get(m.child_profile_id) ?? null : null,
      sort_order: m.sort_order,
      created_at: m.created_at,
    };
  });
  if (memberRows.length) {
    must(await admin.from('family_members').insert(memberRows), 'Insert family');
  }
  for (const m of members) {
    const id = memberIds.get(m.id);
    files += await copyFolder(admin, FAMILY_PHOTOS, `${src}/${m.id}`, `${dst}/${id}`);
    files += await copyFolder(admin, NAME_AUDIO, `${src}/family/${m.id}`, `${dst}/family/${id}`);
  }

  // ---- account settings ----
  const settingRows = settings.map((s) => ({ user_id: dst, key: s.key, value: s.value }));
  if (grantRecordedVoice && !settingRows.some((s) => s.key === RECORDED_VOICE_KEY)) {
    settingRows.push({ user_id: dst, key: RECORDED_VOICE_KEY, value: 'on' });
  }
  if (settingRows.length) {
    must(await admin.from('user_settings').insert(settingRows), 'Insert settings');
  }

  return {
    children: childRows.length,
    members: memberRows.length,
    settings: settingRows.length,
    files,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return res.status(500).json({ error: 'Transfer not configured' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  const { action } = req.body || {};
  if (!['issue', 'claim', 'cancel'].includes(action)) {
    return res.status(400).json({ error: 'Unknown action' });
  }

  try {
    const admin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Session expired — sign in again' });
    }
    const caller = userData.user;

    const inSharedFamily = async (uid) => {
      const own = await resolveFamily(admin, uid);
      if (own.familyId !== uid) return true;
      const { count } = await admin
        .from('family_accounts')
        .select('user_id', { count: 'exact', head: true })
        .eq('family_id', uid);
      return (count || 0) > 0;
    };

    if (action === 'issue' || action === 'cancel') {
      if (action === 'issue' && (await inSharedFamily(caller.id))) {
        return res.status(400).json({
          error: 'This account is part of a shared family — invite the other account to the family instead',
        });
      }
      must(
        await admin
          .from('account_transfers')
          .delete()
          .eq('from_user_id', caller.id)
          .is('claimed_at', null),
        'Drop old codes'
      );
      if (action === 'cancel') return res.status(200).json({ ok: true });

      const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
      // A collision on the primary key is astronomically unlikely but free
      // to retry
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const code = mintCode();
        const { error } = await admin
          .from('account_transfers')
          .insert({ code, from_user_id: caller.id, expires_at: expiresAt });
        if (!error) return res.status(200).json({ code, expiresAt });
        if (error.code !== '23505') throw new Error(`Issue code: ${error.message}`);
      }
      throw new Error('Could not mint a unique code');
    }

    // ---- claim ----
    const code = normalizeCode(req.body?.code);
    if (code.length !== CODE_LENGTH) {
      return res.status(400).json({ error: 'Enter the 6-character code' });
    }
    const transfer = must(
      await admin.from('account_transfers').select('*').eq('code', code).maybeSingle(),
      'Look up code'
    );
    if (!transfer || transfer.claimed_at) {
      return res.status(404).json({ error: 'That code is not valid' });
    }
    if (new Date(transfer.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'That code has expired — issue a new one' });
    }
    if (transfer.from_user_id === caller.id) {
      return res.status(400).json({ error: 'Sign in as the receiving account to use this code' });
    }

    const src = transfer.from_user_id;
    const dst = caller.id;
    if (await inSharedFamily(dst)) {
      return res.status(400).json({
        error: 'This account belongs to a shared family — leave it before receiving a copy',
      });
    }
    if (await inSharedFamily(src)) {
      return res.status(400).json({ error: 'The sending account is now part of a shared family' });
    }
    const { data: srcUser } = await admin.auth.admin.getUserById(src);
    const srcGrant = must(
      await admin
        .from('user_settings')
        .select('value')
        .eq('user_id', src)
        .eq('key', RECORDED_VOICE_KEY)
        .maybeSingle(),
      'Read voice grant'
    );
    const grantRecordedVoice =
      srcUser?.user?.email === RECORDINGS_OWNER_EMAIL || srcGrant?.value === 'on';

    await wipeDestination(admin, dst);
    const summary = await copyAccount(admin, src, dst, grantRecordedVoice);

    must(
      await admin
        .from('account_transfers')
        .update({ claimed_by: dst, claimed_at: new Date().toISOString() })
        .eq('code', code),
      'Mark claimed'
    );

    return res.status(200).json({ ok: true, ...summary });
  } catch (error) {
    console.error('transfer-account error:', error);
    return res.status(500).json({ error: error.message || 'Transfer failed' });
  }
}

-- A family member can BE one of the account's children: the child sees
-- themself in their own family lesson ("Me!"), while siblings see the
-- stored brother/sister relation. Deleting the profile keeps the member as
-- an ordinary person (set null); one member per child profile per account.

alter table public.family_members
  add column if not exists child_profile_id uuid
    references public.child_profiles (id) on delete set null;

create unique index if not exists family_members_one_per_child
  on public.family_members (child_profile_id)
  where child_profile_id is not null;

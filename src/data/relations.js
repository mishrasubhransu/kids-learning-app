// Relations a family member can have to the child. `generation` drives the
// family-tree intro layout: 0 = grandparents row, 1 = parents row, 2 = the
// child's own row. The NAME (what the child actually says — "Nana", "Papa")
// is free text on the member; the relation just places and labels them.
export const RELATIONS = [
  { value: 'mummy', label: 'Mummy', emoji: '👩', generation: 1 },
  { value: 'daddy', label: 'Daddy', emoji: '👨', generation: 1 },
  { value: 'brother', label: 'Brother', emoji: '👦', generation: 2 },
  { value: 'sister', label: 'Sister', emoji: '👧', generation: 2 },
  { value: 'grandma', label: 'Grandma', emoji: '👵', generation: 0 },
  { value: 'grandpa', label: 'Grandpa', emoji: '👴', generation: 0 },
  { value: 'aunt', label: 'Aunt', emoji: '👩‍🦱', generation: 1 },
  { value: 'uncle', label: 'Uncle', emoji: '🧔', generation: 1 },
  { value: 'cousin', label: 'Cousin', emoji: '🧒', generation: 2 },
  { value: 'baby', label: 'Baby', emoji: '👶', generation: 2 },
  { value: 'friend', label: 'Friend', emoji: '🙂', generation: 2 },
  { value: 'pet', label: 'Pet', emoji: '🐾', generation: 2 },
];

export const relationByValue = (value) =>
  RELATIONS.find((r) => r.value === value) || null;

export const relationLabel = (value) => relationByValue(value)?.label || '';

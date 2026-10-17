import {
  ABILITY_FIELDS,
  COMBAT_FIELDS,
  DEATH_SAVE_CHECKS,
  HEADER_FIELDS,
  PAGE2_FIELDS,
  REQUIRED_FIELDS,
  SKILL_FIELDS,
  SLOT_FIELDS,
  SPELL_HEADER_FIELDS,
  SPELL_LINES,
  WEAPON_ROWS,
} from '../sheet-fields';

const MULTILINE = new Set<string>([
  COMBAT_FIELDS.attacks,
  COMBAT_FIELDS.proficiencies,
  COMBAT_FIELDS.equipment,
  COMBAT_FIELDS.features,
  COMBAT_FIELDS.personality,
  COMBAT_FIELDS.ideals,
  COMBAT_FIELDS.bonds,
  COMBAT_FIELDS.flaws,
  PAGE2_FIELDS.allies,
  PAGE2_FIELDS.backstory,
  PAGE2_FIELDS.feats,
  PAGE2_FIELDS.treasure,
]);

let cached: Promise<Uint8Array> | undefined;

/** Test only: a 3-page PDF with every field name the sheet constants use (positions are meaningless). Built once per module instance, handed out as a copy. */
export async function fakeTemplate(): Promise<Uint8Array> {
  cached ??= buildTemplate();
  return (await cached).slice();
}

async function buildTemplate(): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const pages = [doc.addPage(), doc.addPage(), doc.addPage()];
  const form = doc.getForm();

  const texts = new Set<string>();
  const checks = new Set<string>();
  for (const a of Object.values(ABILITY_FIELDS)) {
    texts.add(a.score);
    texts.add(a.mod);
    texts.add(a.save);
    checks.add(a.saveCheck);
  }
  for (const s of Object.values(SKILL_FIELDS)) {
    texts.add(s.value);
    checks.add(s.check);
  }
  for (const c of [...DEATH_SAVE_CHECKS.successes, ...DEATH_SAVE_CHECKS.failures]) checks.add(c);
  for (const w of WEAPON_ROWS) {
    texts.add(w.name);
    texts.add(w.bonus);
    texts.add(w.damage);
  }
  for (const s of Object.values(SLOT_FIELDS)) {
    texts.add(s.total);
    texts.add(s.remaining);
  }
  for (const lines of Object.values(SPELL_LINES)) {
    for (const l of lines) {
      texts.add(l.name);
      if (l.prepared) checks.add(l.prepared);
    }
  }
  for (const group of [HEADER_FIELDS, COMBAT_FIELDS, PAGE2_FIELDS, SPELL_HEADER_FIELDS]) {
    for (const f of Object.values(group)) texts.add(f);
  }
  for (const f of REQUIRED_FIELDS) {
    if (f.startsWith('Check Box')) checks.add(f);
    else texts.add(f);
  }

  let i = 0;
  const rect = () => {
    const n = i++;
    return { x: 20 + (n % 10) * 55, y: 700 - Math.floor(n / 10) * 20, width: 50, height: 16 };
  };
  const pageOf = () => pages[i % 3];
  for (const name of texts) {
    const field = form.createTextField(name);
    if (MULTILINE.has(name)) field.enableMultiline();
    field.addToPage(pageOf(), rect());
  }
  for (const name of checks) {
    const box = form.createCheckBox(name);
    box.addToPage(pageOf(), { ...rect(), width: 12, height: 12 });
  }
  return doc.save();
}

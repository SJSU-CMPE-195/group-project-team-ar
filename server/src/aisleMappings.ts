export const AISLES_BY_ITEM: Readonly<Record<string, string>> = {
  'cup': 'E80',
  'bottle': 'Q19',
  'microwave': 'D74',
  'potted plant': 'B5',
  'keyboard': 'D36',
  'backpack': 'P26',
  'umbrella': 'UT50',
  'handbag': 'AC50',
  'tie': 'MN50',
  'suitcase': 'D49',
  'sports ball': 'Q21',
  'baseball bat': 'Q21',
  'baseball glove': 'Q21',
  'tennis racket': 'Q19',
  'wine glass': 'E66',
  'fork': 'E73',
  'knife': 'E60',
  'spoon': 'E73',
  'bowl': 'E80',
  'banana': 'B49',
  'apple': 'B50',
  'sandwich': 'B43',
  'orange': 'B49',
  'broccoli': 'B57',
  'carrot': 'B57',
  'hot dog': 'B48',
  'pizza': 'B42',
  'donut': 'B31',
  'cake': 'B39',
  'chair': 'E83',
  'tv': 'D69',
  'laptop': 'D27',
  'mouse': 'D36',
  'remote': 'D69',
  'toaster': 'D73',
  'book': 'D48',
  'clock': 'E83',
  'vase': 'E10',
  'scissors': 'A23',
  'teddy bear': 'P24',
  'hair drier': 'C20',
  'toothbrush': 'C27',
};

export function aisleForItem(name: string): string | null {
  const key = name.trim().toLowerCase();
  return Object.hasOwn(AISLES_BY_ITEM, key) ? AISLES_BY_ITEM[key] : null;
}

// One atomic, repeatable update: only known items with differing aisles change.
const cases = Object.keys(AISLES_BY_ITEM).map(() => 'WHEN ? THEN ?').join(' ');
const names = Object.keys(AISLES_BY_ITEM);
export const aisleMigrationSql = `UPDATE grocery_items
SET aisle = CASE LOWER(TRIM(name)) ${cases} ELSE aisle END
WHERE LOWER(TRIM(name)) IN (${names.map(() => '?').join(', ')})
AND NOT (aisle <=> CASE LOWER(TRIM(name)) ${cases} ELSE aisle END)`;
const pairs = Object.entries(AISLES_BY_ITEM).flat();
export const aisleMigrationParams = [...pairs, ...names, ...pairs];

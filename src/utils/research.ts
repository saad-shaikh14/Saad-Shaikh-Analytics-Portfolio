import snapshot from '../data/research-catalog.json';

export const LAB_URL = 'https://github.com/saad-shaikh14/data-systems-engineering-lab';
export interface ResearchEntry {
  id: string;
  title: string;
  summary: string;
  domains: string[];
  publicationDate: string;
  evidenceRevision: string;
  evidencePath: string;
  findingsPath: string;
  reproducePath: string;
  methodology: string;
  findings: string;
  limitations: string;
}

const revision = /^[a-f0-9]{40}$/;
const idPattern = /^EXP-\d{4}-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
function pathSafe(path: unknown, id: string): path is string {
  return typeof path === 'string' && path.startsWith('experiments/' + id + '/') &&
    /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(path) &&
    path.split('/').every((part) => part !== '.' && part !== '..');
}
function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
export function evidenceUrl(entry: ResearchEntry, path: string): string {
  if (!revision.test(entry.evidenceRevision) || !pathSafe(path, entry.id)) {
    throw new Error('Invalid research evidence link');
  }
  return LAB_URL + '/blob/' + entry.evidenceRevision + '/' + path;
}
export const catalogueUrl = LAB_URL + '/blob/' + snapshot.catalogue_revision + '/catalog/experiments.json';

export function releasedResearch(): ResearchEntry[] {
  if (snapshot.schema_version !== 1 || !revision.test(snapshot.catalogue_revision) || !Array.isArray(snapshot.experiments)) {
    throw new Error('Invalid public research catalogue');
  }
  const entries: ResearchEntry[] = [];
  const seen = new Set<string>();
  for (const raw of snapshot.experiments as unknown[]) {
    if (typeof raw !== 'object' || raw === null) throw new Error('Invalid research entry');
    const e = raw as ResearchEntry;
    const date = new Date(e.publicationDate);
    if (!idPattern.test(e.id) || seen.has(e.id) || !revision.test(e.evidenceRevision) ||
      ![e.title, e.summary, e.methodology, e.findings, e.limitations].every(isText) ||
      !Array.isArray(e.domains) || e.domains.length === 0 || !e.domains.every(isText) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.publicationDate) || !Number.isFinite(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== e.publicationDate ||
      ![e.evidencePath, e.findingsPath, e.reproducePath].every((p) => pathSafe(p, e.id))) {
      throw new Error('Invalid or duplicate released research entry');
    }
    seen.add(e.id);
    entries.push(e);
  }
  return entries.sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));
}

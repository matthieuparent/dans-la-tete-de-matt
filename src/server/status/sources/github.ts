/**
 * Source GitHub : au moins un push dans la dernière heure sur un de mes dépôts (privés inclus).
 *
 * On lit `pushed_at` des dépôts les plus récemment poussés (GET /user/repos?sort=pushed).
 * Fonctionne avec un jeton « fine-grained » en lecture seule (Metadata: read), contrairement
 * au flux d'événements qui exige un jeton classique pour voir les dépôts privés.
 */
import { fetchWithTimeout } from '../util';

interface Repo {
  readonly pushed_at: string | null;
}

/** Logique pure : un des dépôts a-t-il été poussé dans la fenêtre ? */
export function pushedRecently(repos: readonly Repo[], now: Date, windowMinutes: number): boolean {
  const since = now.getTime() - windowMinutes * 60_000;
  return repos.some((r) => {
    const t = r.pushed_at ? Date.parse(r.pushed_at) : NaN;
    return Number.isFinite(t) && t >= since && t <= now.getTime() + 60_000;
  });
}

export async function checkGitHub(
  now: Date,
  ctx: { env: Record<string, string | undefined>; windowMinutes: number; timeoutMs: number },
): Promise<boolean> {
  const token = ctx.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error('variable GITHUB_TOKEN absente');
  const url = 'https://api.github.com/user/repos?sort=pushed&direction=desc&per_page=10&affiliation=owner,collaborator,organization_member';
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'portfolio-status',
      },
    },
    ctx.timeoutMs,
    'GitHub',
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const repos = (await res.json()) as Repo[];
  return pushedRecently(Array.isArray(repos) ? repos : [], now, ctx.windowMinutes);
}

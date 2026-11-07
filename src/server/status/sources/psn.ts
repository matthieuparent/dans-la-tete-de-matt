/**
 * Source PlayStation Network (librairie non officielle `psn-api`) : suis-je en ligne ?
 *
 * NPSSO (variable PSN_NPSSO) → code d'accès → jetons. Les jetons sont gardés en mémoire et
 * renouvelés avec le jeton de rafraîchissement ; le NPSSO n'est réutilisé qu'en dernier recours.
 * Aucune information de jeu ne sort d'ici : seulement un booléen.
 */
import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode, exchangeRefreshTokenForAuthTokens, getBasicPresence } from 'psn-api';
import type { AuthTokensResponse } from 'psn-api';
import { withTimeout } from '../util';

interface TokenState {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
}

let tokens: TokenState | null = null;

const toState = (r: AuthTokensResponse, now: number): TokenState => ({
  accessToken: r.accessToken,
  accessExpiresAt: now + (r.expiresIn - 60) * 1000,
  refreshToken: r.refreshToken,
  refreshExpiresAt: now + (r.refreshTokenExpiresIn - 60) * 1000,
});

async function getAccessToken(npsso: string): Promise<string> {
  const now = Date.now();
  if (tokens && tokens.accessExpiresAt > now) return tokens.accessToken;
  if (tokens && tokens.refreshExpiresAt > now) {
    try {
      tokens = toState(await exchangeRefreshTokenForAuthTokens(tokens.refreshToken), now);
      return tokens.accessToken;
    } catch {
      tokens = null; // on retombe sur le NPSSO
    }
  }
  const code = await exchangeNpssoForAccessCode(npsso);
  tokens = toState(await exchangeAccessCodeForAuthTokens(code), now);
  return tokens.accessToken;
}

/** Logique pure : la réponse de présence indique-t-elle « en ligne » ? */
export function isOnline(presence: { basicPresence?: { primaryPlatformInfo?: { onlineStatus?: string } } }): boolean {
  return presence.basicPresence?.primaryPlatformInfo?.onlineStatus === 'online';
}

export async function checkPsn(ctx: { env: Record<string, string | undefined>; timeoutMs: number }): Promise<boolean> {
  const npsso = ctx.env.PSN_NPSSO?.trim();
  if (!npsso) throw new Error('variable PSN_NPSSO absente');
  const accountId = ctx.env.PSN_ACCOUNT_ID?.trim() || 'me';
  const run = async (): Promise<boolean> => {
    const accessToken = await getAccessToken(npsso);
    return isOnline(await getBasicPresence({ accessToken }, accountId));
  };
  try {
    return await withTimeout(run(), ctx.timeoutMs, 'PSN');
  } catch (err) {
    tokens = null; // jeton peut-être révoqué : on repart de zéro au prochain calcul
    throw err;
  }
}

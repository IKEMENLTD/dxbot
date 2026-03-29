import liff from '@line/liff';

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
}

let initialized = false;

export async function initLiff(): Promise<LiffProfile | null> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return null;

  try {
    if (!initialized) {
      await liff.init({ liffId });
      initialized = true;
    }

    if (!liff.isLoggedIn()) {
      if (!liff.isInClient()) return null;
      liff.login();
      return null;
    }

    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl ?? null,
    };
  } catch (err) {
    console.error('[LIFF] 初期化エラー:', err);
    return null;
  }
}

export function closeLiffWindow(): void {
  try {
    if (liff.isInClient()) liff.closeWindow();
  } catch {
    /* ignore */
  }
}

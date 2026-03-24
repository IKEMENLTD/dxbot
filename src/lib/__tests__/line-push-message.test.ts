// ===== pushMessage テスト =====

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PushMessageResult } from '../line-client';
import type { TextMessage } from '../line-types';

// getChannelAccessTokenAsync が依存する queries / crypto をモック
const mockGetAppSetting = vi.fn();
vi.mock('../queries', () => ({
  getAppSetting: (...args: unknown[]) => mockGetAppSetting(...args),
}));

const mockDecrypt = vi.fn();
vi.mock('../crypto', () => ({
  decrypt: (...args: unknown[]) => mockDecrypt(...args),
}));

// fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// モック定義後にインポート
import { pushMessage } from '../line-client';

describe('pushMessage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const testMessages: TextMessage[] = [{ type: 'text', text: 'テストメッセージ' }];
  const testLineUserId = 'U1234567890abcdef1234567890abcdef';

  /** DB にトークンが存在する状態をセットアップ */
  function setupTokenAvailable(token = 'test-token'): void {
    mockGetAppSetting.mockResolvedValue({ encryptedAccessToken: 'encrypted-value' });
    mockDecrypt.mockReturnValue(token);
  }

  /** DB にトークンが無い状態をセットアップ */
  function setupTokenUnavailable(): void {
    mockGetAppSetting.mockResolvedValue(null);
  }

  it('トークン未設定（開発モード）: mockモードで成功を返す', async () => {
    setupTokenUnavailable();
    vi.stubEnv('NODE_ENV', 'development');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result: PushMessageResult = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('トークン未設定（本番モード）: エラーを返す', async () => {
    setupTokenUnavailable();
    vi.stubEnv('NODE_ENV', 'production');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(false);
    expect(result.mock).toBe(false);
    expect(result.error).toContain('アクセストークン');
    consoleSpy.mockRestore();
  });

  it('LINE API 成功 (200): success を返す', async () => {
    setupTokenAvailable('test-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const result = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(true);
    expect(result.mock).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ to: testLineUserId, messages: testMessages }),
      })
    );
  });

  it('LINE API レート制限 (429): 適切なエラーを返す', async () => {
    setupTokenAvailable('test-token');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(result.error).toContain('レート制限');
    consoleSpy.mockRestore();
  });

  it('LINE API 認証エラー (401): 適切なエラーを返す', async () => {
    setupTokenAvailable('invalid-token');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.error).toContain('認証');
    consoleSpy.mockRestore();
  });

  it('LINE API 不正リクエスト (400): 適切なエラーを返す', async () => {
    setupTokenAvailable('test-token');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad request body',
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.error).toContain('不正');
    consoleSpy.mockRestore();
  });

  it('fetch例外（ネットワークエラー）: エラーを返す', async () => {
    setupTokenAvailable('test-token');

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await pushMessage(testLineUserId, testMessages);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
    consoleSpy.mockRestore();
  });

  it('AbortControllerのsignalがfetchに渡されている', async () => {
    setupTokenAvailable('test-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await pushMessage(testLineUserId, testMessages);

    const fetchCall = mockFetch.mock.calls[0];
    const fetchOptions = fetchCall[1] as RequestInit;
    expect(fetchOptions.signal).toBeDefined();
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
  });
});

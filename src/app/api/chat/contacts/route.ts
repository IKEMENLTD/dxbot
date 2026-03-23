// ===== Chat Contacts API Route =====
// GET: 全ユーザーの最新メッセージ + 未読数（コンタクトリスト用）

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getLatestMessages, getUnreadCounts } from '@/lib/queries';
import { getUsers } from '@/lib/queries';
import type { ContactPreview } from '@/lib/chat-types';

// ---------------------------------------------------------------------------
// GET /api/chat/contacts
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const users = await getUsers();
    const userIds = users.map((u) => u.id);

    const [latestMessages, unreadCounts] = await Promise.all([
      getLatestMessages(userIds),
      getUnreadCounts(userIds),
    ]);

    const contacts: ContactPreview[] = userIds.map((uid) => {
      const latest = latestMessages[uid];
      return {
        userId: uid,
        lastMessage: latest?.content ?? '',
        lastMessageTime: latest?.timestamp ?? '',
        unreadCount: unreadCounts[uid] ?? 0,
      };
    });

    return NextResponse.json({ contacts });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json(
      { error: `コンタクト一覧取得中にエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}

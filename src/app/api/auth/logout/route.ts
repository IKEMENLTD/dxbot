import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "ログアウト処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

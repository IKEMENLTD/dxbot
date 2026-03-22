import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

interface LoginRequestBody {
  password: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as LoginRequestBody;

    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "パスワードを入力してください" },
        { status: 400 }
      );
    }

    const success = await createSession(body.password);

    if (!success) {
      return NextResponse.json(
        { error: "パスワードが正しくありません" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "ログイン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

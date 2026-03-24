import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getSupabaseServer } from "@/lib/supabase";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const supabase = getSupabaseServer();

    let trackingUrl = "";

    if (supabase) {
      const { data } = await supabase
        .from("tracking_links")
        .select("code")
        .eq("id", id)
        .single();

      if (data) {
        const origin = request.nextUrl.origin;
        trackingUrl = `${origin}/track/${data.code}`;
      }
    }

    if (!trackingUrl) {
      return NextResponse.json({ error: "リンクが見つかりません" }, { status: 404 });
    }

    const pngBuffer = await QRCode.toBuffer(trackingUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[QR API] エラー:", error);
    return NextResponse.json({ error: "QRコード生成に失敗しました" }, { status: 500 });
  }
}

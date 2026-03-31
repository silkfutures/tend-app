export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const youngPerson = formData.get("youngPerson") || "unknown";
    const date = formData.get("date") || new Date().toISOString().split("T")[0];
    const title = formData.get("title") || "untitled";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const cleanName = `${youngPerson.replace(/\s+/g, "-").toLowerCase()}_${date}_${title.replace(/\s+/g, "-").toLowerCase()}_${Date.now()}.${ext}`;
    const path = `songs/${date}/${cleanName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await getSupabase().storage
      .from("pathways-songs")
      .upload(path, buffer, { contentType: file.type || "audio/mpeg", upsert: true });

    if (uploadError) {
      console.error("[upload-song] Failed:", uploadError);
      return NextResponse.json({
        error: uploadError.message,
        hint: !process.env.SUPABASE_SERVICE_KEY
          ? "Add SUPABASE_SERVICE_KEY to Vercel env vars. Find it in Supabase: Settings > API > service_role key (secret)."
          : "Check pathways-songs bucket exists and policies allow uploads.",
      }, { status: 500 });
    }

    const { data: urlData } = getSupabase().storage
      .from("pathways-songs")
      .getPublicUrl(path);

    return NextResponse.json({
      url: urlData?.publicUrl || "",
      path,
      title,
      youngPerson,
    });
  } catch (err) {
    console.error("[upload-song] Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

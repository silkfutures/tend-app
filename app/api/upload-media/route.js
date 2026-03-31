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
    const youngPerson = formData.get("youngPerson") || "session";
    const date = formData.get("date") || new Date().toISOString().split("T")[0];
    const caption = formData.get("caption") || "";
    const mediaType = formData.get("mediaType") || "photo";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanName = `${date}_${youngPerson.replace(/\s+/g, "-").toLowerCase()}_${Date.now()}.${ext}`;
    const folder = mediaType === "video" ? "videos" : "photos";
    const path = `${folder}/${date}/${cleanName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await getSupabase().storage
      .from("pathways-media")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("[upload-media] Failed:", uploadError);
      return NextResponse.json({
        error: uploadError.message,
        hint: !process.env.SUPABASE_SERVICE_KEY
          ? "Add SUPABASE_SERVICE_KEY to Vercel env vars. Find it in Supabase: Settings > API > service_role key (secret)."
          : "Check bucket exists and policies allow uploads.",
      }, { status: 500 });
    }

    const { data: urlData } = getSupabase().storage
      .from("pathways-media")
      .getPublicUrl(path);

    return NextResponse.json({
      url: urlData?.publicUrl || "",
      path,
      caption,
      mediaType,
    });
  } catch (err) {
    console.error("[upload-media] Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

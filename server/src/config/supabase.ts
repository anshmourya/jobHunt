import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

//upload file to supabase
export const uploadResumeToSupabase = async (file: File) => {
  const { data, error } = await supabase.storage
    .from("job-hunt")
    .upload("/resume/" + file.name, file, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) {
    throw error;
  }
  return data;
};

export default supabase;

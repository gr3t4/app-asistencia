import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON } from "./vars.config";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

export default sb;
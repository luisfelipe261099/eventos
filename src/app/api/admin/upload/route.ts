import { fail, guardAdmin, handle, ok } from "@/lib/http";
import { uploadFlyer } from "@/lib/admin-ops";

export const runtime = "nodejs";

export const POST = handle(async (req: Request) => {
  const denied = await guardAdmin(); if (denied) return denied;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Escolha uma imagem.");
  return ok({ url: await uploadFlyer(file) });
});

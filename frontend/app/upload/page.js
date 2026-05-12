import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UploadClient from "./upload-client";

export default async function UploadPage() {
  const tokenStore = await cookies();
  const token = tokenStore.get("token")?.value;

  if (!token) {
    redirect("/login?next=/upload");
  }

  return <UploadClient />;
}

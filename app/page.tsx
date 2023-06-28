import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Page() {
  if (cookies().has("token")) {
    redirect("/dashboard");
  } else {
    redirect("/schedule");
  }
}

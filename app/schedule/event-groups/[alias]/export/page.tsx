import { redirect } from "next/navigation";

export type Props = {
  params: { alias: string };
};

export default function Page({ params: { alias } }: Props) {
  redirect(`/schedule/event-groups/${alias}`);
}

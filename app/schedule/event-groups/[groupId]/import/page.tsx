import { redirect } from "next/navigation";

export type Props = {
  params: { groupId: string };
};

export default function Page({ params }: Props) {
  redirect(`/schedule/event-groups/${params.groupId}`);
}

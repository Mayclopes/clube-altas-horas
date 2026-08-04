import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function Card({
  children,
}: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
      {children}
    </div>
  );
}
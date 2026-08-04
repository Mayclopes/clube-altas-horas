import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function Container({
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </main>
  );
}
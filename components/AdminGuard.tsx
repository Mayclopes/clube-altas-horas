"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    const logado = localStorage.getItem("admin-logado");

    if (logado === "true") {
      setLiberado(true);
      return;
    }

    router.replace("/login");
  }, [router]);

  if (!liberado) {
    return null;
  }

  return <>{children}</>;
}
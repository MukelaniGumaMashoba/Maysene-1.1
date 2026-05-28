"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    router.push("/auth/logout");
  };

  return <Button onClick={logout}>Logout</Button>;
}

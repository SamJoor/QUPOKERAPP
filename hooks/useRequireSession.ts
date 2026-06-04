import { useEffect, useState } from "react";
import { router } from "expo-router";
import { getCurrentSession } from "@/lib/auth";

export function useRequireSession() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        if (!session?.user) {
          router.replace("/auth/login");
        }
      })
      .finally(() => setChecking(false));
  }, []);

  return checking;
}

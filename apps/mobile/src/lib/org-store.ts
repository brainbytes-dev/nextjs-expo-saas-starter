import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ORG_KEY = "current_org_id";

type OrgListener = (orgId: string | null) => void;

const listeners = new Set<OrgListener>();
let currentOrgId: string | null = null;
let loaded = false;
let loadPromise: Promise<string | null> | null = null;

function notify() {
  for (const listener of listeners) {
    listener(currentOrgId);
  }
}

export function loadOrgId(): Promise<string | null> {
  if (loaded) return Promise.resolve(currentOrgId);
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(ORG_KEY)
      .catch(() => null)
      .then((id) => {
        currentOrgId = id;
        loaded = true;
        notify();
        return currentOrgId;
      });
  }
  return loadPromise;
}

export async function setOrgId(orgId: string | null) {
  currentOrgId = orgId;
  loaded = true;
  loadPromise = null;
  if (orgId) {
    await AsyncStorage.setItem(ORG_KEY, orgId);
  } else {
    await AsyncStorage.removeItem(ORG_KEY);
  }
  notify();
}

export function getOrgId(): string | null {
  return currentOrgId;
}

/** Call on sign-out to clear the in-memory org state */
export function clearOrgId() {
  currentOrgId = null;
  loaded = false;
  loadPromise = null;
  notify();
}

export function useOrgId() {
  const [orgId, setLocal] = useState<string | null>(currentOrgId);
  const [isPending, setIsPending] = useState(!loaded);

  useEffect(() => {
    let mounted = true;
    const listener: OrgListener = (id) => {
      if (mounted) {
        setLocal(id);
        setIsPending(false);
      }
    };
    listeners.add(listener);

    if (!loaded) {
      loadOrgId().then(() => {
        if (mounted) {
          setLocal(currentOrgId);
          setIsPending(false);
        }
      });
    }

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  return { orgId, isPending };
}

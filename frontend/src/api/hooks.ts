import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchFeatures,
  fetchHealth,
  fetchMetrics,
  fetchSamples,
  postPredict,
} from "./client";
import type { ApiProfile } from "./profile";
import type { PredictRequest } from "./types";

function useActiveProfile() {
  const profileQuery = useApiProfile();
  return profileQuery.isSuccess ? profileQuery.data : null;
}

export function useApiProfile() {
  return useQuery({
    queryKey: ["api-health"],
    queryFn: fetchHealth,
    retry: false,
    refetchInterval: 15_000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
}

export function useFeatures() {
  const profile = useActiveProfile();
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "features"],
    queryFn: () => requireProfile(profile, fetchFeatures),
    enabled: profile !== null,
    staleTime: Infinity,
  });
}

export function useSamples() {
  const profile = useActiveProfile();
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "samples"],
    queryFn: () => requireProfile(profile, fetchSamples),
    enabled: profile !== null,
    staleTime: Infinity,
  });
}

export function usePredict() {
  const profile = useActiveProfile();
  return useMutation({
    mutationFn: (request: PredictRequest) => {
      if (!profile) {
        throw new Error(
          "No supported API profile is available; the prediction was not sent.",
        );
      }
      return postPredict(request, profile);
    },
  });
}

export function useMetrics() {
  const profile = useActiveProfile();
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "metrics"],
    queryFn: () => requireProfile(profile, fetchMetrics),
    enabled: profile !== null,
    staleTime: 60_000,
  });
}

function requireProfile<T>(
  profile: ApiProfile | null,
  fetch: (profile: ApiProfile) => Promise<T>,
): Promise<T> {
  if (!profile) {
    throw new Error("No supported API profile is available.");
  }
  return fetch(profile);
}

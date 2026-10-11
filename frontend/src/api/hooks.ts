import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { localiseFeatures } from "../lib/units";
import { useUiStore } from "../store/uiStore";
import {
  fetchCohort,
  fetchFeatures,
  fetchHealth,
  fetchImportance,
  fetchMetrics,
  fetchSamples,
  postPredict,
} from "./client";
import type { ApiProfile } from "./profile";
import type { FeatureDefinition, PredictRequest } from "./types";

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

/**
 * The API's input definitions, marked for the lab units the user chose (values stay in API units; see
 * lib/units.ts). Switching units gives new definition objects, so everything that formats values re-renders.
 */
export function useFeatures() {
  const profile = useActiveProfile();
  const unitSystem = useUiStore((state) => state.unitSystem);
  const select = useCallback(
    (definitions: FeatureDefinition[]) =>
      localiseFeatures(definitions, unitSystem),
    [unitSystem],
  );
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "features"],
    queryFn: () => requireProfile(profile, fetchFeatures),
    enabled: profile !== null,
    staleTime: Infinity,
    select,
  });
}

export function useSamples() {
  const profile = useActiveProfile();
  // samples are checked against the served feature names, so wait for /features
  const featureNames = useFeatures().data?.map((feature) => feature.name);
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "samples"],
    queryFn: () =>
      requireProfile(profile, (active) => fetchSamples(active, featureNames)),
    enabled: profile !== null && featureNames !== undefined,
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

export function useImportance() {
  const profile = useActiveProfile();
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "importance"],
    queryFn: () => requireProfile(profile, fetchImportance),
    enabled: profile !== null,
    staleTime: Infinity,
  });
}

export function useCohort() {
  const profile = useActiveProfile();
  return useQuery({
    queryKey: ["api-profile-data", profile?.id, "cohort"],
    queryFn: () => requireProfile(profile, fetchCohort),
    enabled: profile !== null,
    staleTime: Infinity,
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

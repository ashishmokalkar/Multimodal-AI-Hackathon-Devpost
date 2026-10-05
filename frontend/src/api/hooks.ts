import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchFeatures,
  fetchMetrics,
  fetchSamples,
  postPredict,
} from "./client";
import type { PredictRequest } from "./types";

export function useFeatures() {
  return useQuery({
    queryKey: ["features"],
    queryFn: fetchFeatures,
    staleTime: Infinity,
  });
}

export function useSamples() {
  return useQuery({
    queryKey: ["samples"],
    queryFn: fetchSamples,
    staleTime: Infinity,
  });
}

export function usePredict() {
  return useMutation({
    mutationFn: (request: PredictRequest) => postPredict(request),
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    staleTime: 60_000,
  });
}

import {
  getCategories,
  getCategoryInfo,
  getSchedule,
} from "@/lib/schedule/api";
import { useQuery } from "@tanstack/react-query";

export function useCategories() {
  return useQuery({
    queryKey: ["schedule", "categories"],
    queryFn: getCategories,
  });
}

export function useCategoryInfo(category: string) {
  return useQuery({
    queryKey: ["schedule", "category", category],
    queryFn: async () => await getCategoryInfo(category),
  });
}

export function useSchedule(category: string) {
  return useQuery({
    queryKey: ["schedule", "schedule", category],
    queryFn: async () => await getSchedule(category),
  });
}

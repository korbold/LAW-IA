"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/infrastructure/query/keys";
import { ApiPromptRepository } from "@/infrastructure/repositories/api-prompt-repository";

const repo = new ApiPromptRepository();

export function useSystemPrompt() {
  return useQuery({
    queryKey: queryKeys.prompts.current,
    queryFn: () => repo.getCurrent(),
  });
}

export function useSystemPromptHistory() {
  return useQuery({
    queryKey: queryKeys.prompts.history,
    queryFn: () => repo.getHistory(),
  });
}

export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => repo.update(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.history });
    },
  });
}

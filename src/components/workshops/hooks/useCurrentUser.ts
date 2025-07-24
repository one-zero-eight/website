import { useState, useEffect, useCallback } from "react";
import { workshopsFetch } from "@/api/workshops";
import type { User } from "../types";

export interface UseCurrentUserResult {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  loadCurrentUser: () => Promise<void>;
  changeRole: (newRole: "user" | "admin") => Promise<boolean>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

/**
 * Хук для работы с текущим пользователем
 */
export const useCurrentUser = (): UseCurrentUserResult => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка информации о текущем пользователе
  const loadCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await workshopsFetch.GET("/users/me");

      if (apiError) {
        setCurrentUser(null);
        setError("Failed to load user information.");
        return;
      }

      if (data) {
        setCurrentUser(data);
      }
    } catch (err) {
      setCurrentUser(null);
      setError("An unexpected error occurred while loading user information.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Изменение роли пользователя
  const changeRole = useCallback(
    async (newRole: "user" | "admin"): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: apiError } = await workshopsFetch.POST(
          "/users/change_role",
          {
            params: {
              query: {
                role: newRole,
              },
            },
          },
        );

        if (apiError) {
          setError("Failed to change role. Please try again.");
          return false;
        }

        // Обновляем информацию о пользователе
        await loadCurrentUser();
        return true;
      } catch (err) {
        setError("An unexpected error occurred while changing role.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadCurrentUser],
  );

  // Загружаем пользователя при монтировании с повторной попыткой
  useEffect(() => {
    const loadUserWithRetry = async () => {
      await loadCurrentUser();

      // Если пользователь не загрузился, повторяем попытку через 100мс
      // (возможно, база данных еще не готова)
      if (!currentUser) {
        setTimeout(async () => {
          await loadCurrentUser();
        }, 100);
      }
    };

    loadUserWithRetry();
  }, [loadCurrentUser]);

  // Вычисляемые свойства
  const isAdmin = currentUser?.role === "admin";
  const isAuthenticated = currentUser !== null;

  return {
    currentUser,
    loading,
    error,
    loadCurrentUser,
    changeRole,
    isAdmin,
    isAuthenticated,
  };
};

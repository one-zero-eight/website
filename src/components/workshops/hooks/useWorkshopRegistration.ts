import { useState, useEffect, useCallback } from "react";
import { workshopsFetch } from "@/api/workshops";
import type { Workshop, Participant } from "../types";

export interface UseWorkshopRegistrationResult {
  isRegistered: (workshopId: string) => boolean;
  getParticipants: (workshopId: string) => Participant[];
  getSignedPeopleCount: (workshop: Workshop) => number;
  checkIn: (workshopId: string) => Promise<boolean>;
  checkOut: (workshopId: string) => Promise<boolean>;
  loadMyCheckins: () => Promise<void>;
  loadParticipants: (workshopId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Хук для работы с регистрацией пользователей на воркшопы
 */
export const useWorkshopRegistration = (): UseWorkshopRegistrationResult => {
  const [myCheckins, setMyCheckins] = useState<Workshop[]>([]);
  const [participantsByWorkshop, setParticipantsByWorkshop] = useState<Record<string, Participant[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверка, зарегистрирован ли пользователь на воркшоп
  const isRegistered = useCallback((workshopId: string): boolean => {
    return myCheckins.some((workshop) => workshop.id === workshopId);
  }, [myCheckins]);

  // Получение списка участников воркшопа
  const getParticipants = useCallback((workshopId: string): Participant[] => {
    return participantsByWorkshop[workshopId] || [];
  }, [participantsByWorkshop]);

  // Подсчет количества записанных людей
  const getSignedPeopleCount = useCallback((workshop: Workshop): number => {
    // Если есть remainPlaces, вычисляем через него
    if (workshop.remainPlaces !== undefined && workshop.maxPlaces > 0) {
      return Math.max(0, workshop.maxPlaces - workshop.remainPlaces);
    }
    
    // Иначе берем количество участников из локального состояния
    const participants = getParticipants(workshop.id);
    return participants.length;
  }, [getParticipants]);

  // Загрузка списка воркшопов, на которые записан пользователь
  const loadMyCheckins = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await workshopsFetch.GET("/users/my_checkins");

      if (apiError) {
        setError("Failed to load your registrations.");
        return;
      }

      if (data && Array.isArray(data)) {
        setMyCheckins(data);
      }
    } catch (err) {
      setError("An unexpected error occurred while loading registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка участников конкретного воркшопа
  const loadParticipants = useCallback(async (workshopId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await workshopsFetch.GET(
        "/workshops/{workshop_id}/checkins",
        {
          params: {
            path: { workshop_id: workshopId },
          },
        }
      );

      if (apiError) {
        setError("Failed to load participants.");
        return;
      }

      if (data && Array.isArray(data)) {
        setParticipantsByWorkshop((prev) => ({
          ...prev,
          [workshopId]: data,
        }));
      }
    } catch (err) {
      setError("An unexpected error occurred while loading participants.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Регистрация на воркшоп
  const checkIn = useCallback(async (workshopId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: apiError } = await workshopsFetch.POST(
        "/workshops/{workshop_id}/checkin",
        {
          params: {
            path: { workshop_id: workshopId },
          },
        }
      );

      if (apiError) {
        setError("Failed to check in. Please try again. Probably you have overlapping workshops.");
        return false;
      }

      // Обновляем локальные данные
      await loadMyCheckins();
      await loadParticipants(workshopId);
      return true;
    } catch (err) {
      setError("An unexpected error occurred during check-in.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMyCheckins, loadParticipants]);

  // Отмена регистрации на воркшоп
  const checkOut = useCallback(async (workshopId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: apiError } = await workshopsFetch.POST(
        "/workshops/{workshop_id}/checkout",
        {
          params: {
            path: { workshop_id: workshopId },
          },
        }
      );

      if (apiError) {
        setError("Failed to check out. Please try again.");
        return false;
      }

      // Обновляем локальные данные
      await loadMyCheckins();
      await loadParticipants(workshopId);
      return true;
    } catch (err) {
      setError("An unexpected error occurred during check-out.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadMyCheckins, loadParticipants]);

  // Загружаем данные о регистрациях при монтировании
  useEffect(() => {
    loadMyCheckins();
  }, [loadMyCheckins]);

  return {
    isRegistered,
    getParticipants,
    getSignedPeopleCount,
    checkIn,
    checkOut,
    loadMyCheckins,
    loadParticipants,
    loading,
    error,
  };
};

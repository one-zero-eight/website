import { useState, useEffect, useCallback } from "react";
import { workshopsFetch } from "@/api/workshops";
import type { Workshop } from "../types";
import { transformWorkshopFromAPI } from "../utils";

export interface UseWorkshopsResult {
  workshops: Workshop[];
  loading: boolean;
  error: string | null;
  loadWorkshops: () => Promise<void>;
  createWorkshop: (workshop: Workshop) => Promise<boolean>;
  updateWorkshop: (workshop: Workshop) => Promise<boolean>;
  removeWorkshop: (workshop: Workshop) => Promise<boolean>;
  refreshWorkshops: () => void;
}

export interface CreateWorkshopRequest {
  name: string;
  description: string;
  capacity: number;
  remain_places: number;
  place: string;
  dtstart: string;
  dtend: string;
  is_active: boolean;
  is_registrable?: boolean;
}

interface UpdateWorkshopRequest {
  name: string;
  description: string;
  capacity: number;
  remain_places: number;
  place: string;
  dtstart: string;
  dtend: string;
  is_active: boolean;
  is_registrable?: boolean;
}

export const useWorkshops = (): UseWorkshopsResult => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка списка воркшопов
  const loadWorkshops = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await workshopsFetch.GET("/workshops/", {
        params: {
          query: {
            limit: 100,
          },
        },
      });

      if (apiError) {
        setError("Failed to load workshops. Please check your connection and try again.");
        return;
      }

      if (!data || !Array.isArray(data)) {
        setError("Invalid data received from server.");
        return;
      }

      const transformedWorkshops = data.map(transformWorkshopFromAPI);
      setWorkshops(transformedWorkshops);
    } catch (err) {
      setError("An unexpected error occurred while loading workshops.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Создание нового воркшопа
  const createWorkshop = useCallback(async (newWorkshop: Workshop): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const startDateTime = `${newWorkshop.date}T${newWorkshop.startTime}`;
      const endDateTime = `${newWorkshop.date}T${newWorkshop.endTime}`;

      const createRequest: CreateWorkshopRequest = {
        name: newWorkshop.title,
        description: newWorkshop.body,
        capacity: newWorkshop.maxPlaces || 500,
        remain_places: newWorkshop.maxPlaces || 500,
        place: newWorkshop.room || "TBA",
        dtstart: startDateTime,
        dtend: endDateTime,
        is_active: newWorkshop.isActive ?? true,
        is_registrable: newWorkshop.isRegistrable ?? true,
      };

      const { data, error: apiError } = await workshopsFetch.POST("/workshops/", {
        body: createRequest,
      });

      if (apiError) {
        setError("Failed to create workshop. Please check all fields and try again.");
        return false;
      }

      if (data) {
        const createdWorkshop = transformWorkshopFromAPI(data);
        setWorkshops((prev) => [...prev, createdWorkshop]);
        return true;
      }

      return false;
    } catch (err) {
      setError("An unexpected error occurred while creating workshop.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Обновление воркшопа
  const updateWorkshop = useCallback(async (updatedWorkshop: Workshop): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const startDateTime = `${updatedWorkshop.date}T${updatedWorkshop.startTime}`;
      const endDateTime = `${updatedWorkshop.date}T${updatedWorkshop.endTime}`;

      const updateRequest: UpdateWorkshopRequest = {
        name: updatedWorkshop.title,
        description: updatedWorkshop.body,
        capacity: updatedWorkshop.maxPlaces,
        remain_places: updatedWorkshop.remainPlaces || updatedWorkshop.maxPlaces,
        place: updatedWorkshop.room || "TBA",
        dtstart: startDateTime,
        dtend: endDateTime,
        is_active: updatedWorkshop.isActive ?? true,
        is_registrable: updatedWorkshop.isRegistrable ?? true,
      };

      const { error: apiError } = await workshopsFetch.PUT(`/workshops/{workshop_id}`, {
        params: {
          path: { workshop_id: updatedWorkshop.id },
        },
        body: updateRequest,
      });

      if (apiError) {
        setError("Failed to update workshop. Please check all fields and try again.");
        return false;
      }

      // Обновляем локальный список
      await loadWorkshops();
      return true;
    } catch (err) {
      setError("An unexpected error occurred while updating workshop.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadWorkshops]);

  // Удаление воркшопа
  const removeWorkshop = useCallback(async (workshop: Workshop): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: apiError } = await workshopsFetch.DELETE(`/workshops/{workshop_id}`, {
        params: {
          path: { workshop_id: workshop.id },
        },
      });

      if (apiError) {
        setError("Failed to delete workshop. Please try again.");
        return false;
      }

      // Удаляем из локального списка
      setWorkshops((prev) => prev.filter((w) => w.id !== workshop.id));
      return true;
    } catch (err) {
      setError("An unexpected error occurred while deleting workshop.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Принудительное обновление списка
  const refreshWorkshops = useCallback(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  // Загружаем воркшопы при монтировании
  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  return {
    workshops,
    loading,
    error,
    loadWorkshops,
    createWorkshop,
    updateWorkshop,
    removeWorkshop,
    refreshWorkshops,
  };
};

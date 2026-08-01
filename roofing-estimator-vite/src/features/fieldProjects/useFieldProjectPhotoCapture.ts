import { useCallback, useRef, useState } from "react";
import { compressImageFileToJpegDataUrl, dataUrlToBase64Payload } from "../../lib/fieldPhotoCompress";
import {
  MAX_FIELD_PROJECT_PHOTOS,
  type DamagePhoto,
  type DamagePhotoAiSummary,
  type FieldProject,
} from "../../lib/fieldProjectTypes";
import { postRoofDamageDraft } from "../../lib/roofDamageClient";

export type ImportFilesResult = {
  added: number;
  photoIds: string[];
  error: string | null;
};

type CaptureDeps = {
  fieldProjects: FieldProject[];
  authToken?: string;
  addFieldProjectPhoto: (projectId: string, imageDataUrl: string, caption?: string) => DamagePhoto | null;
  setFieldProjectPhotoAiSummary: (
    projectId: string,
    photoId: string,
    summary: DamagePhotoAiSummary,
  ) => void;
};

/**
 * Shared camera / gallery → compress → attach (+ optional AI draft) pipeline
 * for field jobs (Projects panel + Canvassing storm damage report).
 */
export function useFieldProjectPhotoCapture(deps: CaptureDeps) {
  const { fieldProjects, authToken, addFieldProjectPhoto, setFieldProjectPhotoAiSummary } = deps;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const resetFileInputs = useCallback(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, []);

  const runAiOnPhoto = useCallback(
    async (projectId: string, photoId: string, imageDataUrl: string, contextHint: string) => {
      if (!imageDataUrl.startsWith("data:image/")) {
        setImportError("AI draft needs the original photo on this device.");
        return false;
      }
      setBusyPhotoId(photoId);
      setImportError(null);
      try {
        const { base64, mimeType } = dataUrlToBase64Payload(imageDataUrl);
        const res = await postRoofDamageDraft({
          imageBase64: base64,
          mimeType,
          context: contextHint || undefined,
          token: authToken,
        });
        if (!res.ok) {
          setImportError(res.error);
          return false;
        }
        setFieldProjectPhotoAiSummary(projectId, photoId, res.data);
        return true;
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "AI request failed");
        return false;
      } finally {
        setBusyPhotoId(null);
      }
    },
    [authToken, setFieldProjectPhotoAiSummary],
  );

  const importFiles = useCallback(
    async (
      projectId: string,
      files: FileList | null,
      options?: {
        /** Run roof-damage AI on each newly added photo (requires auth). */
        autoAi?: boolean;
        contextHint?: string;
      },
    ): Promise<ImportFilesResult> => {
      if (!files?.length) return { added: 0, photoIds: [], error: null };
      setImportError(null);
      setImporting(true);
      const proj = fieldProjects.find((p) => p.id === projectId);
      let remaining = proj ? MAX_FIELD_PROJECT_PHOTOS - proj.photos.length : 0;
      if (remaining <= 0) {
        const error = `Each project allows at most ${MAX_FIELD_PROJECT_PHOTOS} photos (local storage limit).`;
        setImportError(error);
        setImporting(false);
        resetFileInputs();
        return { added: 0, photoIds: [], error };
      }

      let added = 0;
      const photoIds: string[] = [];
      let lastError: string | null = null;

      for (let i = 0; i < files.length && remaining > 0; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        try {
          const dataUrl = await compressImageFileToJpegDataUrl(file);
          const photo = addFieldProjectPhoto(projectId, dataUrl);
          if (!photo) continue;
          added += 1;
          remaining -= 1;
          photoIds.push(photo.id);
          if (options?.autoAi && authToken) {
            void runAiOnPhoto(projectId, photo.id, dataUrl, options.contextHint ?? "");
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : "Could not process an image.";
          setImportError(lastError);
        }
      }

      resetFileInputs();
      setImporting(false);
      return { added, photoIds, error: lastError };
    },
    [addFieldProjectPhoto, authToken, fieldProjects, resetFileInputs, runAiOnPhoto],
  );

  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const openGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  return {
    cameraInputRef,
    galleryInputRef,
    busyPhotoId,
    importing,
    importError,
    setImportError,
    importFiles,
    runAiOnPhoto,
    openCamera,
    openGallery,
  };
}

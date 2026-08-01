import { useCallback, useEffect, useRef, useState } from "react";
import { compressImageFileToJpegDataUrl, dataUrlToBase64Payload } from "../../lib/fieldPhotoCompress";
import {
  MAX_FIELD_PROJECT_PHOTOS,
  type DamagePhoto,
  type DamagePhotoAiSummary,
  type FieldProject,
} from "../../lib/fieldProjectTypes";
import { getFieldPhotoBlob } from "../../lib/fieldPhotoBlobStore";
import { postRoofDamageDraft } from "../../lib/roofDamageClient";

export type ImportFilesResult = {
  added: number;
  photoIds: string[];
  error: string | null;
  /** True when every newly added photo finished AI (or AI was skipped). */
  aiComplete: boolean;
  /** Photo count on the project after this import (best-effort). */
  photoCountAfter: number;
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
  const fieldProjectsRef = useRef(fieldProjects);
  useEffect(() => {
    fieldProjectsRef.current = fieldProjects;
  }, [fieldProjects]);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  /** Tracks in-flight AI jobs so the UI can show “building report…”. */
  const aiInFlightRef = useRef(0);

  const resetFileInputs = useCallback(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, []);

  const runAiOnPhoto = useCallback(
    async (projectId: string, photoId: string, imageDataUrl: string, contextHint: string) => {
      let bytes = imageDataUrl;
      if (!bytes.startsWith("data:image/")) {
        bytes = (await getFieldPhotoBlob(photoId)) ?? "";
      }
      if (!bytes.startsWith("data:image/")) {
        setImportError("AI draft needs the original photo on this device.");
        return false;
      }
      aiInFlightRef.current += 1;
      setAnalyzing(true);
      setBusyPhotoId(photoId);
      setImportError(null);
      try {
        const { base64, mimeType } = dataUrlToBase64Payload(bytes);
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
        aiInFlightRef.current = Math.max(0, aiInFlightRef.current - 1);
        if (aiInFlightRef.current === 0) setAnalyzing(false);
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
        /** Await AI before resolving (storm report consolidation). */
        awaitAi?: boolean;
        contextHint?: string;
      },
    ): Promise<ImportFilesResult> => {
      if (!files?.length) {
        const proj0 = fieldProjectsRef.current.find((p) => p.id === projectId);
        return {
          added: 0,
          photoIds: [],
          error: null,
          aiComplete: true,
          photoCountAfter: proj0?.photos.length ?? 0,
        };
      }
      setImportError(null);
      setImporting(true);
      const proj = fieldProjectsRef.current.find((p) => p.id === projectId);
      const startingCount = proj?.photos.length ?? 0;
      let remaining = proj ? MAX_FIELD_PROJECT_PHOTOS - startingCount : 0;
      if (remaining <= 0) {
        const error = `Each project allows at most ${MAX_FIELD_PROJECT_PHOTOS} photos.`;
        setImportError(error);
        setImporting(false);
        resetFileInputs();
        return { added: 0, photoIds: [], error, aiComplete: true, photoCountAfter: startingCount };
      }

      let added = 0;
      const photoIds: string[] = [];
      const aiJobs: Array<Promise<boolean>> = [];
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
            const job = runAiOnPhoto(projectId, photo.id, dataUrl, options.contextHint ?? "");
            if (options.awaitAi) aiJobs.push(job);
            else void job;
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : "Could not process an image.";
          setImportError(lastError);
        }
      }

      resetFileInputs();
      setImporting(false);

      let aiComplete = true;
      if (aiJobs.length > 0) {
        const results = await Promise.all(aiJobs);
        aiComplete = results.every(Boolean);
      }

      return {
        added,
        photoIds,
        error: lastError,
        aiComplete,
        photoCountAfter: startingCount + added,
      };
    },
    [addFieldProjectPhoto, authToken, resetFileInputs, runAiOnPhoto],
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
    analyzing,
    importError,
    setImportError,
    importFiles,
    runAiOnPhoto,
    openCamera,
    openGallery,
  };
}

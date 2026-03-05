"use client";

import { useCallback, useRef, useState } from "react";

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 800;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

function resizeToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export default function PhotoUpload({ photos, onChange, maxPhotos = MAX_PHOTOS }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);
      const remaining = maxPhotos - photos.length;
      if (remaining <= 0) {
        setError(`Maxim ${maxPhotos} poze permise`);
        return;
      }

      const valid = fileArray
        .filter((f) => {
          if (!ACCEPTED_TYPES.includes(f.type)) return false;
          if (f.size > MAX_FILE_SIZE) return false;
          return true;
        })
        .slice(0, remaining);

      if (valid.length === 0) {
        if (fileArray.length > 0) setError("Fisiere invalide. Acceptam JPG, PNG sau WebP, max 5MB.");
        return;
      }

      setProcessing(true);
      try {
        const results = await Promise.all(valid.map(resizeToBase64));
        onChange([...photos, ...results]);
      } catch {
        setError("Eroare la procesarea pozelor. Incearca din nou.");
      } finally {
        setProcessing(false);
      }
    },
    [photos, onChange, maxPhotos],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removePhoto = useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange],
  );

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Poza ${i + 1}`}
                className="h-20 w-20 rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white
                  flex items-center justify-center text-xs opacity-0 group-hover:opacity-100
                  transition-opacity shadow-sm hover:bg-red-600"
                aria-label="Sterge poza"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed
            px-4 py-5 cursor-pointer transition-colors
            ${dragActive ? "border-blue-400 bg-blue-50/60" : "border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {processing ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Se proceseaza...
            </div>
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-4.5 w-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-600">
                {photos.length === 0
                  ? "Adauga poze cu apartamentul"
                  : `Adauga inca ${maxPhotos - photos.length} ${maxPhotos - photos.length === 1 ? "poza" : "poze"}`}
              </p>
              <p className="text-[10px] text-gray-400">
                Trage pozele aici sau apasa pentru a selecta. JPG, PNG, WebP — max 5MB.
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {photos.length === 0 && (
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Pozele ajuta AI-ul sa evalueze starea reala a apartamentului si sa ofere o estimare mai precisa.
          Acest pas este optional.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";

import { cn } from "@loopinator/ui/lib/utils";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export type FileUploadSuccessRenderProps = {
  files: File[];
  clear: () => void;
  open: () => void;
};

type FileUploadProps = {
  onChange?: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  showSelectedFiles?: boolean;
  inputId?: string;
  value?: File[];
  maxFiles?: number;
  maxSize?: number;
  acceptedTypesLabel?: string;
  showConstraints?: boolean;
  renderOnSuccess?: (props: FileUploadSuccessRenderProps) => ReactNode;
  onValidationError?: (rejections: FileRejection[]) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function acceptToLabel(accept: Accept): string {
  const extensions = [
    ...new Set(
      Object.values(accept).flatMap((exts) => {
        const extensionList = Array.isArray(exts) ? exts : [exts];
        return extensionList.map((extension) => extension.replace(/^\./, "").toUpperCase());
      }),
    ),
  ];

  if (extensions.length === 0) {
    return "";
  }

  if (extensions.length === 1) {
    return extensions[0] ?? "";
  }

  if (extensions.length === 2) {
    return `${extensions[0]} or ${extensions[1]}`;
  }

  return `${extensions.slice(0, -1).join(", ")}, or ${extensions.at(-1)}`;
}

function rejectionMessage(rejections: FileRejection[]): string {
  const messages = new Set<string>();

  for (const rejection of rejections) {
    for (const error of rejection.errors) {
      messages.add(error.message);
    }
  }

  return Array.from(messages).join(". ");
}

export function FileUpload({
  onChange,
  accept,
  multiple = false,
  showSelectedFiles = true,
  inputId,
  value,
  maxFiles,
  maxSize,
  acceptedTypesLabel,
  showConstraints = true,
  renderOnSuccess,
  onValidationError,
}: FileUploadProps) {
  const isControlled = value !== undefined;
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const files = isControlled ? value : internalFiles;
  const effectiveMaxFiles = maxFiles ?? (multiple ? undefined : 1);
  const resolvedAcceptedTypesLabel =
    acceptedTypesLabel ?? (accept ? acceptToLabel(accept) : undefined);

  const updateFiles = (nextFiles: File[]) => {
    if (!isControlled) {
      setInternalFiles(nextFiles);
    }

    onChange?.(nextFiles);
  };

  const clearFiles = () => {
    setValidationError(null);
    updateFiles([]);

    if (inputId) {
      const input = document.getElementById(inputId);
      if (input instanceof HTMLInputElement) {
        input.value = "";
      }
    }
  };

  const handleAcceptedFiles = (acceptedFiles: File[]) => {
    setValidationError(null);

    const nextFiles = multiple ? [...files, ...acceptedFiles] : acceptedFiles.slice(0, 1);
    updateFiles(nextFiles);
  };

  const handleRejectedFiles = (rejections: FileRejection[]) => {
    const message = rejectionMessage(rejections);
    setValidationError(message);
    onValidationError?.(rejections);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple,
    noClick: true,
    accept,
    maxSize,
    maxFiles: effectiveMaxFiles,
    onDropAccepted: handleAcceptedFiles,
    onDropRejected: handleRejectedFiles,
  });

  const hiddenInput = (
    <input
      {...getInputProps({
        id: inputId,
        className: "sr-only",
      })}
    />
  );

  const constraintItems: string[] = [];

  if (resolvedAcceptedTypesLabel) {
    constraintItems.push(resolvedAcceptedTypesLabel);
  }

  if (effectiveMaxFiles !== undefined) {
    constraintItems.push(
      effectiveMaxFiles === 1 ? "1 file" : `Up to ${effectiveMaxFiles} files`,
    );
  }

  if (maxSize !== undefined) {
    constraintItems.push(`${formatFileSize(maxSize)} max`);
  }

  if (renderOnSuccess && files.length > 0) {
    return (
      <div className="w-full">
        {hiddenInput}
        {renderOnSuccess({
          files,
          clear: clearFiles,
          open,
        })}
      </div>
    );
  }

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={(event) => {
          event.stopPropagation();
          open();
        }}
        whileHover="animate"
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-lg p-10"
      >
        {hiddenInput}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans text-base font-bold text-neutral-700 dark:text-neutral-300">
            Upload file
          </p>
          <p className="relative z-20 mt-2 font-sans text-base font-normal text-neutral-400 dark:text-neutral-400">
            Drag or drop your files here or click to upload
          </p>
          {showConstraints && constraintItems.length > 0 ? (
            <p className="relative z-20 mt-2 font-sans text-sm text-neutral-500 dark:text-neutral-500">
              {constraintItems.join(" · ")}
            </p>
          ) : null}
          {validationError ? (
            <p className="relative z-20 mt-2 text-center text-sm text-red-600 dark:text-red-400">
              {validationError}
            </p>
          ) : null}
          <div className="relative mx-auto mt-10 w-full max-w-xl">
            {showSelectedFiles &&
              files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative z-40 mx-auto mt-4 flex w-full flex-col items-start justify-start overflow-hidden rounded-md bg-white p-4 md:h-24 dark:bg-neutral-900",
                    "shadow-sm",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="max-w-xs truncate text-base text-neutral-700 dark:text-neutral-300"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="shadow-input w-fit shrink-0 rounded-lg px-2 py-1 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-white"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div className="mt-2 flex w-full flex-col items-start justify-between text-sm text-neutral-600 md:flex-row md:items-center dark:text-neutral-400">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded-md bg-gray-100 px-1 py-0.5 dark:bg-neutral-800"
                    >
                      {file.type}
                    </motion.p>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                      modified {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative z-40 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md bg-white group-hover/file:shadow-2xl dark:bg-neutral-900",
                  "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]",
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center text-neutral-600"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute inset-0 z-30 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md border border-dashed border-sky-400 bg-transparent opacity-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function GridPattern() {
  const columns = 41;
  const rows = 11;

  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px bg-gray-100 dark:bg-neutral-900">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;

          return (
            <div
              key={`${col}-${row}`}
              className={cn(
                "flex h-10 w-10 shrink-0 rounded-[2px]",
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:bg-neutral-950 dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]",
              )}
            />
          );
        }),
      )}
    </div>
  );
}

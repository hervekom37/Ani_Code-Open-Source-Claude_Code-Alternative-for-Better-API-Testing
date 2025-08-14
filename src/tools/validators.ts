import * as path from 'path';


// Track which files have been read in the current session
let readFiles: Set<string> | null = null;

export function setReadFilesTracker(tracker: Set<string>) {
  readFiles = tracker;
}

// Check if a file has been read before allowing edits
export function validateReadBeforeEdit(filePath: string): boolean {
  if (!readFiles) {
    return true; // No tracking enabled, allow edit
  }
  
  const resolvedPath = path.resolve(filePath);
  return readFiles.has(resolvedPath);
}

export function getReadBeforeEditError(filePath: string): string {
  return `File must be read before editing. Use read_file tool first: ${filePath}`;
}
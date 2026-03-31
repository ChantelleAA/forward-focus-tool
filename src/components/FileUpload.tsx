import { Upload, CheckCircle } from "lucide-react";
import { useRef } from "react";

interface FileUploadProps {
  label: string;
  helperText?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
}

const FileUpload = ({ label, helperText, file, onFileChange, accept = ".pdf" }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-input bg-card px-4 py-4 text-sm transition-colors hover:border-primary hover:bg-secondary/50"
      >
        {file ? (
          <>
            <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-foreground">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Click to upload</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
};

export default FileUpload;

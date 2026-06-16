import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  displayName: string;
  onUploadComplete: (avatarPath: string) => void;
}

export function AvatarUploader({
  currentAvatarUrl,
  displayName,
  onUploadComplete,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    const toBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

    try {
      let avatarPath: string | null = null;

      try {
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) throw new Error("No upload URL");

        const { uploadURL, objectPath } = await response.json();

        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) throw new Error("Upload failed");

        const avatarResponse = await fetch("/api/user/avatar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarURL: objectPath }),
        });

        if (avatarResponse.ok) {
          const data = await avatarResponse.json();
          avatarPath = data.avatarPath;
        }
      } catch {
        const base64 = await toBase64(file);
        const profileResponse = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarUrl: base64 }),
        });
        if (profileResponse.ok) {
          avatarPath = base64;
        }
      }

      if (avatarPath) {
        onUploadComplete(avatarPath);
      }
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <Avatar className="h-24 w-24">
        <AvatarImage src={currentAvatarUrl || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-avatar-file"
      />
      <Button
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        data-testid="button-upload-avatar"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

import { useState } from "react";

export const usePinataUpload = () => {
  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedCID, setUploadedCID] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // File validation
  const [fileValidation, setFileValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });

  // Upload function
  const uploadToPinata = async (): Promise<string | null> => {
    if (!selectedFile) {
      setError("Please select a file first");
      return null;
    }

    try {
      setIsUploading(true);
      setError("");
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);

      // Add metadata
      const metadata = {
        name: selectedFile.name,
        description: `Uploaded via Fanvas app - ${new Date().toISOString()}`,
        attributes: {
          type: "fan-content",
          uploadedAt: new Date().toISOString(),
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
      };
      formData.append("pinataMetadata", JSON.stringify(metadata));

      const response = await fetch("/api/upload-to-pinata", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Upload failed: ${errorData.error || response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Upload result:", result);

      if (result.success && result.IpfsHash) {
        setUploadedCID(result.IpfsHash);
        setUploadProgress(100);
        return result.IpfsHash; // Return the CID directly
      } else {
        throw new Error("Upload failed: No CID returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress(0);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // File selection handler
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadedCID("");
    setError("");
    setUploadProgress(0);

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (file.size > maxSize) {
      setFileValidation({
        isValid: false,
        message: "File size must be less than 10MB",
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setFileValidation({
        isValid: false,
        message: "Only JPEG, PNG, GIF, and WebP files are allowed",
      });
      return;
    }

    setFileValidation({ isValid: true, message: "" });
  };

  // Reset function
  const resetUpload = () => {
    setSelectedFile(null);
    setUploadedCID("");
    setError("");
    setUploadProgress(0);
    setFileValidation({ isValid: true, message: "" });
  };

  // Get IPFS gateway URL
  const getGatewayUrl = (cid: string) => {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  };

  return {
    // States
    selectedFile,
    uploadedCID,
    isUploading,
    error,
    uploadProgress,
    fileValidation,

    // Functions
    uploadToPinata,
    handleFileSelect,
    resetUpload,
    getGatewayUrl,
  };
};

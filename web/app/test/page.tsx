"use client";
import { usePinataUpload } from "./usePinataUpload";

export default function TestPage() {
  const {
    selectedFile,
    uploadedCID,
    isUploading,
    error,
    uploadProgress,
    fileValidation,
    uploadToPinata,
    handleFileSelect,
    resetUpload,
    getGatewayUrl,
  } = usePinataUpload();

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "2rem auto",
        padding: 24,
        border: "1px solid #eee",
        borderRadius: 8,
      }}
    >
      <h1>Pinata Upload Test</h1>
      <input
        type="file"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
        disabled={isUploading}
      />
      <button
        onClick={uploadToPinata}
        disabled={isUploading || !fileValidation.isValid || !selectedFile}
        style={{ marginLeft: 8 }}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      {fileValidation.message && (
        <p style={{ color: "orange" }}>{fileValidation.message}</p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {uploadProgress > 0 && <p>Progress: {uploadProgress}%</p>}
      {uploadedCID && (
        <div>
          <p>Uploaded! CID: {uploadedCID}</p>
          <a
            href={getGatewayUrl(uploadedCID)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on IPFS
          </a>
        </div>
      )}
      <button onClick={resetUpload} style={{ marginTop: 16 }}>
        Reset
      </button>
    </div>
  );
}

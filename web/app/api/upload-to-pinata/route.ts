import { NextResponse, type NextRequest } from "next/server";
import { pinata } from "@/lib/pinataConfig";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = formData.get("pinataMetadata") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create file object
    const fileObject = new File([buffer], file.name, {
      type: file.type,
    });

    // Upload to Pinata using the correct method
    const uploadData = await pinata.upload.file(fileObject);

    return NextResponse.json(
      {
        success: true,
        IpfsHash: uploadData.IpfsHash,
        cid: uploadData.IpfsHash,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pinata upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload to Pinata" },
      { status: 500 }
    );
  }
}

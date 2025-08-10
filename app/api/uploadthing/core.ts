import { createUploadthing, type FileRouter } from "uploadthing/next"

const f = createUploadthing()

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
    // Optionally add metadata/auth here
    .onUploadComplete(async ({ file }) => {
      // You can log or persist something if needed
      // console.log("Upload complete:", file.url)
    }),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter

import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/orders/:id/bac-proof",
      method: ["POST"],
      middlewares: [upload.array("files", 3) as any],
    },
  ],
})

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/**
 * Where BAC transfer proofs are written and how the admin gets to see them.
 *
 * Same R2 connection settings as the Medusa file-s3 provider. We upload
 * directly (instead of via the File module) because the s3 provider strips
 * directory paths from filenames, which makes per-order folders impossible,
 * and because it mis-decodes binary content as utf8 — corrupting images.
 *
 * Note that `R2_ENDPOINT` carries the bucket in its path in production, so the
 * real object key is that path plus the key passed here (see
 * `prune-bac-proofs.ts`). Nothing here needs to care: a signed URL built by a
 * client with the same endpoint resolves to exactly the object PutObject wrote.
 */
const connection = (): S3ClientConfig => ({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
})

const uploads = new S3Client(connection())

/**
 * Used only to sign download URLs. The SDK's default checksum settings would
 * add `x-amz-checksum-*` parameters to the signed query; switching them off
 * leaves a plain SigV4 URL that any S3-compatible store accepts.
 */
const signer = new S3Client({
  ...connection(),
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
})

/**
 * How long a signed proof URL works. Long enough for an admin page left open
 * while the payment is checked in BAC; the same default Medusa's own file
 * providers use for private downloads.
 */
export const SIGNED_PROOF_URL_TTL_SECONDS = 60 * 60

/**
 * Stores one proof. No `ACL: "public-read"` any more: a receipt must not be
 * public, and R2 decides public access per bucket (its custom domain), not per
 * object. Whether the media domain still serves the object is decided in
 * Cloudflare, not here.
 */
export const putProof = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> => {
  await uploads.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      // The sniffed type, never the client's — see detectProofType.
      ContentType: contentType,
      ContentDisposition: "inline",
    })
  )
}

/** A short-lived URL for one proof. Signing is local: no request to R2. */
export const signedProofUrl = (key: string): Promise<string> =>
  getSignedUrl(
    signer,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ResponseContentDisposition: "inline",
    }),
    { expiresIn: SIGNED_PROOF_URL_TTL_SECONDS }
  )

import fs from 'fs-extra'
import { merge } from 'lodash'
import path from 'path'
import { z, ZodError } from 'zod'

import {
  getDefaultProjectConfigPath,
  getProjectConfigPath,
} from '../../paths.js'

const projectConfigSchema = z.object({
  projectId: z.string().optional(),
  snapshotId: z.string().optional(),
  sourceDatabaseUrl: z.string().optional(),
  targetDatabaseUrl: z.string().optional(),
  publicKey: z.string().optional(),

  // s3
  s3Bucket: z.string().optional(),
  s3Region: z.string().optional(),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
  s3Endpoint: z.string().optional()
})

const getProjectConfigOverrides = () => ({
  projectId: process.env.SNAPLET_PROJECT_ID,
  snapshotId: process.env.SNAPLET_SNAPSHOT_ID,
  sourceDatabaseUrl:
    process.env.SNAPLET_SOURCE_DATABASE_URL ?? process.env.SNAPLET_DATABASE_URL,
  targetDatabaseUrl:
    process.env.SNAPLET_TARGET_DATABASE_URL ?? process.env.SNAPLET_DATABASE_URL,
  publicKey: process.env.SNAPLET_PUBLIC_KEY,
  // s3
  s3Bucket: process.env.SNAPLET_S3_BUCKET,
  s3Region: process.env.SNAPLET_S3_REGION,
  s3AccessKeyId: process.env.SNAPLET_S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.SNAPLET_S3_SECRET_ACCESS_KEY,
  s3Endpint: process.env.SNAPLET_S3_ENDPOINT
})

export type ProjectConfig = z.infer<typeof projectConfigSchema>

export function parseProjectConfig(config: Record<string, unknown>) {
  config = merge(config, getProjectConfigOverrides())
  try {
    return projectConfigSchema.parse(config)
  } catch (e) {
    if (e instanceof ZodError) {
      throw new Error(`Could not parse project config: ${e.message}`)
    }
    throw e
  }
}

/**
 * This reads the project config from disk, merges the envars,
 * and validates that it's correct.
 */
export function getProjectConfig(configPath = getProjectConfigPath()) {
  let config = {}
  if (configPath && fs.existsSync(configPath)) {
    config = fs.readJsonSync(configPath)
  }
  return parseProjectConfig(config)
}

export async function getProjectConfigAsync(
  configPath = getProjectConfigPath()
) {
  return getProjectConfig(configPath)
}

export function saveProjectConfig(
  config: ProjectConfig,
  configPath = getProjectConfigPath() ?? getDefaultProjectConfigPath()
): string {
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, undefined, 2))

  return configPath
}

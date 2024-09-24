import { isNumber, toNumber, isFinite } from 'lodash'

export const numberEnv = (env: string, defaultValue?: number) => {
  const val = toNumber(process.env[env])

  if (val && isNumber(val) && isFinite(val)) {
    return val
  }

  return defaultValue
}

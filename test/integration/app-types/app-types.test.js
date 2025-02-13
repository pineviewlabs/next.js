/* eslint-env jest */

import path from 'path'
import fs from 'fs-extra'
import { nextBuild } from 'next-test-utils'

const appDir = __dirname

describe('app type checking', () => {
  describe('production mode', () => {
    let stderr, errors
    beforeAll(async () => {
      stderr = (await nextBuild(appDir, [], { stderr: true })).stderr

      errors = stderr.match(
        /===== TS errors =====(.+)===== TS errors =====/s
      )?.[1]
    })

    it('should generate route types correctly and report link error', async () => {
      // Make sure the d.ts file is generated
      const dts = (
        await fs.readFile(path.join(appDir, '.next', 'types', 'link.d.ts'))
      ).toString()
      expect(dts.includes('`/dashboard/user/')).toBeTruthy()

      // Check type checking errors
      expect(errors).toContain(
        'Type error: "/dashboard" is not an existing route. If it is intentional, please type it explicitly with `as Route`.'
      )
      expect(errors).toContain(
        'Type error: "/blog/a/b/c/d" is not an existing route.'
      )

      // Make sure all errors were reported and other links passed type checking
      const errorLines = [
        ...errors.matchAll(
          /\.\/src\/app\/type-checks\/link\/page\.tsx:(\d+):/g
        ),
      ].map(([, line]) => +line)
      expect(errorLines).toEqual([17, 18, 19, 20, 21, 22, 23, 24, 25])
    })

    it('should type check invalid entry exports', () => {
      // Can't export arbitrary things.
      expect(errors).toContain(`"foo" is not a valid Page export field.`)

      // Can't export invalid fields.
      expect(errors).toMatch(
        /Invalid configuration "revalidate":\s+Expected "false | number (>= 0)", got "-1"/
      )

      // Avoid invalid argument types for exported functions.
      expect(errors).toMatch(
        /Page "src\/app\/type-checks\/config\/page\.tsx" has an invalid "default" export:\s+Type "{ foo: string; }" is not valid/
      )
      expect(errors).toMatch(
        /Page "src\/app\/type-checks\/config\/page\.tsx" has an invalid "generateMetadata" export:\s+Type "{ s: number; }" is not valid/
      )
      expect(errors).toMatch(
        /Page "src\/app\/type-checks\/config\/page\.tsx" has an invalid "generateStaticParams" export:\s+Type "string" is not valid/
      )

      // Avoid invalid return types for exported functions.
      expect(errors).toContain(
        `"Promise<number>" is not a valid generateStaticParams return type`
      )
    })
  })
})

#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { Project } from 'ts-morph'
import findRoot from 'find-root'
import replicateTailwindClasses from './'

const parse = async () => {
  const pkgRoot = findRoot(process.cwd(), (dir: string) => {
    return fs.existsSync(path.join(dir, 'tsconfig.json'))
  })

  await replicateTailwindClasses(pkgRoot)
}

parse().catch(console.error)

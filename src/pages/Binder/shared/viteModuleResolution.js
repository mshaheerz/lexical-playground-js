/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


import * as fs from 'node:fs';
import {createRequire} from 'node:module';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const {packagesManager} =
  require('../../scripts/shared/packagesManager');

const sourceModuleResolution = () => {
  function toAlias(pkg, entry) {
    return {
      find: entry.name,
      replacement: pkg.resolve('src', entry.sourceFileName),
    };
  }

  return [
    ...packagesManager
      .getPublicPackages()
      .flatMap((pkg) =>
        pkg.getExportedNpmModuleEntries().map(toAlias.bind(null, pkg)),
      ),
    ...['shared']
      .map((name) => packagesManager.getPackageByDirectoryName(name))
      .flatMap((pkg) =>
        pkg.getPrivateModuleEntries().map(toAlias.bind(null, pkg)),
      ),
  ];
};

const distModuleResolution = (environment: 'development' | 'production') => {
  return [
    ...packagesManager.getPublicPackages().flatMap((pkg) =>
      pkg
        .getNormalizedNpmModuleExportEntries()
        .map((entry) => {
          const [name, moduleExports] = entry;
          const replacements = ([environment, 'default']).map(
            (condition) => pkg.resolve('dist', moduleExports.import[condition]),
          );
          const replacement = replacements.find(fs.existsSync.bind(fs));
          if (!replacement) {
            throw new Error(
              `ERROR: Missing ./${path.relative(
                '../..',
                replacements[1],
              )}. Did you run \`npm run build\` in the monorepo first?`,
            );
          }
          return {
            find: name,
            replacement,
          };
        }),
    ),
    ...[packagesManager.getPackageByDirectoryName('shared')].flatMap(
      (pkg) =>
        pkg.getPrivateModuleEntries().map((entry) => {
          return {
            find: entry.name,
            replacement: pkg.resolve('src', entry.sourceFileName),
          };
        }),
    ),
  ];
};

export default function moduleResolution(
  environment: 'source' | 'development' | 'production',
){
  return environment === 'source'
    ? sourceModuleResolution()
    : distModuleResolution(environment);
}

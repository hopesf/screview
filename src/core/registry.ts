import type { ProgramRule, Rule, ScreviewConfig, Severity } from './types';
import type { ProjectProfile } from './detectProject';
import { awaitInLoop } from '../rules/generic/awaitInLoop';
import { emptyCatch } from '../rules/generic/emptyCatch';
import { floatingPromise } from '../rules/generic/floatingPromise';
import { syncFsInHandler } from '../rules/generic/syncFsInHandler';
import { unusedImport } from '../rules/generic/unusedImport';
import { unusedLocal } from '../rules/generic/unusedLocal';
import { leftoverDebugger } from '../rules/generic/debugger';
import { noSwallowedError } from '../rules/express/noSwallowedError';
import { missingAsyncErrorHandling } from '../rules/express/missingAsyncErrorHandling';
import { noResponseMissing } from '../rules/express/noResponseMissing';
import { queryInLoop } from '../rules/mongo/queryInLoop';
import { missingLean } from '../rules/mongo/missingLean';
import { unboundedFind } from '../rules/mongo/unboundedFind';
import { unsubscribedObservable } from '../rules/angular/unsubscribedObservable';
import { missingNgOnDestroy } from '../rules/angular/missingNgOnDestroy';
import { noUncleanedTimer } from '../rules/angular/noUncleanedTimer';
import { noUncleanedSocket } from '../rules/angular/noUncleanedSocket';
import { missingEffectCleanup } from '../rules/react/missingEffectCleanup';
import { noStateUpdateInRender } from '../rules/react/noStateUpdateInRender';
import { noVar } from '../rules/style/noVar';
import { eqeqeq } from '../rules/style/eqeqeq';
import { noRequire } from '../rules/style/noRequire';
import { noExplicitAny } from '../rules/style/noExplicitAny';
import { noTsIgnore } from '../rules/style/noTsIgnore';
import { importType } from '../rules/style/importType';
import { noWrapperTypes } from '../rules/style/noWrapperTypes';
import { genericFunctionName } from '../rules/naming/genericFunctionName';
import { getWithoutReturn } from '../rules/naming/getWithoutReturn';
import { structureRules } from '../structure/analyzeStructure';
import { importCycle } from '../structure/importCycle';
import { duplicateType } from '../structure/duplicateType';
import { orphanFile } from '../structure/orphanFile';
import { unusedField } from '../db/analyzeModels';
import { schemaTypeDrift } from '../db/schemaTypeDrift';

export const allRules: Rule[] = [
  awaitInLoop,
  emptyCatch,
  floatingPromise,
  syncFsInHandler,
  unusedImport,
  unusedLocal,
  leftoverDebugger,
  noSwallowedError,
  missingAsyncErrorHandling,
  noResponseMissing,
  queryInLoop,
  missingLean,
  unboundedFind,
  unsubscribedObservable,
  missingNgOnDestroy,
  noUncleanedTimer,
  noUncleanedSocket,
  missingEffectCleanup,
  noStateUpdateInRender,
  noVar,
  eqeqeq,
  noRequire,
  noExplicitAny,
  noTsIgnore,
  importType,
  noWrapperTypes,
  genericFunctionName,
  getWithoutReturn,
];

export const allProgramRules: ProgramRule[] = [
  ...structureRules,
  importCycle,
  duplicateType,
  orphanFile,
  unusedField,
  schemaTypeDrift,
];

const LANGUAGE_PACKS = new Set(['generic', 'style', 'naming']);
const TS_ONLY = new Set([
  'style/no-explicit-any',
  'style/no-ts-ignore',
  'style/import-type',
  'style/no-wrapper-types',
]);

export function selectRules(config: ScreviewConfig, profile: ProjectProfile): Rule[] {
  const enabledPacks = new Set(LANGUAGE_PACKS);
  for (const framework of profile.frameworks) enabledPacks.add(framework);

  return allRules.flatMap((rule) => {
    const applied = applyLevel(rule, config);
    if (!applied) return [];
    if (!enabledPacks.has(applied.pack)) return [];
    if (profile.language === 'javascript' && TS_ONLY.has(applied.id)) return [];
    return [applied];
  });
}

export function selectProgramRules(config: ScreviewConfig, profile: ProjectProfile): ProgramRule[] {
  return allProgramRules.flatMap((rule) => {
    const applied = applyLevel(rule, config);
    if (!applied) return [];
    if (applied.pack === 'structure') return [applied];
    if (applied.pack === 'db') {
      if (profile.frameworks.includes('db') || profile.frameworks.includes('mongo')) return [applied];
      return [];
    }
    return [];
  });
}

function applyLevel<T extends { id: string; severity: Severity }>(
  rule: T,
  config: ScreviewConfig,
): T | undefined {
  const level = config.rules[rule.id];
  if (level === 'off') return undefined;
  if (level === 'critical' || level === 'warning' || level === 'info') {
    return { ...rule, severity: level };
  }
  return rule;
}

import type { Rule, ScreviewConfig } from './types';
import { awaitInLoop } from '../rules/generic/awaitInLoop';
import { emptyCatch } from '../rules/generic/emptyCatch';
import { floatingPromise } from '../rules/generic/floatingPromise';
import { noSwallowedError } from '../rules/express/noSwallowedError';
import { missingAsyncErrorHandling } from '../rules/express/missingAsyncErrorHandling';
import { noResponseMissing } from '../rules/express/noResponseMissing';
import { queryInLoop } from '../rules/mongo/queryInLoop';
import { unsubscribedObservable } from '../rules/angular/unsubscribedObservable';
import { missingNgOnDestroy } from '../rules/angular/missingNgOnDestroy';
import { noUncleanedTimer } from '../rules/angular/noUncleanedTimer';
import { missingEffectCleanup } from '../rules/react/missingEffectCleanup';
import { noStateUpdateInRender } from '../rules/react/noStateUpdateInRender';
import { noVar } from '../rules/style/noVar';
import { eqeqeq } from '../rules/style/eqeqeq';
import { noRequire } from '../rules/style/noRequire';
import { noExplicitAny } from '../rules/style/noExplicitAny';
import { noTsIgnore } from '../rules/style/noTsIgnore';
import { genericFunctionName } from '../rules/naming/genericFunctionName';
import { getWithoutReturn } from '../rules/naming/getWithoutReturn';

export const allRules: Rule[] = [
  awaitInLoop,
  emptyCatch,
  floatingPromise,
  noSwallowedError,
  missingAsyncErrorHandling,
  noResponseMissing,
  queryInLoop,
  unsubscribedObservable,
  missingNgOnDestroy,
  noUncleanedTimer,
  missingEffectCleanup,
  noStateUpdateInRender,
  noVar,
  eqeqeq,
  noRequire,
  noExplicitAny,
  noTsIgnore,
  genericFunctionName,
  getWithoutReturn,
];

export function selectRules(config: ScreviewConfig): Rule[] {
  return allRules.filter((rule) => config.rules[rule.id] !== 'off');
}

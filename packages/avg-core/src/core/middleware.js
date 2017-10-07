/**
 * @file        middleware
 * @author      Icemic Jia <bingfeng.web@gmail.com>
 * @copyright   2015-2016 Icemic Jia
 * @link        https://www.avgjs.org
 * @license     Apache License 2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Middleware in AVG.js is very important,
 * you can use it to gain control of the entire framework permissions,
 * such as writing components or plug-ins
 *
 * Example, you want plug your own data in saving archives, you should write a middleware like this:
 * ```js
 * async function saveMiddleware(ctx, next) {
 *   ctx.data.myKey = myValue;
 *   await next();
 * }
 *
 * AVG.core.use('save-archive', saveMiddleware);
 * ```
 *
 * or just:
 * ```js
 * AVG.core.use('save-archive', async (ctx, next) => {
 *   ctx.data.myKey = myValue;
 *   await next();
 * });
 * ```
 */

/**
 * @file        Container that provides transition functions
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

import core from 'core/core';
import Logger from 'core/logger';
import { PrepareFilter,
         CrossFadeFilter,
         UniversalFilter,
         ShutterFilter,
         RippleFilter,
       } from './Filters';

const PIXI = require('pixi.js');

const logger = Logger.create('TransitionContainer');

export default class TransitionContainer extends PIXI.Sprite {
  constructor() {
    super();

    this.renderer = null;

    this.filter = null;
    this.prepareFilter = new PrepareFilter();
    this.previousTexture = null;

    // container, prepare, transition
    this.status = 'container';
    this.promiseFinished = null;
  }
  prepare() {
    const renderer = this.renderer || core.getRenderer();
    const texture = PIXI.RenderTexture.create(renderer.width, renderer.height,
                                              PIXI.settings.SCALE_MODE, renderer.resolution);

    if (this.visible) {
      renderer.render(this, texture);
    }

    this.status = 'prepare';
    this.previousTexture = texture;

    this.prepareFilter.setPreviousTexture(texture);
  }
  start(_filter, params) {

    let filter;

    if (typeof _filter === 'string') {
      switch (_filter.toLowerCase()) {
        case 'crossfade':
          filter = new CrossFadeFilter(params.duration);
          break;
        case 'universal': {
          const { rule, vague, duration } = params;

          filter = new UniversalFilter(rule, vague, duration);
          break;
        }
        case 'shutter': {
          const { direction, num, duration } = params;

          filter = new ShutterFilter(direction, num, duration);
          break;
        }
        case 'ripple': {
          const { origin, speed, count, maxDrift, duration } = params;

          filter = new RippleFilter(origin, speed, count, maxDrift, duration);
          break;
        }
        default:
          logger.error(`Unrecognized filter '${_filter}'.`);
      }
    } else {
      filter = _filter;
    }

    filter.reset();
    this.filter = filter;

    filter.setPreviousTexture(this.previousTexture);

    // const renderer = this.renderer;
    // const texture = PIXI.RenderTexture.create(renderer.width, renderer.height,
    //                                           PIXI.settings.SCALE_MODE, renderer.resolution);

    // this.filter.enabled = false;
    // renderer.render(this, texture);
    // this.filter.enabled = true;

    this.status = 'transition';

    return new Promise(resolve => {
      this.promiseFinished = resolve;
    });
  }
  completeImmediate() {
    this.status = 'container';
    this.promiseFinished();
    this.promiseFinished = null;
  }
  renderWebGL(renderer) {
    if (this.renderer !== renderer) {
      this.renderer = renderer;
    }

    if (this.status === 'container') {
      PIXI.Container.prototype.renderWebGL.call(this, renderer);

      return;
    } else if (this.status === 'transition') {
      const performance = window.performance || window.Date;
      const finished = this.filter.update(performance.now());

      if (finished) {
        this.status = 'container';
        this.promiseFinished();
        this.promiseFinished = null;
      }
    }

    let filters;

    if (this.status === 'prepare') {
      filters = [this.prepareFilter];
    } else {
      filters = [this.filter];
    }

    renderer.flush();
    renderer.filterManager.pushFilter(this, filters);
    super.renderWebGL(renderer);
    renderer.flush();
    renderer.filterManager.popFilter();
  }
}

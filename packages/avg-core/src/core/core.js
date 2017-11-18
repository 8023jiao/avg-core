/**
 * @file        core
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

import compose from 'koa-compose';
import FontFaceObserver from 'fontfaceobserver';
import { render as renderReact } from 'react-dom';
import Container from 'classes/Container';
import { attachToSprite } from 'classes/EventManager';
import sayHello from 'utils/sayHello';
import fitWindow from 'utils/fitWindow';
import Logger from './logger';
import { EventEmitter } from 'eventemitter3';

import { init as preloaderInit, getTexture, load as loadResources } from './preloader';
import Ticker from './ticker';
import { define, connect } from './data';

const PIXI = require('pixi.js');
const isMobile = require('ismobilejs');

const logger = Logger.create('Core');

/**
 * Core of AVG.js, you can start your game development from here.
 *
 * @class
 * @memberof AVG
 */
@connect({
  to: 'core'
})
@define({
  model: {
    width: 1280,
    height: 720,
    isAssetsLoading: false,
    assetsLoadingProgress: 0,
    clickEvent: {}
  },
  actions: self => ({
    setScreenSize(width, height) {
      self.width = width;
      self.height = height;
    },
    setAssetsLoading(value) {
      self.isAssetsLoading = value;
    },
    setAssetsLoadingProgress(value) {
      self.assetsLoadingProgress = value;
    },
    setClickEvent(e) {
      self.clickEvent = e;
    }
  })
})
class Core extends EventEmitter {
  constructor() {
    super();

    /**
     * @type {Boolean}
     * @private
     * @readonly
     */
    this._init = false;
    this._tickTime = 0;

    this.renderer = null;
    this.stage = null;
    this.canvas = null;

    this.options = {};

    /**
     * Currently used middleware
     * @member {object<string, function[]>}
     * @default {}
     * @private
     */
    this.middlewares = {};
    this.plugins = {};

    this.assetsPath = null;
  }

  /**
   * install a middleware.
   *
   * @param {string} name signal name
   * @param {function} middleware instance of middleware
   * @see AVG.core.Middleware
   */
  use(name, middleware) {
    let middlewares;

    if (!this.middlewares[name]) {
      middlewares = [];
      this.middlewares[name] = middlewares;
    } else {
      middlewares = this.middlewares[name];
    }
    middlewares.push(middleware);
  }

  /**
   * uninstall a middleware.
   *
   * @param {string} name signal name
   * @param {function} middleware instance of middleware
   * @see AVG.core.Middleware
   */
  unuse(name, middleware) {
    const middlewares = this.middlewares[name];

    if (middlewares) {
      const pos = middlewares.indexOf(middleware);

      if (pos !== -1) {
        middlewares.splice(pos, 1);
      } else {
        logger.warn(`Do not find the given middleware in ${name}.`);
      }
    } else {
      logger.warn(`Do not find the given middleware in ${name}.`);
    }
  }

  /**
   * send a signal to core
   *
   * @param {string} name signal name
   * @param {object} [context={}] context to process
   * @param {function} next
   * @return {promise}
   */
  post(name, context, next) {
    const middlewares = this.middlewares[name];

    if (middlewares) {
      return compose(middlewares)(context || {}, next);
    }

    return Promise.resolve();
  }

  /**
   * install a plugin
   * 
   * @param {any} constructor plugin class
   * 
   * @memberOf Core
   */
  installPlugin(constructor) {
    new constructor(this);
  }

  /**
   *
   * install a plugin
   *
   * @param {any} name 
   * @param {any} constructor 
   * @memberof Core
   */
  install(name, constructor) {
    const instance = new constructor(this);

    this.plugins[name] = instance;
  }

  /**
   * Initial AVG.js core functions
   *
   * @param {number} width width of screen
   * @param {number} height height of screen
   * @param {object} [options]
   * @param {HTMLCanvasElement} [options.view] custom canvas element
   * @param {PIXI.WebGLRenderer} [options.renderer] custom renderer
   * @param {string|array<string>} [options.fontFamily] load custom web-font
   * @param {boolean} [options.fitWindow=false] auto scale canvas to fit window
   * @param {string} [options.assetsPath='assets'] assets path
   * @param {string} [options.tryWebp=false] auto replace image file extension with .webp format when webp is supported by browser
   */
  async init(width, height, options = {}) {
    if (this._init) {
      return;
    }
    const _options = {
      fitWindow: false,
      assetsPath: '/',
      tryWebp: false,
      ...options,
    };

    const core = this.data.core;

    core.setScreenSize(width, height);

    if (_options.fontFamily) {
      const font = new FontFaceObserver(_options.fontFamily);

      await font.load();
    }

    if (_options.renderer) {
      this.renderer = _options.renderer;
    } else {

      /* create PIXI renderer */
      if (isMobile.any) {
        PIXI.settings.RESOLUTION = 1;
        PIXI.settings.TARGET_FPMS = 0.03;
      } else {
        PIXI.settings.RESOLUTION = window.devicePixelRatio || 1;
      }
      this.renderer = new PIXI.WebGLRenderer(width, height, {
        view: _options.view,
        autoResize: true,
        // resolution: 2,
        roundPixels: true,
      });
    }

    this.options = _options;

    if (_options.fitWindow) {
      window.addEventListener('resize', () => {
        fitWindow(this.renderer, window.innerWidth, window.innerHeight);
      });
      fitWindow(this.renderer, window.innerWidth, window.innerHeight);
    }

    let assetsPath = _options.assetsPath;

    if (!assetsPath.endsWith('/')) {
      assetsPath += '/';
    }
    this.assetsPath = assetsPath;
    preloaderInit(assetsPath, _options.tryWebp);

    this.stage = new Container();
    attachToSprite(this.stage);
    // this.stage._ontap = e => this.post('tap', e);
    // this.stage._onclick = e => this.post('click', e);
    this.stage._ontap = e => core.setClickEvent(e);
    this.stage._onclick = e => core.setClickEvent(e);

    this.ticker = new Ticker();
    this.ticker.add(this.tick.bind(this));
    sayHello();
    this._init = true;
  }

  getRenderer() {
    if (this._init) {
      return this.renderer;
    }
    logger.error('Renderer hasn\'t been initialed.');

    return null;
  }
  getStage() {
    if (this._init) {
      return this.stage;
    }
    logger.error('Stage hasn\'t been initialed.');

    return null;
  }
  getAssetsPath() {
    return this.assetsPath;
  }
  getTexture(url) {
    return getTexture(url);
  }

  /**
   * create a logger for specific name
   *
   * @param {string} name
   * @return {Logger} logger instance
   */
  getLogger(name) {
    return Logger.create(name);
  }

  // TODO: move to actions
  async loadAssets(list) {
    const core = this.data.core;
    core.setAssetsLoading(true);
    await loadResources(list, e => core.setAssetsLoadingProgress(e.progress));
    core.setAssetsLoading(false);
  }

  /**
   * render surface to page.
   *
   * @param {React.Component} component
   * @param {HTMLDOMElement} target
   * @param {boolean} append whether append canvas element to target
   * @return {Promise}
   */
  async render(component, target, append = true) {
    if (!this._init) {
      throw Error('not initialed');
    }

    return new Promise(resolve => {
      renderReact(component, target, resolve);
    }).then(() => {
      append && target.appendChild(this.renderer.view);
    });
  }

  /**
   * Get ticker of AVG.js render loop
   *
   * @return {PIXI.ticker.Ticker} shared ticker
   */
  getTicker() {
    return this.ticker;
  }

  /**
   * @private
   */
  tick(deltaTime) {
    this._tickTime += deltaTime;
    if (this._init && this._tickTime > 0.98) {
      this.renderer.render(this.stage);
      this._tickTime = 0;
      window.stats && window.stats.update();
    }
  }

  /**
   * start rendering, this must be called if you want to start your game.
   */
  start() {
    this.ticker.start();
  }

  /**
   * stop rendering
   */
  stop() {
    this.ticker.stop();
  }
}

/**
 * @export
 * @type {Core}
 */
const core = new Core();
// Object.freeze(core);

export default core;

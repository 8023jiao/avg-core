/**
 * @file        Container component
 * @author      Icemic Jia <bingfeng.web@gmail.com>
 * @copyright   2015-2017 Icemic Jia
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

import { tools, PropTypes } from 'avg-core';
import PixiContainer from 'class/container';

const propTypes = {

};

const Container = tools.componentify('Container', {
  createNode() {
    this.node = new PixiContainer();
  },
  mountNode(props) {
    const node = this.node;

    tools.mountNode(node, props);

    return node;
  },
  updateNode(prevProps, props) {
    const node = this.node;

    tools.updateNode(node, prevProps, props);
  }
}, propTypes);

export default Container;

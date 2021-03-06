/*
 * Kuzzle, a backend software, self-hostable and ready to use
 * to power modern apps
 *
 * Copyright 2015-2017 Kuzzle
 * mailto: support AT kuzzle.io
 * website: http://kuzzle.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Stores a "not equals" condition in the
 * field-operand pairs storage
 *
 * This allows V8 to convert this object to a pure
 * C++ class, with direct access to its members,
 * instead of a dictionary with b-search access time
 *
 * @class NotEqualsCondition
 * @param {string} value
 * @param {object} subfilter
 */
class NotEqualsCondition {
  constructor(value, subfilter) {
    this.value = value;
    this.subfilters = [subfilter];
  }
}

/**
 * @type {NotEqualsCondition}
 */
module.exports = NotEqualsCondition;

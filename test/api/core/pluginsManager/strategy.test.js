'use strict';

const
  should = require('should'),
  rewire = require('rewire'),
  sinon = require('sinon'),
  KuzzleMock = require('../../../mocks/kuzzle.mock'),
  PluginsManager = rewire('../../../../lib/api/core/plugins/pluginsManager'),
  PluginImplementationError = require('kuzzle-common-objects').errors.PluginImplementationError;

describe('PluginsManager: strategy management', () => {
  let
    kuzzle,
    pluginsManager,
    plugin,
    pluginManagerStrategy,
    sandbox = sinon.sandbox.create(),
    foo = {foo: 'bar'};

  beforeEach(() => {
    kuzzle = new KuzzleMock();
    /** @type {PluginsManager} */
    pluginsManager = new PluginsManager(kuzzle);

    plugin = {
      strategies: {
        someStrategy: {
          config: {
            constructor: sandbox.stub(),
            strategyOptions: {
              someStrategy: 'options'
            },
            authenticateOptions: {
              someAuthenticate: 'options'
            },
            fields: ['aField', 'anotherField']
          },
          methods: {
            afterRegister: 'afterRegisterFunction',
            create: 'createFunction',
            delete: 'deleteFunction',
            exists: 'existsFunction',
            getById: 'getByIdFunction',
            getInfo: 'getInfoFunction',
            update: 'updateFunction',
            validate: 'validateFunction',
            verify: 'verifyFunction'
          }
        }
      },
      afterRegisterFunction: sandbox.stub(),
      createFunction: sandbox.stub(),
      existsFunction: sandbox.stub(),
      deleteFunction: sandbox.stub(),
      getByIdFunction: sandbox.stub(),
      getInfoFunction: sandbox.stub(),
      updateFunction: sandbox.stub(),
      validateFunction: sandbox.stub(),
      verifyFunction: sandbox.stub()
    };

    pluginManagerStrategy = {
      strategy: plugin.strategies.someStrategy,
      methods: {
        exists: plugin.existsFunction,
        create: plugin.createFunction,
        update: plugin.updateFunction,
        delete: plugin.deleteFunction,
        getById: plugin.getByIdFunction,
        getInfo: plugin.getInfoFunction,
        validate: plugin.validateFunction,
        afterRegister: plugin.afterRegisterFunction
      }
    };

    pluginsManager.authentications.someStrategy = pluginManagerStrategy;

    sandbox.reset();
  });

  describe('#getStrategyFields', () => {
    it('should return fields from configuration', () => {
      should(pluginsManager.getStrategyFields('someStrategy')).be.deepEqual(['aField', 'anotherField']);
    });
  });

  describe('#hasStrategyMethod', () => {
    it('should return true if a method exists', () => {
      should(pluginsManager.hasStrategyMethod('someStrategy', 'exists')).be.true();
    });

    it('should false true if a method does not exist', () => {
      should(pluginsManager.hasStrategyMethod('someStrategy', 'notExists')).be.false();
    });
  });

  describe('#getStrategyMethod', () => {
    it('should return a method', () => {
      should(pluginsManager.getStrategyMethod('someStrategy', 'exists')).be.a.Function();
    });
  });

  describe('#injectAuthentication', () => {
    let
      authentications,
      injectAuthentication,
      consoleMock;
    const
      pluginName = 'some-plugin-name',
      errorPrefix = `[Plugin Manager] Error initializing plugin ${pluginName}:`,
      strategyName = 'someStrategy';

    beforeEach(() => {
      consoleMock = {
        log: sandbox.stub(),
        error: sandbox.stub()
      };
      authentications = {};
      injectAuthentication = PluginsManager.__get__('injectAuthentication');
      PluginsManager.__set__('console', consoleMock);
    });

    it('should add the strategy in authentications if the strategy is well defined', done => {
      let verifyAdapter;

      plugin.existsFunction = sandbox.stub().returns(foo);
      plugin.verifyFunction = sandbox.stub().returns(Promise.resolve({
        kuid: 'foo'
      }));

      injectAuthentication(kuzzle, authentications, plugin, pluginName);
      should(authentications.someStrategy.strategy).be.deepEqual(plugin.strategies.someStrategy);
      should(authentications.someStrategy.methods.afterRegister).be.Function();
      should(plugin.afterRegisterFunction).be.calledOnce();
      should(plugin.afterRegisterFunction.firstCall.args[0]).be.instanceOf(plugin.strategies.someStrategy.config.constructor);
      should(authentications.someStrategy.methods.exists).be.Function();
      should(authentications.someStrategy.methods.create).be.Function();
      should(authentications.someStrategy.methods.update).be.Function();
      should(authentications.someStrategy.methods.delete).be.Function();
      should(authentications.someStrategy.methods.getById).be.Function();
      should(authentications.someStrategy.methods.getInfo).be.Function();
      should(authentications.someStrategy.methods.validate).be.Function();
      should(plugin.strategies.someStrategy.config.constructor).be.calledOnce();
      should(plugin.strategies.someStrategy.config.constructor).be.calledWithNew();

      verifyAdapter = plugin.strategies.someStrategy.config.constructor.firstCall.args[1];

      authentications.someStrategy.methods.exists(foo)
        .then(result => {
          should(result).be.deepEqual(foo);
          should(plugin.existsFunction).be.calledOnce();
          verifyAdapter({}, (error) => {
            if (error) {
              done(error);
            }
            else {
              done();
            }
          });
        });
    });

    it('method invocation should intercept a thrown error to transform it into PluginImplementationError', () => {
      plugin.existsFunction = sandbox.stub().throws(new Error('some error'));

      injectAuthentication(kuzzle, authentications, plugin, pluginName);
      should(authentications.someStrategy.strategy).be.deepEqual(plugin.strategies.someStrategy);
      should(authentications.someStrategy.methods.exists).be.Function();
      should(authentications.someStrategy.methods.create).be.Function();
      should(authentications.someStrategy.methods.update).be.Function();
      should(authentications.someStrategy.methods.delete).be.Function();
      should(authentications.someStrategy.methods.getInfo).be.Function();
      should(authentications.someStrategy.methods.validate).be.Function();

      return should(authentications.someStrategy.methods.exists(foo)).be.rejectedWith(PluginImplementationError);
    });

    it('should print an error in the console if strategies is not an object', () => {
      plugin.strategies = {};

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin must provide an object "strategies".`);
    });

    it('should print an error in the console if the strategy is not an object', () => {
      plugin.strategies.someStrategy = 'notAnObject';
      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin must provide an object for strategy "${strategyName}".`);
    });

    it('should print an error in the console if methods are not specified', () => {
      plugin.strategies.someStrategy.methods = 'notAnObject';

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin must provide a "methods" object in strategies['${strategyName}'] property.`);
    });

    it('should print an error in the console if config are not specified', () => {
      plugin.strategies.someStrategy.config = 'notAnObject';

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin must provide a "config" object in strategies['${strategyName}'] property.`);
    });

    it('should print an error in the console if a mandatory method is not specified', () => {
      delete plugin.strategies.someStrategy.methods.exists;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin must provide a method "exists" in strategy configuration.`);
    });

    it('should print an error in the console if a mandatory method is not available in the plugin object', () => {
      delete plugin.existsFunction;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin property "existsFunction" must be a function.`);
    });

    it('should print an error in the console if the getInfo method is specified but the method is not available in the plugin object', () => {
      delete plugin.getInfoFunction;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin property "getInfoFunction" must be a function.`);
    });

    it('should print an error in the console if the strategy constructor is not provided', () => {
      plugin.strategies.someStrategy.config.constructor = 'notAFunction';

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The constructor of the strategy "${strategyName}" must be a function.`);
    });

    it('should print an error in the console if the "strategyOptions" config is not provided', () => {
      delete plugin.strategies.someStrategy.config.strategyOptions;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The "strategyOptions" of the strategy "${strategyName}" must be an object.`);
    });

    it('should print an error in the console if the "authenticateOptions" config is not provided', () => {
      delete plugin.strategies.someStrategy.config.authenticateOptions;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The "authenticateOptions" of the strategy "${strategyName}" must be an object.`);
    });

    it('should print an error in the console if the "fields" config is not provided', () => {
      delete plugin.strategies.someStrategy.config.fields;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The "fields" of the strategy "${strategyName}" must be an array.`);
    });

    it('should print an error in the console if the "verify" config is not provided', () => {
      delete plugin.strategies.someStrategy.methods.verify;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin must provide a method "verify" in strategy configuration.`);
    });

    it('should print an error in the console if the "verify" method is not available in the plugin object', () => {
      delete plugin.verifyFunction;

      injectAuthentication(kuzzle, authentications, plugin, pluginName);

      should(consoleMock.error).be.calledOnce();
      should(consoleMock.error.firstCall.args[0]).be.eql(`${errorPrefix} The plugin property "verifyFunction" must be a function.`);
    });

    it('should throw an error if a strategy is registered twice', () => {
      should(() => {
        injectAuthentication(kuzzle, authentications, plugin, pluginName);
        injectAuthentication(kuzzle, authentications, plugin, pluginName);
      }).throw(PluginImplementationError);
    });
  });
});

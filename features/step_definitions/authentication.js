var apiSteps = function () {
  this.When(/^I( can't)? log in as (.*?):(.*?) expiring in (.*?)$/, function (cantLogin, login, password, expiration, callback) {
    this.api.login('local', {username: this.idPrefix + login, password: password, expiresIn: expiration})
      .then(body => {
        if (body.error) {
          callback(new Error(body.error.message));
          return false;
        }

        if (!body.result) {
          callback(new Error('No result provided'));
          return false;
        }

        if (!body.result.jwt) {
          callback(new Error('No token received'));
          return false;
        }

        if (this.currentUser === null || this.currentUser === undefined) {
          this.currentUser = {};
        }

        this.currentToken = {jwt: body.result.jwt};
        this.currentUser.token = body.result.jwt;

        if (cantLogin) {
          callback('Should not be able to login');
        }
        else {
          callback();
        }
      })
      .catch(function (error) {
        if (cantLogin && error.statusCode === 401) {
          callback();
        }
        else {
          callback(error.message);
        }
      });
  });

  this.Then(/^I log ?out$/, function (callback) {
    if (!this.currentUser || !this.currentUser.token) {
      callback(new Error('Cannot retrieve jwt token'));
      return false;
    }

    this.api.logout(this.currentUser.token)
      .then(body => {
        delete this.currentUser;
        if (body.error) {
          return callback(new Error(body.error.message));
        }
        callback();
      })
      .catch(error => {
        delete this.currentUser;
        callback(error);
      });
  });

  this.Then(/^I check the JWT Token$/, function (callback) {
    if (!this.currentToken || !this.currentToken.jwt) {
      return callback(new Error('Cannot retrieve the JWT token'));
    }

    this.api.checkToken(this.currentToken.jwt)
      .then(body => {
        if (body.error) {
          return callback(new Error(body.error.message));
        }

        this.currentToken.tokenValidity = body.result;
        callback();
      })
      .catch(err => callback(err));
  });

  this.Then(/^The token is (.*?)$/, function (state, callback) {
    if (!this.currentToken || !this.currentToken.tokenValidity) {
      return callback(new Error('Cannot check the JWT token validity'));
    }

    if (this.currentToken.tokenValidity.valid === (state === 'valid')) {
      return callback();
    }

    callback(new Error('Expected token to be ' + state + ', got: ' + JSON.stringify(this.currentToken.tokenValidity)));
  });
  
  this.Then(/^I update current user with data \{(.*?)}$/, function (dataBody, callback) {
    this.api.updateSelf(JSON.parse('{' + dataBody + '}'))
      .then(body => {
        if (body.error) {
          return callback(new Error(body.error.message));
        }
        callback();
      })
      .catch(err => callback(err));
  });

  this.Then(/^I get the registrated authentication strategies$/, function (callback) {
    this.api.getAuthenticationStrategies()
      .then(response => {
        if (response.error) {
          return callback(new Error(response.error.message));
        }

        if (!response.result) {
          return callback(new Error('No result provided'));
        }

        if (!response.result || !Array.isArray(response.result)) {
          return callback(new Error('Invalid response format'));
        }

        if (response.result.indexOf('local') === -1) {
          return callback(new Error('The default \'local\' authentication strategy wasn\'t found in the list of registrated strategies'));
        }

        this.result = response.result;
        callback();
      })
      .catch(error => callback(error));
  });
};

module.exports = apiSteps;

const
  should = require('should'),
  KuzzleMock = require('../../../mocks/kuzzle.mock'),
  HotelClerck = require('../../../../lib/api/core/hotelClerk');

describe('Test: hotelClerk.getRealtimeCollections', () => {
  let
    kuzzle,
    hotelClerk;

  beforeEach(() => {
    kuzzle = new KuzzleMock();
    kuzzle.dsl.storage = {
      filtersIndex: {}
    };

    hotelClerk = new HotelClerck(kuzzle);
  });

  it('should return an empty array if there is no subscription', () => {
    should(hotelClerk.getRealtimeCollections('index'))
      .be.an.Array()
      .and.be.empty();
  });

  it('should return an array of unique collection names', () => {
    kuzzle.dsl.storage.filtersIndex = {
      index: {
        foo: true,
        bar: true,
      },
      anotherIndex: {
        baz: true
      }
    };

    const collections = hotelClerk.getRealtimeCollections('index');
    should(collections)
      .match(['foo', 'bar']);
  });
});

const assert = require('assert');
const del = require('del');
const dbprovider = require('../lib/storage/dbprovider_level');


describe('initialized', function () {
    before(function () {
    });
    it('not initialized', function () {
        assert.rejects(dbprovider.put('a', 'a'));
        assert.rejects(dbprovider.get('a'));
        assert.rejects(dbprovider.del('a'));
    });

});

describe('get/put', function () {
    before(function () {
        dbprovider.init('testdb');
    });

    after(function () {
        del('testdb');
    });


    it('empty key', function () {
        assert.rejects(dbprovider.put('', ''));
    });


    it('null key', function () {
        assert.rejects(dbprovider.put(null, ''));
    });


    it('String data', async function () {
        await dbprovider.put('user', 'data');
        const result = await dbprovider.get('user');
        assert.equal('data', result.d);
    });


    it('object data', async function () {
        const data = {a: 'a', b: 'b'};
        const str = JSON.stringify(data);
        await dbprovider.put('user', str);
        const result = await dbprovider.get('user');
        assert.deepEqual(data, JSON.parse(result.d));
    });

    it('Buffer data', async function () {
        const data = Buffer.from('0xabcdef');
        await dbprovider.put('user', data);
        const result = await dbprovider.get('user');
        assert.deepEqual(data, result.d);
    });
});







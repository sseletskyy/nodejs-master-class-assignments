const test = require('ava')
const request = require('supertest')
// require('../..')

const PHONE = '5555555555'
const PASSWORD = 'secret'

const HTTP_URL = 'http://localhost:3000'

test('Checks.post', async (t) => {
  // Users.post
  const resUsersPost = await request(HTTP_URL)
    .post('/users')
    .send({
      firstName: 'some',
      lastName: 'name',
      phone: PHONE,
      password: PASSWORD,
      tosAgreement: true,
    })
  t.is(resUsersPost.status, 200, resUsersPost.body.Error)

  // Token post
  const resToken = await request(HTTP_URL)
    .post('/tokens')
    .send({
      phone: PHONE,
      password: PASSWORD,
    })

  const token = resToken.body.id

  // Checks.post - error
  const resCheckWrong = await request(HTTP_URL)
    .post('/checks')
    .send({
      protocol: 'http',
      method: 'get',
      url: 'google.com',
      successCodes: [200],
      timeoutSeconds: 3,
    })
  t.is(resCheckWrong.status, 400)
  t.is(resCheckWrong.body.Error, 'Missing token in headers')

  // Checks.post
  const resCheck = await request(HTTP_URL)
    .post('/checks')
    .send({
      protocol: 'http',
      method: 'get',
      url: 'google.com',
      successCodes: [200],
      timeoutSeconds: 3,
    })
    .set({ token })
  const { body: checkBody } = resCheck
  console.log('check body', checkBody)
  t.is(resCheck.status, 200)

  // Users.get - and verify that the user has a new check
  const resUserGet = await request(HTTP_URL)
    .get(`/users?phone=${PHONE}`)
    .set({ token })
  // console.log('users get', resUserGet.body)

  t.is(resUserGet.status, 200)
  const userChecks = resUserGet.body.checks
  t.true(Array.isArray(userChecks), 'user.checks should be an array')
  t.is(userChecks[0], checkBody.id)

  // Checks.get - wrong, no token provided
  const resCheckGetWrong = await request(HTTP_URL).get(`/checks?id=${checkBody.id}`)
  t.is(resCheckGetWrong.status, 404)

  // Checks.get - wrong - incorrect checkId
  const wrongCheckId = '22222222221111111111'
  const resCheckGetWrong2 = await request(HTTP_URL)
    .get(`/checks?id=${wrongCheckId}`)
    .set({ token })
  t.is(resCheckGetWrong2.status, 404, resCheckGetWrong2.body.Error)

  // Checks.get - wrong - incorrect token
  const wrongToken = '22222222221111111111'
  const resCheckGetWrong3 = await request(HTTP_URL)
    .get(`/checks?id=${checkBody.id}`)
    .set({ token: wrongToken })
  t.is(resCheckGetWrong3.status, 403, resCheckGetWrong3.body.Error)

  // Checks.get - correct
  const resCheckGet = await request(HTTP_URL)
    .get(`/checks?id=${checkBody.id}`)
    .set({ token })
  t.is(resCheckGet.status, 200, resCheckGet.body.Error)
  t.deepEqual(resCheckGet.body, checkBody)

  // Checks.put - error - not optional fields
  const checkPutWrongObj = {
    id: checkBody.id,
  }
  const resCheckPutWrong = await request(HTTP_URL)
    .put('/checks')
    .set({ token })
    .send(checkPutWrongObj)

  t.is(resCheckPutWrong.status, 400, resCheckPutWrong.body.Error)
  t.is(resCheckPutWrong.body.Error, 'Missing fields to update')

  // Checks.put - error - incorrect token
  const checkPutWrongObj2 = {
    id: checkBody.id,
    method: 'delete',
  }
  const resCheckPutWrong2 = await request(HTTP_URL)
    .put('/checks')
    .set({ token: wrongToken })
    .send(checkPutWrongObj2)

  t.is(resCheckPutWrong2.status, 403, resCheckPutWrong2.body.Error)
  t.is(resCheckPutWrong2.body.Error, 'User is not authorized according to token in headers')

  // Checks.put - correct
  const checkPutObj = {
    id: checkBody.id,
    method: 'delete',
    protocol: 'https',
  }
  const resCheckPut = await request(HTTP_URL)
    .put('/checks')
    .set({ token })
    .send(checkPutObj)

  t.is(resCheckPut.status, 200, resCheckPut.body.Error)
  t.deepEqual(resCheckPut.body, Object.assign({}, checkBody, checkPutObj))

  // Checks.delete
  const resCheckDelete = await request(HTTP_URL)
    .delete(`/checks?id=${checkBody.id}`)
    .set({ token })

  t.is(resCheckDelete.status, 200, resCheckDelete.body.Error)

  //   Users.delete
  const resUsersDelete = await request(HTTP_URL)
    .delete(`/users?phone=${PHONE}`)
    .set({
      token,
    })

  // console.log('users delete', resUsersDelete.body)
  t.is(resUsersDelete.status, 200)
})

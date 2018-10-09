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

  // Checks.get - correct
  const resCheckGet = await request(HTTP_URL)
    .get(`/checks?id=${checkBody.id}`)
    .set({ token })
  t.is(resCheckGet.status, 200, resCheckGet.body.Error)
  t.deepEqual(resCheckGet.body, checkBody)

  //   Users.delete
  const resUsersDelete = await request(HTTP_URL)
    .delete(`/users?phone=${PHONE}`)
    .set({
      token,
    })

  // console.log('users delete', resUsersDelete.body)
  t.is(resUsersDelete.status, 200)
})

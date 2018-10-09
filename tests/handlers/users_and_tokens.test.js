const test = require('ava')
const request = require('supertest')
// require('../..')

const FIRST_NAME = 'Manny'
const LAST_NAME = 'Penny'
const PHONE = '1111222233'
const PASSWORD = 'secret'
const UPDATED_FIRST_NAME = 'Manny2'
const UPDATED_LAST_NAME = 'Penny2'
const UPDATED_PASSWORD = 'secret2'
const HTTP_URL = 'http://localhost:3000'

test('Users.post -> Users.get(error) -> Tokens.post -> Users.get -> Tokens.get -> Tokens.put -> Users.put -> Users.delete -> Tokens.delete', async (t) => {
  // Users.post
  const resUsersPost = await request(HTTP_URL)
    .post('/users')
    .send({
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
      phone: PHONE,
      password: PASSWORD,
      tosAgreement: true,
    })
  t.is(resUsersPost.status, 200)

  // Users.get (error)
  const resUsersGetWrong = await request(HTTP_URL).get(`/users?phone=${PHONE}`)
  // console.log('users get error', resUsersGetWrong.body)
  t.is(resUsersGetWrong.status, 400)
  t.is(resUsersGetWrong.body.Error, 'Token is missing in headers')

  // Tokens.post
  const resToken = await request(HTTP_URL)
    .post('/tokens')
    .send({
      phone: PHONE,
      password: PASSWORD,
    })

  const token = resToken.body.id

  // Users.get
  const resUserGet = await request(HTTP_URL)
    .get(`/users?phone=${PHONE}`)
    .set({
      token,
    })
  // console.log('users get', resUserGet.body)

  t.is(resUserGet.status, 200)
  t.is(resUserGet.body.firstName, FIRST_NAME)
  t.is(resUserGet.body.lastName, LAST_NAME)
  t.is(resUserGet.body.phone, PHONE)
  t.is(resUserGet.body.tosAgreement, true)

  // Tokens.get
  const resTokensGet = await request(HTTP_URL).get(`/tokens?id=${token}`)
  // console.log('tokens get', resTokensGet.body)

  t.is(resTokensGet.status, 200)
  t.is(resTokensGet.body.phone, PHONE)
  t.is(resTokensGet.body.id, token)
  t.truthy(resTokensGet.body.expires)
  const tokenExpires = resTokensGet.body.expires

  // Tokens.put - error
  const resTokensPutWrong = await request(HTTP_URL)
    .put('/tokens')
    .send({
      id: token,
    })
  // console.log('tokens put error', resTokensPutWrong.body)

  t.is(resTokensPutWrong.status, 400)
  t.deepEqual(resTokensPutWrong.body.Error, ['extend: should be boolean type and true'])

  // Tokens.put - correct
  const resTokensPut = await request(HTTP_URL)
    .put('/tokens')
    .send({
      id: token,
      extend: true,
    })

  // console.log('tokens put', resTokensPut.body)
  t.is(resTokensPut.status, 200)
  t.is(resTokensPut.body.id, token)
  t.is(resTokensPut.body.phone, PHONE)
  t.true(resTokensPut.body.expires > tokenExpires)

  // Users.put - wrong
  const resUsersPutWrong = await request(HTTP_URL)
    .put('/users')
    .send({
      firstName: UPDATED_FIRST_NAME,
      lastName: UPDATED_LAST_NAME,
      phone: PHONE,
      password: UPDATED_PASSWORD,
    })

  t.is(resUsersPutWrong.status, 400)
  t.is(resUsersPutWrong.body.Error, 'Token is missing in headers')

  // Users.put - correct
  const resUsersPut = await request(HTTP_URL)
    .put('/users')
    .send({
      firstName: UPDATED_FIRST_NAME,
      lastName: UPDATED_LAST_NAME,
      phone: PHONE,
      password: UPDATED_PASSWORD,
    })
    .set({
      token,
    })

  // console.log('users put', resUsersPut.body)
  t.is(resUsersPut.status, 200)
  t.is(resUsersPut.body.firstName, UPDATED_FIRST_NAME)
  t.is(resUsersPut.body.lastName, UPDATED_LAST_NAME)
  t.is(resUsersPut.body.phone, PHONE)
  const { body: resUsersPutBody } = resUsersPut
  t.falsy(resUsersPutBody.password)

  // Users.delete - error, no token provided
  const resUsersDeleteWrong = await request(HTTP_URL).delete(`/users?phone=${PHONE}`)

  // console.log('users delete error', resUsersDeleteWrong.body)
  t.is(resUsersDeleteWrong.status, 400)

  // Users.delete
  const resUsersDelete = await request(HTTP_URL)
    .delete(`/users?phone=${PHONE}`)
    .set({
      token,
    })

  // console.log('users delete', resUsersDelete.body)
  t.is(resUsersDelete.status, 200)

  // Tokens.delete
  const resTokensDelete = await request(HTTP_URL).delete(`/tokens?id=${token}`)

  // console.log('tokens delete', resUsersDelete.body)
  t.is(resTokensDelete.status, 200)
})

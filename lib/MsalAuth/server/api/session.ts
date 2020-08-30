// Return a session object (without any private fields) for Single Page App clients
import cookie from '../lib/cookie'

export default async (req, res, options, done) => {
  const { cookies, jwt, callbacks } = options
  const sessionMaxAge = options.session.maxAge
  const sessionToken = req.cookies[cookies.sessionToken.name]

  if (!sessionToken) {
    res.setHeader('Content-Type', 'application/json')
    res.json({})
    return done()
  }

  let response = {}

  try {
    // Decrypt and verify token
    const decodedJwt = await jwt.decode({ ...jwt, token: sessionToken })

    // Generate new session expiry date
    const sessionExpiresDate = new Date()
    sessionExpiresDate.setTime(
      sessionExpiresDate.getTime() + sessionMaxAge * 1000
    )
    const sessionExpires = sessionExpiresDate.toISOString()

    // By default, only exposes a limited subset of information to the client
    // as needed for presentation purposes (e.g. "you are logged in as…").
    const defaultSessionPayload = {
      user: {
        name: decodedJwt.name || null,
        email: decodedJwt.email || null,
        image: decodedJwt.picture || null,
      },
      expires: sessionExpires,
    }

    // Pass Session and JSON Web Token through to the session callback
    const jwtPayload = await callbacks.jwt(decodedJwt)
    const sessionPayload = await callbacks.session(
      defaultSessionPayload,
      jwtPayload
    )

    // Return session payload as response
    response = sessionPayload

    // Refresh JWT expiry by re-signing it, with an updated expiry date
    const newEncodedJwt = await jwt.encode({ ...jwt, token: jwtPayload })

    // Set cookie, to also update expiry date on cookie
    cookie.set(res, cookies.sessionToken.name, newEncodedJwt, {
      expires: sessionExpires,
      ...cookies.sessionToken.options,
    })
  } catch (error) {
    // If JWT not verifiable, make sure the cookie for it is removed and return empty object
    console.error('JWT_SESSION_ERROR', error)
    cookie.set(res, cookies.sessionToken.name, '', {
      ...cookies.sessionToken.options,
      maxAge: 0,
    })
  }

  res.setHeader('Content-Type', 'application/json')
  res.json(response)
  return done()
}

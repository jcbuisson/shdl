
// reverse commented lines to alternate between npm and debug versions of ExpressX

import { expressX as expressX_, isAuthenticated as isAuthenticated_, isNotExpired as isNotExpired_, extendExpiration as extendExpiration_, protect as protect_, EXError as EXError_ } from '@jcbuisson/express-x'
// import { expressX as expressX_, isAuthenticated as isAuthenticated_, isNotExpired as isNotExpired_, extendExpiration as extendExpiration_, protect as protect_, EXError as EXError_ } from '#root/src/server.mjs'


export const expressX = expressX_
export const isAuthenticated = isAuthenticated_
export const isNotExpired = isNotExpired_
export const extendExpiration = extendExpiration_
export const protect = protect_
export const EXError = EXError_

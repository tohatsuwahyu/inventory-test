export async function onRequest({ request, env, next }) {
  if (!env.BASIC_USER || !env.BASIC_PASS) {
    return new Response('Server misconfigured — auth env vars missing', { status: 500 });
  }
  const auth = request.headers.get('authorization') || '';
  const expected = 'Basic ' + btoa(`${env.BASIC_USER}:${env.BASIC_PASS}`);
  if (auth === expected) return next();
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
  });
}

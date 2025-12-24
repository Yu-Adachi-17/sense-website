const pickFirstTag = (s) => (s || '').split(',')[0].trim();
const toShort = (tag) => (tag || '').split('-')[0].toLowerCase();

function resolveLocale(req, bodyLocale) {
  const hxu = req.headers['x-user-locale'];
  const hal = req.headers['accept-language'];
  const bcp47 = bodyLocale || hxu || pickFirstTag(hal) || 'en';
  const short = toShort(bcp47);
  if (process.env.LOG_LOCALE === '1') {
    console.log(
      `[LOCALE] body=${bodyLocale || ''} x-user-locale=${hxu || ''} accept-language=${hal || ''} -> resolved=${short}`
    );
  }
  return short;
}

module.exports = { resolveLocale, pickFirstTag, toShort };

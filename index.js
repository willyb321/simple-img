require('dotenv').config()



/**
 * Module dependencies.
 */

const logger = require('koa-logger');
const router = require('koa-router')();
const serve = require('koa-static');
const koaBody = require('koa-body');
const Koa = require('koa');
const fs = require('fs-extra');
const app = new Koa();
const path = require('path');
const { DateTime } = require('luxon');

// log requests

app.use(logger());


async function responseTime(ctx, next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
}

app.use(responseTime);

// route definitions

router
  .get('/', async ctx => {
    ctx.type = 'html';
    ctx.body = fs.createReadStream('public/upload.html');
  })
  .post('/upload', koaBody({
    multipart: true, formidable: {
      keepExtensions: true,
      multiples: false,
      hash: 'md5'
    }
  }), async (ctx) => {
    const file = ctx.request.files.file;

    const date = DateTime.local();
    console.log(file);
    const reader = fs.createReadStream(file.path);

    const dirPath = path.join(
      __dirname,
      'public',
      'img',
      date.year.toString(),
      date.toFormat('MM').toString(),
      date.toFormat('dd').toString()
    )
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      console.error(error);
      return;
    }
    const filePath = path.join(dirPath, `${file.hash}.${file.name.split('.').pop()}`)
    const stream = fs.createWriteStream(filePath);
    reader.pipe(stream);
    const urlPath = `/img/${date.year}/${date.toFormat('MM')}/${date.toFormat('dd')}/${file.hash}.${file.name.split('.').pop()}`;
    console.log('uploading %s -> %s', file.name, urlPath);

    ctx.type = 'application/json';

    ctx.body = {
      url: `${ctx.origin}${urlPath}`,
    }
  });

app.use(router.routes());

// custom 404

app.use(async function (ctx, next) {
  await next();
  if (ctx.body || !ctx.idempotent) return;
  ctx.redirect('/404.html');
});

// serve files from ./public

app.use(serve(path.join(__dirname, '/public')));


// listen
app.listen(process.env.PORT || 3000);
console.log('listening on port 3000');
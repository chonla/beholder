const path = require('path');
const APP_ROOT = path.dirname(require.main.filename);
process.chdir(APP_ROOT);

const dotenv = require('dotenv');
dotenv.config();

const fetch = require('node-fetch');
const fs = require('fs');
const template = require('es6-template-strings');

const package = require('./json/file')('package.json');

const APP_NAME = package.name;
const APP_VERSION = package.version;
const REPOSITORY = process.env.REPOSITORY.trim();
const INTERVAL = parseInt(process.env.INTERVAL, 10);
const CHECKING_INTERVAL = INTERVAL * 60 * 1000;
const HOOKS_DIR = './hooks/';
const SINGLE_RUN = (process.env.SINGLE_RUN && (process.env.SINGLE_RUN.trim() === 'true'));
const IGNORE_LAST_UPDATE = (process.env.IGNORE_LAST_UPDATE && (process.env.IGNORE_LAST_UPDATE.trim() === 'true'));

const logger = require('./logger/logger')({
    namespace: `${APP_NAME}:${REPOSITORY}`,
    boldVariable: false,
    timestamp: true
});

let hooks = [];

try {
    hooks = fs.readdirSync(HOOKS_DIR);
} catch (e) {}

hooks = hooks.map(f => {
    const jsonFile = `${HOOKS_DIR}${f}`;
    const data = fs.readFileSync(jsonFile).toString().trim();
    const json = JSON.parse(data);
    return json;
}).filter(h => h.enabled);

logger.info(`${logger.variable(APP_NAME)} version ${logger.variable(APP_VERSION)}`);
logger.info(`app root: ${logger.variable(APP_ROOT)}`)
logger.info(`repository: ${logger.variable(REPOSITORY)}`);
logger.info(`ignored tags: ${logger.variable(process.env.IGNORED_TAGS.split(',').map(t => t.trim()).join(','))}`);
logger.info(`checking interval: ${logger.variable(INTERVAL)} min(s)`);
logger.info(`total hooks: ${logger.variable(hooks.length)}`);
logger.info(`single run: ${SINGLE_RUN}`);
logger.info(`ignore last update: ${IGNORE_LAST_UPDATE}`);

for (var h in hooks) {
    logger.info(`hooks #${logger.variable(1 + parseInt(h, 10))}: ${logger.variable(hooks[h].name)}`);
}

const baseUrl = `https://hub.docker.com/v2/repositories/${REPOSITORY}/tags/?page_size=${process.env.POLL_SIZE}&ordering=last_updated`;
const ignoredTags = process.env.IGNORED_TAGS.split(',');
let lastUpdated = new Date('2000-01-18T19:20:00.000000Z');

if (!IGNORE_LAST_UPDATE) {
    try {
        const data = fs.readFileSync('./LAST_UPDATE').toString().trim();
        if (data != '') {
            lastUpdated = new Date(data);
            logger.info(`first time: ${logger.variable('FALSE')}`);
            logger.info(`latest release: ${logger.variable(data)}`);
        } else {
            logger.info(`first time: ${logger.variable('TRUE')}`);
        }
    } catch (e) {}
}

function getReleaseFromUrl(url) {
    const finder$ = new Promise((resolve, reject) => {
        const releaseFetch = (url) => {
            fetch(url)
                .then((resp) => resp.json())
                .then((data, error) => {
                    const result = data.results
                        .filter((tag) => {
                            return ignoredTags.filter(t => {
                                const re = new RegExp(t, 'gi');
                                return !re.test(tag.name);
                            }).length == ignoredTags.length;
                        })
                        .filter((tag) => !lastUpdated || (lastUpdated && (new Date(tag.last_updated) > lastUpdated)))
                        .reduce((accum, tag) => {
                            const tag_updated = new Date(tag.last_updated);
                            if (!accum || (accum && accum.safe_last_updated < tag_updated)) {
                                accum = tag;
                                accum.safe_last_updated = tag_updated;
                            }
                            return accum;
                        }, null);

                    if (result) {
                        resolve(result);
                    } else {
                        if (data.next) {
                            logger.info(`navigate to next page...`);
                            releaseFetch(data.next);
                        } else {
                            reject();
                        }
                    }
                });
        }

        releaseFetch(url);
    });

    return finder$;
}

function checkRelease() {

    let url = `${baseUrl}&page=1`;

    logger.info('checking for new release');
    getReleaseFromUrl(url)
        .then(result => {
            logger.info(`new release found: ${logger.variable(result.name)}`);

            if (!IGNORE_LAST_UPDATE) {
                // store for future used
                lastUpdated = result.safe_last_updated;

                fs.writeFile('./LAST_UPDATE', result.last_updated, (err) => {
                    if (err) throw err;
                    logger.info('latest release timestamp has been saved');
                });
            }

            for (var h in hooks) {
                logger.info(`triggering webhook ${logger.variable(hooks[h].name)}`);

                let req = {
                    method: 'get'
                };
                const url = template(hooks[h].url, result).toString().trim();

                if (hooks[h].method === 'post') {
                    const bodyString = (typeof hooks[h].body === 'object') ? JSON.stringify(hooks[h].body) : hooks[h].body;
                    const body = template(bodyString, result);
                    req = {
                        method: 'post',
                        body: body,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };
                }

                ((name, url, req) => {
                    fetch(url, req)
                        .then(data => {
                            logger.info(`webhook ${logger.variable(name)} triggered`, data);
                        })
                        .catch(e => {
                            logger.e(`webhook ${logger.variable(name)} returns error`, e);
                        });
                })(hooks[h].name, url, req);
            }
        })
        .catch(() => {
            logger.info('no new release found');
        });


    if (!SINGLE_RUN) {
        setTimeout(checkRelease, CHECKING_INTERVAL);
    }
}

checkRelease();
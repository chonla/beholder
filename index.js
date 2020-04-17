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

const logger = require('./logger/logger')({
    namespace: `${APP_NAME}:${REPOSITORY}`,
    boldVariable: false,
    timestamp: true
});


logger.info(`${logger.variable(APP_NAME)} version ${logger.variable(APP_VERSION)}`);
logger.info(`app root: ${logger.variable(APP_ROOT)}`)
logger.info(`repository: ${logger.variable(REPOSITORY)}`);
logger.info(`ignored tags: ${logger.variable(process.env.IGNORED_TAGS.split(',').map(t => t.trim()).join(','))}`);
logger.info(`checking interval: ${logger.variable(INTERVAL)} min(s)`);

const url = `https://hub.docker.com/v2/repositories/${REPOSITORY}/tags/?page_size=${process.env.POLL_SIZE}&page=1&ordering=last_updated`;
const ignoredTags = process.env.IGNORED_TAGS.split(',');
let lastUpdated = new Date('2000-01-18T19:20:00.000000Z');

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

function checkRelease() {

    logger.info('checking for new release');
    fetch(url)
        .then((resp) => resp.json())
        .then((data, error) => {
            const result = data.results
                .filter((tag) => ignoredTags.indexOf(tag.name) < 0)
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
                logger.info(`new release found: ${logger.variable(result.name)}`);

                // store for future used
                lastUpdated = result.safe_last_updated;

                fs.writeFile('./LAST_UPDATE', result.last_updated, (err) => {
                    if (err) throw err;
                    logger.info('latest release timestamp has been saved');
                });
                logger.info('notifying through Slack');

                const message = template(process.env.SLACK_MESSAGE, result);

                fetch(process.env.SLACK_WEBHOOK, {
                        method: 'post',
                        body: JSON.stringify({
                            text: `${message}`,
                            link_names: true
                        })
                    })
                    .then((data) => {
                        logger.info('Slack notification sent');
                    });

            } else {
                logger.info('no new release found');
            }
        });

    setTimeout(checkRelease, CHECKING_INTERVAL);
}

checkRelease();
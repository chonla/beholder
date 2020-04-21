# Beholder

Docker release monitoring tool.

## Notification

All hook configurations are stored in `./hooks` directory as `json` file. Here is the hook json format.

```
{
    "name": "<name of your hook>",
    "enabled": <true to enable or false to disable>,
    "method": "<get or post>",
    "url": "<hook url to be triggered>",
    "body": <body, can be JSON or string>
}
```

## Hook file example

```
{
    "name": "Slack",
    "enabled": true,
    "method": "post",
    "url": "https://hooks.slack.com/services/...",
    "body": {
        "text": "New update found `${name}`",
        "link_names": true
    }
}
```

## Configuration

DockMon uses `.env`.

## .env

| Name | Description |
| - | - |
| REPOSITORY | Docker hub repository name |
| INTERVAL | Interval for polling |
| IGNORED_TAGS | Tags list to be ignored. Use comma for multiple tags. For example, `canary,latest` |
| POLL_SIZE | Polling page size |

## Notification message

You can use the following response structure return from docker API by embedding the `JSON` selector into `${selector}` reference.

```
{
    "creator":5007650,
    "id":95751121,
    "image_id":null,
    "images":[
    {
        "architecture":"amd64",
        "features":"",
        "variant":null,
        "digest":"sha256:ed8f10dab7798e7860962c2b4ee4ed9e7f776425b3a605982e7ab283aa473d68",
        "os":"linux",
        "os_features":"",
        "os_version":null,
        "size":234108323
    }
    ],
    "last_updated":"2020-04-16T13:17:13.137296Z",
    "last_updater":5007650,
    "last_updater_username":"energyweb",
    "name":"1.0.2-alpha.5084.0",
    "repository":8759079,
    "full_size":234108323,
    "v2":true
}
```

### For example

The following message will send Slack notify with message `There is a new release: 1.0.2-alpha.5084.0.`

```
There is a new release: ${name}.
```

## Making LAST_UPDATE persistent

Map volume of host `LAST_UPDATE` file to guest `/app/LAST_UPDATE` file.
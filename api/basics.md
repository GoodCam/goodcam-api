# Basic information and device control API

* [Getting basic device info](#getting-basic-device-info)
* [Updating basic device info](#updating-basic-device-info)
* [Rebooting the device](#rebooting-the-device)
* [Device factory reset](#device-factory-reset)
* [Getting firmware information](#getting-firmware-information)
* [Updating firmware](#updating-firmware)
* [Getting exposure info](#getting-exposure-info)
* [Getting exposure settings](#getting-exposure-settings)
* [Updating exposure settings](#updating-exposure-settings)
* [Getting current privacy mask settings](#getting-current-privacy-mask-settings)
* [Setting privacy mask](#setting-privacy-mask)
* [Getting OSD settings](#getting-osd-settings)
* [Updating OSD settings](#updating-osd-settings)

## Getting basic device info

```text
GET /v1/
```

**Response Content-Type:** `application/json`

**Response fields:**
* `timezone`: device time zone in [POSIX format](https://www.gnu.org/software/libc/manual/html_node/TZ-Variable.html)
* `firmware`: see [below](#getting-firmware-information)

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "timezone": "CET-1CEST,M3.5.0/2,M10.5.0/3",
    "firmware": {
        "board": "acbd18db4cc2f85cedef654fccc4a4d8",
        "version": "1.0.0",
        "build": "2021-07-12T13:44:18+00:00"
    }
}
```

## Updating basic device info

```text
PUT /v1/
```

**Request Content-Type:** `application/json`

**Request fields:**
* `timezone`: device time zone in [POSIX format](https://www.gnu.org/software/libc/manual/html_node/TZ-Variable.html)

**Request example:**
```json
{
    "timezone": "CET-1CEST,M3.5.0/2,M10.5.0/3"
}
```

**Response Content-Type:** `application/json`

**Response fields:** see [the GET method](#getting-basic-device-info)

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`

## Rebooting the device

```text
POST /v1/reboot/
```

**Possible response codes:**
* `204`
* `303`
* `401`

## Device factory reset

```text
POST /v1/factory-reset/
```

**Possible response codes:**
* `204`
* `303`
* `401`

## Getting firmware information

```text
GET /v1/firmware/
```

**Response Content-Type:** `application/json`

**Response fields:**
* `board`: hardware family identifier
* `version`: firmware version
* `build`: firmware build

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "board": "acbd18db4cc2f85cedef654fccc4a4d8",
    "version": "1.0.0",
    "build": "2021-07-12T13:44:18+00:00"
}
```

## Updating firmware

```text
POST /v1/firmware/
```

**Please note that firmware update is a delicate procedure. The device power
must not be interrupted during the firmware update. Doing so can damage the
device irreversibly.**

The firmware update may also factory reset the device depending on the firmware
version. The device will be reset into factory defaults if the current version
of the firmware and the new version of the firmware are considered
incompatible. The firmware (in)compatibility is determined using these semantic
versioning rules:
* `0.a.b` -> `0.a.c` where `c >= b` is considered a compatible update,
* `a.b.c` -> `a.d.e` where `a > 0` and `d >= b` is considered a compatible
  update regardless of the relation between `c` and `e`,
* all other updates are considered incompatible and will trigger device factory
  reset.

For example:
* `0.2.1` -> `0.1.0` - incompatible
* `0.2.1` -> `0.2.0` - incompatible
* `0.2.1` -> `0.2.1` - compatible
* `0.2.1` -> `0.2.2` - compatible
* `0.2.1` -> `0.3.0` - incompatible
* `2.2.2` -> `1.0.0` - incompatible
* `2.2.2` -> `2.1.0` - incompatible
* `2.2.2` -> `2.2.1` - compatible
* `2.2.2` -> `2.2.2` - compatible
* `2.2.2` -> `2.2.3` - compatible
* `2.2.2` -> `2.3.0` - compatible
* `2.2.2` -> `3.0.0` - incompatible

**Request Content-Type:** application/octet-stream

**Possible response codes:**
* `204`
* `303`
* `400`
* `401`

## Getting exposure info

```text
GET /v1/exposure/
```

**Response Content-Type:** `application/json`

**Response fields:**
* `night_mode`: `true` if the device is currently in night mode, `false`
  otherwise

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "night_mode": false
}
```

## Getting exposure settings

```text
GET /v1/exposure/settings/
```

**Response Content-Type:** `application/json`

**Response fields:** see [below](#updating-exposure-settings)

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "wdr": true,
    "night_mode": "auto"
}
```

## Updating exposure settings

```text
POST /v1/exposure/settings/
```

**Request Content-Type:** `application/json`

**Request fields:**
* `wdr`: enable/disable WDR mode
* `night_mode`:
  * `auto` - enable/disable night mode automatically based on information from
    the light sensor (if available)
  * `on` - enable night mode
  * `off` - disable night mode

**Request example:**
```json
{
    "wdr": false,
    "night_mode": "on"
}
```

**Response Content-Type:** `application/json`

**Response fields:** same as the request

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`

## Getting current privacy mask settings

```text
GET /v1/privacy-mask/
```

See [below](#setting-privacy-mask) for the privacy mask description.

**Response Content-Type:** `application/json`

**Response fields:**
* `mask`: a list of triangles in the format described below

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "mask": [
        [0.1, 0.1, 0.2, 0.2, 0.3, 0.1]
    ]
}
```

## Setting privacy mask

```text
POST /v1/privacy-mask/
```

The privacy mask allows hiding arbitrary regions in the resulting video. The
regions can be specified using a list of triangle coordinates. More complex
shapes can be composed of multiple triangles if needed. The triangle
coordinates are expected to be decimal numbers from the interval `[0; 1]` where
the point `[0; 0]` represents the top left corner of the video and `[1; 1]`
represents the bottom right corner of the video.

Each triangle is represented by a list of 6 decimal numbers representing
coordinates of the three corresponding triangle vertices. For example:

```json
[0.1, 0.1, 0.2, 0.2, 0.3, 0.1]
```

represents a triangle with the following `[x, y]` vertices:

```text
[0.1, 0.1]
[0.2, 0.2]
[0.3, 0.1]
```

**Request Content-Type:** `application/json`

**Request fields:**
* `mask`: a list of triangles in the format described above

**Request example:**
```json
{
    "mask": [
        [0.1, 0.1, 0.2, 0.2, 0.3, 0.1]
    ]
}
```

**Response Content-Type:** `application/json`

**Response fields:** same as the request

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`

## Getting OSD settings

```text
GET /v1/osd/
```

**Response Content-Type:** `application/json`

**Response fields:**
* `label`: a text label displayed in the OSD area or `null` if the network
  device name is being used

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "label": "An arbitrary label"
}
```

## Updating OSD settings

```text
PUT /v1/osd/
```

**Request Content-Type:** `application/json`

**Request fields:**
* `label`: a text label to be displayed in the OSD area or `null` if the
  network device name should be used

**Request example:**
```json
{
    "label": "My Cool Label"
}
```

**Response Content-Type:** `application/json`

**Response fields:** same as the request

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`

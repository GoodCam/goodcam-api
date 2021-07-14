# Basic information and device control API

* [Getting basic device info](#getting-basic-device-info)
* [Rebooting the device](#rebooting-the-device)
* [Device factory reset](#device-factory-reset)
* [Getting firmware information](#getting-firmware-information)
* [Updating firmware](#updating-firmware)

## Getting basic device info

```text
GET /v1/
```

**Response Content-Type:** `application/json`

**Response fields:**
* TBD

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{}
```

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

# Basic information and device control API

* [Getting basic device info](#getting-basic-device-info)
* [Rebooting the device](#rebooting-the-device)
* [Device factory reset](#device-factory-reset)

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

# Network settings API

* [Getting overall network settings](#getting-overall-network-settings)
* [Changing network settings](#changing-network-settings)
* [Listing network interfaces](#listing-network-interfaces)
* [Getting network interface settings](#getting-network-interface-settings)
* [Changing network interface settings](#changing-network-interface-settings)

## Getting overall network settings

```text
GET /v1/network/
```

**Response Content-Type:** `application/json`

**Response fields:**
* `device_name`: name of the device (used as DNS-SD instance name)

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
{
    "device_name": "GoodCam #012"
}
```

## Changing network settings

```text
PUT /v1/network/
```

The endpoint allows changing certain network parameters. See below for the list
of parameters that can be changed.

**Request Content-Type:** `application/json`

**Request fields:**
* `device_name` (optional): name of the device (used as DNS-SD instance name);
  the device name cannot exceed 63 bytes when encoded as UTF-8

**Request example:**
```json
{}
```

**Response Content-Type:** `application/json`

**Response fields:**
* `device_name`: name of the device (used as DNS-SD instance name)

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`

**Response example:**
```json
{
    "device_name": "GoodCam #012"
}
```

## Listing network interfaces

```text
GET /v1/network/interfaces/
```

The endpoint returns a list of objects describing particular network
interfaces.

**Response Content-Type:** `application/json`

**Interface fields:**
* `name`: interface name
* `mac_address`: interface MAC address as a string containing six hexadecimal
  numbers separated with ":"
* `mode`: interface mode, the possible values are:
  * `static`: for static IP address configuration
  * `dhcp`: for DHCP configuration

In case of `static` mode, the following fields are also present:
* `ipv4_address`: IPv4 address of the network interface (string)
* `ipv4_mask`: IPv4 mask (string)
* `ipv4_gateway`: IPv4 gateway (string) or `null` if the gateway is not set
* `dns_servers`: a list of DNS servers; each DNS server is represented by a
  string containing an IP address

In case of `dhcp` mode, these fields are present:
* `dns_from_dhcp`: boolean flag indicating if the device is using DNS servers
  provided by the DHCP server
* `custom_dns_servers`: a list of custom DNS servers; each DNS server is
  represented by a string containing an IP address

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
[
    {
        "name": "eth0",
        "mac_address": "00:11:22:aa:bb:cc",
        "mode": "static",
        "ipv4_address": "192.168.1.10",
        "ipv4_mask": "255.255.255.0",
        "ipv4_gateway": "192.168.1.1",
        "dns_servers": [
            "192.168.1.1",
            "8.8.8.8"
        ]
    }
]
```

## Getting network interface settings

```text
GET /v1/network/interfaces/{interface_name}/
```

**Response Content-Type:** `application/json`

**Response fields:** see the interface fields described above

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`: if there is no interface with a given name

**Response example:**
```json
{
    "name": "eth1",
    "mac_address": "00:11:22:aa:bb:dd",
    "mode": "dhcp",
    "dns_from_dhcp": true,
    "custom_dns_servers": []
}
```

## Changing network interface settings

```text
PUT /v1/network/interfaces/{interface_name}/
```

All network interface options can be changed except the interface name. If the
`name` field is present in a request, it will be silently ignored. When
changing the network interface mode, all fields required for the particular
mode must be present in the request. Otherwise, only the fields being changed
need to be present. The `mac_address` field can be set to force using a given
MAC address. Setting the field to `null` will reset the interface to its
original MAC address.

The device needs to be rebooted for the changes to take effect.

**Fields required for the `static` mode:**
* `ipv4_address`
* `ipv4_mask`

**Fields required for the `dhcp` mode:**
* `dns_from_dhcp`

**Request Content-Type:** `application/json`

**Request fields:** see the interface fields described above

**Request example:**
```json
{
    "ipv4_address": "192.168.1.20"
}
```

**Response Content-Type:** `application/json`

**Response fields:** see the interface fields described above

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`
* `404`: if there is no interface with a given name

**Response example:**
```json
{
    "name": "eth0",
    "mac_address": "00:11:22:aa:bb:cc",
    "mode": "static",
    "ipv4_address": "192.168.1.20",
    "ipv4_mask": "255.255.255.0",
    "ipv4_gateway": "192.168.1.1",
    "dns_servers": [
        "192.168.1.1",
        "8.8.8.8"
    ]
}
```

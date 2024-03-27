# GoodCam cloud protocol

This document describes how exactly GoodCam devices connect to a cloud service
and how the cloud service can communicate with connected cameras. It should
give you enough information to implement your own cloud service if needed. You
can also use [our library](https://github.com/GoodCam/device-proxy-lib)
implementing this protocol. The library is written in Rust but offers also a C
API, so it shouldn't be a big problem to use it wherever needed. There is also
a [Python wrapper](https://github.com/GoodCam/device-proxy-lib-python) already
available.

The protocol is relatively simple. GoodCam devices initiate an outgoing
connection to a given cloud service using HTTP(S) 1.1, requesting a connection
upgrade. This mechanism is described in
[RFC 7230, section 6.7](https://www.rfc-editor.org/rfc/rfc7230#section-6.7).
The same mechanism is used by WebSockets and some other protocols. The name of
the protocol used in the request is `goodcam-device-proxy`. GoodCam devices
identify themselves using the Basic HTTP Authentication scheme defined in
[RFC 7617](https://www.rfc-editor.org/rfc/rfc7617). The device ID is sent in
place of a username and a key is sent in place of a password.

This is an example of a request sent by a GoodCam device:
```text
GET / HTTP/1.1
Host: my-cloud-service.com
Authorization: Basic ZGV2aWNlLWlkOmtleQ==
Connection: upgrade
Upgrade: goodcam-device-proxy
```

If the cloud service does not know the device or the device key is invalid, it
is expected to respond with `HTTP 401 Unauthorized`, for example:
```text
HTTP/1.1 401 Unauthorized
Connection: close
Content-Type: text/plain

unknown client ID or invalid secret
```

On success, the cloud service is expected to respond with
`HTTP 101 Switching Protocols`, for example:
```text
HTTP/1.1 101 Switching Protocols
Connection: upgrade
Upgrade: goodcam-device-proxy
```

After sending the `HTTP 101` response, the HTTP(S) connection immediately
transitions to the new protocol and all communication from this moment forward
MUST be done using the negotiated protocol. The new protocol is expected to be
HTTP/2 defined in [RFC 9113](https://www.rfc-editor.org/rfc/rfc9113). However,
after the protocol switch, the GoodCam device will be in the role of an HTTP/2
server and the cloud service will be in the role of an HTTP/2 client. The cloud
service can essentially just take the upgraded connection and use it to
initiate an HTTP/2 connection "with prior knowledge" as defined in
[RFC 9113, section 3.3](https://www.rfc-editor.org/rfc/rfc9113#section-3.3).
The resulting HTTP/2 connection can be then used by the cloud service to send
requests to the device API.

## Device authentication and pairing

Careful reader might have noticed one problem already. GoodCam devices are
identified by a device ID and device key (sent in the `Authorization` header)
but how exactly does a cloud service learn which device IDs it should accept?
This process is called pairing and it consists of these steps:

1. Get device ID from your device (see
   [the API documentation](https://goodcam.github.io/goodcam-api/#tag/cloud/operation/get-cloud-client-info)).
2. Set cloud service URL and enable the cloud client in your GoodCam device
   (see [the API documentation](https://goodcam.github.io/goodcam-api/#tag/cloud/operation/update-cloud-client-settings)).
3. Register the device ID within your cloud service.
4. Connect your device to your cloud service (see
   [the API documentation](https://goodcam.github.io/goodcam-api/#tag/cloud/operation/connect-to-cloud)).
5. Store a hash of the device key on the side of your cloud service for future
   reference.

Please note that steps 1, 2 and 4 require direct access to the GoodCam device.
The whole pairing process can be done as a part of
[the initial device setup](https://goodcam.github.io/goodcam-api/#section/Initial-setup)
which also requires direct access to the device. It can be implemented in your
mobile/desktop app.

Steps 3 and 4 depend on your cloud service and are outside of the scope of this
document. However, we recommend to stick to at least the following security
best practices:

* The device ID registration from step 3 should be only temporary. The
  expiration should be short (e.g. 2 minutes) because the registration is
  immediately followed by a connection attempt from the device. Short
  expiration ensures short time window that could be used by a potential
  attacker to spoof a device by guessing the device ID.
* Once a device with the corresponding device ID connects to your cloud service
  for the first time, your cloud service should store a hash of the device key
  and the device ID registration from step 3 should be turned into a permanent
  registration. The hash of the device key should be used to verify the device
  identity during future connection attempts.
* The device key is considered a secret and as such it cannot be retrieved from
  the device directly using the API. Instead, a cloud service will learn a
  device key when a device connects to it for the first time. The cloud service
  must treat all device keys as secrets and it must not store the keys in
  plaintext. At least a secure hash function in combination with a random salt
  should be used. You can also use mechanisms for secure password storage such
  as bcrypt.
* When an already paired device connects to a cloud service, the cloud service
  should verify that the device ID has been registered within the service and
  the hash of the device key matches the hash stored in the service database.

Device ID and device key are random strings with at least 122 bits of
randomness. Both of these strings are generated when a device boots up for the
first time and they are re-generated on device factory reset. This means that
devices that undergo a factory reset have to be paired with your cloud service
again.

## Device state machine

The following picture describes the state machine of the cloud client in a
GoodCam device:

![state machine](./cloud-client-states.jpg)

## Connection keep-alive mechanism

After the initial connection is switched to HTTP/2, it is highly recommended
that both sides of the connection send HTTP/2 PING frames at regular intervals.
The connection should be considered broken if a PING frame isn't acknowledged
by the remote peer within a timeout. All GoodCam devices send PING frames every
10 seconds and will drop the connection if a PING frame isn't acknowledged
within 20 seconds. This ensures that GoodCam devices will discover broken
connections in at most 30 seconds.

## Load balancing

In case you need to run multiple instances of your cloud service and you need
to load balance the GoodCam devices across these instances, you can use
standard HTTP redirects. In other words, if one of your cloud services receives
an upgrade request from a GoodCam device and the service is already at its
capacity, it can redirect the GoodCam device to another service by responding
with `HTTP 307 Temporary Redirect`, for example:
```text
# C -> S:
GET / HTTP/1.1
Host: my-cloud-service.com
Authorization: Basic ZGV2aWNlLWlkOmtleQ==
Connection: upgrade
Upgrade: goodcam-device-proxy

# S -> C:
HTTP/1.1 307 Temporary Redirect
Location: https://i002.my-cloud-service.com/
Connection: close
```

If there is a need to redirect GoodCam devices that are already connected to a
cloud service, the cloud service can simply close the connection with these
devices. This will force the devices to reconnect and on reconnect, the devices
can be easily redirected to another cloud service.

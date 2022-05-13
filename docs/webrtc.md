# WebRTC support

GoodCam cameras support streaming of h264 video over WebRTC. In order to
establish a WebRTC session, a signaling protocol is needed. We use a simple
WebSocket based signaling protocol for this purpose (see below). More complex
signaling protocols like SIP may be available in the future.

## GoodCam Signaling Protocol

The signaling protocol is available at:

```
ws://DEVICE_ADDR/v1/streams/STREAM_NAME/web-rtc/
```

The protocol is optionally identified by a `gcsp` token in the
`Sec-WebSocket-Protocol` header.

All messages are JSON objects and all messages contain property `type` which
identifies the type of the message. The following types are defined:

| Message Type | Direction         |
| ------------ | ----------------- |
| `hello`      | client  -> camera |
| `offer`      | client <- camera  |
| `answer`     | client  -> camera |
| `candidate`  | client <-> camera |

The `hello` message may contain optional property `stun_servers`. If defined,
the property must be a list of STUN servers that the camera may use to gather
server-reflexive ICE candidates. All STUN servers must be in the
`hostname:port` format.

The `offer` message contains property `sdp` which is the SDP offer sent by the
camera.

The `answer` message must contain property `sdp` containing the SDP answer
generated by the client.

The `candidate` message contains an ICE candidate sent by either side after
their SDP has been generated and sent over to the other peer. The `candidate`
message contains property `candidate` which is either a JSON object describing
the ICE candidate or `null` to signal that no more candidates will be sent by
the peer.

The JSON object describing an ICE candidate contains the following properties:
* `candidate` - ICE candidate description formatted as an SDP attribute
  (without the initial `a=`)
* `mid` - media ID of the media stream that this candidate belongs to
* `username` - username fragment used by the media stream

### Protocol operation

Once a new WebSocket connection is established, the camera will expect a
`hello` message from the client. After receiving a `hello` message, the camera
will send an `offer` message to the client followed by one or more `candidate`
messages. The last `candidate` message will always be a `null` candidate.

After receiving an `offer` message, the client is expected to generate an
`answer` message followed by one or more `candidate` messages. The last
`candidate` message must be a `null` candidate.

The WebSocket connection remains open for the entire duration of the
corresponding streaming session. In other words, closing the connection will
terminate the streaming session. Both sides of the connection should send
WebSocket PING messages at regular intervals and check that they receive
corresponding PONG messages to make sure that the connection has not been
broken.

### STUN servers

STUN servers are being used by WebRTC to establish a direct connection between
two peers if they are behind NAT. This is usually the case if you try to stream
video from your camera remotely over the Internet. In such case, you will need
a STUN server for your client and the camera. Both peers will use the STUN
server to gather their server-reflexive ICE candidates and send these
candidates over to the other peer.

You can use your own STUN server or you can use any public STUN server. GoodCam
also provides a STUN server for this purpose at:
```
stun.goodcam.io:3478
```

### TURN servers

TURN servers are being used by WebRTC as packet relays in cases when creating a
direct connection between peers is not possible. This can happen with some
restrictive NAT setups. GoodCam cameras currently do not support communication
relayed by a TURN server. This feature is still in progress and it will be
added in the future.

### Signaling example

The following example illustrates a single session initiation between a camera
and a client:

```json
// client -> camera:

{
    "type": "hello",
    "stun_servers": ["stun.goodcam.io:3478"]
}

// camera -> client:

{
    "type": "offer",
    "sdp": "v=0\r\n..."
}

// camera -> client:

{
    "type": "candidate",
    "candidate": {
        "candidate": "candidate:...",
        "mid": "0",
        "username": "ABCD"
    }
}

// client -> camera:

{
    "type": "answer",
    "sdp": "v=0\r\n..."
}

// camera -> client:

{
    "type": "candidate",
    "candidate": {
        "candidate": "candidate:...",
        "mid": "0",
        "username": "ABCD"
    }
}

// client -> camera:

{
    "type": "candidate",
    "candidate": {
        "candidate": "candidate:...",
        "mid": "0",
        "username": "EFGH"
    }
}

// client -> camera:

{
    "type": "candidate",
    "candidate": null
}

// camera -> client:

{
    "type": "candidate",
    "candidate": null
}
```
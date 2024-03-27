# Streaming options

GoodCam cameras offer several options for delivering a video stream to your
application. H.264 video can be delivered via:

* RTSP
* WebRTC
* Fragmented MP4 over HTTP

MJPEG video can be delivered either via fragmented MP4 over HTTP or via HTTP in
form of a multipart body (one frame per multipart entity).

Choosing the right streaming format might save you a lot of trouble. This
document lists several common use cases which should give you a better idea
which option is the best for you.

## 1. Video player in a web browser

Modern web browsers can play both H.264 and MJPEG video. The only thing that
isn't supported is the RTSP protocol. If you can access your cameras directly
(e.g. you are in the same local network), you can choose freely between WebRTC,
fragmented MP4 and multipart MJPEG streams (see
[the integration examples](../README.md#integration-examples)). You may find
out that players for fragmented MP4 and MJPEG streams are easy to implement,
while WebRTC offers lower latency compared to fragmented MP4. We'd also
recommend using H.264 instead of MJPEG mainly due to lower bitrate
requirements.

If you cannot access your cameras locally or you just need to be able to watch
your cameras remotely (i.e. from a different network), your options will be a
bit more limited. WebRTC is the best option here. The protocol is designed to
establish a peer to peer connection between two hosts in different networks.
The only thing that is needed to negotiate the peer to peer connection is a
signaling protocol. GoodCam cameras use a simple WebSocket based signaling
protocol for WebRTC, see
[the API documentation](https://goodcam.github.io/goodcam-api/#tag/streaming/operation/web-rtc-signaling)
for more info. The signaling endpoint can be accessed remotely via the
[GoodCam Cloud API](https://goodcam.github.io/goodcam-api/cloud.html).

We do not recommend exposing your cameras to the Internet (either directly or
via port forwarding). This would be a serious security risk. You should really
use WebRTC if you need to watch your cameras remotely.

## 2. Video player in a mobile/desktop app

This use case is similar to the previous one with two exceptions:

* There are desktop/mobile video players that support RTSP.
* WebRTC streaming may be a bit more complicated (depending on the platform).

RTSP offers similar latency as WebRTC and it is generally a good option for
video playback within the same local network. There are plenty of video players
that support video playback via RTSP. However, RTSP does not offer any
encryption and it should not be used for remote video access unless you can
provide an additional layer of security (e.g. using a tunneled connection).

How difficult it will be to use WebRTC in a desktop/mobile app will depend on
your platform of choice (i.e. programming language, target operating system,
etc.). There are some libraries that support WebRTC but it may be difficult to
find a video player that would support WebRTC out of the box. This is mainly
because you still need to implement the signaling protocol. A good option would
be to embed a web browser into your application and implement your WebRTC video
player there. Modern web browsers offer excellent support for WebRTC which
makes the implementation relatively easy.

## 3. Local video processing

This use case covers anything that does not involve watching a video in a
player. It may be video recording, some sort of video analysis or other
applications similar to this.

If you can run your application within the same network as your cameras, then
your are free to choose from any streaming format. Fragmented MP4 would be
probably the easiest option. Using WebRTC would be probably quite complicated.
Even though there are libraries that support WebRTC, you'd still have to
implement the signaling protocol.

We do not recommend implementing WebRTC from scratch unless you know what you
are doing. The protocol is very complex, consisting of several layers of other
protocols. Implementing it would certainly take a lot of time.

## 4. Remote video processing

Processing video (e.g. recording or some sort of analysis) from cameras in a
remote network is probably the most complicated use case right now. But even
here we can offer you a solution.

GoodCam Cloud can be used only to obtain WebRTC streams. Using it for remote
access to fragmented MP4 streams or MJPEG streams is not possible because of
the potential huge bandwidth requirements on our infrastructure. As mentioned
above, consuming WebRTC streams in your own application may be a bit
complicated. If you'd like to avoid this complication, you can implement
[the GoodCam cloud protocol](./cloud-server.md) and configure your cameras to
connect to your own server instead of GoodCam Cloud. This way you can directly
consume any stream that is available via the HTTP API. This includes the
fragmented MP4 stream and the MJPEG stream.

_Note: We are also working on making the use of WebRTC less painful. There will
be a library in the future that will allow you to negotiate remote WebRTC
streaming using GoodCam Cloud and consume these streams directly in your
application._

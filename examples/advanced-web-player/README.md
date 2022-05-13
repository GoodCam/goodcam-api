# More sophisticated web player

This video player adds a bit more JavaScript code to address these topics:

* Automatic display element selection for MJPEG and h264 streams.
* Using a JPEG snapshot (if available) as a stream preview when autoplay fails
  or when it isn't enabled.
* Implementing custom controls including pause-like behavior.
* Automatic reconnection in case of a stream and or a playback error.
* Manual fetch & parsing of MJPEG streams in order to avoid triggering browser
  limits.

See `example.html` and contents of the `js` folder for the full implementation.

_Note: This player does not support streaming via WebRTC._

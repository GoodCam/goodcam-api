# Absolute minimum for MJPEG playback on web

MJPEG video streams are usually being transferred as a series of JPEG images
wrapped around in a multipart body. GoodCam cameras are not an exception here.
The content type is `multipart/x-mixed-replace` and this type of stream can be
easily used in pretty much any web browser. You can simply treat the stream URL
as a picture in JPEG and use the `img` element to display the video.

This method has one disadvantage though. Web browsers usually have limits on
the maximum size of an image and they will terminate the connection when the
limit is reached. Unfortunately, this limit applies to the whole MJPEG stream
and not just a single frame. There is also no direct way how to listen for this
event and restart the stream. The only way how to deal with this problem is to
fetch and parse the stream on your own. You can find the solution in the
[advanced web player example](https://github.com/GoodCam/goodcam-api/tree/master/examples/advanced-web-player).

Anyway, if you don't mind the eventual interruption of the stream, you can use
the example below.

Please, keep in mind that the MJPEG stream URL is available only for streams
with the MJPEG codec. You won't be able to get the MJPEG stream if you change
the codec to h264.

```html
<img src="http://USERNAME:PASSWORD@CAMERA_IP/api/v1/streams/secondary/stream.mjpeg">
```

See [example.html](example.html) for the complete example.

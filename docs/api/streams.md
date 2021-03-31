# Streaming API

* [Listing camera streams](#listing-camera-streams)
* [Getting stream details](#getting-stream-details)
* [Changing stream settings](#changing-stream-settings)
* [Getting stream limits](#getting-stream-limits)
* [Getting JPEG snapshot](#getting-jpeg-snapshot)
* [Getting MJPEG stream](#getting-mjpeg-stream)

## Listing camera streams

```text
GET /v1/streams/
```

The endpoint returns a list of objects describing particular media streams.

**Response Content-Type:** `application/json`

**Stream fields:**
* `name`: stream name
* `urls`: a list of objects with the following fields:
  * `format`: stream format; possible values are:
    * `jpeg`: single JPEG snapshot
    * `mjpeg`: MJPEG stream delivered over HTTP as a multipart body
    * `rtsp`: RTSP stream
  * `url`: stream URL
* `video`: video settings with the following fields:
  * `codec`: video codec; possible values are:
    * `mjpeg`
    * `h264`
  * `width`: image width (see below for the limits)
  * `height`: image height (see below for the limits)
  * `fps`: number of frames per second (an integer grater than 0)
  * `bitrate`: bitrate settings with the following fields:
    * `mode`: bitrate control mode; possible values are:
      * `vbr`: variable bitrate
      * `cbr`: constant bitrate

In case of `h264` codec, the video settings contain these additional fields:
* `gop_size`: Size of the Group of Pictures. It is essentially the interval
  between IDR frames (key-frames). The unit is the number of frames. It's
  recommended to keep the interval between 1 and 6 seconds for live streams, so
  for example if the FPS is 25, the GoP size should be between 25 and 150.
  Setting the value too low will increase bandwidth requirements, whereas
  setting it too high will increase the mean time before the stream playback
  can start and it can also cause problems when streaming using HLS or
  fragmented MP4. The value can be an integer grater than 0.
* `profile`: h264 profile; possible values are:
  * `baseline`
  * `main`
  * `high`

In case of `cbr` bitrate mode, the bitrate settings contain these additional
fields:
* `bitrate`: average bitrate in kbps (an integer grater than 0)

In case of `vbr` bitrate mode, the bitrate settings contain these additional
fields:
* `min_quality`: minimal acceptable video quality; a value between 0 and 100
  (inclusive), where 0 is the lowest possible quality and 100 is the highest
  possible quality
* `max_quality`: maximal video quality; a value between
  `min_quality` and 100
* `max_bitrate`: maximum bitrate in kbps (an integer grater than 0)

The usual behavior of the VBR mode is that the encoder targets the maximum
possible quality from a given range which fits a given maximum bitrate.
Therefore, the video bitrate will drop below the given maximum only if the
maximum quality has been already reached. The maximum quality can be also
interpreted as the desired target quality. It is also possible for the maximum
bitrate to be be exceeded if the quality would drop below a given minimum.

The exact meaning of the quality is codec-dependent. For example, in case of
h264, the 0-100 scale of quality is translated to the Quantizer Parameter (0
quality is translated as QP 51, 100 quality is translated as QP 0).

**Possible response codes:**
* `200`
* `303`
* `401`

**Response example:**
```json
[
    {
        "name": "primary",
        "urls": [
            {
                "format": "rtsp",
                "url": "rtsp://192.168.1.10/videoMain"
            }
        ],
        "video": {
            "codec": "h264",
            "width": 1920,
            "height": 1080,
            "fps": 25,
            "gop_size": 50,
            "profile": "main",
            "bitrate": {
                "mode": "vbr",
                "min_quality": 0,
                "max_quality": 60,
                "max_bitrate": 8000
            }
        }
    },
    {
        "name": "secondary",
        "urls": [
            {
                "format": "jpeg",
                "url": "http://192.168.1.10/v1/streams/secondary/snapshot.jpg"
            },
            {
                "format": "mjpeg",
                "url": "http://192.168.1.10/v1/streams/secondary/stream.mjpeg"
            }
        ],
        "video": {
            "codec": "mjpeg",
            "width": 1280,
            "height": 720,
            "fps": 10,
            "bitrate": {
                "mode": "cbr",
                "bitrate": 8000
            }
        }
    }
]
```

## Getting stream details

```text
GET /v1/streams/{stream_name}/
```

**Response Content-Type:** `application/json`

**Response fields:** see the stream fields above

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`

**Response example:**
```json
{
    "name": "primary",
    "urls": [
        {
            "format": "rtsp",
            "url": "rtsp://192.168.1.10/videoMain"
        }
    ],
    "video": {
        "codec": "h264",
        "width": 1920,
        "height": 1080,
        "fps": 25,
        "gop_size": 50,
        "profile": "main",
        "bitrate": {
            "mode": "vbr",
            "min_quality": 0,
            "max_quality": 60,
            "max_bitrate": 8000
        }
    }
}
```

## Changing stream settings

```text
PUT /v1/streams/{stream_name}/
```

All stream parameters can be changed except the stream name and URLs. If
present, the `name` and the `urls` parameters will be silently ignored. Some
parameters may be limited to only a certain set of values. See the stream
limits for more information.

In addition to the parameters listed above, there are also these write-only
parameters:
* `rtsp_path`: this parameter can be used to change the RTSP endpoint
  associated with this stream; the string must start with "/"

When changing the codec, all video parameters valid for that codec must be
present (including `width`, `height` and `fps`). Similarly when changing the
bitrate mode, all parameters valid for that bitrate mode must be present. In
all other cases only the parameters that are being changed need to be present.

**Request Content-Type:** `application/json`

**Request fields:** see the stream parameters described above

**Request example:**
```json
{
    "rtsp_path": "/primary",
    "video": {
        "width": 1280,
        "height": 720,
        "fps": 15,
        "gop_size": 30,
        "bitrate": {
            "max_bitrate": 2000
        }
    }
}
```

**Response Content-Type:** `application/json`

**Response fields:** see the stream parameters described above

**Possible response codes:**
* `200`
* `303`
* `400`
* `401`
* `404`

**Response example:**
```json
{
    "name": "primary",
    "urls": [
        {
            "format": "rtsp",
            "url": "rtsp://192.168.1.10/primary"
        }
    ],
    "video": {
        "codec": "h264",
        "width": 1280,
        "height": 720,
        "fps": 15,
        "gop_size": 30,
        "profile": "main",
        "bitrate": {
            "mode": "vbr",
            "min_quality": 0,
            "max_quality": 60,
            "max_bitrate": 2000
        }
    }
}
```

## Getting stream limits

```text
GET /v1/streams/{stream_name}/limits/
```

The limits might be codec-dependent (i.e. the endpoint might return different
sets of limits based on the current video codec).

**Response Content-Type:** `application/json`

**Response fields:**
* `video`: limits for the video parameters with following options:
  * `valid_resolutions`: a list of valid resolutions (other resolutions will
    be rejected); each resolution is represented by a string in form "WxH",
    where "W" is a decimal width in pixels and "H" is a decimal height in
    pixels
  * `max_fps`: maximum available frame rate
  * `max_gop_size`: maximum allowed GoP size
  * `max_bitrate`: maximum acceptable bitrate in kbps (it applies for both VBR
    and CBR)

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`

**Response example:**
```json
{
    "valid_resolutions": [
        "1920x1080",
        "1280x720",
        "960x540",
        "640x360",
        "426x240",
        "320x180",
        "256x144"
    ],
    "max_fps": 30,
    "max_gop_size": 300,
    "max_bitrate": 100000
}
```

## Getting JPEG snapshot

```text
GET /v1/streams/{stream_name}/snapshot.jpg
```

This endpoint is only available for streams with the MJPEG video codec.

**Response Content-Type:** `image/jpeg`

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`

## Getting MJPEG stream

```text
GET /v1/streams/{stream_name}/stream.mjpeg
```

This endpoint is only available for streams with the MJPEG video codec.

**Response Content-Type:** `multipart/x-mixed-replace`

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`

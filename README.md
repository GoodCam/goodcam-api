# GoodCam API

GoodCam devices provide a REST API, RTSP server and they are also able to
advertise themselves in a local network environment using mDNS and DNS-SD.

## Authentication

Most of the HTTP endpoints require authentication via
[HTTP Digest](https://tools.ietf.org/html/rfc7616). The same authentication is
also required by the RTSP server. It is possible to choose between MD5 and
SHA-256 digest when the application is being configured for the first time. It
is not possible to switch between MD5 and SHA-256 later without factory reset
because the HTTP Digest standard itself does not provide any means for digest
algorithm negotiation. The only alternative solution would be providing
`WWW-Authenticate` challenges with all supported algorithms. Such solution
would not make much sense from the security point of view because any potential
attacker could simply choose the weakest digest algorithm available.

The MD5 digest should be considered deprecated and its use should be avoided.
It's supported only for backwards compatibility with
[RFC 2617](https://tools.ietf.org/html/rfc2617) (the former definition of HTTP
Digest). Unfortunately, even modern web browsers currently don't support other
HTTP Digest algorithms than MD5, so in cases when the API is being consumed by
a web browser, it is possible to use the MD5 algorithm or it is also possible
to use an alternative HTTP client supporting the more recent version of HTTP
Digest. The latter option should be preferred if possible.

## Security considerations

Currently, there is no TLS or other forms of encryption being used. The REST
API is available only via plain HTTP. The reasoning behind is simple. Using TLS
in a local network environment is impractical. There are basically only two
options for using TLS in such environments:

1. Registering a domain name that's globally unique (e.g. xyz.com) and buying
   a proper TLS certificate from a CA (or using Let's Encrypt). All devices in
   the local network would then have to use a local DNS server which would be
   resolving the hostname to a local IP address. Note that there is no CA that
   would issue a TLS certificate for a hostname that cannot be verified as
   globally unique. Doing so would be a serious security risk.
2. Using a self-signed certificate (either directly or as a custom CA) and
   distributing it to all client devices within the local network. All the
   client devices would still have to use a hostname to access the API.

Either of these options are rarely used because it isn't easy to set everything
up without certain technical skills and it may also include some additional
costs. Right now there is no other widely-used option for HTTP encryption
within local networks.

**Because of this, the application services (both HTTP and RTSP) should not be
exposed to the Internet or other outside networks.**

TLS support might be implemented in the future for the REST API to make
exposing the API publicly possible, however, the RTSP protocol does not support
TLS, so exposing it would still be a serious security risk.

## Service discovery

GoodCam devices advertise themselves using
[mDNS](https://tools.ietf.org/html/rfc6762) and
[DNS-SD](https://tools.ietf.org/html/rfc6763). The service name is
`_goodcam._tcp.local`, so all you need to do to find a GoodCam device in a
local network is to send an mDNS query asking for `PTR` records named
`_goodcam._tcp.local`. Doing so will yield instance names of all GoodCam
devices within the local network. These instance names can be used then to
retrieve `SRV` and `TXT` records of those instances. The `SRV` records will
then contain the device hostnames and ports where the REST API can be
accessed. The `TXT` records will contain the API version and the root for the
REST API endpoints. And, of course, the device IP addresses can be retrieved by
querying the `A` or `AAAA` records.

### Example
```text
-> mDNS query (QCLASS, QTYPE, QNAME):
    ANY PTR _goodcam._tcp.local

<- mDNS response (RR TYPE, RR DATA):
    PTR My\ Camera._goodcam._tcp.local
    PTR GoodCam._goodcam._tcp.local
    PTR GoodCam\ #11._goodcam._tcp.local

-> mDNS query (QCLASS, QTYPE, QNAME):
    ANY SRV My\ Camera._goodcam._tcp.local

<- mDNS response (RR TYPE, RR DATA):
    SRV 0 0 80 GC12345678ABCD.local

-> mDNS query (QCLASS, QTYPE, QNAME):
    ANY TXT My\ Camera._goodcam._tcp.local

<- mDNS response (RR TYPE, RR DATA):
    TXT root=/ version=1

-> mDNS query (QCLASS, QTYPE, QNAME):
    ANY A GC12345678ABCD.local

<- mDNS response (RR TYPE, RR DATA):
    A 192.168.123.123
```

## Initial setup

When a GoodCam device hasn't been set up before (or after factory reset), all
API endpoints will be redirecting to `/v1/users/` indicating that there are no
user accounts and the initial setup should be performed.

The setup itself is simple. The user is only required to create the first user
account (see the API endpoints below).

## API endpoints

* [Common concepts](api/common.md)
* [Basic information and device control](api/basics.md)
* [User management](api/users.md)
* [Network settings](api/network.md)
* [Streaming](api/streams.md)

## Example: accessing a camera in a mobile app

1. Look up all `_goodcam._tcp.local` services using service discovery.
2. List all instance names in the user interface, e.g.:
   * My Camera
   * GoodCam
   * GoodCam #11
3. Allow entering a camera IP address manually (useful in cases when the
   service discovery does not work for some reason).
4. After the user taps on a camera, perform the initial setup (if needed) and
   log in to the camera (ask the user for credentials).
5. After successful login, allow changing camera settings, displaying video
   streams, taking snapshots, etc.

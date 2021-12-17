/**
 * MJPEG stream parser.
 *
 * The parser is able to parse any multipart body formatted according to
 * RFC 2046.
 */
class MJPEGParser {
    /**
     * Create a new MJPEG stream parser.
     *
     * @param {string} boundary multipart boundary
     */
    constructor(boundary) {
        let enc = new TextEncoder();

        this.entityPrefix = enc.encode(`\r\n--${boundary}`);
        this.doubleDash = enc.encode('--');
        this.crlf = enc.encode('\r\n');
        this.emptyLine = enc.encode('\r\n\r\n');

        this.textDecoder = new TextDecoder();
        this.buffer = new Uint8Array(10000000);
        this.filled = 0;

        this.entityStart = -1;
        this.headerStart = -1;
        this.headerEnd = -1;
        this.currentHeader = null;
        this.currentFrameSize = -1;
    }

    /**
     * Push a given chunk of data into the parser.
     *
     * @param {Uint8Array} chunk data
     * @returns unprocessed data (if any)
     */
    push(chunk) {
        let available = this.buffer.length - this.filled;

        if (available === 0) {
            throw new Error("picture size exceeded");
        }

        let use = Math.min(available, chunk.length);

        this.buffer.set(chunk.subarray(0, use), this.filled);
        this.filled += use;

        return chunk.subarray(use);
    }

    /**
     * Take the next MJPEG frame.
     *
     * @returns MJPEG frame Blob
     */
    take() {
        let header = this.getEntityHeader();
        let headerEnd = this.findHeaderEnd();
        let frameSize = this.getCurrentFrameSize();

        if (!header || headerEnd < 0 || frameSize < 0) {
            return null;
        }

        let frameStart = headerEnd + 4;
        let frameEnd = frameStart + frameSize;

        if (frameEnd > this.filled) {
            return null;
        }

        let frameData = this.buffer.slice(frameStart, frameEnd);

        this.reset(frameEnd);

        return new Blob([frameData], {
            type: header['content-type'],
        });
    }

    /**
     * Reset the parser state and drop a given number of bytes from the
     * internal buffer.
     *
     * @param {number} drop number of bytes to be dropped from the internal
     * buffer
     */
    reset(drop) {
        if (drop < 0) {
            drop = 0;
        } else if (drop > this.filled) {
            drop = this.filled;
        }

        if (drop > 0) {
            this.buffer.copyWithin(0, drop, this.filled);
        }

        this.filled -= drop;

        this.entityStart = -1;
        this.headerStart = -1;
        this.headerEnd = -1;
        this.currentFrameSize = -1;
        this.currentHeader = null;
    }

    /**
     * Get size of the current frame or -1 if we need more data to find it out.
     *
     * @returns size of the current frame in bytes
     */
    getCurrentFrameSize() {
        while (this.currentFrameSize < 0) {
            let headerEnd = this.findHeaderEnd();

            if (headerEnd < 0) {
                return -1;
            }

            let header = this.getEntityHeader();

            let contentLength = Number(header['content-length']);

            if (isNaN(contentLength) || contentLength < 0) {
                this.reset(headerEnd + 4);
            } else {
                this.currentFrameSize = contentLength;
            }
        }

        return this.currentFrameSize;
    }

    /**
     * Get the current multipart entity header or null if we need more data to
     * get the header.
     *
     * @returns multipart entity header
     */
    getEntityHeader() {
        if (this.currentHeader === null) {
            let headerStart = this.findHeaderStart();
            let headerEnd = this.findHeaderEnd();

            if (headerStart < 0 || headerEnd < 0) {
                return null;
            }

            let headerData = this.buffer.subarray(headerStart, headerEnd);

            let lines = this
                .textDecoder
                .decode(headerData)
                .split('\r\n');

            let header = {};
            let field = '';

            const commitField = () => {
                if (field.length > 0) {
                    let parts = field.split(':');
                    let name = parts[0];
                    let value = parts.slice(1);

                    header[name.toLowerCase()] = value.join('');

                    field = '';
                }
            };

            for (let line of lines) {
                if (/^\S/.test(line)) {
                    commitField();
                }

                field += line;
            }

            commitField();

            this.currentHeader = header;
        }

        return this.currentHeader;
    }

    /**
     * Get the end position of the current multipart entity header or -1 if we
     * need more data to find it.
     *
     * @returns position of the end of the multipart entity header
     */
    findHeaderEnd() {
        if (this.headerEnd < 0) {
            let headerStart = this.findHeaderStart();

            if (headerStart < 0) {
                return -1;
            }

            this.headerEnd = this.findDataInBuffer(this.emptyLine, headerStart);
        }

        return this.headerEnd;
    }

    /**
     * Get the start position of the current multipart entity header or -1 if
     * we need more data to find it.
     *
     * @returns position of the start of the multipart entity header
     */
    findHeaderStart() {
        if (this.headerStart < 0) {
            let entityStart = this.findEntityStart();

            if (entityStart < 0) {
                return -1;
            }

            let delimiterEnd = this.findDataInBuffer(this.crlf, entityStart + 2);

            if (delimiterEnd >= 0) {
                this.headerStart = delimiterEnd + 2;
            }
        }

        return this.headerStart;
    }

    /**
     * Get the start position of the current multipart entity or -1 if need
     * more data to find it.
     *
     * @returns start position of the current multipart entity
     */
    findEntityStart() {
        if (this.entityStart < 0) {
            this.entityStart = this.findDataInBuffer(this.entityPrefix);
        }

        // we can drop all the data that do not contain the entity prefix to
        // avoid searching through it again
        if (this.entityStart < 0) {
            this.reset(this.filled - this.entityPrefix.length);
        }

        return this.entityStart;
    }

    /**
     * Find a given needle in the internal buffer (haystack) starting at a
     * given offset.
     *
     * @param {Uint8Array} data needle
     * @param {number} offset
     * @returns position of the needle or -1 if it wasn't found
     */
    findDataInBuffer(data, offset) {
        offset = offset || 0;

        if (offset > this.filled) {
            return -1;
        }

        let haystack = this.buffer.subarray(offset, this.filled);

        let maxStart = haystack.length - data.length;

        for (let i = 0; i <= maxStart; i++) {
            let match = haystack
                .subarray(i, i + data.length)
                .every((b, j) => b === data[j]);

            if (match) {
                return offset + i;
            }
        }

        return -1;
    }
}

/**
 * Internal MJPEG reader.
 */
class InternalMJPEGReader {
    /**
     * Create a new MJPEG reader from a given HTTP response.
     *
     * @param {object} response
     */
    constructor(response) {
        let contentTypeParts = response
            .headers
            .get('content-type')
            .split(';');

        let contentType = contentTypeParts[0]
            .trim()
            .toLowerCase();

        if (contentType !== 'multipart/x-mixed-replace') {
            throw new Error(`unexpected content type: ${contentType[0]}`);
        }

        let boundary = contentTypeParts
            .slice(1)
            .map(param => param.trim())
            .find(param => param.startsWith('boundary='));

        if (!boundary) {
            throw new Error("missing multipart boundary");
        }

        boundary = boundary.slice(9);

        if (boundary.startsWith('"') && boundary.endsWith('"')) {
            boundary = boundary.slice(1, -1).replace('\\', '');
        }

        this.parser = new MJPEGParser(boundary);
        this.stream = response.body.getReader();
        this.unusedChunk = null;
        this.cancelled = false;
    }

    /**
     * Read the next chunk of data from the underlying stream.
     *
     * @returns chunk
     */
    async readChunk() {
        // make sure that we consume all the remaining data from
        // the previous frame read
        if (this.unusedChunk) {
            let chunk = this.unusedChunk;
            this.unusedChunk = null;
            return chunk;
        } else if (!this.stream) {
            return null;
        }

        let chunk = await this.stream.read();

        if (!chunk.value) {
            chunk.value = [];
        }

        if (chunk.value.length === 0 && chunk.done) {
            // avoid reading from the stream again
            this.stream = null;

            return null;
        }

        return chunk.value;
    }

    /**
     * Read the next MJPEG frame.
     *
     * @returns MJPEG frame Blob
     */
    async readFrame() {
        while (true) {
            let frame = this.parser.take();

            if (frame) {
                return frame;
            }

            let chunk = await this.readChunk();

            if (!chunk) {
                return null;
            }

            chunk = this.parser.push(chunk);

            if (chunk.length > 0) {
                this.unusedChunk = chunk;
            }
        }
    }

    /**
     * Cancel the stream processing.
     */
    async cancel() {
        this.cancelled = true;

        if (!this.stream) {
            return;
        }

        let stream = this.stream;
        this.stream = null;
        await stream.cancel();
    }
}

/**
 * MJPEG reader.
 */
class MJPEGReader {
    /**
     * Create a new MJPEG reader for a given HTTP response.
     *
     * @param {object} response
     */
    constructor(response) {
        this.inner = new InternalMJPEGReader(response);
    }

    /**
     * Property indicating if the stream was cancelled.
     */
    get cancelled() {
        return this.inner.cancelled;
    }

    /**
     * Read the next MJPEG frame.
     *
     * @returns a frame Blob
     */
    async readFrame() {
        return await this.inner.readFrame();
    }

    /**
     * Cancel the stream processing.
     */
    async cancel() {
        await this.inner.cancel();
    }

    /**
     * Fetch MJPEG stream from a given URL.
     *
     * @param {string} url MJPEG stream URL
     * @returns MJPEG reader
     */
    static async fetch(url) {
        let response = await fetch(url, {
            credentials: 'include',
        });

        return new MJPEGReader(response);
    }
}

if (window) {
    if (!window.GoodCam) {
        window.GoodCam = {};
    }

    window.GoodCam.MJPEGReader = MJPEGReader;
}

require("@testing-library/jest-dom");

// This is added to adress "TrnasformStream is not defined errror" in reelbot-panel.test.tsx
if (typeof globalThis.TransformStream === "undefined") {
	globalThis.TransformStream = require("node:stream/web").TransformStream;
}

const { TextDecoder, TextEncoder } = require("node:util");

if (typeof globalThis.TextDecoder === "undefined") {
	globalThis.TextDecoder = TextDecoder;
}

if (typeof globalThis.TextEncoder === "undefined") {
	globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.Response === "undefined") {
	globalThis.Response = class {
		status;
		body;

		constructor(body, init = {}) {
			this.body = body;
			this.status = init.status ?? 200;
		}

		async json() {
			return JSON.parse(this.body);
		}

		static json(data, init = {}) {
			return new globalThis.Response(JSON.stringify(data), init);
		}
	};
}

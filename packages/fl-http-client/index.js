"use strict";
// FreeLang v9 Package: fl-http-client
// FL 인터프리터에 등록 가능한 HTTP 클라이언트 함수들
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockHttpClient = void 0;
exports.createMockHttpClient = createMockHttpClient;
exports.registerFlHttpClient = registerFlHttpClient;
class MockHttpClient {
    constructor() {
        this.routes = [];
        this.defaultResponse = {
            status: 200,
            body: '{"ok":true}',
            headers: { "content-type": "application/json" },
        };
    }
    addRoute(method, url, response) {
        this.routes.push({ method: method.toUpperCase(), url, response });
    }
    async request(method, url, _body) {
        const route = this.routes.find((r) => r.method === method.toUpperCase() && r.url === url);
        if (route) {
            return {
                status: route.response.status ?? 200,
                body: route.response.body ?? "",
                headers: route.response.headers ?? {},
            };
        }
        return { ...this.defaultResponse };
    }
    async get(url) {
        return this.request("GET", url);
    }
    async post(url, body) {
        return this.request("POST", url, body);
    }
    async put(url, body) {
        return this.request("PUT", url, body);
    }
    async delete(url) {
        return this.request("DELETE", url);
    }
    async json(url) {
        const res = await this.get(url);
        return JSON.parse(res.body);
    }
    async withHeaders(url, headers, method) {
        return this.request(method, url);
    }
}
exports.MockHttpClient = MockHttpClient;
function createMockHttpClient() {
    return new MockHttpClient();
}
// 실제 fetch 기반 HTTP 함수 (Node.js 18+ 또는 node-fetch 필요)
async function httpFetch(url, method, body, headers) {
    const fetchFn = typeof fetch !== "undefined"
        ? fetch
        : (await Promise.resolve().then(() => __importStar(require("node:https")))).request;
    const opts = {
        method,
        headers: { "Content-Type": "application/json", ...headers },
    };
    if (body !== undefined)
        opts.body = body;
    const res = await fetch(url, opts);
    const resBody = await res.text();
    const resHeaders = {};
    res.headers.forEach((v, k) => {
        resHeaders[k] = v;
    });
    return { status: res.status, body: resBody, headers: resHeaders };
}
function registerFlHttpClient(registry) {
    registry["http-get"] = async (url) => httpFetch(url, "GET");
    registry["http-post"] = async (url, body) => httpFetch(url, "POST", body);
    registry["http-put"] = async (url, body) => httpFetch(url, "PUT", body);
    registry["http-delete"] = async (url) => httpFetch(url, "DELETE");
    registry["http-json"] = async (url) => {
        const res = await httpFetch(url, "GET");
        return JSON.parse(res.body);
    };
    registry["http-headers"] = async (url, headers, method) => httpFetch(url, method, undefined, headers);
}
//# sourceMappingURL=index.js.map
export interface HttpResponse {
    status: number;
    body: string;
    headers: Record<string, string>;
}
export interface MockRoute {
    method: string;
    url: string;
    response: Partial<HttpResponse>;
}
export declare class MockHttpClient {
    private routes;
    private defaultResponse;
    addRoute(method: string, url: string, response: Partial<HttpResponse>): void;
    request(method: string, url: string, _body?: string): Promise<HttpResponse>;
    get(url: string): Promise<HttpResponse>;
    post(url: string, body: string): Promise<HttpResponse>;
    put(url: string, body: string): Promise<HttpResponse>;
    delete(url: string): Promise<HttpResponse>;
    json(url: string): Promise<any>;
    withHeaders(url: string, headers: Record<string, string>, method: string): Promise<HttpResponse>;
}
export declare function createMockHttpClient(): MockHttpClient;
export declare function registerFlHttpClient(registry: any): void;
//# sourceMappingURL=index.d.ts.map